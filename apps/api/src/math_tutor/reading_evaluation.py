"""Reading rehearsal through production prompts; mocks measure contracts only."""

import argparse
import hashlib
import json
import math
import platform
import statistics
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Literal
from uuid import uuid4

from alembic import command
from alembic.config import Config
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from math_tutor.adapters.db.engine import create_engine_for_url
from math_tutor.adapters.db.models import Job, Learner, PracticeSession, ProblemInstance, Submission
from math_tutor.adapters.providers.config import Configuration, ProviderConfig
from math_tutor.adapters.providers.contracts import ProviderError
from math_tutor.providers import complete
from math_tutor.reading import ReadingPassage
from math_tutor.tutoring import finish_model, make_request


class ReadingCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    skill: Literal["literal", "inference", "main_idea", "vocabulary", "evidence", "source_boundary"]
    response_kind: Literal["correct", "mistaken", "partial", "alternative", "adversarial"]
    passage: ReadingPassage
    question: str
    response: str
    follow_up: str
    review_notes: list[str] = Field(min_length=1)


class ReadingSuite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    suite: Literal["original-reading-v1"]
    provenance: str
    authored_at: str
    cases: list[ReadingCase] = Field(min_length=1, max_length=30)


def attempt(
    db: Session, lesson: PracticeSession, problem: ProblemInstance, text: str
) -> tuple[Submission, Job]:
    row = Submission(
        learner_id=lesson.learner_id,
        problem_id=problem.id,
        request_key=str(uuid4()),
        payload_hash="synthetic",
        kind="answer",
        text=text,
        work_text="",
        status="tutoring",
        assignment_version=problem.version,
    )
    db.add(row)
    db.flush()
    job = Job(submission_id=row.id, state="running", stage="tutoring")
    db.add(job)
    db.flush()
    return row, job


def problem_for(
    lesson: PracticeSession, case: ReadingCase, *, next_question: bool
) -> ProblemInstance:
    return ProblemInstance(
        session_id=lesson.id,
        template_id="ai_generated",
        template_version=1,
        skill_id="tutor.generated",
        seed=0,
        position=int(next_question),
        parameters={
            "activity_state": "generating" if next_question else "ready",
            "reading_mode": True,
        },
        passage=case.passage.model_dump(mode="json"),
        problem_text="Preparing a new reading question." if next_question else case.question,
        expected_result={},
        format_constraints={},
        status="assigned",
        version=1,
    )


def run(
    fixtures: Path, provider: ProviderConfig | None = None, *, max_calls: int | None = None
) -> dict[str, Any]:
    content = fixtures.read_bytes()
    suite = ReadingSuite.model_validate_json(content)
    chosen = provider or Configuration().providers["demo"]
    limit = max_calls if max_calls is not None else len(suite.cases) * 3
    if limit < 3 or limit % 3:
        raise ValueError("Use a whole-case budget: three calls per case.")
    outputs: list[dict[str, Any]] = []
    latencies: list[int] = []
    usage: dict[str, int] = {}
    with TemporaryDirectory(prefix="shepherd-reading-eval-") as temporary:
        database_url = f"sqlite+pysqlite:///{Path(temporary) / 'synthetic.sqlite3'}"
        migration = Config()
        migration.set_main_option(
            "script_location", str(Path(__file__).resolve().parents[2] / "migrations")
        )
        migration.set_main_option("sqlalchemy.url", database_url)
        command.upgrade(migration, "head")
        engine = create_engine_for_url(database_url)
        try:
            with Session(engine) as db:
                for case in suite.cases[: limit // 3]:
                    learner = Learner(alias=f"Synthetic evaluation {uuid4()}", eligibility="adult")
                    db.add(learner)
                    db.flush()
                    lesson = PracticeSession(
                        learner_id=learner.id,
                        mode="ai_tutor",
                        topic=f"Reading comprehension: {case.skill}",
                        initiative="balanced",
                        profile_settings={"difficulty": "standard"},
                    )
                    db.add(lesson)
                    db.flush()
                    problem = problem_for(lesson, case, next_question=False)
                    db.add(problem)
                    db.commit()
                    stages: list[dict[str, Any]] = []
                    for stage, text in [
                        ("feedback", case.response),
                        ("follow_up", case.follow_up),
                        ("next_question", ""),
                    ]:
                        if stage == "next_question":
                            problem = problem_for(lesson, case, next_question=True)
                            db.add(problem)
                            db.flush()
                        row, job = attempt(db, lesson, problem, text)
                        db.commit()
                        entry: dict[str, Any] = {"stage": stage, "contracts_passed": False}
                        try:
                            request = make_request(db, job, row, problem, lesson, chosen, None)
                            # Network work begins after the read transaction is released.
                            db.commit()
                            result = complete(chosen, request)
                            finish_model(db, job, row, problem, result, chosen.adapter)
                            db.commit()
                            entry.update(
                                contracts_passed=True, result=result.model_dump(mode="json")
                            )
                            latencies.append(result.latency_ms)
                            for name, count in result.reported_usage.items():
                                usage[name] = usage.get(name, 0) + count
                        except ProviderError as error:
                            db.rollback()
                            row.status, job.state = "failed", "failed"
                            row.safe_error = error.safe_message[:256]
                            db.commit()
                            entry.update(error_code=error.code, safe_error=error.safe_message)
                        stages.append(entry)
                    outputs.append(
                        {
                            "fixture_id": case.id,
                            "skill": case.skill,
                            "response_kind": case.response_kind,
                            "review_notes": case.review_notes,
                            "stages": stages,
                            "human_review": {
                                name: "pending"
                                for name in [
                                    "false_correction",
                                    "unsupported_claim",
                                    "answer_leakage",
                                    "follow_up_context",
                                    "next_question_relevance",
                                ]
                            },
                        }
                    )
        finally:
            engine.dispose()
    ordered = sorted(latencies)
    return {
        "suite": suite.suite,
        "provenance": suite.provenance,
        "authored_at": suite.authored_at,
        "fixture_sha256": hashlib.sha256(content).hexdigest(),
        "recorded_at": datetime.now(UTC).isoformat(),
        "python": platform.python_version(),
        "provider_adapter": chosen.adapter,
        "model": chosen.model,
        "provider_settings": chosen.model_dump(mode="json", exclude={"base_url", "api_key_env"}),
        "prompt_versions": ["guidance-v2", "activity-v2"],
        "total_cases": len(suite.cases),
        "sample_size": len(outputs),
        "call_budget": limit,
        "calls_attempted": sum(len(item["stages"]) for item in outputs),
        "reported_token_usage": usage,
        "latency_ms": {
            "p50": statistics.median(ordered) if ordered else None,
            "p95": ordered[math.ceil(len(ordered) * 0.95) - 1] if ordered else None,
        },
        "cost_estimate": "Unavailable; consult configured provider billing.",
        "contracts_passed": all(
            stage["contracts_passed"] for item in outputs for stage in item["stages"]
        ),
        "model_quality": "Not measured by mocks; human review required for live responses.",
        "photo_quality": "Not measured here; use the physical photo rehearsal.",
        "outputs": outputs,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--live-provider")
    parser.add_argument("--authorize-synthetic-calls", action="store_true")
    parser.add_argument("--max-calls", type=int, default=3)
    args = parser.parse_args()
    provider = None
    if args.live_provider:
        if (
            not args.authorize_synthetic_calls
            or not 3 <= args.max_calls <= 90
            or args.max_calls % 3
        ):
            raise SystemExit(
                "Live reading evaluation requires explicit authorization and a 3–90 call budget divisible by three."
            )
        from math_tutor.adapters.providers.config import Routes, load_configuration, route

        config = load_configuration()
        _, provider = route(
            config.model_copy(update={"routes": Routes(tutor=args.live_provider)}), "tutor", "adult"
        )
    report = run(args.fixtures, provider, max_calls=args.max_calls if provider else None)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    if not report["contracts_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
