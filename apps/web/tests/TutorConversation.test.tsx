import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TutorConversation } from "../src/TutorConversation";
import type { Schema } from "../src/client";

const feedback: Schema<"FeedbackPublic"> = {
  strengths: ["You identified the observation."],
  guidance: ["Explain how it supports your claim."],
  next_step: "Add one sentence connecting the evidence to the claim.",
  concepts: ["Evidence"],
  uncertainty_note: null,
  learning_observation: null,
  teaching_action: "coach",
};
function operation(
  overrides: Partial<Schema<"OperationPublic">> = {},
): Schema<"OperationPublic"> {
  return {
    id: "operation-one",
    problem_id: "problem-one",
    kind: "answer",
    text: "The plant by the window grew taller.",
    work_text: "",
    status: "completed",
    source: "synthetic",
    created_at: "2026-10-29T12:00:00Z",
    assistance_level: 0,
    retryable: false,
    safe_error: null,
    feedback,
    ...overrides,
  };
}
function session(
  operations: Schema<"OperationPublic">[],
): Schema<"TutoringSessionPublic"> {
  return {
    id: "session-one",
    learner_id: "learner-one",
    topic: "Evidence",
    learning_intent: "practice",
    initiative: "balanced",
    difficulty: "standard",
    status: "open",
    created_at: "2026-10-29T12:00:00Z",
    problems: [
      {
        id: "problem-one",
        session_id: "session-one",
        status: "assigned",
        version: 1,
        skill_id: "tutor.generated",
        template_id: "generated",
        template_version: 1,
        format_constraints: null,
        problem_text: "Compare the observations.",
        activity_state: "ready",
        assistance_level: 0,
        operations,
        created_at: "2026-10-29T12:00:00Z",
        updated_at: "2026-10-29T12:00:00Z",
      },
    ],
  };
}
function show(operations: Schema<"OperationPublic">[], offline = false) {
  return showSession(session(operations), offline);
}
function showSession(value: Schema<"TutoringSessionPublic">, offline = false) {
  return render(conversation(value, offline));
}
function conversation(value: Schema<"TutoringSessionPublic">, offline = false) {
  return (
    <TutorConversation
      session={value}
      offline={offline}
      disabled={false}
      active={true}
      act={async (action) => action()}
      refresh={async () => {}}
    />
  );
}
const reading: Schema<"ReadingPublic"> = {
  quality: "clear",
  confidence: 0.97,
  can_continue: true,
  organization_feedback: [],
  rejection_reason: null,
  ambiguities: [],
  transcription: "Two seedlings",
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("learning conversation", () => {
  it("keeps a finished session without saved responses neutral", () => {
    showSession({
      ...session([operation({ kind: "generation", feedback: null })]),
      status: "finished",
    });
    expect(
      screen.getByText(
        "No responses were saved. You can review the activity above.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(
        /Type a response|attach your work|ask for help|Send your work/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("directs an empty reference capture to the photo intake", () => {
    const value = session([]);
    value.problems[0]!.activity_state = "reference_capture";
    showSession(value);
    expect(
      screen.getByText(
        "Add a photo in the activity area. Its reading will appear here before we continue.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/Type a response/)).not.toBeInTheDocument();
  });

  it("invites a response when an assigned activity has no conversation yet", () => {
    show([]);
    expect(
      screen.getByText(
        "Start with your own thinking. Type a response, attach your work, or ask for help.",
      ),
    ).toBeVisible();
  });

  it("directs a stopped generation to material controls rather than an unavailable response box", () => {
    show([
      operation({
        kind: "generation",
        status: "canceled",
        feedback: null,
        text: "",
      }),
    ]);
    expect(
      screen.getByText(/Open Session & material to create another activity/),
    ).toBeVisible();
    expect(
      screen.queryByText(/You can send another response/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Type a response/)).not.toBeInTheDocument();
  });

  it("separates strengths, guidance and the next step, with an always visible AI disclosure", () => {
    show([operation()]);
    const response = screen.getByRole("region", { name: "Tutor response" });
    expect(
      within(response)
        .getAllByRole("heading")
        .map((node) => node.textContent),
    ).toEqual(["What’s working", "Guidance", "Try next"]);
    expect(
      within(response).getByText("AI guidance · Can be mistaken"),
    ).toBeVisible();
    expect(within(response).getByText(feedback.next_step)).toBeVisible();
  });

  it("does not invent a next step or empty strengths section when the model supplies none", () => {
    show([
      operation({ feedback: { ...feedback, strengths: [], next_step: "" } }),
    ]);
    expect(
      screen.queryByRole("heading", { name: "What’s working" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Try next" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Guidance" })).toBeVisible();
  });

  it("shows the photo interpretation before guidance and follows the backend continuation decision", () => {
    show([
      operation({
        reading: { ...reading, confidence: 0.7 },
        interpretation: "Two seedlings",
        ambiguities: ["A small mark is unclear."],
      }),
    ]);
    const photo = screen.getByRole("region", {
      name: "Reading from your photo",
    });
    const response = screen.getByRole("region", { name: "Tutor response" });
    expect(
      photo.compareDocumentPosition(response) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /approve|accept|confirm reading/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("This photo needs clarification."),
    ).not.toBeInTheDocument();
  });

  it("keeps rejected readings explicitly uncertain without presenting their feedback", () => {
    show([
      operation({
        reading: {
          ...reading,
          can_continue: false,
          rejection_reason: "Photograph the last line more closely.",
        },
        interpretation: "An uncertain line",
      }),
    ]);
    expect(screen.getByText("This photo needs clarification.")).toBeVisible();
    expect(
      screen.getByText("Photograph the last line more closely."),
    ).toBeVisible();
    expect(screen.getByText(/This reading is uncertain/)).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Tutor response" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry tutor response" }),
    ).not.toBeInTheDocument();
  });

  it("explains the pending photo stage and permits stopping the saved operation", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    show([operation({ status: "interpreting", feedback: null })]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reading your photo… Feedback will follow if the work is readable.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop response" }));
    await vi.waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/v1/operations/operation-one/cancel",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(
      screen.queryByRole("region", { name: "Tutor response" }),
    ).not.toBeInTheDocument();
  });

  it("retains saved work on provider failure and disables retry while offline", () => {
    show(
      [
        operation({
          status: "failed",
          feedback: null,
          safe_error: "The tutor is unavailable. Try again later.",
          retryable: true,
        }),
      ],
      true,
    );
    expect(
      screen.getByText(
        "Your submitted work is still saved in this conversation.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Retry tutor response" }),
    ).toBeDisabled();
    expect(
      screen.getByText("The plant by the window grew taller."),
    ).toBeVisible();
  });

  it("jumps to the beginning of a long latest exchange rather than its bottom", () => {
    show([
      operation({ id: "old" }),
      operation({ id: "latest", text: "Latest work" }),
    ]);
    const log = screen.getByRole("log");
    Object.defineProperties(log, {
      scrollHeight: { value: 3000 },
      clientHeight: { value: 400 },
    });
    const exchanges = within(log).getAllByRole("article");
    vi.spyOn(log, "getBoundingClientRect").mockReturnValue({
      top: 100,
      bottom: 500,
    } as DOMRect);
    vi.spyOn(exchanges[1]!, "getBoundingClientRect").mockReturnValue({
      top: 1100,
      bottom: 2300,
    } as DOMRect);
    log.scrollTop = 0;
    fireEvent.scroll(log);
    fireEvent.click(screen.getByRole("button", { name: "Latest messages ↓" }));
    expect(log.scrollTop).toBe(992);
    expect(log.scrollTop).not.toBe(log.scrollHeight);
  });

  it("auto-follows completed typed guidance past the learner's long response", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const top = this.matches(".conversation-scroll")
          ? 100
          : this.matches(".tutor-feedback")
            ? 1500
            : 900;
        return { top, bottom: top + 1000 } as DOMRect;
      },
    );
    const { rerender } = show([
      operation({ status: "tutoring", feedback: null }),
    ]);
    const log = screen.getByRole("log");
    log.scrollTop = 0;
    rerender(conversation(session([operation({ status: "completed" })])));
    // Feedback begins at 1500px; the learner exchange begins at 900px.
    expect(log.scrollTop).toBe(1392);
    expect(log.scrollTop).not.toBe(792);
    expect(
      screen.getByRole("region", { name: "Tutor response" }),
    ).toBeVisible();
  });

  it("auto-follows a completed photo to its reading before the tutor guidance", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const top = this.matches(".conversation-scroll")
          ? 100
          : this.matches(".photo-reading")
            ? 1200
            : this.matches(".tutor-feedback")
              ? 1700
              : 900;
        return { top, bottom: top + 1000 } as DOMRect;
      },
    );
    const { rerender } = show([
      operation({ status: "interpreting", feedback: null }),
    ]);
    const log = screen.getByRole("log");
    log.scrollTop = 0;
    rerender(
      conversation(
        session([
          operation({
            status: "completed",
            reading,
            interpretation: "Two seedlings",
          }),
        ]),
      ),
    );
    // The photo reading begins at 1200px, ahead of guidance at 1700px.
    expect(log.scrollTop).toBe(1092);
    expect(log.scrollTop).not.toBe(1592);
    const photo = screen.getByRole("region", {
      name: "Reading from your photo",
    });
    const response = screen.getByRole("region", { name: "Tutor response" });
    expect(
      photo.compareDocumentPosition(response) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("auto-follows a failed typed response to its error after long submitted work", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const top = this.matches(".conversation-scroll")
          ? 100
          : this.matches(".error")
            ? 1500
            : 900;
        return { top, bottom: top + 1000 } as DOMRect;
      },
    );
    const { rerender } = show([
      operation({ status: "tutoring", feedback: null }),
    ]);
    const log = screen.getByRole("log");
    log.scrollTop = 0;
    rerender(
      conversation(
        session([
          operation({
            status: "failed",
            feedback: null,
            retryable: true,
            safe_error: "The tutor is temporarily unavailable. Try again.",
          }),
        ]),
      ),
    );
    expect(log.scrollTop).toBe(1392);
    expect(log.scrollTop).not.toBe(792);
    expect(screen.getByRole("status")).toHaveTextContent(
      "The tutor is temporarily unavailable. Try again.",
    );
    expect(
      screen.getByRole("button", { name: "Retry tutor response" }),
    ).toBeEnabled();
  });

  it("preserves an earlier reading position and reveals Latest when a new exchange arrives without scrolling", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.matches(".conversation-scroll"))
          return { top: 100, bottom: 500 } as DOMRect;
        if (this.matches(".tutor-operation"))
          return this.textContent?.includes("New unseen response")
            ? ({ top: 1200, bottom: 2400 } as DOMRect)
            : ({ top: 50, bottom: 1100 } as DOMRect);
        return { top: 150, bottom: 1100 } as DOMRect;
      },
    );
    const earlier = operation({ id: "earlier", text: "Earlier long response" });
    const { rerender } = show([earlier]);
    const log = screen.getByRole("log");
    Object.defineProperties(log, {
      scrollHeight: { value: 3000 },
      clientHeight: { value: 400 },
    });
    // Let the initial programmatic positioning finish before the learner scrolls.
    await act(async () => {
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      );
    });
    log.scrollTop = 250;
    fireEvent.scroll(log);
    expect(
      screen.queryByRole("button", { name: "Latest messages ↓" }),
    ).not.toBeInTheDocument();

    rerender(
      conversation(
        session([
          earlier,
          operation({ id: "new", text: "New unseen response" }),
        ]),
      ),
    );
    // No scroll event occurs for the append: the content revision must expose
    // the jump affordance without moving the learner away from earlier work.
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Latest messages ↓" }),
      ).toBeVisible(),
    );
    expect(log.scrollTop).toBe(250);
    fireEvent.click(screen.getByRole("button", { name: "Latest messages ↓" }));
    expect(log.scrollTop).toBe(1342);
  });

  it.each(["ready", "reference_capture"] as const)(
    "marks a fresh %s activity after prior guidance and follows its start instead of the older response",
    async (activityState) => {
      vi.spyOn(
        HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockImplementation(function (this: HTMLElement) {
        const top = this.matches(".conversation-scroll")
          ? 100
          : this.matches(".conversation-start")
            ? 1800
            : this.matches(".tutor-feedback")
              ? 900
              : 600;
        return { top, bottom: top + 400 } as DOMRect;
      });
      const prior = session([operation()]);
      const { rerender } = showSession(prior);
      const log = screen.getByRole("log");
      log.scrollTop = 0;
      const earlier = prior.problems[0]!;
      const next: Schema<"TutoringSessionPublic"> = {
        ...prior,
        problems: [
          { ...earlier, status: "skipped" },
          {
            ...earlier,
            id: "next-problem",
            activity_state: activityState,
            operations:
              activityState === "ready"
                ? [
                    operation({
                      id: "next-generation",
                      kind: "generation",
                      feedback: null,
                    }),
                  ]
                : [],
          },
        ],
      };
      rerender(conversation(next));
      expect(log.scrollTop).toBe(1692);
      const start = screen.getByRole("region", {
        name: "Current activity start",
      });
      expect(start).toHaveTextContent(
        activityState === "ready"
          ? "Current activity · Ready for your response"
          : "Current activity · Add your photo",
      );
      expect(start).toHaveTextContent(
        activityState === "ready"
          ? "Start with your own thinking."
          : "Add a photo in the activity area.",
      );
      expect(
        screen.getAllByRole("region", { name: "Tutor response" }),
      ).toHaveLength(1);
      expect(screen.getByText("Earlier activity 1")).toBeVisible();

      Object.defineProperties(log, {
        scrollHeight: { value: 3000 },
        clientHeight: { value: 400 },
      });
      await act(async () => {
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => resolve()),
        );
      });
      log.scrollTop = 250;
      fireEvent.scroll(log);
      fireEvent.click(
        screen.getByRole("button", { name: "Latest messages ↓" }),
      );
      expect(log.scrollTop).toBe(1942);
    },
  );
});
