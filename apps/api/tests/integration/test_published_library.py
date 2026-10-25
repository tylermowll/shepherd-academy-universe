"""Local corpus persistence, discovery and learner snapshots on real SQLite files."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any
from uuid import UUID

import pytest
from httpx2 import AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_tutoring import activity, tutor_session
from test_workflows import adult as adult
from test_workflows import anyio_backend as anyio_backend
from test_workflows import client, learner_ids, sign_in_learner
from test_workflows import engine as engine

from math_tutor.adapters.db.models import PublishedText
from math_tutor.published_library import LibraryImportError, import_library
from math_tutor.reading_sources import verify_source_token


def record(index: int, **changes: Any) -> dict[str, Any]:
    body = ("Synthetic public observation " * (index + 1)).strip()
    return {
        "id": f"synthetic-{index}",
        "title": f"Synthetic book: Piece {index}",
        "text": body,
        "author": "Author One" if index % 2 else "Author Two",
        "category": "Stories" if index % 2 else "Science",
        "text_kind": "story",
        "reading_level": "grades_3_5" if index % 2 else None,
        "level_basis": "Synthetic estimate fixture; not assessed ability." if index % 2 else None,
        "source_url": "https://example.invalid/public-source",
        "permission": "Original synthetic public test material.",
        "excerpt": False,
        "source_book_id": "synthetic-book",
        "source_book_title": "Synthetic book",
        "content_sha256": hashlib.sha256(body.encode()).hexdigest(),
        **changes,
    }


def write_corpus(tmp_path: Path, records: list[dict[str, Any]]) -> Path:
    directory = tmp_path / "texts"
    directory.mkdir(exist_ok=True)
    entries = []
    for item in records:
        relative = f"texts/{item['id']}.json"
        raw = json.dumps(item, ensure_ascii=False).encode()
        (tmp_path / relative).write_bytes(raw)
        entries.append({"path": relative, "sha256": hashlib.sha256(raw).hexdigest()})
    path = tmp_path / "manifest.json"
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "source_policy": "Original synthetic public corpus.",
                "sources": [{"id": "synthetic-book", "license": "Synthetic public fixture."}],
                "records": entries,
            }
        )
    )
    return path


def test_offline_import_is_atomic_idempotent_and_immutable(engine: Engine, tmp_path: Path) -> None:
    original = [record(0), record(1)]
    manifest = write_corpus(tmp_path, original)
    first = import_library(engine, manifest)
    assert first.model_dump() == {"added": 2, "unchanged": 0, "total": 2}
    with Session(engine) as db:
        saved = db.get(PublishedText, "synthetic-0")
        assert saved
        imported_at = saved.imported_at
        assert saved.text == original[0]["text"] and saved.permission == original[0]["permission"]
    repeated = import_library(engine, manifest)
    assert repeated.model_dump() == {"added": 0, "unchanged": 2, "total": 2}
    write_corpus(tmp_path, [record(2), record(0, title="Changed metadata must not overwrite")])
    with pytest.raises(LibraryImportError, match="different content or metadata"):
        import_library(engine, manifest)
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(PublishedText)) == 2
        saved = db.get(PublishedText, "synthetic-0")
        assert saved and saved.title == original[0]["title"] and saved.imported_at == imported_at
        assert db.get(PublishedText, "synthetic-2") is None


def test_operator_cli_imports_only_the_local_manifest(engine: Engine, tmp_path: Path) -> None:
    manifest = write_corpus(tmp_path, [record(0)])
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "math_tutor.published_library",
            "import",
            "--manifest",
            str(manifest),
        ],
        capture_output=True,
        text=True,
        check=False,
        timeout=15,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == {"added": 1, "unchanged": 0, "total": 1}
    assert "Synthetic public observation" not in result.stdout
    with Session(engine) as db:
        assert db.get(PublishedText, "synthetic-0") is not None


@pytest.mark.anyio
async def test_catalog_search_filters_and_pages_are_local_and_bounded(
    adult: AsyncClient, engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_fetch(_source: str) -> None:
        pytest.fail("Local discovery and selection must not fetch an external source")

    monkeypatch.setattr("math_tutor.api.reading.import_source", no_fetch)
    import_library(engine, write_corpus(tmp_path, [record(index) for index in range(6)]))
    response = await adult.get("/api/v1/reading/sources?limit=2")
    assert response.status_code == 200 and response.headers["Cache-Control"] == "no-store"
    first = response.json()
    assert first["total"] == 6 and first["offset"] == 0 and first["limit"] == 2
    assert first["categories"] == ["Science", "Stories"]
    assert [item["id"] for item in first["items"]] == ["synthetic-0", "synthetic-1"]
    assert first["live_sources"][0]["id"] == "nasa_news"
    assert "text" not in first["items"][0] and "search_text" not in response.text
    assert "permission" not in first["items"][0]
    second = (await adult.get("/api/v1/reading/sources?limit=2&offset=2")).json()
    assert [item["id"] for item in second["items"]] == ["synthetic-2", "synthetic-3"]
    author = (await adult.get("/api/v1/reading/sources", params={"q": "AUTHOR ONE"})).json()
    assert author["total"] == 3
    by_words = (
        await adult.get(
            "/api/v1/reading/sources",
            params={"category": "Stories", "min_words": 6, "max_words": 12},
        )
    ).json()
    assert [item["id"] for item in by_words["items"]] == ["synthetic-1", "synthetic-3"]
    assert by_words["categories"] == ["Science", "Stories"]
    rated = (await adult.get("/api/v1/reading/sources?reading_level=grades_3_5")).json()
    assert rated["total"] == 3 and all(item["level_basis"] for item in rated["items"])
    unrated = (await adult.get("/api/v1/reading/sources?reading_level=unrated")).json()
    assert unrated["total"] == 3 and all(item["reading_level"] is None for item in unrated["items"])
    empty = (
        await adult.get("/api/v1/reading/sources", params={"q": "no such synthetic word"})
    ).json()
    assert empty["items"] == [] and empty["total"] == 0
    literal = (await adult.get("/api/v1/reading/sources", params={"q": "%"})).json()
    assert literal["total"] == 0
    chosen = await adult.post(
        "/api/v1/reading/import",
        json={"learner_id": (await learner_ids(adult))[0], "source_id": "synthetic-1"},
    )
    assert chosen.status_code == 200 and len(chosen.json()["passages"]) == 1
    assert chosen.json()["passages"][0]["passage"]["text"] == record(1)["text"]


@pytest.mark.anyio
@pytest.mark.parametrize(
    "query",
    [
        "limit=0",
        "limit=51",
        "offset=-1",
        "offset=2147483648",
        "offset=9223372036854775808",
        "min_words=-1",
        "min_words=50001",
        "min_words=9223372036854775808",
        "max_words=50001",
        "min_words=10&max_words=1",
        "reading_level=grade_99",
        "q=" + "x" * 121,
        "category=" + "x" * 81,
    ],
)
async def test_invalid_library_filters_are_rejected(adult: AsyncClient, query: str) -> None:
    assert (await adult.get("/api/v1/reading/sources?" + query)).status_code == 422


@pytest.mark.anyio
async def test_local_selection_keeps_ownership_tokens_snapshots_and_corpus_scope(
    adult: AsyncClient, engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_fetch(_source: str) -> None:
        pytest.fail("A local text must not trigger remote source loading")

    monkeypatch.setattr("math_tutor.api.reading.import_source", no_fetch)
    import_library(engine, write_corpus(tmp_path, [record(0)]))
    first_id, second_id = await learner_ids(adult)
    async with client(engine) as browser:
        assert (await browser.get("/api/v1/reading/sources")).status_code == 401
        await sign_in_learner(adult, browser, first_id)
        assert (
            await browser.post(
                "/api/v1/reading/import", json={"learner_id": second_id, "source_id": "synthetic-0"}
            )
        ).status_code == 404
        assert (
            await browser.post(
                "/api/v1/reading/import",
                json={"learner_id": first_id, "source_id": "synthetic-0"},
                headers={"X-CSRF-Token": "wrong"},
            )
        ).status_code == 403
    selected = await adult.post(
        "/api/v1/reading/import", json={"learner_id": first_id, "source_id": "synthetic-0"}
    )
    assert selected.status_code == 200
    token = selected.json()["passages"][0]["source_token"]
    source = verify_source_token(token, UUID(first_id))
    assert source.text == record(0)["text"] and source.permission == record(0)["permission"]
    session = await tutor_session(adult)
    saved = await activity(adult, session, source="published", source_token=token)
    import_library(engine, write_corpus(tmp_path, [record(1)]))
    assert (await adult.get(f"/api/v1/tutor/sessions/{session['id']}")).json()["problems"][0][
        "passage"
    ] == saved["passage"]
    assert (await adult.delete(f"/api/v1/admin/learners/{first_id}")).status_code == 200
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(PublishedText)) == 2


@pytest.mark.anyio
async def test_unknown_or_corrupt_local_text_does_not_fall_back_to_network(
    adult: AsyncClient, engine: Engine, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "math_tutor.api.reading.import_source", lambda _: pytest.fail("Unexpected fetch")
    )
    import_library(engine, write_corpus(tmp_path, [record(0)]))
    learner_id = (await learner_ids(adult))[0]
    for source_id in ("missing", "aesop_hare", "aesop_grapes"):
        response = await adult.post(
            "/api/v1/reading/import", json={"learner_id": learner_id, "source_id": source_id}
        )
        assert response.status_code == 404
    with Session(engine) as db:
        item = db.get(PublishedText, "synthetic-0")
        assert item
        item.text = "Corrupted synthetic body."
        db.commit()
    response = await adult.post(
        "/api/v1/reading/import", json={"learner_id": learner_id, "source_id": "synthetic-0"}
    )
    assert response.status_code == 503 and "Corrupted" not in response.text


@pytest.mark.parametrize(
    "statement",
    [
        "UPDATE published_text SET word_count=0",
        "UPDATE published_text SET text=''",
        "UPDATE published_text SET text_kind='answer'",
        "UPDATE published_text SET reading_level='grades_3_5', level_basis=NULL",
    ],
)
def test_library_database_enforces_current_schema_integrity(
    engine: Engine, tmp_path: Path, statement: str
) -> None:
    import_library(engine, write_corpus(tmp_path, [record(0)]))
    with Session(engine) as db, pytest.raises(IntegrityError):
        db.execute(text(statement))
        db.commit()
