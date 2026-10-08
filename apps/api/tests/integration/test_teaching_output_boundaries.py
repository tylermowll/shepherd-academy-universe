"""Rejected tutor output preserves work; whole sources reach honest context checks."""

import json
from typing import Any
from uuid import uuid4

import pytest
from httpx2 import AsyncClient
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_tutoring import activity, install_tutor, latest, tutor_session
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import engine as engine

from math_tutor import worker
from math_tutor.adapters.db.models import (
    Job,
    Learner,
    PracticeSession,
    ProblemInstance,
    Submission,
    TutorTurn,
)
from math_tutor.adapters.providers.config import ProviderConfig
from math_tutor.adapters.providers.contracts import (
    Capabilities,
    FeedbackPayload,
    LearningObservation,
    ModelRequest,
    ModelResult,
    ProviderError,
)
from math_tutor.adapters.providers.transports import check_request, validate_payload
from math_tutor.reading import ReadingPassage
from math_tutor.tutoring import finish_model, make_request


@pytest.mark.anyio
@pytest.mark.parametrize(
    "criterion,error",
    [
        ("Describe one step used to solve the equation.", "reference_repeated"),
        (
            "State x = 5, then explain how subtracting 4 and dividing by 3 gives that result.",
            "malformed_output",
        ),
    ],
)
async def test_rephrased_homework_or_answer_criterion_fails_without_accepting_original_task(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, criterion: str, error: str
) -> None:
    reference = "Solve 3x + 4 = 19 and explain your steps."
    session = await tutor_session(adult, "Algebra")
    await activity(adult, session, source="reference_text", reference_text=reference)

    def hostile(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        return ModelResult(
            model_id=request.model_id,
            validated_payload=validate_payload(
                request,
                json.dumps(
                    {
                        "problem_text": "For this practice, solve the equation 3x + 4 = 19, explaining your steps.",
                        "concept_focus": "Equations",
                        "success_criteria": [criterion],
                    }
                ),
            ),
        )

    monkeypatch.setattr(worker, "complete", hostile)
    assert worker.run_once(engine)
    result = await latest(adult, session)
    assert result["activity_state"] == "generating"
    assert result["success_criteria"] == []
    assert result["operations"][-1]["status"] == "failed"
    assert result["operations"][-1]["error_code"] == error
    assert "x = 5" not in result["problem_text"]


@pytest.mark.anyio
async def test_sufficient_feedback_with_compulsory_extra_work_is_rejected_and_submission_survives(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    install_tutor(monkeypatch)
    session = await tutor_session(adult)
    await activity(adult, session)
    assert worker.run_once(engine)
    initial = await latest(adult, session)
    text = "Record height each day and compare growth over the same week."
    response = await adult.post(
        f"/api/v1/problems/{initial['id']}/submissions",
        json={"version": initial["version"], "text": text},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert response.status_code == 202

    def hostile(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        return ModelResult(
            model_id=request.model_id,
            validated_payload=validate_payload(
                request,
                json.dumps(
                    {
                        "teaching_action": "acknowledge",
                        "learning_observation": {
                            "assessment": "sufficient",
                            "evidence": "Names an observation and its comparison.",
                            "resolved_points": ["Connects evidence"],
                            "open_points": [],
                        },
                        "strengths": [],
                        "guidance": [
                            "Before you may continue, draw a diagram and provide two more examples."
                        ],
                        "next_step": "",
                        "concepts": [],
                    }
                ),
            ),
        )

    monkeypatch.setattr(worker, "complete", hostile)
    assert worker.run_once(engine)
    result = await latest(adult, session)
    saved = result["operations"][-1]
    assert saved["status"] == "failed" and saved["error_code"] == "malformed_output"
    assert saved["text"] == text and saved["feedback"] is None and saved["verdict"] is None
    assert result["status"] == "assigned"


@pytest.mark.anyio
@pytest.mark.parametrize(
    "reference,task",
    [
        (
            "Use F = m * a to find the force when mass is 2 kg and acceleration is 3 m/s².",
            "A 4 kg cart accelerates at 2 m/s². Use F = m * a to calculate the force.",
        ),
        (
            "Use E = 0.5 * m * v^2 for a mass of 2 kg moving at 3 m/s.",
            "A 4 kg cart moves at 2 m/s. Use E = 0.5 * m * v^2 to calculate its energy.",
        ),
        (
            "Use g = 9.8 m/s² to find the speed after falling for 2 seconds.",
            "A stone falls for 5 seconds. Use g = 9.8 m/s² to calculate its speed.",
        ),
        (
            "Use R = 8.31 to find the gas pressure for 2 moles at 300 K in 1 cubic metre.",
            "A vessel holds 4 moles at 280 K in 2 cubic metres. Use R = 8.31 to calculate pressure.",
        ),
    ],
)
async def test_distinct_force_example_can_reuse_the_reference_formula(
    adult: AsyncClient, engine: Engine, monkeypatch: pytest.MonkeyPatch, reference: str, task: str
) -> None:
    session = await tutor_session(adult, "Science: apply a supplied relationship")
    await activity(adult, session, source="reference_text", reference_text=reference)

    def distinct(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        return ModelResult(
            model_id=request.model_id,
            validated_payload=validate_payload(
                request,
                json.dumps(
                    {
                        "problem_text": task,
                        "concept_focus": "Apply the supplied relationship",
                        "success_criteria": [
                            "Choose the given quantities and apply the relationship to this cart."
                        ],
                    }
                ),
            ),
        )

    monkeypatch.setattr(worker, "complete", distinct)
    assert worker.run_once(engine)
    result = await latest(adult, session)
    assert result["activity_state"] == "ready" and result["problem_text"] == task
    assert result["operations"][-1]["status"] == "completed"


@pytest.mark.parametrize("text", ["a" * 50000, "科" * 50000, "🌱" * 50000, "\u0001" * 50000])
@pytest.mark.parametrize("review", [False, True])
def test_complete_whole_sources_use_configured_context_instead_of_an_arbitrary_message_ceiling(
    engine: Engine, text: str, review: bool
) -> None:
    with Session(engine) as db:
        learner = db.scalar(select(Learner))
        assert learner
        lesson = PracticeSession(
            learner_id=learner.id,
            mode="ai_tutor",
            topic="Study supplied material",
            initiative="balanced",
            profile_settings={"difficulty": "standard"},
        )
        db.add(lesson)
        db.flush()
        source = ReadingPassage(title="Original synthetic long source", origin="pasted", text=text)
        parameters: dict[str, Any] = {
            "activity_state": "ready" if review else "generating",
            "reading_mode": True,
            "material_mode": "whole",
            "success_criteria": ["Connect a detail to its meaning."],
        }
        problem = ProblemInstance(
            session_id=lesson.id,
            template_id="ai_generated",
            template_version=1,
            skill_id="tutor.generated",
            seed=0,
            position=0,
            parameters=parameters,
            passage=source.model_dump(mode="json"),
            problem_text="What does one selected detail suggest?",
            expected_result={},
            format_constraints={},
            status="assigned",
            version=1,
        )
        db.add(problem)
        db.flush()
        row = Submission(
            learner_id=learner.id,
            problem_id=problem.id,
            request_key=str(uuid4()),
            payload_hash="synthetic",
            kind="answer",
            text="A synthetic response.",
            work_text="",
            status="tutoring",
        )
        db.add(row)
        db.flush()
        job = Job(submission_id=row.id, stage="tutoring", state="running")
        db.add(job)
        db.flush()
        provider = ProviderConfig(
            adapter="mock",
            model="synthetic",
            enabled=True,
            data_boundary="synthetic",
            capabilities=Capabilities(configured_context_limit=1000000),
        )
        request = make_request(db, job, row, problem, lesson, provider, None)
        check_request(provider, request)
        content = request.ordered_messages[-1].content
        source_json = content[content.index("\n{") + 1 : content.index("\nEND READING PASSAGE")]
        assert json.loads(source_json)["text"] == text
        smaller = provider.model_copy(
            update={"capabilities": Capabilities(configured_context_limit=32768)}
        )
        with pytest.raises(ProviderError, match="context_limit"):
            make_request(db, job, row, problem, lesson, smaller, None)
        assert problem.passage and problem.passage["text"] == text


def test_explicit_help_remains_assisted_after_more_than_the_conversation_window(
    engine: Engine,
) -> None:
    with Session(engine) as db:
        learner = db.scalar(select(Learner))
        assert learner
        lesson = PracticeSession(
            learner_id=learner.id, mode="ai_tutor", topic="Writing", initiative="balanced"
        )
        db.add(lesson)
        db.flush()
        problem = ProblemInstance(
            session_id=lesson.id,
            template_id="ai_generated",
            template_version=1,
            skill_id="tutor.generated",
            seed=0,
            position=0,
            parameters={"activity_state": "ready"},
            problem_text="Connect one detail to a claim.",
            expected_result={},
            format_constraints={},
            status="assigned",
            version=1,
        )
        db.add(problem)
        db.flush()
        for index in range(83):
            row = Submission(
                learner_id=learner.id,
                problem_id=problem.id,
                request_key=str(uuid4()),
                payload_hash="synthetic",
                kind="hint" if index == 0 else "answer",
                text="Synthetic work.",
                work_text="",
                help_level=1 if index == 0 else 0,
                status="tutoring",
            )
            db.add(row)
            db.flush()
            job = Job(submission_id=row.id, state="running", stage="tutoring")
            db.add(job)
            db.flush()
            payload = FeedbackPayload(
                teaching_action="acknowledge",
                learning_observation=LearningObservation(
                    assessment="not_assessed" if index < 82 else "sufficient",
                    evidence="Synthetic conversation evidence.",
                    resolved_points=[],
                    open_points=[],
                ),
                strengths=[],
                guidance=["Synthetic response."],
                next_step="",
                concepts=[],
            )
            finish_model(
                db,
                job,
                row,
                problem,
                ModelResult(model_id="synthetic", validated_payload=payload),
                "synthetic",
            )
            db.flush()
        db.commit()
        saved = db.scalar(select(TutorTurn).where(TutorTurn.submission_id == row.id))
        assert saved and saved.feedback
        assert saved.feedback["evidence_link"]["support"] == "assisted"
        assert saved.feedback["evidence_link"]["basis"] == "current_work"
