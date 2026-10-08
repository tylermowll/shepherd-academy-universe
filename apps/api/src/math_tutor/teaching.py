"""Conservative text guards, not semantic grading or a proof of tutor quality.

These recognize concrete failure forms. They never execute input, infer an answer,
or replace rejected model output with authored tutoring.
"""

import re
from difflib import SequenceMatcher

_ATOM = r"(?:\d+(?:\.\d+)?[a-z]?|[a-z])"
_EXPRESSION = rf"-?{_ATOM}(?:\s*[+*/^\-]\s*-?{_ATOM})*"
_EQUATION = re.compile(rf"(?<!\w){_EXPRESSION}\s*=\s*{_EXPRESSION}(?!\w)", re.I)
_TASK_START = re.compile(
    r"^(?:solve|calculate|find|write|explain|describe|compare|evaluate|simplify|factor|"
    r"prove|answer|which|what|why|how|who|when|where|identify|list|state|give|determine|"
    r"show|discuss|summari[sz]e)\b",
    re.I,
)


def _math_text(text: str) -> str:
    return text.casefold().replace("−", "-").replace("×", "*").replace("÷", "/")


def equations(text: str) -> set[str]:
    return {re.sub(r"\s+", "", match.group()) for match in _EQUATION.finditer(_math_text(text))}


def _numerical_constraint(equation: str) -> bool:
    left, right = equation.split("=")

    def scalar(side: str) -> bool:
        return bool(re.fullmatch(r"-?\d+(?:\.\d+)?", side))

    def expression(side: str) -> bool:
        return bool(re.search(r"[+*/^\-]|\d[a-z]", side))

    # Single given values, including physical constants, can legitimately recur.
    # Recognise a numerical constraint only with a nontrivial other side.
    return (scalar(left) and expression(right)) or (scalar(right) and expression(left))


def repeated_task(reference: str, generated: str) -> bool:
    """Catch literal/boilerplate repeats and unchanged equations, not all paraphrases."""

    def clean(value: str) -> str:
        return " ".join(re.findall(r"\w+|[=+*/^<>\-]", _math_text(value)))

    source, task = clean(reference), clean(generated)
    if not source:
        return False
    if source == task or (len(source) >= 20 and SequenceMatcher(None, source, task).ratio() > 0.96):
        return True
    # A shared symbolic formula is conceptual reference, not the assigned
    # numerical exercise: distinct force examples may both use F = m * a.
    if any(
        _numerical_constraint(equation) for equation in equations(reference) & equations(generated)
    ):
        return True
    # Reading quotations may legitimately recur in a new comprehension question.
    # Restrict the substring guard to recognisable assignment instructions.
    for sentence in re.split(r"(?<=[.!?])\s+|\n+", reference.strip()):
        candidate = clean(sentence)
        if len(candidate) >= 12 and _TASK_START.match(sentence.strip()) and candidate in task:
            return True
    return False


def answer_disclosing_criterion(problem: str, criterion: str) -> bool:
    """Recognise supplied scalar answers; broader answer leakage needs human review."""
    if re.search(
        r"\b(?:answer|solution|result)\s*(?:is|=|:)\s*(?:[\"'“‘]\s*)?[+−-]?\d+(?:\.\d+)?",
        criterion,
        re.I,
    ):
        return True
    supplied = equations(problem)
    return any(
        re.fullmatch(r"[a-z]=-?\d+(?:\.\d+)?", equation) and equation not in supplied
        for equation in equations(criterion)
    )


def required_follow_up(text: str) -> bool:
    """Reject explicit compulsory work in an acknowledgement's narrative fields."""
    actions = (
        r"draw|provide|supply|add|revise|rewrite|write|give|explain|try|complete|answer|"
        r"show|solve|do|make|find|check|compare|describe|calculate"
    )
    for sentence in re.split(r"(?<=[.!?])\s+|\n+", text.strip()):
        if re.search(r"\bbefore you (?:may |can )?(?:continue|move on|finish)\b", sentence, re.I):
            return True
        if re.search(
            r"\b(?:you (?:must|need to|have to)|you'll (?:need|have) to|required to)\b",
            sentence,
            re.I,
        ):
            # A tutor may explain a requirement already met. Only a terminal
            # explicit completion clause qualifies; a later new demand remains
            # a separate sentence and is still checked.
            if re.search(
                r"\b(?:which|as|and) you (?:already did|did|have (?:already )?done)(?: correctly)?[.!]?$",
                sentence,
                re.I,
            ):
                continue
            return True
        if re.match(
            r"(?:optional(?:ly)?\b|if (?:you (?:want|wish)|you(?:'d| would) like)|"
            r"you (?:may|can)\b|feel free\b|when you(?:'re| are) ready\b)",
            sentence,
            re.I,
        ):
            continue
        if re.match(rf"(?:(?:now|next|then),?\s+)?(?:{actions})\b", sentence, re.I):
            return True
        if re.match(rf"(?:could|can|would) you (?:please )?(?:{actions})\b", sentence, re.I):
            return True
    return False


def sufficiency_question(text: str) -> bool:
    """Only recognise bounded reassurance questions with no new submitted work."""
    if len(text) > 600:
        return False
    value = " ".join(text.strip().split())
    patterns = (
        r"was that enough(?:,? or do i need (?:to draw a diagram too|more evidence|a second example|an essay))?[?.!]*",
        r"is (?:that|this|my (?:answer|response)) (?:enough|sufficient)[?.!]*",
        r"is one (?:specific )?example enough(?: evidence)?(?: here)?\?(?: i want a concise answer, not a full essay\.)?",
        r"can i keep (?:that|this) as (?:two|three|one|[123]) (?:short )?sentences?\?",
        r"i only wanted to practice claims\. should i write the whole essay now\?",
    )
    return any(re.fullmatch(pattern, value, re.I) for pattern in patterns)
