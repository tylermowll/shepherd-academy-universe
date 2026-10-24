"""Learning goals persist independently of material inputs and own the tutor prompts."""

from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx2 import AsyncClient
from pydantic import HttpUrl
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_tutoring import activity, latest
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import client, learner_ids, phone_link, photo_bytes, sign_in_learner
from test_workflows import engine as engine

from math_tutor import worker
from math_tutor.adapters.db.models import Job, PracticeSession, ProblemInstance, TutorTurn
from math_tutor.adapters.providers.config import ProviderConfig
from math_tutor.adapters.providers.contracts import (
    ActivityPayload,
    ModelRequest,
    ModelResult,
    ReadingPayload,
)
from math_tutor.adapters.providers.transports import MockProvider
from math_tutor.reading import OriginalPassage, ReadingPassage
from math_tutor.reading_sources import sign_source
from math_tutor.tutoring import ACTIVITY_PROMPT_VERSION, GUIDANCE_PROMPT_VERSION, LearningIntent

CURRENT = "CURRENT_SECTION: notes compare observations and distinguish evidence from explanation. "
MATERIAL = CURRENT * 14 + "\n\nFUTURE_SECTION_MARKER: later material must not enter this request."


def capture_tutor(monkeypatch: pytest.MonkeyPatch, *, original: bool = False) -> list[ModelRequest]:
    requests: list[ModelRequest] = []

    def respond(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        if request.purpose == "generate":
            return ModelResult(
                model_id=request.model_id,
                validated_payload=ActivityPayload(
                    problem_text="Compare two observations and explain one useful connection.",
                    concept_focus="Use observations to develop an explanation",
                    success_criteria=["Connect one observation to an explanation."],
                    passage=OriginalPassage(title="Synthetic notes", text=CURRENT * 3)
                    if original
                    else None,
                ),
            )
        if request.purpose == "read":
            return ModelResult(
                model_id=request.model_id,
                validated_payload=ReadingPayload(
                    transcription=MATERIAL,
                    quality="clear",
                    confidence=1,
                    ambiguities=[],
                    organization_feedback=[],
                    rejection_reason=None,
                ),
            )
        return MockProvider().complete(request)

    monkeypatch.setattr(worker, "complete", respond)
    return requests


@pytest.mark.anyio
@pytest.mark.parametrize(
    "intent,generation_contract,feedback_contract",
    [
        (
            "understand",
            "explanation comes before the optional check",
            "Answer their question before",
        ),
        ("practice", "fresh activity for applying the requested skill", "skill and reasoning"),
        ("read", "grounded in the supplied passage", "interpretation and the evidence"),
        ("write", "Keep the learner as the author", "Do not rewrite or complete their essay"),
        (
            "review",
            "short recall or application activity",
            "without claiming that the learner is ready",
        ),
        ("homework", "distinct analogous practice activity", "original assignment or the active"),
        ("other", "stated freeform goal", "without forcing an unrelated exercise"),
    ],
)
async def test_intent_persists_and_drives_atomic_activity_and_feedback(
    adult: AsyncClient,
    engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
    intent: LearningIntent,
    generation_contract: str,
    feedback_contract: str,
) -> None:
    requests = capture_tutor(monkeypatch)
    body = {
        "learner_id": (await learner_ids(adult))[0],
        "topic": "Synthetic learning goal about observations",
        "learning_intent": intent,
        "initial_activity": {
            "source": "reading_text",
            "reference_text": MATERIAL,
            "reading_mode": "guided",
            "section_size": "short",
        },
    }
    headers = {"Idempotency-Key": str(uuid4())}
    response = await adult.post("/api/v1/tutor/sessions", json=body, headers=headers)
    assert response.status_code == 201, response.text
    session = response.json()
    assert session["learning_intent"] == intent and len(session["problems"]) == 1
    repeated = await adult.post("/api/v1/tutor/sessions", json=body, headers=headers)
    assert repeated.status_code == 201 and repeated.json() == session
    changed = await adult.post(
        "/api/v1/tutor/sessions",
        json={**body, "learning_intent": "other" if intent != "other" else "practice"},
        headers=headers,
    )
    assert changed.status_code == 409
    with Session(engine) as db:
        row = db.get(PracticeSession, UUID(session["id"]))
        assert row and row.profile_settings["learning_intent"] == intent
        assert db.scalar(select(func.count()).select_from(PracticeSession)) == 1
        assert db.scalar(select(func.count()).select_from(ProblemInstance)) == 1
        assert db.scalar(select(func.count()).select_from(Job)) == 1
    assert worker.run_once(engine)
    generated = requests[-1]
    assert generated.purpose == "generate"
    assert f"Learning intent: {intent}." in generated.system_instruction
    assert generation_contract in generated.system_instruction
    assert ("This is READING COMPREHENSION." in generated.system_instruction) == (intent == "read")
    assert "Never give the final answer" in generated.system_instruction
    if intent == "understand":
        assert (
            "Do not give the active task's worked solution or final answer"
            in generated.system_instruction
        )
        assert "Worked examples with distinct content are allowed" in generated.system_instruction
        assert "No worked solution or answer." not in generated.system_instruction
    assert "CURRENT_SECTION" in str(generated.ordered_messages)
    assert "FUTURE_SECTION_MARKER" not in str(generated.ordered_messages)
    current = await latest(adult, session)
    submitted = await adult.post(
        f"/api/v1/problems/{current['id']}/submissions",
        json={"version": current["version"], "text": "Help me understand this learning activity."},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert submitted.status_code == 202, submitted.text
    assert worker.run_once(engine)
    reviewed = requests[-1]
    assert reviewed.purpose == "review"
    assert f"Learning intent: {intent}." in reviewed.system_instruction
    assert feedback_contract in reviewed.system_instruction
    assert "FUTURE_SECTION_MARKER" not in str(reviewed.ordered_messages)
    if intent == "homework":
        assert "CURRENT_SECTION" not in str(reviewed.ordered_messages)
    settings = await adult.post(
        f"/api/v1/tutor/sessions/{session['id']}/settings",
        json={"initiative": "learner_led", "difficulty": "introductory"},
    )
    assert settings.status_code == 200 and settings.json()["learning_intent"] == intent
    await activity(adult, session, source="same_passage", difficulty="challenge")
    assert worker.run_once(engine)
    detail = (await adult.get(f"/api/v1/tutor/sessions/{session['id']}")).json()
    summary = (await adult.get("/api/v1/tutor/sessions")).json()[0]
    assert detail["learning_intent"] == summary["learning_intent"] == intent
    with Session(engine) as db:
        row = db.get(PracticeSession, UUID(session["id"]))
        assert row and row.profile_settings == {
            "learning_intent": intent,
            "difficulty": "challenge",
        }
        versions = set(db.scalars(select(TutorTurn.prompt_version)))
        assert versions == {ACTIVITY_PROMPT_VERSION, GUIDANCE_PROMPT_VERSION}


@pytest.mark.anyio
@pytest.mark.parametrize("intent", ["understand", "review", "write"])
@pytest.mark.parametrize("source", ["reading_photo", "reading_generated", "published"])
async def test_study_material_input_does_not_override_the_selected_goal(
    adult: AsyncClient,
    engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
    intent: LearningIntent,
    source: str,
) -> None:
    requests = capture_tutor(monkeypatch, original=source == "reading_generated")
    learner_id = (await learner_ids(adult))[0]
    initial: dict[str, Any] = {"source": source, "reading_mode": "guided", "section_size": "short"}
    if source == "published":
        imported = sign_source(
            ReadingPassage(
                title="Synthetic source notes",
                text=MATERIAL,
                origin="published",
                author="Synthetic author",
                source_url=HttpUrl("https://www.nasa.gov/synthetic-not-fetched"),
                permission="Original synthetic fixture; no publisher content was fetched.",
            ),
            UUID(learner_id),
        )
        initial["source_token"] = imported.source_token
    response = await adult.post(
        "/api/v1/tutor/sessions",
        json={
            "learner_id": learner_id,
            "topic": "Work with synthetic observation notes",
            "learning_intent": intent,
            "initial_activity": initial,
        },
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 201, response.text
    session = response.json()
    if source == "reading_photo":
        link = await phone_link(adult, session["problems"][0])
        async with client(engine) as phone:
            uploaded = await phone.post(
                "/api/v1/phone-upload/photos",
                content=photo_bytes(),
                headers={
                    "X-Photo-Token": link["url"].split("#capture=")[1],
                    "Idempotency-Key": str(uuid4()),
                },
            )
        assert uploaded.status_code == 202
        assert worker.run_once(engine)
        assert requests[-1].purpose == "read"
    assert worker.run_once(engine)
    request = requests[-1]
    assert request.purpose == "generate"
    assert f"Learning intent: {intent}." in request.system_instruction
    assert "This is READING COMPREHENSION." not in request.system_instruction
    assert (
        "Its input method does not change the selected learning intent"
        in request.system_instruction
    )
    if source != "reading_generated":
        assert "CURRENT_SECTION" in str(request.ordered_messages)
        assert "FUTURE_SECTION_MARKER" not in str(request.ordered_messages)
    current = await latest(adult, session)
    assert current["activity_state"] == "ready" and current["passage"]
    assert (
        current["passage"]["origin"]
        == {"reading_photo": "photo", "reading_generated": "ai_written", "published": "published"}[
            source
        ]
    )


@pytest.mark.anyio
async def test_omitted_intent_and_retained_sessions_default_without_losing_settings(
    adult: AsyncClient, engine: Engine
) -> None:
    body = {"learner_id": (await learner_ids(adult))[0], "topic": "Synthetic default"}
    headers = {"Idempotency-Key": str(uuid4())}
    response = await adult.post(
        "/api/v1/tutor/sessions",
        json=body,
        headers=headers,
    )
    assert response.status_code == 201 and response.json()["learning_intent"] == "practice"
    session_id = response.json()["id"]
    repeated = await adult.post(
        "/api/v1/tutor/sessions", json={**body, "learning_intent": "practice"}, headers=headers
    )
    assert repeated.status_code == 201 and repeated.json()["id"] == session_id
    with Session(engine) as db:
        row = db.get(PracticeSession, UUID(session_id))
        assert row
        row.profile_settings = {"difficulty": "standard", "synthetic_setting": "preserve"}
        db.commit()
    detail = await adult.get(f"/api/v1/tutor/sessions/{session_id}")
    assert detail.json()["learning_intent"] == "practice"
    assert (await adult.get("/api/v1/tutor/sessions")).json()[0]["learning_intent"] == "practice"
    settings = await adult.post(
        f"/api/v1/tutor/sessions/{session_id}/settings",
        json={"initiative": "balanced", "difficulty": "challenge"},
    )
    assert settings.status_code == 200 and settings.json()["learning_intent"] == "practice"
    with Session(engine) as db:
        row = db.get(PracticeSession, UUID(session_id))
        assert row and row.profile_settings == {
            "difficulty": "challenge",
            "synthetic_setting": "preserve",
        }


@pytest.mark.anyio
async def test_homework_goal_rejects_repeating_assignment_from_study_material(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    reference = "Solve 3x + 4 = 19 and explain your steps."

    def repeat(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        assert "Learning intent: homework." in request.system_instruction
        return ModelResult(
            model_id=request.model_id,
            validated_payload=ActivityPayload(
                problem_text=reference,
                concept_focus="Equations",
                success_criteria=["Explain a valid first step."],
            ),
        )

    monkeypatch.setattr(worker, "complete", repeat)
    response = await adult.post(
        "/api/v1/tutor/sessions",
        json={
            "learner_id": (await learner_ids(adult))[0],
            "topic": "Help with the underlying concept",
            "learning_intent": "homework",
            "initial_activity": {"source": "reading_text", "reference_text": reference},
        },
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 201
    assert worker.run_once(engine)
    current = await latest(adult, response.json())
    assert current["operations"][-1]["status"] == "failed"
    assert "distinct practice" in current["operations"][-1]["safe_error"]
    assert current["activity_state"] == "generating"


@pytest.mark.anyio
async def test_learning_intent_keeps_validation_csrf_and_learner_ownership(
    adult: AsyncClient, engine: Engine
) -> None:
    first_id, second_id = await learner_ids(adult)
    body = {"learner_id": first_id, "topic": "Synthetic goal", "learning_intent": "write"}
    assert (
        await adult.post(
            "/api/v1/tutor/sessions",
            json={**body, "learning_intent": "solve"},
            headers={"Idempotency-Key": str(uuid4())},
        )
    ).status_code == 422
    assert (
        await adult.post(
            "/api/v1/tutor/sessions",
            json=body,
            headers={"Idempotency-Key": str(uuid4()), "X-CSRF-Token": "wrong"},
        )
    ).status_code == 403
    async with client(engine) as device:
        assert (await device.post("/api/v1/tutor/sessions", json=body)).status_code == 401
        await sign_in_learner(adult, device, first_id)
        assert (
            await device.post(
                "/api/v1/tutor/sessions",
                json={**body, "learner_id": second_id},
                headers={"Idempotency-Key": str(uuid4())},
            )
        ).status_code == 404
        response = await device.post(
            "/api/v1/tutor/sessions", json=body, headers={"Idempotency-Key": str(uuid4())}
        )
        assert response.status_code == 201 and response.json()["learning_intent"] == "write"
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(PracticeSession)) == 1
        assert db.scalar(select(func.count()).select_from(Job)) == 0
