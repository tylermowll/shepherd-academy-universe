"""Owned practice operations with canonical request identity and immutable results."""

import hashlib
import json
import os
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from math_tutor.adapters.db.models import (
    DeviceSession,
    Evaluation,
    Interpretation,
    Job,
    ModelCall,
    PracticeSession,
    ProblemInstance,
    Submission,
    TutorTurn,
)
from math_tutor.adapters.providers.contracts import FeedbackPublic, ReadingPayload
from math_tutor.api.access import Database, Principal, owned_learner
from math_tutor.api.learners import Acknowledged
from math_tutor.api.schemas import ProblemInstancePublic
from math_tutor.reading import ActivitySource, MaterialFocus, ReadingPassage, material_focus
from math_tutor.request_recovery import require_uncancelled
from math_tutor.tutoring import rejected_reference_reading

router = APIRouter(prefix="/api/v1", tags=["practice"])
ACTIVE = {"queued", "tutoring", "interpreting"}


class VersionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)


class SubmissionInput(VersionInput):
    kind: Literal["answer", "question", "hint"] = "answer"
    text: str = Field(default="", max_length=8000)
    help_level: int = Field(default=0, ge=0, le=4)
    work_text: str = Field(default="", max_length=8000)


class ReadingPublic(ReadingPayload):
    can_continue: bool


class VerdictPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    answer_status: str
    format_status: str
    reasoning_status: str
    verifier_version: str


class OperationPublic(BaseModel):
    id: UUID
    problem_id: UUID
    kind: str
    text: str
    status: str
    work_text: str
    safe_error: str | None
    error_code: str | None = None
    retryable: bool = False
    created_at: datetime
    verdict: VerdictPublic | None = None
    message: str | None = None
    source: str | None = None
    prompt_version: str | None = None
    assistance_level: int = 0
    interpretation: str | None = None
    interpretation_version: int | None = None
    interpreted_final_answer: str | None = None
    ambiguities: list[str] = Field(default_factory=list)
    reading: ReadingPublic | None = None
    feedback: FeedbackPublic | None = None


class ProblemPublic(ProblemInstancePublic):
    version: int
    assistance_level: int
    operations: list[OperationPublic]
    activity_state: Literal["generating", "reference_capture", "ready"] = "ready"
    reference_source: ActivitySource | None = None
    concept_focus: str | None = None
    passage: ReadingPassage | None = None
    material_focus: MaterialFocus | None = None
    learning_goal: str | None = None
    success_criteria: list[str] = Field(default_factory=list)


class SessionPublic(BaseModel):
    id: UUID
    learner_id: UUID
    status: str
    profile: dict[str, Any]
    problems: list[ProblemPublic]


def request_key(request: Request) -> str:
    key = request.headers.get("Idempotency-Key", "")
    if not 1 <= len(key) <= 128 or not key.isascii():
        raise HTTPException(400, "A bounded Idempotency-Key is required.")
    return key


def digest(body: dict[str, Any]) -> str:
    return hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()


def owned_session(db: Session, actor: DeviceSession, session_id: UUID) -> PracticeSession:
    row = db.get(PracticeSession, session_id)
    if row is None:
        raise HTTPException(404, "Not found.")
    owned_learner(db, actor, row.learner_id)
    return row


def owned_problem(db: Session, actor: DeviceSession, problem_id: UUID) -> ProblemInstance:
    row = db.get(ProblemInstance, problem_id)
    if row is None:
        raise HTTPException(404, "Not found.")
    owned_session(db, actor, row.session_id)
    return row


def owned_operation(db: Session, actor: DeviceSession, operation_id: UUID) -> Submission:
    row = db.get(Submission, operation_id)
    if row is None:
        raise HTTPException(404, "Not found.")
    owned_learner(db, actor, row.learner_id)
    return row


def can_retry(db: Session, row: Submission, job: Job | None) -> bool:
    """Expose the same retry transition that the command can actually accept."""
    if (
        row.status != "failed"
        or job is None
        or job.state != "failed"
        or not job.retryable
        or job.attempts >= 6
        or job.call_count >= 6
        or job.stage
        not in {
            "interpreting",
            "interpreting_reference",
            "tutoring",
            "reference_discussion",
        }
    ):
        return False
    problem = db.get(ProblemInstance, row.problem_id)
    session = db.get(PracticeSession, problem.session_id) if problem else None
    if (
        problem is None
        or problem.status != "assigned"
        or problem.version != row.assignment_version
        or session is None
        or session.mode != "ai_tutor"
        or session.status != "open"
        or session.learner_id != row.learner_id
    ):
        return False
    if (
        job.stage in {"interpreting_reference", "reference_discussion"}
        and problem.parameters.get("activity_state") != "reference_capture"
    ):
        return False
    if job.stage == "reference_discussion" and rejected_reference_reading(db, problem) is None:
        return False
    return (
        db.scalar(
            select(Submission.id).where(
                Submission.problem_id == problem.id, Submission.status.in_(ACTIVE)
            )
        )
        is None
    )


def operation_public(
    db: Session, row: Submission, *, include_verdict: bool = False
) -> OperationPublic:
    evaluation = (
        db.scalar(select(Evaluation).where(Evaluation.submission_id == row.id))
        if include_verdict
        else None
    )
    turn = db.scalar(select(TutorTurn).where(TutorTurn.submission_id == row.id))
    interpretation = db.scalar(
        select(Interpretation)
        .where(Interpretation.submission_id == row.id)
        .order_by(Interpretation.version.desc())
        .limit(1)
    )
    job = db.scalar(select(Job).where(Job.submission_id == row.id))
    call = db.scalar(
        select(ModelCall)
        .where(ModelCall.submission_id == row.id)
        .order_by(ModelCall.created_at.desc())
        .limit(1)
    )
    error_code = (
        call.status
        if row.status == "failed" and call and call.status not in {"started", "completed"}
        else None
    )
    return OperationPublic(
        id=row.id,
        problem_id=row.problem_id,
        kind="generation" if row.request_key == f"activity:{row.problem_id}" else row.kind,
        text=row.text,
        work_text=row.work_text,
        status=row.status,
        safe_error=row.safe_error,
        error_code=error_code,
        retryable=can_retry(db, row, job),
        created_at=row.created_at,
        verdict=VerdictPublic.model_validate(evaluation) if evaluation else None,
        message=turn.message if turn else None,
        source=turn.source if turn else None,
        prompt_version=turn.prompt_version if turn else None,
        assistance_level=turn.assistance_level if turn else 0,
        interpretation=interpretation.transcription if interpretation else None,
        interpretation_version=interpretation.version if interpretation else None,
        interpreted_final_answer=interpretation.final_answer if interpretation else None,
        ambiguities=interpretation.ambiguities if interpretation else [],
        reading=ReadingPublic.model_validate(interpretation.reading)
        if interpretation and interpretation.reading
        else None,
        feedback=FeedbackPublic.model_validate(
            {
                key: value
                for key, value in turn.feedback.items()
                if key in FeedbackPublic.model_fields
            }
        )
        if turn and turn.feedback
        else None,
    )


def problem_public(
    db: Session, row: ProblemInstance, *, include_verdict: bool = False
) -> ProblemPublic:
    data = ProblemInstancePublic.model_validate(row).model_dump()
    passage = ReadingPassage.model_validate(row.passage) if row.passage else None
    return ProblemPublic(
        **data,
        version=row.version,
        assistance_level=row.assistance_level,
        activity_state=row.parameters.get("activity_state", "ready"),
        reference_source=row.parameters.get("reference_source"),
        concept_focus=row.parameters.get("concept_focus"),
        passage=passage,
        material_focus=material_focus(passage, row.parameters) if passage else None,
        learning_goal=row.parameters.get("concept_focus"),
        success_criteria=row.parameters.get("success_criteria", []),
        operations=[
            operation_public(db, op, include_verdict=include_verdict)
            for op in db.scalars(
                select(Submission)
                .where(Submission.problem_id == row.id)
                .order_by(Submission.created_at)
            )
        ],
    )


def session_public(db: Session, row: PracticeSession) -> SessionPublic:
    return SessionPublic(
        id=row.id,
        learner_id=row.learner_id,
        status=row.status,
        profile=row.profile_settings,
        problems=[
            problem_public(db, p, include_verdict=True)
            for p in db.scalars(
                select(ProblemInstance)
                .where(ProblemInstance.session_id == row.id)
                .order_by(ProblemInstance.position)
            )
        ],
    )


def assert_available(db: Session, problem: ProblemInstance, version: int) -> None:
    session = db.get(PracticeSession, problem.session_id)
    if session is None or session.mode != "ai_tutor":
        raise HTTPException(409, "This historical practice is read-only. Start a tutor session.")
    if problem.version != version or problem.status != "assigned":
        raise HTTPException(409, "Problem changed. Refresh before continuing.")
    active = db.scalar(
        select(Submission.id).where(
            Submission.problem_id == problem.id, Submission.status.in_(ACTIVE)
        )
    )
    if active is not None:
        raise HTTPException(409, "An operation is already active for this problem.")


@router.post("/problems/{problem_id}/submissions", response_model=OperationPublic, status_code=202)
def submit(
    problem_id: UUID, body: SubmissionInput, request: Request, db: Database, actor: Principal
) -> OperationPublic:
    problem = owned_problem(db, actor, problem_id)
    session = owned_session(db, actor, problem.session_id)
    key, payload = request_key(request), digest({"problem_id": problem_id, **body.model_dump()})
    require_uncancelled(db, session.learner_id, key)
    old = db.scalar(
        select(Submission).where(
            Submission.learner_id == session.learner_id, Submission.request_key == key
        )
    )
    if old:
        if old.payload_hash != payload:
            raise HTTPException(409, "Request key already used with different input.")
        return operation_public(db, old)
    assert_available(db, problem, body.version)
    reference_question = bool(
        body.kind == "question"
        and body.text.strip()
        and not body.work_text.strip()
        and body.help_level == 0
        and rejected_reference_reading(db, problem) is not None
    )
    if session.status != "open" or (
        problem.parameters.get("activity_state") != "ready" and not reference_question
    ):
        raise HTTPException(409, "Wait for the new practice activity before submitting work.")
    if body.help_level == 4:
        raise HTTPException(403, "The tutor guides your work; it does not supply final answers.")
    if body.kind != "hint" and not (body.text.strip() or body.work_text.strip()):
        raise HTTPException(422, "Write your work or question, or submit a photograph.")
    if os.getenv("APP_MODE", "private") == "demo":
        raise HTTPException(403, "Private tutoring is unavailable in the synthetic preview.")
    from math_tutor.providers import authorize_route, effective_configuration

    authorize_route(db, effective_configuration(db), "tutor", session.learner_id)
    row = Submission(
        learner_id=session.learner_id,
        problem_id=problem_id,
        request_key=key,
        payload_hash=payload,
        kind=body.kind,
        text=body.text,
        help_level=body.help_level,
        assignment_version=body.version,
        work_text=body.work_text,
    )
    db.add(row)
    db.flush()
    db.add(
        Job(
            submission_id=row.id,
            stage="reference_discussion" if reference_question else "tutoring",
            policy_digest=effective_configuration(db).fingerprint(),
        )
    )
    db.flush()
    return operation_public(db, row)


@router.post("/sessions/{session_id}/finish", response_model=Acknowledged)
def finish_session(session_id: UUID, db: Database, actor: Principal) -> Acknowledged:
    row = owned_session(db, actor, session_id)
    if row.mode != "ai_tutor":
        raise HTTPException(409, "This historical practice is read-only. Start a tutor session.")
    active = db.scalar(
        select(Submission.id)
        .join(ProblemInstance, Submission.problem_id == ProblemInstance.id)
        .where(ProblemInstance.session_id == session_id, Submission.status.in_(ACTIVE))
    )
    if active:
        raise HTTPException(409, "Wait for or cancel the active operation first.")
    row.status = "completed"
    for problem in db.scalars(
        select(ProblemInstance).where(
            ProblemInstance.session_id == session_id, ProblemInstance.status == "assigned"
        )
    ):
        problem.status = "skipped"
        problem.version += 1
    return Acknowledged()


@router.get("/operations/{operation_id}", response_model=OperationPublic)
def read_operation(operation_id: UUID, db: Database, actor: Principal) -> OperationPublic:
    return operation_public(db, owned_operation(db, actor, operation_id))


@router.post("/operations/{operation_id}/cancel", response_model=OperationPublic)
def cancel_operation(operation_id: UUID, db: Database, actor: Principal) -> OperationPublic:
    row = owned_operation(db, actor, operation_id)
    if row.status == "completed":
        raise HTTPException(409, "Operation already completed.")
    row.status = "canceled"
    job = db.scalar(select(Job).where(Job.submission_id == row.id))
    if job:
        job.state, job.lease_token = "canceled", None
    return operation_public(db, row)


@router.post("/operations/{operation_id}/retry", response_model=OperationPublic, status_code=202)
def retry_operation(operation_id: UUID, db: Database, actor: Principal) -> OperationPublic:
    row = owned_operation(db, actor, operation_id)
    job = db.scalar(select(Job).where(Job.submission_id == row.id))
    if not can_retry(db, row, job):
        raise HTTPException(409, "Operation cannot be retried.")
    assert job is not None
    row.status, row.safe_error = "queued", None
    job.state, job.lease_token = "queued", None
    return operation_public(db, row)
