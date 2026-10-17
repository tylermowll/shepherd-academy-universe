"""Owned photo intake; clear readings continue automatically in the worker."""

import asyncio
import hashlib
import os
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from math_tutor.adapters.db.models import Job, ProblemInstance, Submission
from math_tutor.adapters.images import (
    MAX_BYTES,
    NORMALIZED_IMAGE_MIME_TYPE,
    delete_image,
    normalize,
    read_image,
    store_image,
)
from math_tutor.api.access import Database, Principal, principal
from math_tutor.api.practice import (
    OperationPublic,
    assert_available,
    digest,
    operation_public,
    owned_operation,
    owned_problem,
    owned_session,
    request_key,
)
from math_tutor.request_recovery import require_uncancelled
from math_tutor.retention import photo_expired

router = APIRouter(prefix="/api/v1", tags=["photos"])
_decode_slots = asyncio.Semaphore(2)


async def receive_image(request: Request) -> tuple[bytes, str]:
    """Bound and normalize both ordinary and delegated phone photos."""
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_BYTES:
            raise HTTPException(413, "Image exceeds 8 MiB.")
    checksum = hashlib.sha256(data).hexdigest()
    async with _decode_slots:
        try:
            image = await asyncio.to_thread(normalize, bytes(data))
        except ValueError as error:
            raise HTTPException(422, str(error)) from None
    return image, checksum


def enqueue_photo(
    db: Session,
    problem: ProblemInstance,
    learner_id: UUID,
    version: int,
    kind: str,
    key: str,
    payload: str,
    image: bytes,
) -> Submission:
    """Persist one photo/job; caller commits and cleans up on commit failure."""
    from math_tutor.providers import authorize_route, effective_configuration

    assert_available(db, problem, version)
    if problem.parameters.get("activity_state") not in {
        "ready",
        "reference_capture",
    }:
        raise HTTPException(409, "Wait for the practice activity before uploading work.")
    config = effective_configuration(db)
    authorize_route(db, config, "vision", learner_id)
    image_key = store_image(image)
    try:
        row = Submission(
            learner_id=learner_id,
            problem_id=problem.id,
            request_key=key,
            payload_hash=payload,
            kind=kind,
            text="",
            image_key=image_key,
            assignment_version=version,
        )
        db.add(row)
        db.flush()
        db.add(Job(submission_id=row.id, stage="interpreting", policy_digest=config.fingerprint()))
        db.flush()
    except Exception:
        delete_image(image_key)
        raise
    return row


@router.post("/problems/{problem_id}/photos", response_model=OperationPublic, status_code=202)
async def upload_photo(
    problem_id: UUID,
    request: Request,
    db: Database,
    actor: Principal,
    version: int,
    kind: Literal["answer", "question"] = "answer",
) -> OperationPublic:
    if os.getenv("APP_MODE", "private") == "demo":
        raise HTTPException(
            403,
            "Demo accepts supplied synthetic fixtures only. Use private mode for your own photographs.",
        )
    problem = owned_problem(db, actor, problem_id)
    session = owned_session(db, actor, problem.session_id)
    learner_id, key = session.learner_id, request_key(request)
    require_uncancelled(db, learner_id, key)
    from math_tutor.providers import authorize_route, effective_configuration

    authorize_route(db, effective_configuration(db), "vision", learner_id)
    # Release the authentication transaction before receiving/decoding the image.
    db.commit()
    image, checksum = await receive_image(request)
    payload = digest(
        {
            "problem_id": problem_id,
            "version": version,
            "kind": kind,
            "sha256": checksum,
        }
    )
    db.connection(execution_options={"sqlite_begin_immediate": True})
    db.expire_all()
    actor = principal(request, db)
    problem = owned_problem(db, actor, problem_id)
    require_uncancelled(db, learner_id, key)
    old = db.scalar(
        select(Submission).where(Submission.learner_id == learner_id, Submission.request_key == key)
    )
    if old:
        if old.payload_hash != payload:
            raise HTTPException(409, "Request key already used with different input.")
        return operation_public(db, old)
    row = enqueue_photo(db, problem, learner_id, version, kind, key, payload, image)
    try:
        db.commit()
    except Exception:
        if row.image_key:
            delete_image(row.image_key)
        raise
    return operation_public(db, row)


@router.get("/submissions/{submission_id}/image")
def photo(submission_id: UUID, db: Database, actor: Principal) -> Response:
    row = owned_operation(db, actor, submission_id)
    if row.image_key is None or row.status == "completed" or photo_expired(row):
        raise HTTPException(404, "Photo expired or unavailable.")
    try:
        data = read_image(row.image_key)
    except OSError:
        raise HTTPException(404, "Photo expired or unavailable.") from None
    return Response(
        data,
        media_type=NORMALIZED_IMAGE_MIME_TYPE,
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.post("/images/preview")
async def preview_image(request: Request, db: Database, actor: Principal) -> Response:
    if os.getenv("APP_MODE", "private") == "demo":
        raise HTTPException(403, "Demo does not accept personal photographs.")
    db.commit()
    normalized, _ = await receive_image(request)
    return Response(
        normalized, media_type=NORMALIZED_IMAGE_MIME_TYPE, headers={"Cache-Control": "no-store"}
    )
