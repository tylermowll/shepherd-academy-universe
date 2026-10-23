"""History lists remain small and owned even with substantial retained work."""

from datetime import datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx2 import AsyncClient
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import client, learner_ids, sign_in_learner
from test_workflows import engine as engine

from math_tutor.adapters.db.models import PracticeSession, ProblemInstance, Submission, TutorTurn
from math_tutor.adapters.db.types import utcnow


@pytest.mark.anyio
async def test_history_summaries_do_not_read_or_serialize_retained_work(
    adult: AsyncClient, engine: Engine
) -> None:
    owner = UUID((await learner_ids(adult))[0])
    passage = "Synthetic retained passage. " * 1700
    work = "Synthetic retained learner response. " * 200
    now = utcnow()
    with Session(engine) as db:
        for index in range(100):
            row = PracticeSession(
                learner_id=owner,
                mode="ai_tutor",
                topic=f"Synthetic history {index}",
                created_at=now + timedelta(seconds=index),
            )
            db.add(row)
            db.flush()
            problem = ProblemInstance(
                session_id=row.id,
                template_id="ai-activity-v1",
                template_version=1,
                skill_id="open.subject",
                seed=0,
                position=0,
                parameters={"activity_state": "ready"},
                problem_text="Discuss a synthetic passage.",
                expected_result={},
                passage={"title": "Synthetic material", "text": passage, "origin": "pasted"},
            )
            db.add(problem)
            db.flush()
            db.add(
                Submission(
                    learner_id=owner,
                    problem_id=problem.id,
                    request_key=str(uuid4()),
                    payload_hash="synthetic",
                    kind="answer",
                    text=work,
                    status="completed",
                )
            )
        selected_id = row.id
        db.commit()

    statements: list[str] = []

    def record_select(
        _connection: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(engine, "before_cursor_execute", record_select)
    try:
        response = await adult.get("/api/v1/tutor/sessions")
    finally:
        event.remove(engine, "before_cursor_execute", record_select)
    assert response.status_code == 200, response.text
    summaries = response.json()
    assert len(summaries) == 100
    assert summaries[0]["id"] == str(selected_id)
    assert all(item["activity_count"] == 1 for item in summaries)
    assert all(
        set(item)
        == {
            "id",
            "learner_id",
            "status",
            "topic",
            "initiative",
            "difficulty",
            "activity_count",
            "created_at",
        }
        for item in summaries
    )
    assert len(response.content) < 32768
    assert passage not in response.text and work not in response.text
    # One grouped projection, regardless of activity/message count. Authentication
    # still performs its usual independent account/session queries.
    assert sum("FROM practice_session" in statement for statement in statements) == 1
    assert not any("FROM submission" in statement for statement in statements)
    assert not any("FROM tutor_turn" in statement for statement in statements)
    assert not any("FROM interpretation" in statement for statement in statements)

    detail = await adult.get(f"/api/v1/tutor/sessions/{selected_id}")
    assert detail.status_code == 200
    assert detail.json()["created_at"] == summaries[0]["created_at"]
    assert datetime.fromisoformat(summaries[0]["created_at"]) == now + timedelta(seconds=99)
    assert detail.json()["problems"][0]["passage"]["text"] == passage
    assert detail.json()["problems"][0]["operations"][0]["text"] == work


@pytest.mark.anyio
async def test_owned_response_metadata_exposes_version_without_private_provider_data(
    adult: AsyncClient, engine: Engine
) -> None:
    owner, outsider = (UUID(value) for value in (await learner_ids(adult))[:2])
    created = await adult.post(
        "/api/v1/tutor/sessions",
        json={"learner_id": str(owner), "topic": "Synthetic response provenance"},
        headers={"Idempotency-Key": str(uuid4())},
    )
    assert created.status_code == 201, created.text
    session_id = created.json()["id"]
    with Session(engine) as db:
        problem = ProblemInstance(
            session_id=UUID(session_id),
            template_id="ai-activity-v1",
            template_version=1,
            skill_id="open.subject",
            seed=0,
            position=0,
            parameters={"activity_state": "ready"},
            problem_text="Describe synthetic observations.",
            expected_result={"private": "synthetic hidden answer"},
        )
        db.add(problem)
        db.flush()
        submission = Submission(
            learner_id=owner,
            problem_id=problem.id,
            request_key=str(uuid4()),
            payload_hash="synthetic",
            kind="answer",
            text="Synthetic work",
            status="completed",
        )
        db.add(submission)
        db.flush()
        db.add(
            TutorTurn(
                submission_id=submission.id,
                message="Synthetic guidance",
                source="model",
                prompt_version="synthetic-review-v1",
                assistance_level=2,
            )
        )
        db.commit()
    async with client(engine) as learner, client(engine) as other:
        await sign_in_learner(adult, learner, str(owner))
        await sign_in_learner(adult, other, str(outsider))
        detail = await learner.get(f"/api/v1/tutor/sessions/{session_id}")
        forbidden = await other.get(f"/api/v1/tutor/sessions/{session_id}")
    assert detail.status_code == 200
    operation = detail.json()["problems"][0]["operations"][0]
    assert operation["prompt_version"] == "synthetic-review-v1"
    assert operation["assistance_level"] == 2
    assert "synthetic hidden answer" not in detail.text
    assert "expected_result" not in detail.text
    assert forbidden.status_code == 404
    assert "synthetic-review-v1" not in forbidden.text


@pytest.mark.anyio
async def test_history_limit_applies_after_ownership_and_keeps_empty_sessions(
    adult: AsyncClient, engine: Engine
) -> None:
    owner, outsider = (UUID(value) for value in (await learner_ids(adult))[:2])
    now = utcnow()
    with Session(engine) as db:
        for index in range(101):
            db.add(
                PracticeSession(
                    learner_id=owner,
                    mode="ai_tutor",
                    topic=f"Owned {index}",
                    created_at=now + timedelta(seconds=index),
                )
            )
        db.add(
            PracticeSession(
                learner_id=outsider,
                mode="ai_tutor",
                topic="Another learner's newest private session",
                created_at=now + timedelta(days=1),
            )
        )
        db.add(
            PracticeSession(
                learner_id=owner,
                mode="built_in",
                topic="Historical exact practice",
                created_at=now + timedelta(days=1),
            )
        )
        db.commit()

    async with client(engine) as learner, client(engine) as anonymous:
        assert (await anonymous.get("/api/v1/tutor/sessions")).status_code == 401
        await sign_in_learner(adult, learner, str(owner))
        response = await learner.get("/api/v1/tutor/sessions")
    assert response.status_code == 200, response.text
    summaries = response.json()
    assert len(summaries) == 100
    assert [item["topic"] for item in summaries] == [
        f"Owned {index}" for index in range(100, 0, -1)
    ]
    assert all(item["learner_id"] == str(owner) for item in summaries)
    assert all(item["activity_count"] == 0 for item in summaries)
