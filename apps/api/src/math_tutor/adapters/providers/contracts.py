"""Provider-neutral, bounded requests; no model-controlled permissions or verdicts."""

from dataclasses import dataclass
from typing import Annotated, Any, Literal, Protocol, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from math_tutor.adapters.images import NORMALIZED_IMAGE_MIME_TYPE
from math_tutor.reading import OriginalPassage

# Context sizes cross the JSON API and are persisted in SQLite JSON. A signed
# 32-bit ceiling is exact in browser numbers, comfortably inside SQLite's signed
# 64-bit integer range, and leaves Python's request-budget arithmetic unbounded by
# machine-word overflow while accommodating current million-token models.
MAX_CONFIGURED_CONTEXT_LIMIT = 2_147_483_647
DEFAULT_TUTOR_OUTPUT_LIMIT = 16384
MAX_OUTPUT_TOKENS = 131072
DEFAULT_PROVIDER_ERROR_MESSAGE = "Provider could not complete this operation. Your work is saved."
ReasoningEffort = Literal["default", "minimal", "low", "medium", "high", "xhigh"]


class Capabilities(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    text_input: bool = True
    image_input: bool = False
    structured_output_mode: Literal["native", "json_prompt"] = "native"
    max_images: int = Field(default=1, ge=0, le=1)
    accepted_image_mime_types: list[str] = Field(
        default_factory=lambda: [NORMALIZED_IMAGE_MIME_TYPE]
    )
    configured_context_limit: int = Field(default=32768, ge=2048, le=MAX_CONFIGURED_CONTEXT_LIMIT)
    configured_output_limit: int = Field(
        default=DEFAULT_TUTOR_OUTPUT_LIMIT, ge=64, le=MAX_OUTPUT_TOKENS
    )
    reasoning_effort: ReasoningEffort = "default"


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    role: Literal["user", "assistant"]
    content: str = Field(max_length=32000)


class TutorPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal["1"] = "1"
    message_kind: Literal["hint", "explanation", "worked_example", "solution", "question_response"]
    message_markdown: str = Field(min_length=1, max_length=6000)
    suggested_next_action: Literal["revise_answer", "ask_question", "continue"]
    uncertainty_note: str | None = Field(default=None, max_length=500)


class InterpretationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    transcription: str = Field(max_length=4000)
    final_answer: str | None = Field(default=None, max_length=128)
    ambiguities: list[str] = Field(max_length=20)


class ActivityPayload(BaseModel):
    """A new practice activity, never an answer key or a solved reference."""

    model_config = ConfigDict(extra="forbid", frozen=True)
    problem_text: str = Field(min_length=12, max_length=4000)
    concept_focus: str = Field(min_length=1, max_length=500)
    success_criteria: list[Annotated[str, Field(min_length=1, max_length=300)]] = Field(
        min_length=1, max_length=3
    )
    passage: OriginalPassage | None = None


class ReadingPayload(BaseModel):
    """Visible work and readability, with no permissive quality defaults."""

    model_config = ConfigDict(extra="forbid", frozen=True)
    transcription: str = Field(max_length=8000)
    quality: Literal["clear", "uncertain", "unreadable"]
    confidence: float = Field(ge=0, le=1)
    ambiguities: list[str] = Field(max_length=20)
    organization_feedback: list[str] = Field(max_length=8)
    rejection_reason: str | None = Field(max_length=1000)


class LearningObservation(BaseModel):
    """Fallible evidence about this response, never a mastery score or a grade."""

    model_config = ConfigDict(extra="forbid", frozen=True)
    assessment: Literal["sufficient", "developing", "uncertain", "not_assessed"]
    evidence: str = Field(min_length=1, max_length=600)
    resolved_points: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(max_length=3)
    open_points: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(max_length=3)


class FeedbackContent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    strengths: list[str] = Field(max_length=5)
    guidance: list[str] = Field(min_length=1, max_length=5)
    next_step: str = Field(max_length=1000)
    concepts: list[str] = Field(max_length=5)
    uncertainty_note: str | None = Field(default=None, max_length=500)


TeachingAction = Literal["acknowledge", "clarify", "explain", "coach", "extend"]


class FeedbackPublic(FeedbackContent):
    """Historical feedback records absent structured observations as unknown."""

    teaching_action: TeachingAction | None
    learning_observation: LearningObservation | None


class FeedbackPayload(FeedbackContent):
    """Teaching observations are not grades, tools, or completion commands."""

    teaching_action: TeachingAction
    learning_observation: LearningObservation

    @model_validator(mode="after")
    def sufficient_work_has_no_extra_assignment(self) -> Self:
        if self.learning_observation.assessment == "sufficient" and (
            self.teaching_action != "acknowledge"
            or self.next_step.strip()
            or self.learning_observation.open_points
        ):
            raise ValueError("Sufficient work must be acknowledged without a required next step.")
        return self


class ModelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    operation_id: UUID
    stage: Literal["tutor", "vision"]
    purpose: Literal["legacy", "generate", "read", "review"] = "legacy"
    model_id: str
    system_instruction: str = Field(max_length=6000)
    ordered_messages: list[Message] = Field(max_length=32)
    private_image_bytes: bytes | None = Field(default=None, exclude=True)
    response_schema: dict[str, Any]
    max_output_tokens: int = Field(default=1200, ge=64, le=MAX_OUTPUT_TOKENS)
    timeout_seconds: int = Field(default=90, ge=1, le=90)


class ModelResult(BaseModel):
    validated_payload: (
        TutorPayload | InterpretationPayload | ActivityPayload | ReadingPayload | FeedbackPayload
    )
    provider_request_id: str | None = None
    model_id: str
    reported_usage: dict[str, int] = Field(default_factory=dict)
    latency_ms: int = 0
    finish_reason: str = "stop"


@dataclass
class ProviderError(Exception):
    code: str
    retryable: bool = False
    retry_after_seconds: int = 1
    safe_message: str = DEFAULT_PROVIDER_ERROR_MESSAGE
    provider_request_id: str | None = None
    completion_reason: str | None = None
    http_status: int | None = None


class Provider(Protocol):
    def complete(self, request: ModelRequest) -> ModelResult: ...
