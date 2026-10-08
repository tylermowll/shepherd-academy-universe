"""Multi-subject sessions: learner-owned activities, model-authored guidance."""

from __future__ import annotations

import os
from typing import Any, Literal, cast
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from math_tutor.adapters.db.models import (
    DEFAULT_PROFILE,
    Job,
    PracticeSession,
    ProblemInstance,
    Submission,
)
from math_tutor.adapters.db.types import utcnow
from math_tutor.api.access import Database, Principal, owned_learner
from math_tutor.api.practice import (
    ACTIVE,
    ProblemPublic,
    digest,
    owned_session,
    problem_public,
    request_key,
)
from math_tutor.providers import authorize_route, effective_configuration
from math_tutor.reading import (
    MAX_PASSAGE_LENGTH,
    ActivitySource,
    MaterialMode,
    ReadingPassage,
    SectionSize,
    material_focus,
    section_offsets,
)

router = APIRouter(prefix="/api/v1/tutor", tags=["AI tutoring"])
Initiative = Literal["tutor_led", "balanced", "learner_led"]
Difficulty = Literal["introductory", "standard", "challenge"]


def session_difficulty(row: PracticeSession) -> Difficulty:
    value = row.profile_settings.get("difficulty", "standard")
    return cast(
        Difficulty, value if value in {"introductory", "standard", "challenge"} else "standard"
    )


class TutorSettingsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    initiative: Initiative
    difficulty: Difficulty | None = None


class TutorActivityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    difficulty: Difficulty | None = None
    source: ActivitySource = "topic"
    reference_text: str | None = Field(default=None, max_length=MAX_PASSAGE_LENGTH)
    passage_title: str | None = Field(default=None, min_length=1, max_length=200)
    source_token: str | None = Field(default=None, max_length=410000)
    reading_mode: MaterialMode | None = None
    section_size: SectionSize | None = None
    section_index: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_reference(self) -> TutorActivityInput:
        if (
            self.source in {"reference_text", "reading_text"}
            and not (self.reference_text or "").strip()
        ):
            raise ValueError("Reference text is required.")
        if (
            self.source not in {"reference_text", "reading_text"}
            and self.reference_text is not None
        ):
            raise ValueError("Only a text source accepts reference_text.")
        if self.passage_title is not None and (
            self.source not in {"reading_text", "reading_photo"} or not self.passage_title.strip()
        ):
            raise ValueError("A passage title belongs to a pasted or photographed passage.")
        if (self.source == "published") != bool(self.source_token):
            raise ValueError("A published passage requires its imported source token.")
        if self.source == "reference_text" and len(self.reference_text or "") > 8000:
            raise ValueError("Assignment reference text must be at most 8,000 characters.")
        if self.source not in {
            "reading_text",
            "reading_photo",
            "reading_generated",
            "same_passage",
            "published",
        } and any(
            value is not None
            for value in (self.reading_mode, self.section_size, self.section_index)
        ):
            raise ValueError("Section controls require reading or study material.")
        if self.section_index is not None and self.source != "same_passage":
            raise ValueError("Choose a saved passage before navigating its sections.")
        return self


def activity_request_payload(body: TutorActivityInput) -> dict[str, Any]:
    """Keep saved request identities stable when optional controls are absent."""
    return {
        key: value
        for key, value in body.model_dump().items()
        if key not in {"reading_mode", "section_size", "section_index"} or value is not None
    }


class TutoringSessionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    learner_id: UUID
    topic: str = Field(min_length=1, max_length=500)
    initiative: Initiative = "balanced"
    difficulty: Difficulty = "standard"
    initial_activity: TutorActivityInput | None = None


class TutoringSessionPublic(BaseModel):
    id: UUID
    learner_id: UUID
    status: str
    topic: str
    initiative: Initiative
    difficulty: Difficulty
    problems: list[ProblemPublic]


def public_session(db: Session, row: PracticeSession) -> TutoringSessionPublic:
    return TutoringSessionPublic(
        id=row.id,
        learner_id=row.learner_id,
        status=row.status,
        topic=row.topic,
        initiative=cast(Initiative, row.initiative),
        difficulty=session_difficulty(row),
        problems=[
            problem_public(db, item)
            for item in db.scalars(
                select(ProblemInstance)
                .where(ProblemInstance.session_id == row.id)
                .order_by(ProblemInstance.position)
            )
        ],
    )


def private_tutoring() -> None:
    if os.getenv("APP_MODE", "private") == "demo":
        raise HTTPException(
            403,
            "AI tutoring accepts private work only in a private deployment. The public demo is synthetic.",
        )


def owned_tutoring_session(db: Session, actor: Principal, session_id: UUID) -> PracticeSession:
    row = owned_session(db, actor, session_id)
    if row.mode != "ai_tutor":
        raise HTTPException(404, "Tutoring session not found.")
    return row


@router.post("/sessions", response_model=TutoringSessionPublic, status_code=201)
def create_session(
    body: TutoringSessionInput, request: Request, db: Database, actor: Principal
) -> TutoringSessionPublic:
    private_tutoring()
    owned_learner(db, actor, body.learner_id)
    if not body.topic.strip():
        raise HTTPException(422, "Choose a topic or describe what you want to practice.")
    if body.initial_activity and body.initial_activity.source == "same_passage":
        raise HTTPException(422, "Choose a passage before starting questions about it.")
    request_payload = body.model_dump()
    if body.initial_activity is not None:
        request_payload["initial_activity"] = activity_request_payload(body.initial_activity)
    key, payload = request_key(request), digest(request_payload)
    old = db.scalar(
        select(PracticeSession).where(
            PracticeSession.learner_id == body.learner_id, PracticeSession.request_key == key
        )
    )
    if old:
        if old.payload_hash != payload or old.mode != "ai_tutor":
            raise HTTPException(409, "Request key already used with different input.")
        return public_session(db, old)
    authorize_route(db, effective_configuration(db), "tutor", body.learner_id)
    row = PracticeSession(
        learner_id=body.learner_id,
        mode="ai_tutor",
        topic=body.topic.strip(),
        initiative=body.initiative,
        profile_settings={**DEFAULT_PROFILE, "difficulty": body.difficulty},
        request_key=key,
        payload_hash=payload,
    )
    db.add(row)
    db.flush()
    if body.initial_activity is not None:
        activity(row.id, body.initial_activity, request, db, actor)
    return public_session(db, row)


@router.get("/sessions", response_model=list[TutoringSessionPublic])
def sessions(db: Database, actor: Principal) -> list[TutoringSessionPublic]:
    query = (
        select(PracticeSession)
        .where(PracticeSession.mode == "ai_tutor")
        .order_by(PracticeSession.created_at.desc())
        .limit(100)
    )
    if actor.role != "adult":
        query = query.where(PracticeSession.learner_id == actor.learner_id)
    return [public_session(db, row) for row in db.scalars(query)]


@router.get("/sessions/{session_id}", response_model=TutoringSessionPublic)
def read_session(session_id: UUID, db: Database, actor: Principal) -> TutoringSessionPublic:
    return public_session(db, owned_tutoring_session(db, actor, session_id))


@router.post("/sessions/{session_id}/settings", response_model=TutoringSessionPublic)
def settings(
    session_id: UUID, body: TutorSettingsInput, db: Database, actor: Principal
) -> TutoringSessionPublic:
    private_tutoring()
    row = owned_tutoring_session(db, actor, session_id)
    if row.status != "open":
        raise HTTPException(409, "This session is finished.")
    row.initiative = body.initiative
    if body.difficulty is not None:
        row.profile_settings = {**row.profile_settings, "difficulty": body.difficulty}
    row.updated_at = utcnow()
    return public_session(db, row)


@router.post("/sessions/{session_id}/activities", response_model=ProblemPublic, status_code=201)
def activity(
    session_id: UUID, body: TutorActivityInput, request: Request, db: Database, actor: Principal
) -> ProblemPublic:
    private_tutoring()
    session = owned_tutoring_session(db, actor, session_id)
    key, payload = request_key(request), digest(activity_request_payload(body))
    problems = list(
        db.scalars(
            select(ProblemInstance)
            .where(ProblemInstance.session_id == session_id)
            .order_by(ProblemInstance.position)
        )
    )
    for old in problems:
        if old.request_key == key:
            if old.parameters.get("request_digest") != payload:
                raise HTTPException(409, "Request key already used with different input.")
            return problem_public(db, old)
    if session.status != "open":
        raise HTTPException(409, "Start another session to continue.")
    for old in problems:
        if old.status == "assigned":
            active = db.scalar(
                select(Submission.id).where(
                    Submission.problem_id == old.id, Submission.status.in_(ACTIVE)
                )
            )
            if active:
                raise HTTPException(409, "Wait for or cancel the current operation first.")
            # The learner requests moving on. Model output never owns this transition.
            old.status = (
                "completed" if old.parameters.get("activity_state") == "ready" else "skipped"
            )
            old.version += 1
    config = effective_configuration(db)
    authorize_route(db, config, "tutor", session.learner_id)
    photo = body.source in {"reference_photo", "reading_photo"}
    if photo:
        authorize_route(db, config, "vision", session.learner_id)
    passage: ReadingPassage | None = None
    if body.source == "reading_text":
        passage = ReadingPassage(
            title=body.passage_title or "Your reading passage",
            text=body.reference_text or "",
            origin="pasted",
        )
    elif body.source == "same_passage":
        if not problems or not problems[-1].passage:
            raise HTTPException(409, "Choose a reading passage before requesting another question.")
        passage = ReadingPassage.model_validate(problems[-1].passage)
    elif body.source == "published":
        from math_tutor.reading_sources import verify_source_token

        passage = verify_source_token(body.source_token or "", session.learner_id)
    previous_parameters = problems[-1].parameters if body.source == "same_passage" else {}
    mode = body.reading_mode or previous_parameters.get(
        "material_mode", "whole" if body.source == "same_passage" else "guided"
    )
    size = body.section_size or previous_parameters.get("section_size", "standard")
    index = body.section_index
    if index is None:
        index = 0
        if passage and body.source == "same_passage" and mode == "guided":
            previous_focus = material_focus(passage, previous_parameters)
            index = next(
                i
                for i, (start, end) in enumerate(section_offsets(passage.text, size))
                if start <= previous_focus.start < end
            )
    material_parameters = {"material_mode": mode, "section_size": size, "section_index": index}
    if passage:
        try:
            material_focus(passage, material_parameters)
        except ValueError as error:
            raise HTTPException(422, str(error)) from None
    # Leave room to read every section and revisit questions in a long source.
    # The bound depends on saved material, not the selected difficulty or mode.
    activity_limit = (
        max(100, min(500, 3 * len(section_offsets(passage.text, "short")))) if passage else 100
    )
    if len(problems) >= activity_limit:
        raise HTTPException(
            409, "This session reached its activity limit. Start another session to continue."
        )
    if body.difficulty is not None:
        session.profile_settings = {**session.profile_settings, "difficulty": body.difficulty}
    session.updated_at = utcnow()
    row = ProblemInstance(
        session_id=session.id,
        template_id="ai-activity-v1",
        template_version=1,
        skill_id="open.subject",
        seed=0,
        position=len(problems),
        parameters={
            **material_parameters,
            "activity_state": "reference_capture" if photo else "generating",
            "reference_source": body.source,
            "reference": (body.reference_text or "") if body.source == "reference_text" else "",
            "reading_mode": body.source
            in {"reading_text", "reading_photo", "reading_generated", "same_passage", "published"},
            "passage_title": body.passage_title or "Your photographed passage",
            "request_digest": payload,
        },
        passage=passage.model_dump(mode="json") if passage else None,
        problem_text="Photograph the reading passage. The tutor will save its text and ask a question about it."
        if body.source == "reading_photo"
        else "Photograph the source material. The tutor will create a different practice activity, not solve the original assignment."
        if photo
        else "Preparing a new practice activity…",
        expected_result={},
        format_constraints=None,
        request_key=key,
    )
    db.add(row)
    db.flush()
    if not photo:
        operation = Submission(
            learner_id=session.learner_id,
            problem_id=row.id,
            request_key=f"activity:{row.id}",
            payload_hash=payload,
            kind="hint",
            text="Create a new practice activity.",
            assignment_version=row.version,
        )
        db.add(operation)
        db.flush()
        db.add(
            Job(submission_id=operation.id, stage="tutoring", policy_digest=config.fingerprint())
        )
        db.flush()
    return problem_public(db, row)
