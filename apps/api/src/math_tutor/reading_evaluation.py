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
from typing import Annotated, Any, Literal
from uuid import uuid4

from alembic import command
from alembic.config import Config
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from math_tutor.adapters.db.engine import create_engine_for_url
from math_tutor.adapters.db.models import (
    Job,
    Learner,
    PracticeSession,
    ProblemInstance,
    Submission,
    TutorTurn,
)
from math_tutor.adapters.providers.config import Configuration, ProviderConfig
from math_tutor.adapters.providers.contracts import ProviderError
from math_tutor.providers import complete
from math_tutor.reading import MaterialMode, ReadingPassage, SectionSize, material_focus
from math_tutor.tutoring import finish_model, make_request


class RehearsalActivity(BaseModel):
    """Authored transfer task: distinct from unpredictable generated practice."""

    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=12, max_length=4000)
    goal: str = Field(min_length=1, max_length=500)
    success_criteria: list[Annotated[str, Field(min_length=1, max_length=300)]] = Field(
        min_length=1, max_length=3
    )
    passage: ReadingPassage | None = None


class RehearsalStep(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    purpose: Literal["review", "generate"] = "review"
    text: str = Field(default="", max_length=8000)
    work_text: str = Field(default="", max_length=8000)
    kind: Literal["answer", "question", "hint"] = "answer"
    help_level: int = Field(default=0, ge=0, le=3)
    new_activity: RehearsalActivity | None = None
    material_mode: MaterialMode | None = None
    section_size: SectionSize | None = None
    section_index: int | None = Field(default=None, ge=0)
    difficulty: Literal["introductory", "standard", "challenge"] | None = None
    review_notes: list[str] = Field(min_length=1)

    @model_validator(mode="after")
    def coherent_step(self) -> RehearsalStep:
        if self.purpose == "generate" and (self.text or self.work_text or self.new_activity):
            raise ValueError("Generation has no prewritten learner answer or authored task.")
        if (
            self.purpose == "review"
            and self.kind != "hint"
            and not (self.text.strip() or self.work_text.strip())
        ):
            raise ValueError("Review requires learner work or a discussion message.")
        if self.kind != "hint" and self.help_level:
            raise ValueError("Only explicit hint requests have a help level.")
        if (
            self.purpose == "review"
            and self.new_activity is None
            and any(
                value is not None
                for value in (self.material_mode, self.section_size, self.section_index)
            )
        ):
            raise ValueError("Navigation creates a new activity; it cannot rescope earlier work.")
        return self


class ReadingCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    subject: str = Field(default="Reading comprehension", min_length=1, max_length=100)
    skill: str = Field(min_length=1, max_length=100)
    response_kind: Literal["correct", "mistaken", "partial", "alternative", "adversarial"]
    passage: ReadingPassage | None = None
    success_criteria: list[Annotated[str, Field(min_length=1, max_length=300)]] = Field(
        default_factory=list, max_length=3
    )
    question: str = Field(min_length=12, max_length=4000)
    response: str = Field(default="", max_length=8000)
    follow_up: str = Field(default="", max_length=8000)
    review_notes: list[str] = Field(min_length=1)
    initiative: Literal["learner_led", "balanced", "tutor_led"] = "balanced"
    eligibility: Literal["adult", "minor", "unknown"] = "adult"
    difficulty: Literal["introductory", "standard", "challenge"] = "standard"
    material_mode: MaterialMode = "whole"
    section_size: SectionSize = "standard"
    section_index: int = Field(default=0, ge=0)
    steps: list[RehearsalStep] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def complete_conversation(self) -> ReadingCase:
        if self.steps:
            if self.response or self.follow_up:
                raise ValueError("Use explicit steps or the three-stage fixture, not both.")
            if len({step.id for step in self.steps}) != len(self.steps):
                raise ValueError("Stage IDs must be unique within a case.")
        elif not self.response.strip() or not self.follow_up.strip():
            raise ValueError("A three-stage case needs its response and follow-up.")
        if self.material_mode == "guided" and self.passage is None:
            raise ValueError("Guided rehearsal needs supplied material.")
        return self

    def planned_steps(self) -> list[RehearsalStep]:
        return self.steps or [
            RehearsalStep(id="feedback", text=self.response, review_notes=self.review_notes),
            RehearsalStep(id="follow_up", text=self.follow_up, review_notes=self.review_notes),
            RehearsalStep(id="next_question", purpose="generate", review_notes=self.review_notes),
        ]


class ReadingSuite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    suite: Literal[
        "original-reading-v1",
        "published-reading-v1",
        "cross-subject-teaching-v1",
        "adversarial-teaching-v2",
    ]
    provenance: str
    authored_at: str
    cases: list[ReadingCase] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def explicit_cross_subject_criteria(self) -> ReadingSuite:
        if self.suite in {"cross-subject-teaching-v1", "adversarial-teaching-v2"} and any(
            not case.success_criteria or any(not item.strip() for item in case.success_criteria)
            for case in self.cases
        ):
            raise ValueError("Cross-subject cases need explicit sufficient-response criteria.")
        return self


def attempt(
    db: Session,
    lesson: PracticeSession,
    problem: ProblemInstance,
    text: str,
    *,
    kind: Literal["answer", "question", "hint"] = "answer",
    help_level: int = 0,
    work_text: str = "",
) -> tuple[Submission, Job]:
    row = Submission(
        learner_id=lesson.learner_id,
        problem_id=problem.id,
        request_key=str(uuid4()),
        payload_hash="synthetic",
        kind=kind,
        help_level=help_level,
        text=text,
        work_text=work_text,
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
            "material_mode": case.material_mode,
            "section_size": case.section_size,
            "section_index": case.section_index,
            "evaluation_task_origin": "fixture",
        },
        passage=case.passage.model_dump(mode="json") if case.passage else None,
        problem_text="Preparing a new practice question." if next_question else case.question,
        expected_result={},
        format_constraints={},
        status="assigned",
        version=1,
    )


def prepare_step(
    lesson: PracticeSession, problem: ProblemInstance, step: RehearsalStep
) -> ProblemInstance:
    if step.difficulty:
        lesson.profile_settings = {**lesson.profile_settings, "difficulty": step.difficulty}
    if step.purpose == "generate" or step.new_activity:
        activity = step.new_activity
        fresh_parameters = {
            key: value for key, value in problem.parameters.items() if key != "tutor_help_received"
        }
        problem = ProblemInstance(
            session_id=lesson.id,
            template_id="ai_generated",
            template_version=1,
            skill_id="tutor.generated",
            seed=0,
            position=problem.position + 1,
            parameters={
                **fresh_parameters,
                "activity_state": "generating" if activity is None else "ready",
                "concept_focus": activity.goal if activity else problem.parameters["concept_focus"],
                "success_criteria": activity.success_criteria
                if activity
                else problem.parameters["success_criteria"],
                "evaluation_task_origin": "fixture" if activity else "generated",
            },
            passage=activity.passage.model_dump(mode="json")
            if activity and activity.passage
            else problem.passage,
            problem_text=activity.question if activity else "Preparing a new practice question.",
            expected_result={},
            format_constraints={},
            status="assigned",
            version=1,
        )
    parameters = dict(problem.parameters)
    for name in ("material_mode", "section_size", "section_index"):
        value = getattr(step, name)
        if value is not None:
            parameters[name] = value
    if parameters.get("material_mode") == "whole":
        parameters["section_index"] = 0
    problem.parameters = parameters
    if problem.passage:
        material_focus(ReadingPassage.model_validate(problem.passage), problem.parameters)
    return problem


def run(
    fixtures: Path, provider: ProviderConfig | None = None, *, max_calls: int | None = None
) -> dict[str, Any]:
    content = fixtures.read_bytes()
    suite = ReadingSuite.model_validate_json(content)
    chosen = provider or Configuration().providers["demo"]
    planned = [len(case.planned_steps()) for case in suite.cases]
    total_calls = sum(planned)
    limit = max_calls if max_calls is not None else total_calls
    case_limits = {sum(planned[:index]) for index in range(1, len(planned) + 1)}
    if limit not in case_limits:
        raise ValueError("Use a whole-case budget matching a cumulative fixture stage count.")
    outputs: list[dict[str, Any]] = []
    latencies: list[int] = []
    usage: dict[str, int] = {}
    prompt_versions: set[str] = set()
    provider_calls = 0
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
                spent = 0
                for case, calls in zip(suite.cases, planned, strict=True):
                    if spent + calls > limit:
                        break
                    spent += calls
                    learner = Learner(
                        alias=f"Synthetic evaluation {uuid4()}", eligibility=case.eligibility
                    )
                    db.add(learner)
                    db.flush()
                    lesson = PracticeSession(
                        learner_id=learner.id,
                        mode="ai_tutor",
                        topic=f"{case.subject}: {case.skill}",
                        initiative=case.initiative,
                        profile_settings={"difficulty": case.difficulty},
                    )
                    db.add(lesson)
                    db.flush()
                    problem = problem_for(lesson, case, next_question=False)
                    db.add(problem)
                    db.commit()
                    stages: list[dict[str, Any]] = []
                    for step in case.planned_steps():
                        previous = problem
                        problem = prepare_step(lesson, problem, step)
                        if problem is not previous:
                            db.add(problem)
                            db.flush()
                        row, job = attempt(
                            db,
                            lesson,
                            problem,
                            step.text,
                            kind=step.kind,
                            help_level=step.help_level,
                            work_text=step.work_text,
                        )
                        db.commit()
                        entry: dict[str, Any] = {
                            "stage": step.id,
                            "purpose": step.purpose,
                            "learner_message": step.text,
                            "written_work": step.work_text,
                            "eligibility": case.eligibility,
                            "submission_kind": step.kind,
                            "help_level": step.help_level,
                            "task_origin": problem.parameters["evaluation_task_origin"],
                            "difficulty": lesson.profile_settings["difficulty"],
                            "initiative": lesson.initiative,
                            "review_notes": step.review_notes,
                            "contracts_passed": False,
                            "human_review": {
                                name: "pending"
                                for name in (
                                    "sufficiency",
                                    "criteria_burden_or_answer_leak",
                                    "revision_and_supported_alternative",
                                    "evidence_attribution_and_support",
                                    "grounding_and_uncertainty",
                                    "progression_and_independent_transfer",
                                )
                            },
                        }
                        if problem.passage:
                            entry["material_focus"] = material_focus(
                                ReadingPassage.model_validate(problem.passage), problem.parameters
                            ).model_dump(exclude={"text"})
                        try:
                            if (
                                chosen.adapter != "mock"
                                and chosen.audience == "adult_only"
                                and case.eligibility != "adult"
                            ):
                                raise ProviderError(
                                    "audience_blocked",
                                    safe_message="This synthetic learner is ineligible for the selected provider audience; no inference was sent.",
                                )
                            request = make_request(db, job, row, problem, lesson, chosen, None)
                            if request.purpose != step.purpose:
                                raise ProviderError(
                                    "evaluation_stage_state",
                                    safe_message="The preceding failed activity has not reached the state required for this review; no inference was sent for this stage.",
                                )
                            entry["request_sha256"] = hashlib.sha256(
                                request.model_dump_json(exclude={"private_image_bytes"}).encode()
                            ).hexdigest()
                            # Network work begins after the read transaction is released.
                            db.commit()
                            provider_calls += 1
                            result = complete(chosen, request)
                            finish_model(db, job, row, problem, result, chosen.adapter)
                            db.commit()
                            turn = db.scalar(
                                select(TutorTurn).where(TutorTurn.submission_id == row.id)
                            )
                            if turn:
                                prompt_versions.add(turn.prompt_version)
                                entry["persisted_observation"] = {
                                    name: (turn.feedback or {}).get(name)
                                    for name in ("learning_observation", "evidence_link")
                                }
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
        "prompt_versions": sorted(prompt_versions),
        "total_cases": len(suite.cases),
        "sample_size": len(outputs),
        "call_budget": limit,
        "total_planned_calls": total_calls,
        "calls_attempted": provider_calls,
        "stages_attempted": sum(len(item["stages"]) for item in outputs),
        "reported_token_usage": usage,
        "latency_ms": {
            "p50": statistics.median(ordered) if ordered else None,
            "p95": ordered[math.ceil(len(ordered) * 0.95) - 1] if ordered else None,
        },
        "cost_estimate": "Unavailable; consult configured provider billing.",
        "contracts_passed": all(
            stage["contracts_passed"] for item in outputs for stage in item["stages"]
        ),
        "model_quality": "Not measured by mocks; all quality fields remain pending for human review. Scripted answers to fixture-authored transfer tasks are synthetic behavior, not observed student learning.",
        "evaluation_scope": "Production request/result handlers on synthetic SQLite. No browser, HTTP authorization, durable worker, photographed input or real-student learning measurement. Fixture-authored transfer tasks are marked separately from model-generated activities; no answer is scripted for an unpredictable generated task.",
        "photo_quality": "Not measured here; use the physical photo rehearsal.",
        "outputs": outputs,
    }


def active_tutor(eligibility: str = "adult") -> ProviderConfig:
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
            _, provider = route(effective_configuration(db), "tutor", eligibility)
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
        authorized = args.authorize_synthetic_calls and 1 <= args.max_calls <= 90
        if authorized:
            suite = ReadingSuite.model_validate_json(args.fixtures.read_bytes())
            sizes = [len(case.planned_steps()) for case in suite.cases]
            authorized = args.max_calls in {
                sum(sizes[:index]) for index in range(1, len(sizes) + 1)
            }
        if not authorized:
            raise SystemExit(
                "Live reading evaluation requires explicit authorization and a 1–90 call budget matching complete fixture cases."
            )
        selected_audiences: set[str] = set()
        selected_count = 0
        for case in suite.cases:
            if selected_count == args.max_calls:
                break
            selected_audiences.add(case.eligibility)
            selected_count += len(case.planned_steps())
        if args.live_active_tutor:
            for eligibility in sorted(selected_audiences):
                provider = active_tutor(eligibility)
        else:
            from math_tutor.adapters.providers.config import Routes, load_configuration, route

            config = load_configuration()
            for eligibility in sorted(selected_audiences):
                _, provider = route(
                    config.model_copy(update={"routes": Routes(tutor=args.live_provider)}),
                    "tutor",
                    eligibility,
                )
    report = run(args.fixtures, provider, max_calls=args.max_calls if provider else None)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    if not report["contracts_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
