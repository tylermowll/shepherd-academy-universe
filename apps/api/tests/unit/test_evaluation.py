"""Exact regression and current provider contracts, without live inference."""

import json
from pathlib import Path

import pytest

from math_tutor import evaluation
from math_tutor.adapters.providers.config import Configuration, ProviderConfig
from math_tutor.adapters.providers.contracts import ModelRequest, ModelResult, ReadingPayload
from math_tutor.providers import complete

FIXTURES = Path(__file__).resolve().parents[4] / "evals/fixtures/rational-v1.json"


def test_exact_and_vision_regressions_use_current_readability_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[ModelRequest] = []

    def capture(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        requests.append(request)
        return complete(provider, request)

    monkeypatch.setattr(evaluation, "complete", capture)
    report = evaluation.run(FIXTURES)
    assert report["passed"]
    cases, vision, quality = report["cases"], report["mock_vision"], report["model_quality"]
    assert isinstance(cases, list) and isinstance(vision, list) and isinstance(quality, str)
    assert len(cases) == 33
    assert len(vision) == len(requests) == 30
    assert {case["category"] for case in vision} == {
        "clear",
        "messy",
        "rotated",
        "ambiguous",
        "adversarial",
    }
    assert all(
        request.stage == "vision"
        and request.purpose == "read"
        and request.private_image_bytes
        and request.response_schema["title"] == "ReadingPayload"
        for request in requests
    )
    assert "Not measured" in quality


def test_mock_evaluation_rejects_invented_readings(monkeypatch: pytest.MonkeyPatch) -> None:
    def invented(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        return ModelResult(
            model_id=provider.model,
            validated_payload=ReadingPayload(
                transcription="Invented work",
                quality="clear",
                confidence=1,
                ambiguities=[],
                organization_feedback=[],
                rejection_reason=None,
            ),
        )

    monkeypatch.setattr(evaluation, "complete", invented)
    report = evaluation.run(FIXTURES)
    assert not report["passed"]
    cases, vision = report["cases"], report["mock_vision"]
    assert isinstance(cases, list) and isinstance(vision, list)
    assert all(not case["passed"] for case in vision)
    assert all(case["passed"] for case in cases)


@pytest.mark.parametrize("authorization,budget", [(False, 3), (True, 0), (True, 31)])
def test_live_authorization_and_call_budget_precede_configuration_access(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    authorization: bool,
    budget: int,
) -> None:
    def forbidden() -> Configuration:
        raise AssertionError("Must not load operator configuration")

    monkeypatch.setattr("math_tutor.adapters.providers.config.load_configuration", forbidden)
    arguments = [
        "evaluation",
        "--fixtures",
        str(FIXTURES),
        "--output",
        str(tmp_path / "report.json"),
        "--live-provider",
        "cloud",
        "--max-calls",
        str(budget),
    ]
    if authorization:
        arguments.append("--authorize-synthetic-calls")
    monkeypatch.setattr("sys.argv", arguments)
    with pytest.raises(SystemExit, match="explicit authorization"):
        evaluation.main()
    assert not (tmp_path / "report.json").exists()


@pytest.mark.parametrize(
    "stage,purpose,schema",
    [("tutor", "review", "FeedbackPayload"), ("vision", "read", "ReadingPayload")],
)
def test_authorized_diagnostic_uses_current_contract_and_respects_call_limit(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    stage: str,
    purpose: str,
    schema: str,
) -> None:
    monkeypatch.setattr("math_tutor.adapters.providers.config.load_configuration", Configuration)
    requests: list[ModelRequest] = []

    def capture(provider: ProviderConfig, request: ModelRequest) -> ModelResult:
        assert provider.adapter == "mock"
        requests.append(request)
        return complete(provider, request)

    monkeypatch.setattr(evaluation, "complete", capture)
    output = tmp_path / "report.json"
    monkeypatch.setattr(
        "sys.argv",
        [
            "evaluation",
            "--fixtures",
            str(FIXTURES),
            "--output",
            str(output),
            "--live-provider",
            "demo",
            "--authorize-synthetic-calls",
            "--stage",
            stage,
            "--max-calls",
            "1",
        ],
    )
    evaluation.main()
    report = json.loads(output.read_text())
    assert report["passed"] and report["sample_size"] == len(requests) == 1
    assert report["prompt_version"] == "adapter-diagnostic-v2"
    assert report["human_review"] == "required; not automatically approved"
    assert requests[0].purpose == purpose
    assert requests[0].response_schema["title"] == schema
