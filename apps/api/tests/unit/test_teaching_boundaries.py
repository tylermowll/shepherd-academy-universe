"""Concrete hostile output forms are rejected without claiming semantic certainty."""

import pytest
from pydantic import ValidationError

from math_tutor.adapters.providers.contracts import (
    ActivityPayload,
    FeedbackPayload,
    LearningObservation,
)
from math_tutor.teaching import repeated_task, required_follow_up, sufficiency_question


@pytest.mark.parametrize(
    "task",
    [
        "For this practice, solve the equation 3x + 4 = 19, explaining your steps.",
        "Try this equation and explain your reasoning: 3x+4=19.",
        "Solve 3x + 4 = 19 and explain your steps. Then check your answer.",
    ],
)
def test_boilerplate_does_not_make_the_original_equation_distinct(task: str) -> None:
    assert repeated_task("Solve 3x + 4 = 19 and explain your steps.", task)


def test_distinct_equations_preserve_operator_and_number_changes() -> None:
    assert not repeated_task("Solve 3x + 4 = 19.", "Solve 3x - 4 = 19 and explain one step.")
    assert not repeated_task("Solve 3x + 4 = 19.", "Solve 5x + 2 = 17 and explain one step.")
    assert repeated_task(
        "Explain why roads changed this town.", "For practice: explain why roads changed this town."
    )


def test_shared_symbolic_formula_does_not_reject_distinct_numerical_practice() -> None:
    assert not repeated_task(
        "Use F = m * a to find the force when mass is 2 kg and acceleration is 3 m/s².",
        "A 4 kg cart accelerates at 2 m/s². Use F = m * a to calculate the force.",
    )
    assert not repeated_task(
        "Use E = 0.5 * m * v^2 for a mass of 2 kg moving at 3 m/s.",
        "A 4 kg cart moves at 2 m/s. Use E = 0.5 * m * v^2 to calculate its energy.",
    )
    assert repeated_task(
        "Solve 3x + 4 = 19 and explain your steps.",
        "Try this equation and explain your reasoning: 3x+4=19.",
    )


@pytest.mark.parametrize(
    "criterion",
    [
        "State x = 5, then explain how subtracting 4 and dividing by 3 gives that result.",
        "The answer is 5. Explain how you found it.",
        "The answer is '5'. Explain how you found it.",
        "Write x=5 as your answer.",
    ],
)
def test_criteria_cannot_disclose_a_new_scalar_answer(criterion: str) -> None:
    with pytest.raises(ValidationError, match="must not disclose"):
        ActivityPayload(
            problem_text="Solve 3x + 4 = 19 and explain your steps.",
            concept_focus="Equations",
            success_criteria=[criterion],
        )


def test_criteria_can_refer_to_information_already_in_the_question() -> None:
    assert ActivityPayload(
        problem_text="Explain why x = 5 satisfies the supplied equation.",
        concept_focus="Checking a supplied solution",
        success_criteria=["Substitute x = 5 and compare the two sides."],
    )


@pytest.mark.parametrize(
    "field,text",
    [
        ("guidance", "Before you may continue, draw a diagram and provide two more examples."),
        ("guidance", "Now supply another example."),
        ("guidance", "Could you give two more supporting details?"),
        ("strengths", "You must write a full essay before you continue."),
        ("uncertainty_note", "You need to explain using another method."),
    ],
)
def test_sufficient_work_cannot_require_another_assignment_in_narrative(
    field: str, text: str
) -> None:
    data: dict[str, object] = {
        "teaching_action": "acknowledge",
        "learning_observation": LearningObservation(
            assessment="sufficient",
            evidence="One supported detail.",
            resolved_points=["Supports the interpretation"],
            open_points=[],
        ),
        "strengths": [],
        "guidance": ["That answers the question. You may continue."],
        "next_step": "",
        "concepts": [],
    }
    data[field] = text if field == "uncertainty_note" else [text]
    with pytest.raises(ValidationError, match="without a required next step"):
        FeedbackPayload.model_validate(data)


def test_sufficient_work_can_offer_an_explicitly_optional_extension() -> None:
    assert FeedbackPayload(
        teaching_action="acknowledge",
        learning_observation=LearningObservation(
            assessment="sufficient",
            evidence="One supported detail.",
            resolved_points=[],
            open_points=[],
        ),
        strengths=[],
        guidance=["That answers the question. If you'd like, try a different example."],
        next_step="",
        concepts=[],
    )


def test_acknowledgement_can_describe_a_completed_requirement_but_not_add_one_after_it() -> None:
    acknowledgement = "Your response is sufficient. You need to use same-sized wholes for the comparison, which you did."
    assert not required_follow_up(acknowledgement)
    assert required_follow_up(acknowledgement + " Now draw a diagram.")
    assert required_follow_up(
        "Before you may continue, draw a diagram and provide two more examples."
    )


@pytest.mark.parametrize(
    "text",
    [
        "Was that enough, or do I need to draw a diagram too?",
        "Is one specific example enough evidence here? I want a concise answer, not a full essay.",
        "Can I keep that as two short sentences?",
    ],
)
def test_reassurance_only_questions_do_not_claim_a_fresh_demonstration(text: str) -> None:
    assert sufficiency_question(text)


def test_new_work_followed_by_a_question_is_not_reassurance_only() -> None:
    assert not sufficiency_question(
        "I multiply both numerator and denominator by two. Was that enough?"
    )
    assert not sufficiency_question(
        "So an observation is the evidence, and the explanation connects it to the claim?"
    )
    assert not sufficiency_question(
        "Was that enough? Actually I now think the necklace was worth 3000."
    )


@pytest.mark.parametrize(
    "reference,task",
    [
        (
            "Use g = 9.8 m/s² to find the speed after falling for 2 seconds.",
            "A stone falls for 5 seconds. Use g = 9.8 m/s² to calculate its speed.",
        ),
        (
            "Use R = 8.31 to find the gas pressure for 2 moles at 300 K in 1 cubic metre.",
            "A vessel holds 4 moles at 280 K in 2 cubic metres. Use R = 8.31 to calculate pressure.",
        ),
    ],
)
def test_shared_given_constant_does_not_reject_distinct_practice(reference: str, task: str) -> None:
    assert not repeated_task(reference, task)
    assert repeated_task("Solve 3x = 19.", "Try this equation and explain your reasoning: 3x=19.")


@pytest.mark.parametrize(
    "criterion",
    [
        'Explain why your answer is "plausible" rather than proven.',
        'Show that your result is "supported by one relevant reason".',
    ],
)
def test_criteria_can_describe_evidence_quality_without_disclosing_an_answer(
    criterion: str,
) -> None:
    assert ActivityPayload(
        problem_text="Explain what the evidence can establish about the cause.",
        concept_focus="Evidence limits",
        success_criteria=[criterion],
    )


def test_acknowledgement_can_describe_completed_work_with_an_and_clause() -> None:
    completed = "You need to compare equal wholes, and you already did."
    assert not required_follow_up(completed)
    assert required_follow_up(completed + " Now supply another example.")
