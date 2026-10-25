"""Optional subject levels are typed learner preferences, not inferred grades."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from math_tutor.api.tutoring import TutoringSessionInput, TutorSettingsInput


@pytest.mark.parametrize(
    "subject,level",
    [
        *(
            ("reading", value)
            for value in ("grades_k_2", "grades_3_5", "grades_6_8", "grades_9_12", "adult")
        ),
        *(
            ("math", value)
            for value in (
                "grade_k",
                "grade_1",
                "grade_2",
                "grade_3",
                "grade_4",
                "grade_5",
                "grade_6",
                "grade_7",
                "grade_8",
                "grade_9",
                "grade_10",
                "grade_11",
                "grade_12",
                "pre_algebra",
                "algebra_1",
                "geometry",
                "algebra_2",
                "precalculus",
                "calculus",
                "college",
            )
        ),
        ("other", "Introductory chemistry"),
    ],
)
def test_level_subjects_accept_only_their_declared_band_or_course(subject: str, level: str) -> None:
    body = TutoringSessionInput.model_validate(
        {
            "learner_id": str(uuid4()),
            "topic": "Synthetic subject context",
            "learning_level": {"subject": subject, "level": level},
        }
    )
    assert body.learning_level is not None
    assert body.learning_level.model_dump() == {"subject": subject, "level": level}


@pytest.mark.parametrize(
    "selection",
    [
        {"subject": "reading", "level": "grade_3"},
        {"subject": "math", "level": "grades_3_5"},
        {"subject": "reading", "level": "university"},
        {"subject": "math", "level": "trigonometry"},
        {"subject": "science", "level": "Introductory chemistry"},
        {"subject": "other", "level": " \n\t "},
        {"subject": "other", "level": "é" * 81},
        {"subject": "other", "level": 8},
        {"subject": "math", "level": True},
        {"subject": "reading"},
        {"level": "adult"},
        {"subject": "reading", "level": "adult", "mastery": True},
        "adult",
        [],
    ],
)
def test_subject_level_validation_rejects_mismatched_unbounded_or_privileged_fields(
    selection: object,
) -> None:
    for model, fields in (
        (TutoringSessionInput, {"learner_id": str(uuid4()), "topic": "Synthetic context"}),
        (TutorSettingsInput, {"initiative": "balanced"}),
    ):
        with pytest.raises(ValidationError):
            model.model_validate({**fields, "learning_level": selection})


def test_freeform_course_is_trimmed_bounded_and_never_required() -> None:
    settings = TutorSettingsInput.model_validate(
        {
            "initiative": "balanced",
            "learning_level": {"subject": "other", "level": "  " + "é" * 80 + " \n"},
        }
    )
    assert settings.learning_level is not None
    assert settings.learning_level.level == "é" * 80
    omitted = TutorSettingsInput(initiative="balanced")
    explicit_none = TutorSettingsInput(initiative="balanced", learning_level=None)
    assert omitted.learning_level is explicit_none.learning_level is None
    assert "learning_level" not in omitted.model_fields_set
    assert "learning_level" in explicit_none.model_fields_set
