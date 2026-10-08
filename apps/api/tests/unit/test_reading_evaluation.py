"""Evaluation authorization and production-context fidelity, never model grading."""

from pathlib import Path

import pytest

from math_tutor import reading_evaluation
from math_tutor.adapters.providers.config import Configuration, ProviderConfig
from math_tutor.adapters.providers.contracts import ModelRequest, ModelResult
from math_tutor.providers import complete

FIXTURES = Path(__file__).resolve().parents[4] / "evals/fixtures/reading-v1.json"
NECKLACE = FIXTURES.with_name("reading-necklace-v1.json")


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
