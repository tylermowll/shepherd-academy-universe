"""Lost acknowledgements recover owned receipts; resolution excludes late acceptance."""

import json
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from fastapi import Request
from httpx2 import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_tutoring import activity, latest, tutor_session
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import client, learner_ids, photo_bytes, sign_in_learner
from test_workflows import engine as engine

from math_tutor import worker
from math_tutor.adapters.db.models import CancelledTutorRequest, Job, PracticeSession, Submission
from math_tutor.api import photos


@pytest.mark.anyio
async def test_owned_session_receipt_survives_lost_response(
    adult: AsyncClient, engine: Engine
) -> None:
    learner = (await learner_ids(adult))[0]
    key = str(uuid4())
    body = {
        "learner_id": learner,
        "topic": "Synthetic source recovery",
        "initial_activity": {"source": "topic"},
    }
    accepted = await adult.post(
        "/api/v1/tutor/sessions", json=body, headers={"Idempotency-Key": key}
    )
    assert accepted.status_code == 201
    receipt = await adult.get(f"/api/v1/tutor/request-receipts/{key}?learner_id={learner}")
    assert receipt.status_code == 200
    assert receipt.json() == {
        "kind": "session",
        "session_id": accepted.json()["id"],
        "activity_id": None,
        "submission_id": None,
    }
    resolution = await adult.post(
        f"/api/v1/tutor/request-receipts/{key}/resolve", json={"learner_id": learner}
    )
    assert resolution.json() == {"status": "accepted", "receipt": receipt.json()}
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(PracticeSession)) == 1
        assert db.scalar(select(func.count()).select_from(Job)) == 1
        assert db.scalar(select(func.count()).select_from(CancelledTutorRequest)) == 0


@pytest.mark.anyio
async def test_receipts_do_not_authorize_another_learner(
    adult: AsyncClient, engine: Engine
) -> None:
    owner, outsider = (await learner_ids(adult))[:2]
    key = str(uuid4())
    response = await adult.post(
        "/api/v1/tutor/sessions",
        json={"learner_id": owner, "topic": "Private synthetic session"},
        headers={"Idempotency-Key": key},
    )
    assert response.status_code == 201
    async with client(engine) as learner:
        await sign_in_learner(adult, learner, outsider)
        for requested_owner in (owner, outsider):
            response = await learner.get(
                f"/api/v1/tutor/request-receipts/{key}?learner_id={requested_owner}"
            )
            assert response.status_code == 404
        response = await learner.post(
            f"/api/v1/tutor/request-receipts/{key}/resolve", json={"learner_id": owner}
        )
        assert response.status_code == 404
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(CancelledTutorRequest)) == 0


@pytest.mark.anyio
@pytest.mark.parametrize("kind", ["session", "activity", "submission"])
async def test_resolution_blocks_a_delayed_command(
    adult: AsyncClient, engine: Engine, kind: str
) -> None:
    learner = (await learner_ids(adult))[0]
    key = str(uuid4())
    if kind == "session":
        path = "/api/v1/tutor/sessions"
        body = {"learner_id": learner, "topic": "Delayed session"}
    else:
        session = await tutor_session(adult)
        if kind == "activity":
            path = f"/api/v1/tutor/sessions/{session['id']}/activities"
            body = {"source": "topic"}
        else:
            problem = await activity(adult, session)
            assert worker.run_once(engine)
            problem = await latest(adult, session)
            path = f"/api/v1/problems/{problem['id']}/submissions"
            body = {"version": problem["version"], "text": "Synthetic delayed work"}
    missing = await adult.get(f"/api/v1/tutor/request-receipts/{key}?learner_id={learner}")
    assert missing.status_code == 404
    for _ in range(2):
        resolved = await adult.post(
            f"/api/v1/tutor/request-receipts/{key}/resolve", json={"learner_id": learner}
        )
        assert resolved.json() == {"status": "not_accepted", "receipt": None}
    late = await adult.post(path, json=body, headers={"Idempotency-Key": key})
    assert late.status_code == 409
    assert "closed during recovery" in late.text
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(CancelledTutorRequest)) == 1
        assert db.scalar(select(Submission).where(Submission.request_key == key)) is None


@pytest.mark.anyio
async def test_activity_and_submission_receipts(adult: AsyncClient, engine: Engine) -> None:
    session = await tutor_session(adult)
    learner = session["learner_id"]
    activity_key = str(uuid4())
    response = await adult.post(
        f"/api/v1/tutor/sessions/{session['id']}/activities",
        json={"source": "topic"},
        headers={"Idempotency-Key": activity_key},
    )
    problem = response.json()
    receipt = await adult.get(f"/api/v1/tutor/request-receipts/{activity_key}?learner_id={learner}")
    assert receipt.json()["activity_id"] == problem["id"]
    assert receipt.json()["kind"] == "activity"
    assert worker.run_once(engine)
    problem = await latest(adult, session)
    submission_key = str(uuid4())
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/submissions",
        json={"version": problem["version"], "kind": "question", "text": "Explain the concept."},
        headers={"Idempotency-Key": submission_key},
    )
    assert response.status_code == 202
    receipt = await adult.get(
        f"/api/v1/tutor/request-receipts/{submission_key}?learner_id={learner}"
    )
    assert receipt.json()["submission_id"] == response.json()["id"]
    assert receipt.json()["kind"] == "submission"
    assert "text" not in receipt.json()
    assert "Explain" not in receipt.text


@pytest.mark.anyio
async def test_photo_receipt_and_resolved_photo_cannot_arrive_later(
    adult: AsyncClient, engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("MATH_TUTOR_DATA_DIR", str(tmp_path))
    session = await tutor_session(adult)
    await activity(adult, session)
    assert worker.run_once(engine)
    problem = await latest(adult, session)
    key = str(uuid4())
    path = f"/api/v1/problems/{problem['id']}/photos?version={problem['version']}"
    response = await adult.post(
        path, content=photo_bytes(), headers={"Idempotency-Key": key, "Content-Type": "image/png"}
    )
    assert response.status_code == 202, response.text
    receipt = await adult.get(
        f"/api/v1/tutor/request-receipts/{key}?learner_id={session['learner_id']}"
    )
    assert receipt.json()["submission_id"] == response.json()["id"]
    late_key = str(uuid4())
    resolution = await adult.post(
        f"/api/v1/tutor/request-receipts/{late_key}/resolve",
        json={"learner_id": session["learner_id"]},
    )
    assert resolution.json()["status"] == "not_accepted"
    late = await adult.post(
        path,
        content=photo_bytes(),
        headers={"Idempotency-Key": late_key, "Content-Type": "image/png"},
    )
    assert late.status_code == 409
    assert "closed during recovery" in late.text


@pytest.mark.anyio
async def test_resolution_during_photo_decoding_excludes_late_acceptance(
    adult: AsyncClient, engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("MATH_TUTOR_DATA_DIR", str(tmp_path))
    session = await tutor_session(adult)
    await activity(adult, session)
    assert worker.run_once(engine)
    problem = await latest(adult, session)
    key = str(uuid4())
    receive = photos.receive_image

    async def resolve_before_accepting(request: Request) -> tuple[bytes, str]:
        image = await receive(request)
        resolution = await adult.post(
            f"/api/v1/tutor/request-receipts/{key}/resolve",
            json={"learner_id": session["learner_id"]},
        )
        assert resolution.json()["status"] == "not_accepted"
        return image

    monkeypatch.setattr(photos, "receive_image", resolve_before_accepting)
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/photos?version={problem['version']}",
        content=photo_bytes(),
        headers={"Idempotency-Key": key, "Content-Type": "image/png"},
    )
    assert response.status_code == 409
    assert "closed during recovery" in response.text
    with Session(engine) as db:
        assert db.scalar(select(Submission).where(Submission.request_key == key)) is None


@pytest.mark.anyio
@pytest.mark.parametrize("character,escaped", [("a", False), ("漢", False), ("🌱", True)])
async def test_submission_byte_budget_accepts_full_unicode_schema(
    adult: AsyncClient, engine: Engine, character: str, escaped: bool
) -> None:
    session = await tutor_session(adult)
    await activity(adult, session)
    assert worker.run_once(engine)
    problem = await latest(adult, session)
    text = character * 8000
    encoded = json.dumps(
        {"version": problem["version"], "text": text, "work_text": text}, ensure_ascii=escaped
    ).encode()
    response = await adult.post(
        f"/api/v1/problems/{problem['id']}/submissions",
        content=encoded,
        headers={"Content-Type": "application/json", "Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 202, response.text
    assert response.json()["text"] == text
    assert response.json()["work_text"] == text


def test_recovery_migration_rolls_back_without_changing_saved_work(engine: Engine) -> None:
    from test_db_foundation import alembic_config

    url = str(engine.url)
    with Session(engine) as db, db.begin():
        learner = db.scalar(select(PracticeSession.learner_id))
        if learner is None:
            from math_tutor.adapters.db.models import Learner

            learner = db.scalar(select(Learner.id))
        assert learner is not None
        db.add(CancelledTutorRequest(learner_id=learner, request_key=str(uuid4())))
    command.downgrade(alembic_config(url), "0019_teaching_observations")
    command.upgrade(alembic_config(url), "head")
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(CancelledTutorRequest)) == 0
