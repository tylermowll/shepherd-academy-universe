"""Reviewed extraction layouts keep literal synthetic pieces and reject front matter."""

import gzip
import hashlib
import json
import runpy
from pathlib import Path
from typing import Any

import pytest


@pytest.fixture(scope="module")
def builder() -> dict[str, Any]:
    script = Path(__file__).resolve().parents[4] / "scripts/build-reading-library.py"
    # Loading this trusted operator script does not invoke its guarded CLI.
    return runpy.run_path(str(script))


def test_body_boundaries_handle_wrapped_titles_bom_and_crlf(builder: dict[str, Any]) -> None:
    raw = (
        "\ufeffSynthetic Gutenberg notices\r\n"
        "*** START OF THE PROJECT GUTENBERG EBOOK A WRAPPED\r\n"
        "SYNTHETIC TITLE ***\r\n"
        "Literal café and £5.\r\n\r\nA second paragraph.\r\n"
        "*** END OF THE PROJECT GUTENBERG EBOOK SYNTHETIC TITLE ***\r\n"
        "License notices must remain outside the selected body.\r\n"
    ).encode()
    body = builder["body_text"](raw)
    assert body == "Literal café and £5.\n\nA second paragraph.\n"
    assert body in raw.decode("utf-8-sig").replace("\r\n", "\n")


@pytest.mark.parametrize(
    "raw",
    [
        b"A text without explicit Gutenberg boundaries.",
        b"*** START OF THE PROJECT GUTENBERG EBOOK SYNTHETIC ***\nMissing end.",
    ],
)
def test_body_without_reviewed_boilerplate_boundaries_fails(
    builder: dict[str, Any], raw: bytes
) -> None:
    with pytest.raises(ValueError, match="boundaries"):
        builder["body_text"](raw)


def test_fables_exclude_contents_preface_and_footnotes(builder: dict[str, Any]) -> None:
    source = (
        "CONTENTS\n"
        "    The Lion And The Mouse\n"
        "    The Patient Farmer\n\n"
        "PREFACE\n\nA synthetic preface is not a selectable fable.\n\n"
        "The Lion And The Mouse\n\nA lion pauses. A mouse returns.\n\n"
        "The Patient Farmer\n\nA farmer waits for a seed to grow.\n\n"
        "FOOTNOTES\n\nEditorial notes must not become another fable.\n"
    )
    pieces = builder["heading_spans"](source, "fables", 21)
    assert pieces == [
        ("The Lion And The Mouse", "A lion pauses. A mouse returns."),
        ("The Patient Farmer", "A farmer waits for a seed to grow."),
    ]
    assert all(value in source for _, value in pieces)


def test_science_prose_reference_is_not_a_new_lecture_heading(builder: dict[str, Any]) -> None:
    source = (
        "CONTENTS\n    LECTURE I\n    LECTURE II\n\n"
        "LECTURE I\n\nObserve a synthetic stone.\n\n"
        "Lecture VIII, that later discussion, does not start another lecture here.\n\n"
        "LECTURE II\n\nObserve a synthetic stream.\n"
    )
    pieces = builder["heading_spans"](source, "science", 5726)
    assert [title for title, _ in pieces] == ["LECTURE I", "LECTURE II"]
    assert "Lecture VIII, that later discussion" in pieces[0][1]
    assert all(value in source for _, value in pieces)


def test_short_poems_remain_complete_and_unrated(builder: dict[str, Any]) -> None:
    source = (
        "I\n\nThe Little Light\nLight falls softly.\n\n"
        "II\n\nTwo Birds\nBirds rest.\n\n"
        "Transcriber's Note:\nA synthetic editorial note.\n"
    )
    pieces = builder["heading_spans"](source, "poems", 28722)
    assert pieces == [
        ("I The Little Light", "Light falls softly."),
        ("II Two Birds", "Birds rest."),
    ]
    for _, value in pieces:
        assert value in source
        level, basis = builder["estimate_level"](value, "poem")
        assert level is None and basis.startswith("Unrated:")


def test_short_chapters_preserve_prose_after_their_separate_titles(builder: dict[str, Any]) -> None:
    source = (
        "CHAPTER I\n\nA Small Beginning\n\nA bee rests.\n\n"
        "CHAPTER II\n\nAnother Beginning\n\nA bird sings.\n"
    )
    pieces = builder["heading_spans"](source, "chapter", 11)
    assert pieces == [
        ("CHAPTER I — A Small Beginning", "A bee rests."),
        ("CHAPTER II — Another Beginning", "A bird sings."),
    ]
    assert all(value in source for _, value in pieces)


def test_bare_chapters_keep_opening_prose_and_exclude_appendix(builder: dict[str, Any]) -> None:
    source = (
        "CHAPTER I\n\nMy first observation remains the chapter's opening.\n\n"
        "CHAPTER II\n\nMy next observation remains literal.\n\n"
        "APPENDIX\nEditorial material remains outside these chapter units.\n"
    )
    pieces = builder["heading_spans"](source, "bare_chapter", 23)
    assert pieces == [
        ("CHAPTER I", "My first observation remains the chapter's opening."),
        ("CHAPTER II", "My next observation remains literal."),
    ]


def test_oversized_units_split_at_literal_boundaries_without_dropping_text(
    builder: dict[str, Any],
) -> None:
    source = "\n\n".join(("A synthetic observation. " * 600).strip() for _ in range(5))
    pieces = builder["pieces"](source)
    assert len(pieces) > 1 and all(0 < len(value) <= 48000 for value in pieces)
    assert all(value in source for value in pieces)
    assert "\n\n".join(pieces) == source


def test_overlong_unbroken_source_fails_instead_of_silently_clipping(
    builder: dict[str, Any],
) -> None:
    with pytest.raises(ValueError, match="safe excerpt boundary"):
        builder["pieces"]("x" * 50001)


def test_packaged_selections_remain_literal_slices_of_hash_verified_originals(
    builder: dict[str, Any],
) -> None:
    root = Path(__file__).resolve().parents[2] / "src/math_tutor/data/published"
    manifest = json.loads((root / "manifest.json").read_text())
    bodies: dict[str, str] = {}
    for source in manifest["sources"]:
        original = gzip.decompress((root / source["original_path"]).read_bytes())
        assert len(original) <= 8_000_000
        assert hashlib.sha256(original).hexdigest() == source["original_sha256"]
        bodies[source["book_id"]] = builder["body_text"](original)
    selected_books = set()
    for entry in manifest["records"]:
        record = json.loads((root / entry["path"]).read_text())
        selected_books.add(record["source_book_id"])
        assert record["text"] in bodies[record["source_book_id"]], record["id"]
    assert selected_books == set(bodies)
