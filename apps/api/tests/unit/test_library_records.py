"""Offline corpus validation uses only original synthetic public text fixtures."""

import hashlib
import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from math_tutor.published_library import (
    DEFAULT_MANIFEST,
    LibraryImportError,
    LibraryRecord,
    read_corpus,
)


def record(**changes: Any) -> dict[str, Any]:
    text = "Synthetic public text keeps Unicode café, £5 and <literal> characters unchanged."
    return {
        "id": "synthetic-text",
        "title": "Synthetic book: a public story",
        "text": text,
        "author": "Synthetic author",
        "category": "Stories",
        "text_kind": "story",
        "source_url": "https://example.invalid/synthetic-source",
        "permission": "Original synthetic test material.",
        "excerpt": False,
        "source_book_id": "synthetic-book",
        "source_book_title": "Synthetic book",
        "content_sha256": hashlib.sha256(text.encode()).hexdigest(),
        **changes,
    }


def manifest(tmp_path: Path, item: dict[str, Any]) -> Path:
    path = tmp_path / "texts" / "synthetic.json"
    path.parent.mkdir()
    raw = json.dumps(item, ensure_ascii=False).encode()
    path.write_bytes(raw)
    result = tmp_path / "manifest.json"
    result.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "source_policy": "Synthetic public fixtures only.",
                "sources": [],
                "records": [
                    {"path": "texts/synthetic.json", "sha256": hashlib.sha256(raw).hexdigest()}
                ],
            }
        )
    )
    return result


def test_record_retains_literal_text_and_computes_whitespace_word_count() -> None:
    original = record()
    parsed = LibraryRecord.model_validate(original)
    values = parsed.stored_values()
    assert values["text"] == original["text"]
    assert values["word_count"] == len(original["text"].split())
    assert values["permission"] == original["permission"]
    assert values["reading_level"] is None and values["level_basis"] is None


def test_packaged_public_corpus_has_the_required_independent_selectable_units() -> None:
    records = read_corpus(DEFAULT_MANIFEST)
    assert 500 <= len(records) <= 1000
    assert len({record.id for record in records}) == len(records)
    assert len({record.content_sha256 for record in records}) == len(records)
    assert all(record.text_kind != "poem" or record.reading_level is None for record in records)


@pytest.mark.parametrize(
    "changes",
    [
        {"content_sha256": "a" * 64},
        {"word_count": 999},
        {"text": " "},
        {"title": " "},
        {"source_url": "http://example.invalid/public"},
        {"source_url": "https://synthetic-user:synthetic-key@example.invalid/public"},
        {"permission": ""},
        {"id": "nasa_news"},
        {"id": "../../outside"},
        {"reading_level": "grades_3_5", "level_basis": None},
        {"reading_level": "unknown"},
        {"text_kind": "answer_key"},
        {"text": "x" * 50001},
    ],
)
def test_invalid_or_unverifiable_corpus_records_fail_closed(changes: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        LibraryRecord.model_validate(record(**changes))


def test_manifest_validates_file_checksum_and_text_integrity_before_import(tmp_path: Path) -> None:
    path = manifest(tmp_path, record())
    assert read_corpus(path)[0].id == "synthetic-text"
    (tmp_path / "texts/synthetic.json").write_text(json.dumps(record(title="Changed")))
    with pytest.raises(LibraryImportError, match="checksum"):
        read_corpus(path)


@pytest.mark.parametrize("path_value", ["../outside.json", "/tmp/outside.json", "texts/file.txt"])
def test_manifest_cannot_read_unlisted_paths(tmp_path: Path, path_value: str) -> None:
    path = manifest(tmp_path, record())
    value = json.loads(path.read_text())
    value["records"][0]["path"] = path_value
    path.write_text(json.dumps(value))
    with pytest.raises(LibraryImportError, match="unsafe"):
        read_corpus(path)


def test_manifest_rejects_symlink_escape_and_duplicate_records(tmp_path: Path) -> None:
    path = manifest(tmp_path, record())
    outside = tmp_path.parent / "synthetic-outside-corpus.json"
    outside.write_text(json.dumps(record()))
    target = tmp_path / "texts/synthetic.json"
    target.unlink()
    target.symlink_to(outside)
    with pytest.raises(LibraryImportError, match="inside the corpus"):
        read_corpus(path)
    target.unlink()
    target.write_text(json.dumps(record(), ensure_ascii=False))
    value = json.loads(path.read_text())
    value["records"] *= 2
    path.write_text(json.dumps(value))
    with pytest.raises(LibraryImportError, match="unique files"):
        read_corpus(path)
