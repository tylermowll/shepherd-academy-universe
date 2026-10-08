"""Evaluation authorization and production-context fidelity, never model grading."""

from pathlib import Path

import pytest

from math_tutor import reading_evaluation
from math_tutor.adapters.providers.config import Configuration, ProviderConfig
from math_tutor.adapters.providers.contracts import ModelRequest, ModelResult
from math_tutor.providers import complete

FIXTURES = Path(__file__).resolve().parents[4] / "evals/fixtures/reading-v1.json"


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
