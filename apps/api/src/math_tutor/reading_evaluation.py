"""Reading and cross-subject rehearsals; mocks measure contracts, not learning."""

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
from pydantic import BaseModel, ConfigDict, Field, model_validator
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
    subject: str = Field(default="Reading comprehension", min_length=1, max_length=100)
    skill: str = Field(min_length=1, max_length=100)
    response_kind: Literal["correct", "mistaken", "partial", "alternative", "adversarial"]
    passage: ReadingPassage | None = None
    success_criteria: list[str] = Field(default_factory=list, max_length=3)
    question: str
    response: str
    follow_up: str
    review_notes: list[str] = Field(min_length=1)


class ReadingSuite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    suite: Literal["original-reading-v1", "published-reading-v1", "cross-subject-teaching-v1"]
    provenance: str
    authored_at: str
    cases: list[ReadingCase] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def explicit_cross_subject_criteria(self) -> ReadingSuite:
        if self.suite == "cross-subject-teaching-v1" and any(
            not case.success_criteria or any(not item.strip() for item in case.success_criteria)
            for case in self.cases
        ):
            raise ValueError("Cross-subject cases need explicit sufficient-response criteria.")
        return self


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
            "reading_mode": case.passage is not None,
            "concept_focus": case.skill,
            "success_criteria": case.success_criteria,
        },
        passage=case.passage.model_dump(mode="json") if case.passage else None,
        problem_text="Preparing a new practice question." if next_question else case.question,
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
                        topic=f"{case.subject}: {case.skill}",
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
                                contracts_passed=True,
                                result=result.model_dump(
                                    mode="json", exclude={"provider_request_id"}
                                ),
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
                            "subject": case.subject,
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
                                    "unnecessary_demands",
                                    "recognizes_revision",
                                    "appropriate_teaching_action",
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
        "provider_settings": {"capabilities": chosen.capabilities.model_dump(mode="json")},
        "prompt_versions": ["guidance-v3", "activity-v3"],
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


def active_tutor() -> ProviderConfig:
    """Resolve the actual saved route internally; export neither settings nor credentials."""
    from math_tutor.adapters.db.engine import create_default_engine
    from math_tutor.adapters.providers.config import route
    from math_tutor.providers import effective_configuration, probe_is_current
    from math_tutor.settings import database_path

    if not database_path().is_file():
        raise SystemExit("No installed database found. Run inside the configured installation.")
    engine = create_default_engine()
    try:
        with Session(engine) as db:
            _, provider = route(effective_configuration(db), "tutor", "adult")
            if provider.adapter == "mock":
                raise SystemExit(
                    "The active tutor is a mock. Select a tested live tutor in Settings."
                )
            if not probe_is_current(db, provider, "tutor"):
                raise SystemExit("The active tutor needs a current connection test in Settings.")
            return provider
    finally:
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--live-provider")
    selection.add_argument("--live-active-tutor", action="store_true")
    parser.add_argument("--authorize-synthetic-calls", action="store_true")
    parser.add_argument("--max-calls", type=int, default=3)
    args = parser.parse_args()
    provider = None
    if args.live_provider or args.live_active_tutor:
        if (
            not args.authorize_synthetic_calls
            or not 3 <= args.max_calls <= 90
            or args.max_calls % 3
        ):
            raise SystemExit(
                "Live reading evaluation requires explicit authorization and a 3–90 call budget divisible by three."
            )
        if args.live_active_tutor:
            provider = active_tutor()
        else:
            from math_tutor.adapters.providers.config import Routes, load_configuration, route

            config = load_configuration()
            _, provider = route(
                config.model_copy(update={"routes": Routes(tutor=args.live_provider)}),
                "tutor",
                "adult",
            )
    report = run(args.fixtures, provider, max_calls=args.max_calls if provider else None)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    if not report["contracts_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
