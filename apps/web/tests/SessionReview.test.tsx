import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Schema } from "../src/client";
import { SessionReview } from "../src/SessionReview";
import { TutorConversation } from "../src/TutorConversation";

const savedAt = "2026-10-23T12:34:00Z";
const feedback: Schema<"FeedbackPublic"> = {
  strengths: [],
  guidance: ["Explain how your observation supports the claim."],
  next_step: "",
  concepts: ["Evidence"],
  teaching_action: "coach",
  learning_observation: {
    assessment: "developing",
    evidence: "The response identifies an observation but does not explain it.",
    resolved_points: ["An observation is present."],
    open_points: ["Connect the observation to the claim."],
  },
};

function operation(
  changes: Partial<Schema<"OperationPublic">> = {},
): Schema<"OperationPublic"> {
  return {
    id: "synthetic-operation",
    problem_id: "synthetic-activity",
    kind: "answer",
    text: "My saved observation.",
    status: "completed",
    work_text: "",
    safe_error: null,
    retryable: false,
    created_at: savedAt,
    assistance_level: 1,
    source: "synthetic-local-tutor",
    prompt_version: "guidance-v4",
    feedback,
    ...changes,
  };
}

function savedSession(
  operations: Schema<"OperationPublic">[],
): Schema<"TutoringSessionPublic"> {
  return {
    id: "synthetic-session",
    learner_id: "synthetic-learner",
    status: "completed",
    topic: "Evidence and explanation",
    initiative: "balanced",
    difficulty: "standard",
    created_at: savedAt,
    problems: [
      {
        id: "synthetic-activity",
        session_id: "synthetic-session",
        skill_id: "open.subject",
        status: "skipped",
        version: 2,
        assistance_level: 2,
        operations,
        activity_state: "ready",
        problem_text: "Support a claim with evidence.",
        format_constraints: null,
        template_id: "ai-activity-v1",
        template_version: 1,
        created_at: savedAt,
        updated_at: savedAt,
      },
    ],
  };
}

afterEach(cleanup);

it("recaps explicit help and the last assessed discussion points when the latest message is a question", () => {
  render(
    <SessionReview
      session={savedSession([
        operation({ kind: "hint", assistance_level: 2, text: "" }),
        operation({
          id: "synthetic-follow-up",
          kind: "question",
          feedback: {
            ...feedback,
            teaching_action: "explain",
            learning_observation: {
              assessment: "not_assessed",
              evidence: "A question is not a new demonstration of work.",
              resolved_points: [],
              open_points: [],
            },
          },
        }),
      ])}
    />,
  );
  fireEvent.click(screen.getByText("Help and points to revisit"));
  expect(screen.getByText(/1 saved help request/)).toBeVisible();
  expect(
    screen.getByText(feedback.learning_observation!.open_points[0]!),
  ).toBeVisible();
  expect(
    screen.getByText(/Tutor’s last saved observations/).closest("p"),
  ).toHaveTextContent(feedback.learning_observation!.evidence);
  expect(
    screen.queryByText("The tutor recorded no open points in that response."),
  ).toBeNull();
  expect(
    screen.getByText(/These AI observations can be mistaken/),
  ).toBeVisible();
});

it.each([
  [1, "Requested a hint with this activity."],
  [2, "Requested a concept explanation."],
  [3, "Requested a different worked example."],
] as const)(
  "preserves the help request type %s with optional source/version and open-point details",
  (assistanceLevel, requestedHelp) => {
    render(
      <TutorConversation
        session={savedSession([
          operation({
            kind: "hint",
            text: "",
            assistance_level: assistanceLevel,
          }),
        ])}
        offline={false}
        disabled={false}
        active={false}
        act={async (action) => action()}
        refresh={vi.fn(async () => {})}
      />,
    );
    expect(
      screen.getByText(requestedHelp, { selector: ".learner-message p" }),
    ).toBeVisible();
    expect(screen.getByText("Response version: guidance-v4")).not.toBeVisible();
    fireEvent.click(screen.getByText("Response details"));
    expect(screen.getByText("Response version: guidance-v4")).toBeVisible();
    expect(screen.getByText(/synthetic-local-tutor/)).toBeVisible();
    expect(
      screen.getByText(feedback.learning_observation!.open_points[0]!),
    ).toBeVisible();
    expect(screen.getByText(/AI feedback can be mistaken/)).toBeVisible();
  },
);

it("does not treat a rejected photo report as a newer assessment in the recap", () => {
  render(
    <SessionReview
      session={savedSession([
        operation(),
        operation({
          id: "synthetic-rejected-photo",
          reading: {
            quality: "uncertain",
            confidence: 0.5,
            can_continue: false,
            transcription: "An uncertain reading of the claim.",
            ambiguities: ["The claim is unreadable."],
            organization_feedback: [],
            rejection_reason: "Send a clearer photo of the claim.",
          },
          feedback: {
            ...feedback,
            learning_observation: {
              assessment: "uncertain",
              evidence: "This rejected report must remain uncertain.",
              resolved_points: [],
              open_points: ["Unverified photo-only point."],
            },
          },
        }),
      ])}
    />,
  );
  fireEvent.click(screen.getByText("Help and points to revisit"));
  expect(
    screen.getByText(feedback.learning_observation!.open_points[0]!),
  ).toBeVisible();
  expect(screen.queryByText("Unverified photo-only point.")).toBeNull();
});

it("keeps historical unknown observations and response versions explicitly absent", () => {
  const historical = operation({
    prompt_version: null,
    feedback: {
      ...feedback,
      learning_observation: null,
      teaching_action: null,
    },
  });
  render(<SessionReview session={savedSession([historical])} />);
  fireEvent.click(screen.getByText("Help and points to revisit"));
  expect(
    screen.getByText("No observations about demonstrated work were saved."),
  ).toBeVisible();
  expect(screen.queryByText(/The tutor recorded no open points/)).toBeNull();
});
