"""Checkout discovery follows the root Python project, independent of the shell."""

from pathlib import Path

import pytest

from math_tutor import settings


def checkout(root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    module = root / "apps/api/src/math_tutor/settings.py"
    module.parent.mkdir(parents=True)
    module.touch()
    (root / "Makefile").touch()
    monkeypatch.setattr(settings, "__file__", str(module))


def test_root_manifest_resolves_checkout_and_relative_data_from_another_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = tmp_path / "checkout"
    checkout(root, monkeypatch)
    (root / "pyproject.toml").write_text('[project]\nname = "synthetic-checkout"\n')
    elsewhere = tmp_path / "another directory"
    elsewhere.mkdir()
    monkeypatch.chdir(elsewhere)
    monkeypatch.delenv(settings.DATABASE_URL_ENV_VAR, raising=False)
    monkeypatch.setenv(settings.DATA_DIR_ENV_VAR, "private-data")

    assert settings.repository_root() == root
    assert settings.database_path() == root / "private-data" / settings.DEFAULT_DB_FILENAME
    assert not (root / "apps/api/pyproject.toml").exists()
    assert not (elsewhere / "private-data").exists()


def test_retired_nested_manifest_does_not_identify_a_current_checkout(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    checkout(tmp_path, monkeypatch)
    (tmp_path / "apps/api/pyproject.toml").touch()

    with pytest.raises(ValueError, match="Outside a checkout"):
        settings.repository_root()


def test_installed_package_can_use_explicit_absolute_data_without_checkout_metadata(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    checkout(tmp_path / "installed", monkeypatch)
    directory = tmp_path / "private-data"
    monkeypatch.delenv(settings.DATABASE_URL_ENV_VAR, raising=False)
    monkeypatch.setenv(settings.DATA_DIR_ENV_VAR, str(directory))

    assert settings.database_path() == directory / settings.DEFAULT_DB_FILENAME
    assert not directory.exists()
