"""Bounded rational grammar, exact verification and reproducible authored templates."""

import re
from dataclasses import dataclass
from fractions import Fraction
from math import gcd
from random import Random
from typing import Literal

SKILLS = (
    "fractions.equivalent",
    "fractions.simplify",
    "fractions.add",
    "fractions.subtract",
    "fractions.multiply",
    "fractions.divide",
    "equations.linear",
)
VALUE = re.compile(r"([+-]?\d{1,9})(?:\s*/\s*([+-]?\d{1,9})|\.(\d{1,6}))?", re.ASCII)


@dataclass(frozen=True)
class Parsed:
    value: Fraction
    simplified: bool


def parse_answer(text: str, *, equation: bool = False) -> Parsed:
    if len(text) > 128 or not text.isascii():
        raise ValueError("Use a bounded integer, fraction, or decimal.")
    normalized = text.strip()
    if equation and normalized.startswith("x"):
        normalized = re.sub(r"^x\s*=\s*", "", normalized)
    match = VALUE.fullmatch(normalized)
    if match is None:
        raise ValueError("Use an integer, fraction, or decimal (up to six decimal places).")
    whole, denominator, decimals = match.groups()
    if denominator is not None:
        n, d = int(whole), int(denominator)
        if d == 0:
            raise ValueError("The denominator cannot be zero.")
        return Parsed(Fraction(n, d), d > 0 and gcd(n, d) == 1)
    if decimals is not None:
        return Parsed(Fraction(whole + "." + decimals), True)
    return Parsed(Fraction(int(whole)), True)


@dataclass(frozen=True)
class Verdict:
    answer_status: Literal["correct", "incorrect", "unverifiable", "no_answer"]
    format_status: Literal["satisfied", "needs_simplification", "not_applicable", "unverifiable"]
    reasoning_status: str = "not_checked"


def verify(text: str, expected: str, simplest: bool = True, *, equation: bool = False) -> Verdict:
    if not text.strip():
        return Verdict("no_answer", "not_applicable")
    try:
        parsed = parse_answer(text, equation=equation)
    except ValueError:
        return Verdict("unverifiable", "unverifiable")
    return Verdict(
        "correct" if parsed.value == Fraction(expected) else "incorrect",
        "needs_simplification" if simplest and not parsed.simplified else "satisfied",
    )


@dataclass(frozen=True)
class Problem:
    skill: str
    seed: int
    text: str
    expected: str
    parameters: dict[str, int | str]
    simplest: bool = True


def generate(skill: str, seed: int, difficulty: str = "standard") -> Problem:
    if skill not in SKILLS or difficulty not in {"introductory", "standard", "challenge"}:
        raise ValueError("Unsupported skill or difficulty.")
    rng = Random(seed)
    bound = {"introductory": 6, "standard": 12, "challenge": 24}[difficulty]
    if skill == "equations.linear":
        a = rng.choice([-1, 1]) * rng.randint(1, bound)
        b, c = rng.randint(-bound, bound), rng.randint(-bound, bound)
        return Problem(
            skill,
            seed,
            f"{a}x {'+' if b >= 0 else '−'} {abs(b)} = {c}",
            str(Fraction(c - b, a)),
            {"a": a, "b": b, "c": c},
        )
    a, b, c, d = (rng.randint(1, bound) for _ in range(4))
    left, right = Fraction(a, b), Fraction(c, d)
    if skill.endswith("equivalent") or skill.endswith("simplify"):
        factor = rng.randint(2, 6)
        return Problem(
            skill,
            seed,
            f"Write {a * factor}/{b * factor} in simplest form.",
            str(left),
            {"n": a * factor, "d": b * factor},
        )
    operation = skill.split(".")[1]
    result = {
        "add": left + right,
        "subtract": left - right,
        "multiply": left * right,
        "divide": left / right,
    }[operation]
    symbol = {"add": "+", "subtract": "−", "multiply": "×", "divide": "÷"}[operation]
    return Problem(
        skill, seed, f"{left} {symbol} {right}", str(result), {"a": a, "b": b, "c": c, "d": d}
    )
