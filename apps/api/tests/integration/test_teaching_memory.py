"""Cross-subject conversation contracts on real temporary SQLite databases."""

import json
from typing import Any, Literal
from uuid import UUID, uuid4

import pytest
from httpx2 import AsyncClient
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_tutoring import activity, latest, tutor_session
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import engine as engine
from test_workflows import learner_ids

from math_tutor import worker
from math_tutor.adapters.db.models import PracticeSession, ProblemInstance, Submission, TutorTurn
from math_tutor.adapters.providers.config import ProviderConfig
from math_tutor.adapters.providers.contracts import (
    ActivityPayload,
    FeedbackPayload,
    LearningObservation,
    ModelRequest,
    ModelResult,
)
from math_tutor.reading import SECTION_LENGTHS, OriginalPassage, SectionSize
from math_tutor.tutoring import learning_memory


@pytest.mark.anyio
@pytest.mark.parametrize(
    "topic,goal,task,criterion,work,revision,explanation",
    [
        (
            "Mathematics: equivalent fractions",
            "Explain equivalent fractions",
            "Use a drawing to explain why two equivalent fractions represent the same amount.",
            "Use one drawing to connect equal amounts to differently sized parts.",
            "The denominators change so the amounts change.",
            "The same whole is split into smaller pieces, but the covered amount stays equal.",
            "Explain why the size of the whole matters.",
        ),
        (
            "Science: investigations",
            "Connect evidence to a fair comparison",
            "Describe one measurement that would compare two plants grown with different light.",
            "Name one measurement and explain how it supports the comparison.",
            "One plant looks nicer.",
            "Measure growth over a week to compare change under different light.",
            "Explain why keeping water equal matters.",
        ),
        (
            "Writing: argument",
            "Support a claim with evidence",
            "Explain how one detail could support a claim about making a school garden.",
            "Connect one relevant detail to the claim.",
            "A garden would be nice.",
            "A garden lets students observe plant growth during science lessons.",
            "Explain how evidence differs from an opinion.",
        ),
        (
            "History: sources",
            "Distinguish observation from interpretation",
            "Explain one reason a diary can reveal a perspective without describing every event.",
            "Connect one limitation of the source to the writer's perspective.",
            "A diary contains everything that happened.",
            "The writer records what they noticed, so events outside their experience may be absent.",
            "Explain how comparing sources helps.",
        ),
    ],
)
async def test_revision_sufficiency_and_explanation_keep_evidence_without_changing_grades(
    adult: AsyncClient,
    engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
    topic: str,
    goal: str,
    task: str,
    criterion: str,
    work: str,
    revision: str,
    explanation: str,
) -> None:
    requests: list[ModelRequest] = []
    review_count = 0

    def respond(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        nonlocal review_count
        requests.append(request)
        if request.purpose == "generate":
            payload: ActivityPayload | FeedbackPayload = ActivityPayload(
                problem_text=task, concept_focus=goal, success_criteria=[criterion]
            )
        else:
            review_count += 1
            assessment: Literal["developing", "sufficient", "not_assessed"] = (
                "developing"
                if review_count == 1
                else "sufficient"
                if review_count == 2
                else "not_assessed"
            )
            payload = FeedbackPayload(
                teaching_action="coach"
                if review_count == 1
                else "acknowledge"
                if review_count == 2
                else "explain",
                learning_observation=LearningObservation(
                    assessment=assessment,
                    evidence=work
                    if review_count == 1
                    else revision
                    if review_count == 2
                    else "The learner requested an explanation.",
                    resolved_points=[goal] if review_count == 2 else [],
                    open_points=["Initial connection is missing"] if review_count == 1 else [],
                ),
                strengths=[],
                guidance=[
                    "Synthetic focused coaching."
                    if review_count == 1
                    else "Your revision answers the question; you may continue."
                    if review_count == 2
                    else "Synthetic focused explanation."
                ],
                next_step="Explain the connection." if review_count == 1 else "",
                concepts=[],
            )
        return ModelResult(model_id=request.model_id, validated_payload=payload)

    monkeypatch.setattr(worker, "complete", respond)
    initiative: Literal["balanced", "tutor_led", "learner_led"] = (
        "tutor_led"
        if topic.startswith("Science")
        else "learner_led"
        if topic.startswith("History")
        else "balanced"
    )
    session = await tutor_session(adult, topic, initiative=initiative)
    await activity(adult, session)
    assert worker.run_once(engine)
    initial = await latest(adult, session)
    assert initial["learning_goal"] == goal and initial["success_criteria"] == [criterion]
    for text in (work, revision, explanation):
        current = await latest(adult, session)
        response = await adult.post(
            f"/api/v1/problems/{current['id']}/submissions",
            json={
                "version": current["version"],
                "kind": "question" if text == explanation else "answer",
                "text": text,
            },
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert response.status_code == 202, response.text
        assert worker.run_once(engine)
        result = await latest(adult, session)
        assert result["status"] == "assigned" and result["operations"][-1]["verdict"] is None
        assert "evidence_link" not in result["operations"][-1]["feedback"]
    revised = result["operations"][-2]
    assert revised["feedback"]["teaching_action"] == "acknowledge"
    assert revised["feedback"]["next_step"] == ""
    assert "Sufficient-response criteria" in requests[-1].ordered_messages[-1].content
    assert criterion in requests[-1].ordered_messages[-1].content
    with Session(engine) as db:
        first_turn = db.scalar(
            select(TutorTurn).where(TutorTurn.submission_id == UUID(result["operations"][1]["id"]))
        )
        assert first_turn and first_turn.feedback
        assert first_turn.feedback["evidence_link"]["support"] == "independent"
        saved = db.scalar(select(TutorTurn).where(TutorTurn.submission_id == UUID(revised["id"])))
        assert saved and saved.feedback
        assert saved.feedback["evidence_link"] == {
            "activity_id": initial["id"],
            "submission_id": revised["id"],
            "support": "assisted",
            "basis": "current_work",
            "source_id": None,
            "source_title": None,
        }
        practice = db.get(PracticeSession, UUID(session["id"]))
        problem = db.get(ProblemInstance, UUID(initial["id"]))
        assert practice and problem
        memory = learning_memory(db, practice, problem)
        assert revision in memory and "Initial connection is missing" not in memory
        assert json.loads(memory)[0]["observation"]["assessment"] == "sufficient"
    await activity(adult, session)
    assert worker.run_once(engine)
    assert revision in "\n".join(message.content for message in requests[-1].ordered_messages)
    assert "avoid repeating questions" in requests[-1].system_instruction


@pytest.mark.anyio
@pytest.mark.parametrize("size", ["short", "standard", "long"])
@pytest.mark.parametrize("over_limit", [False, True])
async def test_original_guided_passage_and_question_must_fit_the_visible_section(
    adult: AsyncClient,
    engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
    size: SectionSize,
    over_limit: bool,
) -> None:
    requests: list[ModelRequest] = []
    limit = SECTION_LENGTHS[size]

    def respond(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        return ModelResult(
            model_id=request.model_id,
            validated_payload=ActivityPayload(
                problem_text="Explain what the observed change suggests about the plant.",
                concept_focus="Connect observations to explanations",
                success_criteria=["Connect one observation to a possible explanation."],
                passage=OriginalPassage(
                    title="Synthetic original", text="x" * (limit + int(over_limit))
                ),
            ),
        )

    monkeypatch.setattr(worker, "complete", respond)
    session = await tutor_session(adult)
    await activity(
        adult, session, source="reading_generated", reading_mode="guided", section_size=size
    )
    assert worker.run_once(engine)
    result = await latest(adult, session)
    assert (
        requests[0].response_schema["$defs"]["OriginalPassage"]["properties"]["text"]["maxLength"]
        == limit
    )
    if over_limit:
        assert result["passage"] is None and result["activity_state"] == "generating"
        assert result["operations"][-1]["error_code"] == "passage_too_long"
    else:
        assert result["activity_state"] == "ready"
        assert result["material_focus"]["section_count"] == 1
        assert result["material_focus"]["text"] == result["passage"]["text"]


@pytest.mark.anyio
async def test_memory_survives_discussion_window_and_rejects_wrong_owner_or_forged_links(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    from test_tutoring import install_tutor

    from math_tutor.tutoring import discussion

    install_tutor(monkeypatch)
    session = await tutor_session(adult)
    await activity(adult, session)
    assert worker.run_once(engine)
    ready = await latest(adult, session)
    with Session(engine) as db:
        practice = db.get(PracticeSession, UUID(session["id"]))
        problem = db.get(ProblemInstance, UUID(ready["id"]))
        assert practice and problem
        other_id = (await learner_ids(adult))[1]
        for index in range(16):
            row = Submission(
                learner_id=UUID(other_id) if index == 15 else practice.learner_id,
                problem_id=problem.id,
                request_key=str(uuid4()),
                payload_hash="a" * 64,
                kind="question",
                text=f"Synthetic discussion {index}",
                status="completed",
            )
            db.add(row)
            db.flush()
            assessment = "sufficient" if index in (0, 14, 15) else "not_assessed"
            feedback: dict[str, Any] = {
                "teaching_action": "acknowledge" if assessment == "sufficient" else "explain",
                "learning_observation": {
                    "assessment": assessment,
                    "evidence": "Older resolved evidence"
                    if index == 0
                    else "Must not replace evidence",
                    "resolved_points": ["Evidence connection"] if index == 0 else [],
                    "open_points": [],
                },
                "evidence_link": {
                    "activity_id": str(problem.id),
                    "submission_id": str(uuid4()) if index == 14 else str(row.id),
                    "support": "independent",
                },
            }
            db.add(
                TutorTurn(
                    submission_id=row.id,
                    message="Synthetic reply",
                    source="synthetic",
                    assistance_level=1,
                    prompt_version="guidance-v4",
                    feedback=feedback,
                )
            )
        db.flush()
        stale = Submission(
            learner_id=practice.learner_id,
            problem_id=problem.id,
            request_key=str(uuid4()),
            payload_hash="b" * 64,
            kind="question",
            text="Was that enough?",
            status="completed",
        )
        db.add(stale)
        db.flush()
        db.add(
            TutorTurn(
                submission_id=stale.id,
                message="Historical reassurance remains visible.",
                source="synthetic",
                assistance_level=1,
                prompt_version="guidance-v3",
                feedback={
                    "teaching_action": "acknowledge",
                    "learning_observation": {
                        "assessment": "sufficient",
                        "evidence": "STALE_MISATTRIBUTED_EVIDENCE",
                        "resolved_points": ["Incorrectly attributed new demonstration"],
                        "open_points": [],
                    },
                    "evidence_link": {
                        "activity_id": str(problem.id),
                        "submission_id": str(stale.id),
                        "support": "independent",
                    },
                },
            )
        )
        db.flush()
        current = Submission(id=uuid4(), learner_id=practice.learner_id, problem_id=problem.id)
        assert "Older resolved evidence" in learning_memory(db, practice, problem)
        assert "Must not replace evidence" not in learning_memory(db, practice, problem)
        assert "STALE_MISATTRIBUTED_EVIDENCE" not in learning_memory(db, practice, problem)
        historical = db.scalar(select(TutorTurn).where(TutorTurn.submission_id == stale.id))
        assert historical and historical.feedback
        assert (
            historical.feedback["learning_observation"]["evidence"]
            == "STALE_MISATTRIBUTED_EVIDENCE"
        )
        assert "Synthetic discussion 0\n" not in "\n".join(
            item.content for item in discussion(db, problem, current)
        )


@pytest.mark.anyio
async def test_reassurance_preserves_real_evidence_and_new_whole_source_does_not_inherit_old_facts(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    from math_tutor.reading import source_identity

    requests: list[ModelRequest] = []

    def respond(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        if request.purpose == "generate":
            payload: ActivityPayload | FeedbackPayload = ActivityPayload(
                problem_text="What decision does Nia make about her boat?",
                concept_focus="Describe a decision",
                success_criteria=["Describe the stated decision."],
            )
        else:
            payload = FeedbackPayload(
                teaching_action="acknowledge",
                learning_observation=LearningObservation(
                    assessment="sufficient",
                    evidence="The learner described Nia selling the boat.",
                    resolved_points=["Nia sold the boat"],
                    open_points=[],
                ),
                strengths=[],
                guidance=["Your previous answer describes the decision. You may continue."],
                next_step="",
                concepts=[],
            )
        return ModelResult(model_id=request.model_id, validated_payload=payload)

    monkeypatch.setattr(worker, "complete", respond)
    session = await tutor_session(adult, "Reading decisions")
    await activity(
        adult,
        session,
        source="reading_text",
        reading_mode="whole",
        reference_text="Nia sold her boat to pay for repairs.",
        passage_title="Nia",
    )
    assert worker.run_once(engine)
    initial = await latest(adult, session)
    for kind, text in [
        ("answer", "She sold her boat."),
        ("question", "Was that enough, or do I need to draw a diagram too?"),
    ]:
        current = await latest(adult, session)
        response = await adult.post(
            f"/api/v1/problems/{current['id']}/submissions",
            json={"version": current["version"], "kind": kind, "text": text},
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert response.status_code == 202
        assert worker.run_once(engine)
    finished = await latest(adult, session)
    answer, reassurance = finished["operations"][-2:]
    assert reassurance["feedback"]["learning_observation"]["assessment"] == "not_assessed"
    assert reassurance["verdict"] is None and "evidence_link" not in reassurance["feedback"]
    with Session(engine) as db:
        practice = db.get(PracticeSession, UUID(session["id"]))
        problem = db.get(ProblemInstance, UUID(initial["id"]))
        saved = db.scalar(
            select(TutorTurn).where(TutorTurn.submission_id == UUID(reassurance["id"]))
        )
        assert practice and problem and saved and saved.feedback
        link = saved.feedback["evidence_link"]
        assert link["basis"] == "prior_work" and link["support"] == "not_assessed"
        assert link["prior_submission_id"] == answer["id"]
        assert link["source_id"] == source_identity(problem.passage)["source_id"]
        memory = json.loads(learning_memory(db, practice, problem))
        assert len(memory) == 1 and memory[0]["evidence_link"]["submission_id"] == answer["id"]
        assert saved.feedback["provider_learning_observation"]["assessment"] == "sufficient"
    await activity(
        adult,
        session,
        source="reading_text",
        reading_mode="whole",
        reference_text="Nia kept her boat and cancelled the repairs.",
        passage_title="Nia",
    )
    assert worker.run_once(engine)
    context = "\n".join(message.content for message in requests[-1].ordered_messages)
    assert "Nia kept her boat" in context
    assert "Nia sold" not in context and "She sold" not in context
