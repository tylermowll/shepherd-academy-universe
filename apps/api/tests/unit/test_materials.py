"""Source fidelity and scope hold for material from any subject."""

import json

import pytest
from pydantic import ValidationError

from math_tutor.api.tutoring import TutorActivityInput
from math_tutor.reading import (
    SECTION_LENGTHS,
    OriginalPassage,
    ReadingPassage,
    SectionSize,
    evidence,
    history_allowed,
    material_focus,
    section_offsets,
)


@pytest.mark.parametrize("size", ["short", "standard", "long"])
@pytest.mark.parametrize(
    "text",
    [
        "A brief lab observation.",
        ("First observation: 🌱 needs water.\r\n\r\nSecond observation: leaves spread.\n\n" * 130),
        ("Dense mathematical argument; a variable denotes the unknown. " * 200),
        "無空白的連續文本" * 1100,
    ],
)
def test_sections_reconstruct_exact_source(text: str, size: SectionSize) -> None:
    offsets = section_offsets(text, size)
    assert offsets[0][0] == 0 and offsets[-1][1] == len(text)
    assert "".join(text[start:end] for start, end in offsets) == text
    assert all(0 < end - start <= SECTION_LENGTHS[size] for start, end in offsets)
    assert all(first[1] == second[0] for first, second in zip(offsets, offsets[1:], strict=False))
    assert offsets == section_offsets(text, size)


def test_guided_evidence_keeps_current_source_and_excludes_future() -> None:
    paragraphs = [f"SOURCE_SECTION_{i}: " + ("synthetic fact " * 80) + "\n\n" for i in range(10)]
    passage = ReadingPassage(title="Science notes", text="".join(paragraphs), origin="pasted")
    params = {"material_mode": "guided", "section_size": "standard", "section_index": 4}
    focus = material_focus(passage, params)
    content = evidence(passage, params)
    assert focus.text == passage.text[focus.start : focus.end] == paragraphs[4]
    assert "SOURCE_SECTION_2" in content and "SOURCE_SECTION_4" in content
    assert "SOURCE_SECTION_0" in content and "SOURCE_SECTION_5" not in content
    assert "SOURCE_SECTION_1" not in content
    assert "may omit intervening sections" in content
    assert "Later sections are unread and excluded" in content
    source = json.loads(content.split("\n", 1)[1].split("\nEND READING PASSAGE")[0])
    assert source["selected_section"]["text"] == paragraphs[4]
    assert len(source["previous_sections"]) == 2
    assert source["opening_context"]["text"] == paragraphs[0]
    assert source["opening_context"]["is_excerpt"] is False


def test_guided_history_rejects_future_whole_and_other_material() -> None:
    source = ReadingPassage(title="History", text="A paragraph. " * 500, origin="pasted")
    saved = source.model_dump(mode="json")
    params = {"material_mode": "guided", "section_index": 1}
    assert history_allowed(saved, params, saved, {**params, "section_index": 0})
    assert history_allowed(saved, params, saved, params)
    assert not history_allowed(saved, params, saved, {**params, "section_index": 2})
    assert not history_allowed(saved, params, saved, {"material_mode": "whole"})
    assert not history_allowed(saved, params, None, {})
    assert not history_allowed(saved, params, {**saved, "title": "Other material"}, params)
    assert not history_allowed(saved, {"material_mode": "whole"}, None, {})
    assert not history_allowed(
        saved, {"material_mode": "whole"}, {**saved, "text": "Another source"}, {}
    )
    assert history_allowed(saved, {"material_mode": "whole"}, saved, {})


def test_later_long_sections_keep_a_bounded_opening_premise_without_future_text() -> None:
    source = ReadingPassage(
        title="Original causal story",
        origin="pasted",
        text=(
            "EARLY_CAUSE: Nia promised to return the borrowed boat. "
            + "Opening context. " * 250
            + "\n\n"
            + "Middle context. " * 1500
            + "\n\nFUTURE_ENDING: the promise was broken."
        ),
    )
    params = {"material_mode": "guided", "section_size": "long", "section_index": 4}
    content = evidence(source, params)
    assert "EARLY_CAUSE" in content and "FUTURE_ENDING" not in content
    saved = json.loads(content.split("\n", 1)[1].split("\nEND READING PASSAGE")[0])
    opening = saved["opening_context"]
    assert opening["text"] == source.text[opening["start"] : opening["end"]]
    assert opening["is_excerpt"] is True
    assert (
        sum(len(item["text"]) for item in saved["previous_sections"])
        + len(opening["text"])
        + len(saved["selected_section"]["text"])
        <= 5000
    )


def test_unscoped_photo_uncertainties_do_not_disclose_unread_material() -> None:
    source = ReadingPassage(
        title="Photographed notes",
        text="The opening observation. " * 200,
        origin="photo",
        uncertainties=["FUTURE_DETAIL may be crossed out in the final paragraph."],
    )
    guided = evidence(source, {"material_mode": "guided", "section_index": 0})
    assert "FUTURE_DETAIL" not in guided and "reader recorded uncertainty" in guided
    assert "FUTURE_DETAIL" in evidence(source, {"material_mode": "whole"})


def test_supplied_limit_does_not_expand_generated_or_homework_limits() -> None:
    text = "a" * 50000
    assert ReadingPassage(title="Long supplied material", text=text, origin="pasted").text == text
    assert TutorActivityInput(source="reading_text", reference_text=text).reference_text == text
    with pytest.raises(ValidationError):
        ReadingPassage(title="Too long", text=text + "a", origin="pasted")
    with pytest.raises(ValidationError):
        OriginalPassage(title="Generated", text="a" * 8001)
    with pytest.raises(ValidationError, match="Assignment reference"):
        TutorActivityInput(source="reference_text", reference_text="a" * 8001)
    assert TutorActivityInput(source="reference_text", reference_text="a" * 8000)


def test_whole_mode_preserves_every_character_and_invalid_index_fails() -> None:
    source = ReadingPassage(title="Notes", text="  Source 🌱\n\n" * 750, origin="pasted")
    focus = material_focus(source, {"material_mode": "whole"})
    assert focus.text == source.text and focus.section_count == 1
    assert focus.start == 0 and focus.end == len(source.text)
    assert source.text in evidence(source, {"material_mode": "whole"}).replace("\\n", "\n")
    with pytest.raises(ValueError, match="available section"):
        material_focus(source, {"material_mode": "guided", "section_index": 999})
    with pytest.raises(ValueError, match="available section"):
        material_focus(source, {"material_mode": "whole", "section_index": 1})
