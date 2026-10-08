"""Evaluation resolves the installed saved route without any network inference."""

from pathlib import Path

import pytest
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from test_workflows import engine as engine

from math_tutor.adapters.db.models import ProviderConnection, ProviderProbe, RouteSelection
from math_tutor.adapters.providers.config import ProviderConfig
from math_tutor.adapters.providers.contracts import ProviderError
from math_tutor.providers import probe_fingerprint
from math_tutor.reading_evaluation import active_tutor


def saved_provider(engine: Engine, *, cloud: bool = False) -> ProviderConfig:
    provider = ProviderConfig(
        adapter="meta" if cloud else "ollama",
        model="synthetic-evaluation-no-network",
        enabled=True,
        base_url="https://example.invalid" if cloud else "http://127.0.0.1:11434",
        data_boundary="cloud" if cloud else "local_network",
        audience="mixed",
        eligibility_record="Synthetic test connection only",
    )
    with Session(engine) as db:
        db.add(
            ProviderConnection(
                id="saved-synthetic-tutor",
                configuration=provider.model_dump(mode="json"),
                encrypted_api_key=None,
                credential_revision="synthetic-revision",
            )
        )
        db.add(
            RouteSelection(
                name="active", routes={"tutor": "saved-synthetic-tutor", "vision": "demo"}
            )
        )
        db.commit()
    return provider.model_copy(update={"credential_revision": "synthetic-revision"})


def test_active_rehearsal_refuses_mock_instead_of_reporting_live_quality(engine: Engine) -> None:
    with pytest.raises(SystemExit, match="active tutor is a mock"):
        active_tutor()


def test_active_rehearsal_uses_saved_route_and_requires_current_probe(engine: Engine) -> None:
    provider = saved_provider(engine)
    with pytest.raises(SystemExit, match="current connection test"):
        active_tutor()
    with Session(engine) as db:
        db.add(
            ProviderProbe(
                fingerprint=probe_fingerprint(provider, "tutor"),
                provider_id="saved-synthetic-tutor",
                stage="tutor",
            )
        )
        db.commit()
    selected = active_tutor()
    assert selected.model == provider.model
    assert selected.adapter == "ollama"


def test_active_rehearsal_does_not_bypass_installation_cloud_policy(engine: Engine) -> None:
    saved_provider(engine, cloud=True)
    with pytest.raises(ProviderError) as result:
        active_tutor()
    assert result.value.code == "cloud_disabled"


def test_active_rehearsal_does_not_create_a_missing_database(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "not-installed.sqlite3"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+pysqlite:///{path}")
    with pytest.raises(SystemExit, match="No installed database"):
        active_tutor()
    assert not path.exists()
