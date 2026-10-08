"""Evaluation authorization and production-context fidelity, never model grading."""

from pathlib import Path

import pytest

from math_tutor import reading_evaluation
from math_tutor.adapters.providers.config import Configuration, ProviderConfig
from math_tutor.adapters.providers.contracts import ModelRequest, ModelResult
from math_tutor.providers import complete

FIXTURES = Path(__file__).resolve().parents[4] / "evals/fixtures/reading-v1.json"
NECKLACE = FIXTURES.with_name("reading-necklace-v1.json")
ADVERSARIAL = FIXTURES.with_name("teaching-adversarial-v2.json")


def test_published_rehearsal_preserves_excerpt_and_keeps_review_criteria_private(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    suite = reading_evaluation.ReadingSuite.model_validate_json(NECKLACE.read_bytes())
    excerpt = NECKLACE.with_name("the-necklace-excerpt.txt").read_text().strip()
    assert suite.suite == "published-reading-v1"
    assert len(suite.cases) == 3
    assert all(
        case.passage and case.passage.text == excerpt and case.passage.excerpt
        for case in suite.cases
    )
    assert all(case.passage and case.passage.origin == "published" for case in suite.cases)
    assert all(case.passage and case.passage.author == "Guy de Maupassant" for case in suite.cases)
    requests: list[ModelRequest] = []

    def capture(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        return complete(provider, request)

    monkeypatch.setattr(reading_evaluation, "complete", capture)
    report = reading_evaluation.run(NECKLACE, max_calls=9)
    assert report["contracts_passed"] and report["calls_attempted"] == 9
    assert report["suite"] == "published-reading-v1"
    for request in requests:
        context = "\n".join(message.content for message in request.ordered_messages)
        assert "Guy de Maupassant" in context
        assert "gutenberg.org/ebooks/12758" in context
        assert "five hundred francs" in context
        assert all(note not in context for case in suite.cases for note in case.review_notes)


def test_reading_suite_uses_production_context_without_leaking_review_notes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[ModelRequest] = []

    def capture(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        return complete(provider, request)

    monkeypatch.setattr(reading_evaluation, "complete", capture)
    report = reading_evaluation.run(FIXTURES, max_calls=3)
    assert report["contracts_passed"] and report["sample_size"] == 1
    assert report["total_cases"] == 12 and report["calls_attempted"] == 3
    assert [request.purpose for request in requests] == ["review", "review", "generate"]
    assert all("Mira carried a seedling" in str(request.ordered_messages) for request in requests)
    assert "A sunny shelf." in str(requests[1].ordered_messages)
    assert "What did Mira ask her brother" in str(requests[2].ordered_messages)
    assert all(
        "Accept the stated shelf" not in str(request.ordered_messages) for request in requests
    )
    assert report["outputs"][0]["human_review"]["false_correction"] == "pending"
    assert "Not measured" in report["model_quality"]


def test_live_evaluation_rejects_missing_authorization_before_reading_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def forbidden() -> Configuration:
        raise AssertionError("Must not load operator configuration")

    monkeypatch.setattr("math_tutor.adapters.providers.config.load_configuration", forbidden)
    monkeypatch.setattr(
        "sys.argv",
        [
            "reading_evaluation",
            "--fixtures",
            str(FIXTURES),
            "--output",
            "/tmp/unused-reading-report.json",
            "--live-provider",
            "cloud",
        ],
    )
    with pytest.raises(SystemExit, match="explicit authorization"):
        reading_evaluation.main()


@pytest.mark.parametrize("budget", [0, 2, 4, 93])
def test_active_tutor_authorization_and_whole_case_budget_precede_installation_access(
    monkeypatch: pytest.MonkeyPatch, budget: int
) -> None:
    def forbidden() -> ProviderConfig:
        raise AssertionError("Must not access installed settings before authorization")

    monkeypatch.setattr(reading_evaluation, "active_tutor", forbidden)
    monkeypatch.setattr(
        "sys.argv",
        [
            "reading_evaluation",
            "--fixtures",
            str(FIXTURES),
            "--output",
            "/tmp/unused-teaching-report.json",
            "--live-active-tutor",
            "--authorize-synthetic-calls",
            "--max-calls",
            str(budget),
        ],
    )
    with pytest.raises(SystemExit, match="explicit authorization"):
        reading_evaluation.main()


def test_active_tutor_requires_explicit_authorization(monkeypatch: pytest.MonkeyPatch) -> None:
    def forbidden() -> ProviderConfig:
        raise AssertionError("Must not access installed settings before authorization")

    monkeypatch.setattr(reading_evaluation, "active_tutor", forbidden)
    monkeypatch.setattr(
        "sys.argv",
        [
            "reading_evaluation",
            "--fixtures",
            str(FIXTURES),
            "--output",
            "/tmp/unused-teaching-report.json",
            "--live-active-tutor",
        ],
    )
    with pytest.raises(SystemExit, match="explicit authorization"):
        reading_evaluation.main()


def test_cross_subject_rehearsal_uses_goals_context_and_redacts_operator_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixtures = FIXTURES.with_name("teaching-v1.json")
    suite = reading_evaluation.ReadingSuite.model_validate_json(fixtures.read_bytes())
    requests: list[ModelRequest] = []

    def capture(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        return complete(provider, request)

    monkeypatch.setattr(reading_evaluation, "complete", capture)
    provider = (
        Configuration()
        .providers["demo"]
        .model_copy(
            update={
                "eligibility_record": "PRIVATE_OPERATOR_NOTE",
                "credential_revision": "PRIVATE_REV",
            }
        )
    )
    report = reading_evaluation.run(fixtures, provider)
    assert report["contracts_passed"] and report["calls_attempted"] == 36
    assert report["sample_size"] == 12
    assert {case.subject for case in suite.cases} == {
        "Mathematics",
        "Writing",
        "Science",
        "History",
        "Reading comprehension",
    }
    for offset, case in enumerate(suite.cases):
        initial, followup, subsequent = requests[offset * 3 : offset * 3 + 3]
        assert [initial.purpose, followup.purpose, subsequent.purpose] == [
            "review",
            "review",
            "generate",
        ]
        for request in (initial, followup):
            context = "\n".join(message.content for message in request.ordered_messages)
            assert case.question in context
            assert all(criterion in context for criterion in case.success_criteria)
        assert case.response in str(followup.ordered_messages)
        assert case.subject in str(subsequent.ordered_messages)
    assert all(
        note not in str(request.ordered_messages)
        for request in requests
        for case in suite.cases
        for note in case.review_notes
    )
    assert "PRIVATE_OPERATOR_NOTE" not in str(report)
    assert "PRIVATE_REV" not in str(report)
    assert all(
        value == "pending"
        for output in report["outputs"]
        for value in output["human_review"].values()
    )


def test_staged_rehearsal_preserves_intent_navigation_and_actual_transfer_work(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[ModelRequest] = []

    def capture(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        return complete(provider, request)

    monkeypatch.setattr(reading_evaluation, "complete", capture)
    suite = reading_evaluation.ReadingSuite.model_validate_json(ADVERSARIAL.read_bytes())
    report = reading_evaluation.run(ADVERSARIAL)
    assert report["contracts_passed"] and report["calls_attempted"] == 20
    assert report["sample_size"] == 4 and report["total_planned_calls"] == 20
    offset = 0
    for case, output in zip(suite.cases, report["outputs"], strict=True):
        for step, entry, request in zip(
            case.steps,
            output["stages"],
            requests[offset : offset + len(case.steps)],
            strict=True,
        ):
            context = "\n".join(message.content for message in request.ordered_messages)
            assert request.purpose == step.purpose
            assert entry["submission_kind"] == step.kind
            assert entry["help_level"] == step.help_level
            assert entry["learner_message"] == step.text
            assert len(entry["request_sha256"]) == 64
            assert all(note not in context for note in [*case.review_notes, *step.review_notes])
            assert all(value == "pending" for value in entry["human_review"].values())
            if step.new_activity:
                assert entry["task_origin"] == "fixture"
                assert step.new_activity.question in context and step.text in context
            if step.kind == "hint":
                assert "Learner request: hint" in context
                assert (
                    "concept explanation" in context
                    if step.help_level == 2
                    else "small hint" in context
                )
        offset += len(case.steps)
    guided = report["outputs"][1]["stages"]
    assert [entry["material_focus"]["section_index"] for entry in guided] == [
        0,
        0,
        0,
        0,
        1,
        1,
        0,
        0,
    ]
    assert guided[4]["difficulty"] == "introductory"
    assert guided[6]["difficulty"] == "standard"
    assert guided[7]["material_focus"]["mode"] == "guided"
    for request in [*requests[4:10], requests[11]]:
        context = "\n".join(message.content for message in request.ordered_messages)
        assert "violet lantern" not in context
    whole_context = "\n".join(message.content for message in requests[10].ordered_messages)
    assert "violet lantern" in whole_context
    transfer_context = "\n".join(message.content for message in requests[9].ordered_messages)
    assert "Lina arrived" in transfer_context and "Ravi reached" in transfer_context
    assert "Scripted answers" in report["model_quality"]


def test_staged_help_revision_and_transfer_record_server_qualified_support(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from math_tutor.adapters.providers.contracts import FeedbackPayload, LearningObservation

    fixture = tmp_path / "staged.json"
    fixture.write_text(
        reading_evaluation.ReadingSuite(
            suite="adversarial-teaching-v2",
            provenance="Synthetic software contract test only.",
            authored_at="2026-10-08",
            cases=[
                reading_evaluation.ReadingCase(
                    id="support",
                    skill="Evidence",
                    response_kind="partial",
                    question="Explain how an observation supports a claim.",
                    success_criteria=["Connect one observation to a claim."],
                    review_notes=["Reviewer-only support expectation."],
                    steps=[
                        reading_evaluation.RehearsalStep(
                            id="help",
                            text="Please explain with a different example.",
                            kind="hint",
                            help_level=2,
                            review_notes=["Explanation is help."],
                        ),
                        reading_evaluation.RehearsalStep(
                            id="revision",
                            text="The damp soil supports the claim about retaining water.",
                            review_notes=["This response follows help."],
                        ),
                        reading_evaluation.RehearsalStep(
                            id="transfer",
                            text="Full bins support the need for more frequent collection.",
                            new_activity=reading_evaluation.RehearsalActivity(
                                question="How do full park bins support a claim about collection?",
                                goal="Connect a new observation to a claim.",
                                success_criteria=["Connect the new observation to the claim."],
                            ),
                            review_notes=["A new task without task-specific help."],
                        ),
                    ],
                )
            ],
        ).model_dump_json()
    )
    call = 0

    def respond(_provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        nonlocal call
        call += 1
        return ModelResult(
            model_id=request.model_id,
            validated_payload=FeedbackPayload(
                teaching_action="explain" if call == 1 else "acknowledge",
                learning_observation=LearningObservation(
                    assessment="not_assessed" if call == 1 else "sufficient",
                    evidence="Synthetic model evidence; does not measure learning.",
                    resolved_points=[] if call == 1 else ["Connected observation to claim."],
                    open_points=[],
                ),
                strengths=[],
                guidance=["Synthetic focused teaching."],
                next_step="",
                concepts=[],
            ),
        )

    monkeypatch.setattr(reading_evaluation, "complete", respond)
    report = reading_evaluation.run(fixture)
    stages = report["outputs"][0]["stages"]
    assert report["contracts_passed"] and report["calls_attempted"] == 3
    assert stages[1]["persisted_observation"]["evidence_link"]["support"] == "assisted"
    assert stages[2]["persisted_observation"]["evidence_link"]["support"] == "independent"
    assert stages[2]["task_origin"] == "fixture"


@pytest.mark.parametrize("budget", [3, 5, 17, 21])
def test_staged_budget_does_not_stop_halfway_through_a_conversation(budget: int) -> None:
    with pytest.raises(ValueError, match="whole-case budget"):
        reading_evaluation.run(ADVERSARIAL, max_calls=budget)


def test_staged_live_budget_validation_precedes_saved_connection_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def forbidden() -> ProviderConfig:
        raise AssertionError("Invalid staged budget must not load private configuration.")

    monkeypatch.setattr(reading_evaluation, "active_tutor", forbidden)
    monkeypatch.setattr(
        "sys.argv",
        [
            "reading_evaluation",
            "--fixtures",
            str(ADVERSARIAL),
            "--output",
            "/tmp/unused-staged-report.json",
            "--live-active-tutor",
            "--authorize-synthetic-calls",
            "--max-calls",
            "3",
        ],
    )
    with pytest.raises(SystemExit, match="complete fixture cases"):
        reading_evaluation.main()


def test_staged_minor_audience_blocks_direct_live_provider_before_inference(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    suite = reading_evaluation.ReadingSuite.model_validate_json(ADVERSARIAL.read_bytes())
    fixture = tmp_path / "minor.json"
    fixture.write_text(suite.model_copy(update={"cases": [suite.cases[-1]]}).model_dump_json())
    provider = ProviderConfig(
        adapter="ollama",
        model="synthetic-no-network",
        enabled=True,
        base_url="http://127.0.0.1:11434",
        audience="adult_only",
        eligibility_record="Synthetic policy test only.",
    )

    def forbidden(_provider: ProviderConfig, _request: ModelRequest) -> ModelResult:
        raise AssertionError("An ineligible synthetic learner must never reach inference.")

    monkeypatch.setattr(reading_evaluation, "complete", forbidden)
    report = reading_evaluation.run(fixture, provider)
    assert report["calls_attempted"] == 0 and report["stages_attempted"] == 4
    assert not report["contracts_passed"]
    assert all(
        stage["error_code"] == "audience_blocked" for stage in report["outputs"][0]["stages"]
    )


def test_staged_failure_does_not_send_review_as_unintended_generation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from math_tutor.adapters.providers.contracts import ProviderError

    suite = reading_evaluation.ReadingSuite.model_validate_json(ADVERSARIAL.read_bytes())
    case = suite.cases[0].model_copy(
        update={
            "steps": [
                reading_evaluation.RehearsalStep(
                    id="failed-generation",
                    purpose="generate",
                    review_notes=["Fail this generation."],
                ),
                reading_evaluation.RehearsalStep(
                    id="unready-review",
                    text="My saved work must not turn into another generation.",
                    review_notes=["No inference without the expected activity state."],
                ),
            ]
        }
    )
    fixture = tmp_path / "failed.json"
    fixture.write_text(suite.model_copy(update={"cases": [case]}).model_dump_json())
    calls = 0

    def unavailable(_provider: ProviderConfig, _request: ModelRequest) -> ModelResult:
        nonlocal calls
        calls += 1
        raise ProviderError("timeout", retryable=True)

    monkeypatch.setattr(reading_evaluation, "complete", unavailable)
    report = reading_evaluation.run(fixture)
    stages = report["outputs"][0]["stages"]
    assert calls == report["calls_attempted"] == 1
    assert report["stages_attempted"] == 2 and not report["contracts_passed"]
    assert stages[0]["error_code"] == "timeout"
    assert stages[1]["error_code"] == "evaluation_stage_state"
    assert stages[1]["learner_message"] == "My saved work must not turn into another generation."
