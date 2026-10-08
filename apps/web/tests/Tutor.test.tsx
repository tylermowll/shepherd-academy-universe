import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tutor } from "../src/Tutor";
import { App } from "../src/App";
import type { Schema } from "../src/client";

const learner = "911c9abc-4e8e-424d-a914-4338187ba00a";
const sessionId = "911c9abc-4e8e-424d-a914-4338187ba00b";
const problemId = "911c9abc-4e8e-424d-a914-4338187ba00c";
const capabilities = {
  photos_available: true,
  photo_status: "Photos are read by the local vision provider.",
  tutoring_available: true,
  tutor_status: "Synthetic test provider, not a live quality claim.",
  text_processing: "local",
  external_problems: false,
};
const activity = (operations: unknown[] = [], state = "ready") => ({
  id: problemId,
  status: "assigned",
  version: 1,
  skill_id: "tutor.generated",
  problem_text:
    "Write an argument for protecting a neighborhood wetland. Support your claim with evidence.",
  concept_focus: "Evidence and persuasion",
  activity_state: state,
  reference_source: "topic",
  assistance_level: 0,
  operations,
});
const session = (problems: unknown[] = []) => ({
  id: sessionId,
  learner_id: learner,
  topic: "Persuasive writing",
  initiative: "balanced",
  difficulty: "standard",
  status: "open",
  problems,
});
const guidance = {
  strengths: ["You stated a clear position."],
  guidance: [
    "What evidence would help your reader understand why the wetland matters?",
  ],
  next_step: "Add one observation and explain how it supports your claim.",
  concepts: ["Supporting evidence"],
  uncertainty_note: null,
};
const operation = (overrides: Record<string, unknown> = {}) => ({
  id: "911c9abc-4e8e-424d-a914-4338187ba00d",
  problem_id: problemId,
  kind: "answer",
  text: "",
  work_text: "",
  status: "completed",
  source: "synthetic",
  created_at: "2026-09-07T10:00:00Z",
  interpretation: "Protect the wetland because it gives birds a home.",
  interpretation_version: 1,
  ambiguities: [],
  reading: {
    quality: "clear",
    confidence: 0.97,
    can_continue: true,
    organization_feedback: [
      "Your line spacing makes the argument easy to read.",
    ],
    rejection_reason: null,
  },
  feedback: guidance,
  ...overrides,
});
const response = (value: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(value), { status }));
const run = async (action: () => Promise<void>) => action();

function installSession(value: ReturnType<typeof session>) {
  window.location.hash = `tutor=${sessionId}`;
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(value);
    if (url.endsWith("/tutor/sessions")) return response([value]);
    if (options.method === "POST") return response({});
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("AI learning conversation", () => {
  it("keeps one composer with compact photo and next-activity controls", async () => {
    const fetcher = installSession(session([activity()]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    const reply = await screen.findByLabelText("Your work or question");
    expect(
      screen.getByRole("log", { name: "Learning conversation" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Send" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ask about this" })).toBeNull();
    expect(screen.getByText("Upload a photo")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    expect(screen.getByText("Upload a photo")).toBeVisible();
    expect(screen.getByLabelText("Take or choose a photo")).toBeVisible();
    expect(
      reply.compareDocumentPosition(screen.getByText("Upload a photo")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(screen.getByText("Next activity options"));
    await vi.waitFor(() =>
      expect(screen.getByText("Upload a photo")).not.toBeVisible(),
    );
    const easier = screen.getByRole("button", { name: "Easier next activity" });
    expect(easier).toBeVisible();
    fireEvent.click(easier);
    await vi.waitFor(() => {
      const sent = fetcher.mock.calls.find(([url]) =>
        url.endsWith("/activities"),
      );
      expect(sent).toBeDefined();
      expect(JSON.parse(sent![1].body as string)).toEqual({
        source: "topic",
        difficulty: "introductory",
      });
    });
  });

  it("preserves a photo draft when menus or remote operation changes dismiss attachments", async () => {
    let current = session([activity()]);
    let currentLoads = 0;
    const NativeUrl = URL;
    vi.stubGlobal(
      "URL",
      Object.assign(class extends NativeUrl {}, {
        createObjectURL: vi.fn(() => "blob:photo-preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
    window.location.hash = `tutor=${sessionId}`;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`)) {
          currentLoads += 1;
          return response(current);
        }
        if (url.endsWith("/tutor/sessions")) return response([current]);
        if (url.endsWith("/images/preview"))
          return Promise.resolve(
            new Response(new Blob(["preview"], { type: "image/png" })),
          );
        throw new Error(url);
      }),
    );
    render(<Tutor learner={learner} offline={false} act={run} />);
    await screen.findByLabelText("Your work or question");
    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    fireEvent.change(screen.getByLabelText("Take or choose a photo"), {
      target: {
        files: [new File(["photo"], "work.png", { type: "image/png" })],
      },
    });
    expect(
      await screen.findByAltText("Your photograph before submission"),
    ).toBeVisible();

    fireEvent.click(screen.getByText("Help"));
    await vi.waitFor(() =>
      expect(screen.getByText("Upload a photo")).not.toBeVisible(),
    );
    expect(
      screen.getByRole("button", { name: "Give me a hint" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    expect(
      screen.getByAltText("Your photograph before submission"),
    ).toBeVisible();
    current = session([
      activity([
        operation({
          status: "failed",
          interpretation: null,
          interpretation_version: null,
          reading: null,
          feedback: null,
          safe_error: "The photograph could not be read.",
        }),
      ]),
    ]);
    fireEvent(window, new Event("online"));
    await vi.waitFor(() => expect(currentLoads).toBeGreaterThanOrEqual(2));
    await vi.waitFor(() =>
      expect(screen.getByText("Upload a photo")).not.toBeVisible(),
    );
    expect(
      screen.getByAltText("Your photograph before submission"),
    ).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    expect(
      screen.getByAltText("Your photograph before submission"),
    ).toBeVisible();
  });

  it("starts a non-math topic with no level, templates, or solution controls", async () => {
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`))
        return response(session());
      if (url.endsWith("/tutor/sessions"))
        return response(options.method === "POST" ? session() : []);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<Tutor learner={learner} offline={false} act={run} />);
    fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
      target: { value: "Persuasive writing" },
    });
    expect(screen.getByRole("group", { name: "Tutor style" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Tutor style"), {
      target: { value: "learner_led" },
    });
    fireEvent.change(screen.getByLabelText("Activity difficulty"), {
      target: { value: "challenge" },
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start session" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start session" }));
    expect(
      await screen.findByRole("button", { name: "Create practice activity" }),
    ).toBeEnabled();
    const sent = fetcher.mock.calls.find(
      ([url, options]) =>
        url.endsWith("/tutor/sessions") && options.method === "POST",
    );
    expect(JSON.parse(sent![1].body as string)).toEqual({
      learner_id: learner,
      topic: "Persuasive writing",
      initiative: "learner_led",
      difficulty: "challenge",
      initial_activity: { source: "topic" },
    });
    expect(screen.queryByLabelText(/level|skill|grade/i)).toBeNull();
    expect(screen.queryByText("Full solution")).toBeNull();
  });

  it("uses pasted assignments only as reference for distinct practice", async () => {
    const fetcher = installSession(session());
    render(<Tutor learner={learner} offline={false} act={run} />);
    await screen.findByText("Choose practice material");
    fireEvent.change(await screen.findByLabelText("Practice source"), {
      target: { value: "reference_text" },
    });
    expect(screen.getByText(/The tutor uses your material/)).toHaveTextContent(
      "create different practice",
    );
    expect(screen.getByText(/The tutor uses your material/)).toHaveTextContent(
      "cannot access a book from its title",
    );
    fireEvent.change(screen.getByLabelText("Reference material"), {
      target: {
        value: "Homework: argue whether a historical decision was justified.",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create practice activity" }),
    );
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.some(([url]) => url.endsWith("/activities")),
      ).toBe(true),
    );
    const sent = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/activities"),
    )!;
    expect(JSON.parse(sent[1].body as string)).toEqual({
      source: "reference_text",
      reference_text:
        "Homework: argue whether a historical decision was justified.",
    });
  });

  it("offers the phone capture route for a source photo without solving it", async () => {
    installSession(session([activity([], "reference_capture")]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    expect(
      await screen.findByRole("button", { name: "Take photo with phone" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/Photograph the reference material/),
    ).toHaveTextContent("not solve the original assignment");
    expect(screen.getByLabelText("Take or choose a photo")).toHaveAttribute(
      "capture",
      "environment",
    );
    expect(screen.queryByRole("combobox", { name: "Purpose" })).toBeNull();
    expect(screen.queryByLabelText("Your work or question")).toBeNull();
  });

  it("keeps a lost reference-photo receipt reachable after capture completes", async () => {
    let current = session([activity([], "reference_capture")]);
    let currentLoads = 0;
    const errors: unknown[] = [];
    const NativeUrl = URL;
    vi.stubGlobal(
      "URL",
      Object.assign(class extends NativeUrl {}, {
        createObjectURL: vi.fn(() => "blob:reference-preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
    window.location.hash = `tutor=${sessionId}`;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`)) {
          currentLoads += 1;
          return response(current);
        }
        if (url.endsWith("/tutor/sessions")) return response([current]);
        if (url.endsWith("/images/preview"))
          return Promise.resolve(
            new Response(new Blob(["preview"], { type: "image/png" })),
          );
        if (url.includes(`/problems/${problemId}/photos?`))
          return Promise.reject(new TypeError("Synthetic lost receipt"));
        throw new Error(url);
      }),
    );
    render(
      <Tutor
        learner={learner}
        offline={false}
        act={async (action) => {
          try {
            await action();
          } catch (cause) {
            errors.push(cause);
          }
        }}
      />,
    );
    fireEvent.change(await screen.findByLabelText("Take or choose a photo"), {
      target: {
        files: [new File(["photo"], "reference.png", { type: "image/png" })],
      },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Submit this photograph" }),
    );
    expect(
      await screen.findByRole("button", { name: "Retry saved photograph" }),
    ).toBeVisible();
    expect(errors).toHaveLength(1);

    current = session([
      activity(
        [
          operation({
            status: "failed",
            interpretation: null,
            interpretation_version: null,
            reading: null,
            feedback: null,
            safe_error: "The reference photograph could not be read.",
          }),
        ],
        "ready",
      ),
    ]);
    fireEvent(window, new Event("online"));
    await vi.waitFor(() => expect(currentLoads).toBeGreaterThanOrEqual(2));
    await screen.findByLabelText("Your work or question");
    expect(
      screen.getByRole("button", { name: "Retry saved photograph" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Attach photo" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Attach photo" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the reading before specific guidance with no approval request or button", async () => {
    const fetcher = installSession(session([activity([operation()])]));
    const { container } = render(
      <Tutor learner={learner} offline={false} act={run} />,
    );
    const reading = await screen.findByRole("region", {
      name: "Reading from your photo",
    });
    const feedback = screen.getByRole("region", { name: "Tutor response" });
    expect(
      reading.compareDocumentPosition(feedback) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(reading).getByText(/Protect the wetland/)).toBeVisible();
    expect(within(reading).getByText(/line spacing/)).not.toBeVisible();
    fireEvent.click(within(reading).getByText("Reading details"));
    expect(within(reading).getByText(/line spacing/)).toBeVisible();
    expect(within(feedback).getByText(guidance.guidance[0]!)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /confirm|approve|accept/i }),
    ).toBeNull();
    expect(screen.queryByLabelText(/transcription/i)).toBeNull();
    expect(container.querySelector(".verdict")).toBeNull();
    expect(
      fetcher.mock.calls.filter(([, options]) => options.method === "POST"),
    ).toHaveLength(0);
  });

  it("rejects low-confidence readings and offers clearer work without tutoring guessed text", async () => {
    const uncertain = operation({
      status: "failed",
      ambiguities: ["The second sentence overlaps the first."],
      reading: {
        quality: "uncertain",
        confidence: 0.46,
        can_continue: false,
        organization_feedback: ["Put each sentence on a separate line."],
        rejection_reason: "Overlapping writing makes the argument unclear.",
      },
      // Even inconsistent server data must not present feedback on rejected text.
      feedback: guidance,
    });
    const fetcher = installSession(session([activity([uncertain])]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    expect(
      await screen.findByText("This photo needs clarification."),
    ).toBeVisible();
    fireEvent.click(screen.getByText("Reading details"));
    expect(
      screen.getByText("Put each sentence on a separate line."),
    ).toBeVisible();
    expect(screen.queryByRole("region", { name: "Tutor response" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Retry tutor response" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    expect(
      screen.getByRole("button", { name: "Take photo with phone" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Your work or question")).not.toHaveAttribute(
      "readonly",
    );
    expect(
      fetcher.mock.calls.filter(([, options]) => options.method === "POST"),
    ).toHaveLength(0);
  });

  it("shares full written work and continues discussion instead of demanding a final answer", async () => {
    const fetcher = installSession(session([activity([operation()])]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    fireEvent.change(await screen.findByLabelText("Your work or question"), {
      target: {
        value:
          "I added an observation about nesting birds. Does it support my claim?",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.some(([url]) => url.endsWith("/submissions")),
      ).toBe(true),
    );
    const sent = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/submissions"),
    )!;
    expect(JSON.parse(sent[1].body as string)).toMatchObject({
      kind: "answer",
      text: "I added an observation about nesting birds. Does it support my claim?",
      work_text: "",
      version: 1,
    });
    expect(screen.queryByText("Check answer")).toBeNull();
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Next activity" }),
      ).toBeEnabled(),
    );
  });

  it("changes tutor initiative without introducing a homework solution setting", async () => {
    const fetcher = installSession(session([activity()]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    fireEvent.click(await screen.findByText("Session & material"));
    fireEvent.click(screen.getByText("Session settings"));
    fireEvent.change(screen.getByLabelText("Tutor style for this session"), {
      target: { value: "tutor_led" },
    });
    fireEvent.change(screen.getByLabelText("Activity difficulty"), {
      target: { value: "introductory" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save session settings" }),
    );
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.some(([url]) => url.endsWith("/settings")),
      ).toBe(true),
    );
    const sent = fetcher.mock.calls.find(([url]) => url.endsWith("/settings"))!;
    expect(JSON.parse(sent[1].body as string)).toEqual({
      initiative: "tutor_led",
      difficulty: "introductory",
    });
    expect(
      screen.getByText(/Supplied homework is used for related practice only/),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Full solution/ })).toBeNull();
  });

  it("blocks competing work while a reading is being processed", async () => {
    installSession(
      session([
        activity([
          operation({
            status: "interpreting",
            reading: null,
            feedback: null,
            interpretation: null,
          }),
        ]),
      ]),
    );
    render(<Tutor learner={learner} offline={false} act={run} />);
    expect(await screen.findByText("Reading your photograph…")).toBeVisible();
    expect(document.querySelector(".spinner")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AI tutor" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(await screen.findByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByLabelText("Your work or question")).toHaveAttribute(
      "readonly",
    );
    expect(
      screen.getByRole("button", { name: "Next activity" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    expect(
      screen.getByRole("button", { name: "Take photo with phone" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop response" })).toBeEnabled();
  });

  it("shows the persisted provider code and only offers valid retries", async () => {
    const failure = operation({
      status: "failed",
      reading: null,
      feedback: null,
      interpretation: null,
      safe_error:
        "The photo reader rejected the request. Ask an adult to check the model and connection settings. Your work is saved.",
      error_code: "invalid_request",
      retryable: false,
    });
    installSession(session([activity([failure])]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    expect(
      await screen.findByText("Diagnostic code: invalid_request"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Retry tutor response" }),
    ).toBeNull();
  });

  it("keeps the original session request and key when its acknowledgement is lost", async () => {
    const errors: unknown[] = [];
    let attempts = 0;
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`))
        return response(session());
      if (url.endsWith("/tutor/sessions") && options.method === "POST") {
        attempts += 1;
        if (attempts === 1)
          return Promise.reject(new TypeError("Lost acknowledgement"));
        return response(session());
      }
      if (url.endsWith("/tutor/sessions")) return response([]);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    render(
      <Tutor
        learner={learner}
        offline={false}
        act={async (action) => {
          try {
            await action();
          } catch (cause) {
            errors.push(cause);
          }
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
      target: { value: "Persuasive writing" },
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start session" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start session" }));
    const retry = await screen.findByRole("button", {
      name: "Retry saved request",
    });
    expect(screen.getByLabelText("Topic or learning goal")).toBeDisabled();
    fireEvent.click(retry);
    expect(
      await screen.findByRole("button", { name: "Create practice activity" }),
    ).toBeEnabled();
    const sent = fetcher.mock.calls.filter(
      ([url, options]) =>
        url.endsWith("/tutor/sessions") && options.method === "POST",
    );
    expect(sent).toHaveLength(2);
    expect(sent[1]![1].body).toBe(sent[0]![1].body);
    expect(
      (sent[1]![1].headers as Record<string, string>)["Idempotency-Key"],
    ).toBe((sent[0]![1].headers as Record<string, string>)["Idempotency-Key"]);
    expect(errors).toHaveLength(1);
  });

  it("keeps a created session open when its follow-up refresh fails", async () => {
    const created = session([activity()]);
    const errors: unknown[] = [];
    let saved = false;
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`))
        return Promise.reject(new TypeError("Synthetic refresh loss"));
      if (url.endsWith("/tutor/sessions") && options.method === "POST") {
        saved = true;
        return response(created, 201);
      }
      if (url.endsWith("/tutor/sessions"))
        return response(saved ? [created] : []);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    render(
      <Tutor
        learner={learner}
        offline={false}
        act={async (action) => {
          try {
            await action();
          } catch (cause) {
            errors.push(cause);
          }
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
      target: { value: "Persuasive writing" },
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start session" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start session" }));

    expect(
      await screen.findByText(
        "Your session was saved, but its latest state could not be refreshed. Reconnect to continue.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Your work or question")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start session" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Retry saved request" }),
    ).toBeNull();
    expect(window.location.hash).toBe(`#tutor=${sessionId}`);
    expect(
      fetcher.mock.calls.filter(
        ([url, options]) =>
          url.endsWith("/tutor/sessions") && options.method === "POST",
      ),
    ).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("makes AI tutoring the only private practice interface", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/auth/session"))
          return response({
            authenticated: true,
            role: "learner",
            learner_id: learner,
            csrf_token: "synthetic",
          });
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith("/tutor/sessions")) return response([]);
        throw new Error(url);
      }),
    );
    render(<App />);
    expect(
      await screen.findByLabelText("Topic or learning goal"),
    ).toBeVisible();
    expect(
      screen.queryByText(
        /Built-in math|offline practice pack|Tutor profiles|Full solution/,
      ),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Shepherd Academy Universe" }),
    ).toBeVisible();
  });

  it("shows one current activity and keeps the response draft across page changes", async () => {
    installSession(session([activity([operation()])]));
    const draftChanged = vi.fn();
    const props = {
      learner,
      offline: false,
      act: run,
      onDraftChange: draftChanged,
    };
    const view = render(<Tutor {...props} />);
    const input = await screen.findByLabelText("Your work or question");
    expect(screen.getAllByText(activity().problem_text)).toHaveLength(1);
    expect(screen.queryByLabelText("Topic or learning goal")).toBeNull();
    fireEvent.change(input, {
      target: { value: "An unsent observation about birds." },
    });
    expect(screen.getByRole("button", { name: "New session" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next activity" }),
    ).toBeDisabled();
    expect(draftChanged).toHaveBeenLastCalledWith(true);
    view.rerender(<Tutor {...props} page="history" />);
    expect(
      screen.getByRole("heading", { name: "Saved sessions" }),
    ).toBeVisible();
    expect(input).not.toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continue session" }),
    ).toBeEnabled();
    view.rerender(<Tutor {...props} active={false} />);
    view.rerender(<Tutor {...props} active />);
    expect(screen.getByLabelText("Your work or question")).toBe(input);
    expect(input).toHaveValue("An unsent observation about birds.");
    fireEvent.change(input, { target: { value: "" } });
    expect(draftChanged).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "New session" }));
    expect(screen.getByLabelText("Topic or learning goal")).toBeVisible();
    expect(input).not.toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Back to current session" }),
    );
    expect(input).toBeVisible();
  });

  it("does not let hidden reference text block the current session", async () => {
    installSession(session([activity()]));
    const draftChanged = vi.fn();
    render(
      <Tutor
        learner={learner}
        offline={false}
        act={run}
        onDraftChange={draftChanged}
      />,
    );
    await screen.findByLabelText("Your work or question");
    fireEvent.click(screen.getByText("Session & material"));
    fireEvent.click(screen.getByText("Use different practice material"));
    const source = screen.getByLabelText("Practice source");
    fireEvent.change(source, { target: { value: "reference_text" } });
    fireEvent.change(screen.getByLabelText("Reference material"), {
      target: { value: "A reference draft to preserve." },
    });
    expect(screen.getByRole("button", { name: "New session" })).toBeDisabled();
    expect(draftChanged).toHaveBeenLastCalledWith(true);

    fireEvent.change(source, { target: { value: "topic" } });
    expect(screen.queryByLabelText("Reference material")).toBeNull();
    expect(screen.getByRole("button", { name: "New session" })).toBeEnabled();
    await vi.waitFor(() =>
      expect(draftChanged).toHaveBeenLastCalledWith(false),
    );

    fireEvent.change(source, { target: { value: "reference_text" } });
    expect(screen.getByLabelText("Reference material")).toHaveValue(
      "A reference draft to preserve.",
    );
  });

  it("opens an owned history session and preserves page query parameters", async () => {
    const navigate = vi.fn();
    const own = session([activity()]);
    const other = {
      ...own,
      id: "another-session",
      learner_id: "another-learner",
      topic: "Private other learner work",
    };
    window.history.replaceState(null, "", "/?page=history");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(own);
        if (url.endsWith("/tutor/sessions")) return response([own, other]);
        throw new Error(url);
      }),
    );
    render(
      <Tutor
        learner={learner}
        offline={false}
        act={run}
        page="history"
        onNavigate={navigate}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Continue session" }),
    );
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("practice"));
    expect(window.location.search).toBe("?page=history");
    expect(window.location.hash).toBe(`#tutor=${sessionId}`);
    expect(screen.queryByText(other.topic)).toBeNull();
  });

  it("keeps polling the current session after another session fails to load", async () => {
    const secondId = "911c9abc-4e8e-424d-a914-4338187ba00e";
    const current = session([activity()]);
    const other = { ...current, id: secondId, topic: "Photosynthesis" };
    const errors: unknown[] = [];
    let currentLoads = 0;
    let otherLoads = 0;
    window.history.replaceState(null, "", `/?page=history#tutor=${sessionId}`);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`)) {
          currentLoads += 1;
          return response(current);
        }
        if (url.endsWith(`/tutor/sessions/${secondId}`)) {
          otherLoads += 1;
          return Promise.reject(new TypeError("Synthetic session load loss"));
        }
        if (url.endsWith("/tutor/sessions")) return response([current, other]);
        throw new Error(url);
      }),
    );
    render(
      <Tutor
        learner={learner}
        offline={false}
        page="history"
        act={async (action) => {
          try {
            await action();
          } catch (cause) {
            errors.push(cause);
          }
        }}
      />,
    );
    const otherHeading = await screen.findByRole("heading", {
      name: "Photosynthesis",
    });
    fireEvent.click(
      within(otherHeading.closest("article")!).getByRole("button", {
        name: "Continue session",
      }),
    );
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(window.location.hash).toBe(`#tutor=${sessionId}`);

    fireEvent(window, new Event("online"));
    await vi.waitFor(() => expect(currentLoads).toBeGreaterThanOrEqual(2));
    expect(otherLoads).toBe(1);
    expect(window.location.hash).toBe(`#tutor=${sessionId}`);
  });

  it("lets an explicit History selection finish before background polling", async () => {
    const secondId = "911c9abc-4e8e-424d-a914-4338187ba00e";
    const current = session([activity()]);
    const other = { ...current, id: secondId, topic: "Photosynthesis" };
    const hashesAtNavigate: string[] = [];
    const navigate = vi.fn(() => hashesAtNavigate.push(window.location.hash));
    let currentLoads = 0;
    let otherLoads = 0;
    let resolveOther!: (response: Response) => void;
    const otherRequest = new Promise<Response>((resolve) => {
      resolveOther = resolve;
    });
    window.history.replaceState(null, "", `/?page=history#tutor=${sessionId}`);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`)) {
          currentLoads += 1;
          return response(current);
        }
        if (url.endsWith(`/tutor/sessions/${secondId}`)) {
          otherLoads += 1;
          return otherRequest;
        }
        if (url.endsWith("/tutor/sessions")) return response([current, other]);
        throw new Error(url);
      }),
    );
    render(
      <Tutor
        learner={learner}
        offline={false}
        page="history"
        act={run}
        onNavigate={navigate}
      />,
    );
    const otherHeading = await screen.findByRole("heading", {
      name: "Photosynthesis",
    });
    fireEvent.click(
      within(otherHeading.closest("article")!).getByRole("button", {
        name: "Continue session",
      }),
    );
    await vi.waitFor(() => expect(otherLoads).toBe(1));

    const loadsBeforeOnline = currentLoads;
    fireEvent(window, new Event("online"));
    expect(currentLoads).toBe(loadsBeforeOnline);
    resolveOther(new Response(JSON.stringify(other)));

    await vi.waitFor(() =>
      expect(hashesAtNavigate).toEqual([`#tutor=${secondId}`]),
    );
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("practice");
    expect(window.location.hash).toBe(`#tutor=${secondId}`);
  });

  it("lets a browser History selection finish before its page refresh", async () => {
    const secondId = "911c9abc-4e8e-424d-a914-4338187ba00e";
    const current = session([activity()]);
    const other = { ...current, id: secondId, topic: "Photosynthesis" };
    let currentLoads = 0;
    let otherLoads = 0;
    let resolveOther!: (response: Response) => void;
    const otherRequest = new Promise<Response>((resolve) => {
      resolveOther = resolve;
    });
    window.history.replaceState(null, "", `/?page=history#tutor=${sessionId}`);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`)) {
          currentLoads += 1;
          return response(current);
        }
        if (url.endsWith(`/tutor/sessions/${secondId}`)) {
          otherLoads += 1;
          return otherRequest;
        }
        if (url.endsWith("/tutor/sessions")) return response([current, other]);
        throw new Error(url);
      }),
    );
    const view = render(
      <Tutor learner={learner} offline={false} page="history" act={run} />,
    );
    await screen.findByRole("heading", { name: "Photosynthesis" });

    window.history.replaceState(null, "", `/?page=practice#tutor=${secondId}`);
    fireEvent(window, new PopStateEvent("popstate"));
    await vi.waitFor(() => expect(otherLoads).toBe(1));
    const loadsBeforePageChange = currentLoads;
    view.rerender(
      <Tutor learner={learner} offline={false} page="practice" act={run} />,
    );
    expect(currentLoads).toBe(loadsBeforePageChange);
    resolveOther(new Response(JSON.stringify(other)));

    expect(
      await screen.findByRole("heading", {
        name: "Photosynthesis",
        level: 2,
      }),
    ).toBeVisible();
    expect(window.location.hash).toBe(`#tutor=${secondId}`);
  });

  it("keeps an unsent response when asking for a hint", async () => {
    const fetcher = installSession(session([activity()]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    const input = await screen.findByLabelText("Your work or question");
    fireEvent.change(input, { target: { value: "An unfinished argument." } });
    fireEvent.click(screen.getByText("Help"));
    fireEvent.click(screen.getByRole("button", { name: "Give me a hint" }));
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.some(([url]) => url.endsWith("/submissions")),
      ).toBe(true),
    );
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Give me a hint" }),
      ).toBeEnabled(),
    );
    expect(input).toHaveValue("An unfinished argument.");
    const request = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/submissions"),
    )!;
    expect(JSON.parse(request[1].body as string)).toMatchObject({
      kind: "hint",
      text: "",
      help_level: 1,
    });
  });

  it("restores the session in the URL when the browser goes back", async () => {
    const secondId = "911c9abc-4e8e-424d-a914-4338187ba00e";
    const first = session([activity()]);
    const second = { ...first, id: secondId, topic: "Photosynthesis" };
    window.history.pushState(null, "", `/?page=practice#tutor=${sessionId}`);
    window.history.pushState(null, "", `/?page=practice#tutor=${secondId}`);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`))
          return response(first);
        if (url.endsWith(`/tutor/sessions/${secondId}`))
          return response(second);
        if (url.endsWith("/tutor/sessions")) return response([first, second]);
        throw new Error(url);
      }),
    );
    render(<Tutor learner={learner} offline={false} act={run} />);
    expect(
      await screen.findByRole("heading", { name: "Photosynthesis" }),
    ).toBeVisible();
    window.history.back();
    expect(
      await screen.findByRole("heading", { name: "Persuasive writing" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Photosynthesis" }),
    ).toBeNull();
    expect(window.location.hash).toBe(`#tutor=${sessionId}`);
    expect(window.location.search).toBe("?page=practice");
  });

  it("preserves the current session and draft when browser Back targets another session", async () => {
    const secondId = "911c9abc-4e8e-424d-a914-4338187ba00e";
    const first = session([activity()]);
    const second = { ...first, id: secondId, topic: "Photosynthesis" };
    window.history.pushState(null, "", `/?page=practice#tutor=${sessionId}`);
    window.history.pushState(null, "", `/?page=history#tutor=${secondId}`);
    const fetcher = vi.fn((url: string) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${secondId}`)) return response(second);
      if (url.endsWith("/tutor/sessions")) return response([first, second]);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<Tutor learner={learner} offline={false} act={run} />);
    const input = await screen.findByLabelText("Your work or question");
    fireEvent.change(input, {
      target: { value: "Keep my unfinished response." },
    });
    window.history.back();
    expect(
      await screen.findByText(
        "Send or clear your draft in Practice before switching sessions.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Photosynthesis" }),
    ).toBeVisible();
    expect(input).toHaveValue("Keep my unfinished response.");
    expect(window.location.hash).toBe(`#tutor=${secondId}`);
    expect(window.location.search).toBe("?page=practice");
    expect(
      fetcher.mock.calls.some(([url]) =>
        url.endsWith(`/tutor/sessions/${sessionId}`),
      ),
    ).toBe(false);
  });

  it("keeps an uncertain submission and its retry identity while History is open", async () => {
    const value = session([activity()]);
    let attempts = 0;
    const busyChanged = vi.fn();
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(value);
      if (url.endsWith("/tutor/sessions")) return response([value]);
      if (url.endsWith("/submissions") && options.method === "POST") {
        attempts += 1;
        if (attempts === 1)
          return Promise.reject(new TypeError("Lost receipt"));
        return response({});
      }
      throw new Error(url);
    });
    window.location.hash = `tutor=${sessionId}`;
    vi.stubGlobal("fetch", fetcher);
    const caught: unknown[] = [];
    const props = {
      learner,
      offline: false,
      onBusyChange: busyChanged,
      act: async (action: () => Promise<void>) => {
        try {
          await action();
        } catch (error) {
          caught.push(error);
        }
      },
    };
    const view = render(<Tutor {...props} />);
    fireEvent.change(await screen.findByLabelText("Your work or question"), {
      target: { value: "Keep this draft." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByRole("button", { name: "Retry saved request" });
    expect(busyChanged).toHaveBeenLastCalledWith(true);
    view.rerender(<Tutor {...props} page="history" />);
    expect(
      screen.getByRole("button", { name: "Continue session" }),
    ).toBeDisabled();
    view.rerender(<Tutor {...props} />);
    expect(screen.getByLabelText("Your work or question")).toHaveValue(
      "Keep this draft.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry saved request" }),
    );
    await vi.waitFor(() => expect(busyChanged).toHaveBeenLastCalledWith(false));
    const sent = fetcher.mock.calls.filter(([url]) =>
      url.endsWith("/submissions"),
    );
    expect(sent).toHaveLength(2);
    expect(sent[1]![1].body).toBe(sent[0]![1].body);
    expect(
      (sent[1]![1].headers as Record<string, string>)["Idempotency-Key"],
    ).toBe((sent[0]![1].headers as Record<string, string>)["Idempotency-Key"]);
    expect(caught).toHaveLength(1);
    expect(screen.getByLabelText("Your work or question")).toHaveValue("");
  });

  it("explains unavailable tutoring and refreshes capabilities after setup", async () => {
    let available = false;
    const navigate = vi.fn();
    const fetcher = vi.fn((url: string) => {
      if (url.endsWith("/features"))
        return response({
          ...capabilities,
          tutoring_available: available,
          tutor_status: available
            ? "Local tutor ready."
            : "This demo does not accept personal work.",
        });
      if (url.endsWith("/tutor/sessions")) return response([]);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    const props = {
      learner,
      offline: false,
      act: run,
      isAdult: true,
      onNavigate: navigate,
    };
    const view = render(<Tutor {...props} />);
    expect(
      await screen.findByText("Tutoring is not available yet"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
      target: { value: "Photosynthesis" },
    });
    expect(
      screen.getByRole("button", { name: "Start session" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Open Settings" }));
    expect(navigate).toHaveBeenLastCalledWith("settings");
    fireEvent.click(screen.getByRole("button", { name: "Setup help" }));
    expect(navigate).toHaveBeenLastCalledWith("help", "setup");
    view.rerender(<Tutor {...props} active={false} />);
    available = true;
    view.rerender(<Tutor {...props} active settingsVersion={1} />);
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start session" }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("Topic or learning goal")).toHaveValue(
      "Photosynthesis",
    );
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/features")),
    ).toHaveLength(2);
  });
});

it("shows feedback on a usable reading while keeping localized uncertainty visible in its details", async () => {
  const note = "The sketch count is uncertain; the equation is legible.";
  installSession(session([activity([operation({ ambiguities: [note] })])]));
  render(<Tutor learner={learner} offline={false} act={run} />);
  expect(
    await screen.findByRole("region", { name: "Tutor response" }),
  ).toBeVisible();
  expect(screen.queryByText("This photo needs clarification.")).toBeNull();
  fireEvent.click(screen.getByText("Reading details"));
  expect(screen.getByText(note)).toBeVisible();
});

it("keeps rejected photos and follow-ups together across activities without a dismiss action", async () => {
  const rejected = operation({
    status: "failed",
    feedback: null,
    reading: {
      quality: "uncertain",
      confidence: 0.5,
      can_continue: false,
      organization_feedback: [],
      rejection_reason: "The first numerator could be 3 or 8.",
    },
  });
  const previous = { ...activity([rejected]), status: "completed" };
  const current = {
    ...activity([
      operation({
        id: "next-message",
        text: "Which numerator was unclear?",
        reading: null,
        interpretation: null,
        feedback: { ...guidance, strengths: [], next_step: "" },
      }),
    ]),
    id: "next-activity",
  };
  installSession(session([previous, current]));
  render(<Tutor learner={learner} offline={false} act={run} />);
  const log = await screen.findByRole("log", { name: "Learning conversation" });
  expect(
    within(log).getByText("The first numerator could be 3 or 8."),
  ).toBeVisible();
  expect(within(log).getByText("Which numerator was unclear?")).toBeVisible();
  expect(within(log).getAllByLabelText(/exchange/)).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /dismiss|cancel/i })).toBeNull();
  expect(screen.queryByText("What is working")).toBeNull();
  expect(screen.queryByText("Try this next")).toBeNull();
});

it("reopens the complete passage separately and reuses it for harder practice", async () => {
  const passage = {
    title: "Mira's seedling",
    text: "Mira moved the pot toward the window. She built a sunny shelf.",
    origin: "pasted",
    uncertainties: [],
  };
  const fetcher = installSession(
    session([{ ...activity(), passage, reference_source: "reading_text" }]),
  );
  render(<Tutor learner={learner} offline={false} act={run} />);
  expect(await screen.findByLabelText("Reading passage")).toHaveTextContent(
    passage.text,
  );
  expect(screen.getByText("Your pasted passage")).toBeVisible();
  fireEvent.click(screen.getByText("Next activity options"));
  fireEvent.click(screen.getByRole("button", { name: "Harder next activity" }));
  await vi.waitFor(() => {
    const sent = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/activities"),
    );
    expect(JSON.parse(sent![1].body as string)).toEqual({
      source: "same_passage",
      difficulty: "challenge",
    });
  });
});

it.each(["reading_text", "reading_photo", "reading_generated"])(
  "starts reading with the selected %s source",
  async (source) => {
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`))
        return response(session([activity()]));
      if (url.endsWith("/tutor/sessions"))
        return response(options.method === "POST" ? session([activity()]) : []);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<Tutor learner={learner} offline={false} act={run} />);
    await screen.findByLabelText("Practice source");
    fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
      target: { value: "Reading comprehension" },
    });
    fireEvent.change(screen.getByLabelText("Practice source"), {
      target: { value: source },
    });
    if (source !== "reading_generated")
      fireEvent.change(screen.getByLabelText("Passage title (optional)"), {
        target: { value: "Original synthetic passage" },
      });
    if (source === "reading_text") {
      expect(
        screen.getByRole("button", { name: "Start session" }),
      ).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Reading passage"), {
        target: { value: "Mira built a sunny shelf for the seedling." },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Start session" }));
    await vi.waitFor(() => {
      const sent = fetcher.mock.calls.find(
        ([url, options]) =>
          url.endsWith("/tutor/sessions") && options.method === "POST",
      );
      const body = JSON.parse(
        sent![1].body as string,
      ) as Schema<"TutoringSessionInput">;
      expect(body.initial_activity?.source).toBe(source);
      if (source === "reading_text")
        expect(body.initial_activity?.reference_text).toBe(
          "Mira built a sunny shelf for the seedling.",
        );
      if (source !== "reading_generated")
        expect(body.initial_activity?.passage_title).toBe(
          "Original synthetic passage",
        );
    });
  },
);

it("starts published reading only after a selected preview supplies its source token", async () => {
  const passage = {
    title: "Synthetic public story",
    text: "A seedling moved toward the sunlight.",
    origin: "published",
    author: "Synthetic author",
    permission: "Original test fixture",
    source_url: "https://www.gutenberg.org/ebooks/21",
    uncertainties: [],
  };
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith("/reading/sources"))
      return response([{ id: "aesop_hare", title: "Synthetic source" }]);
    if (url.endsWith("/reading/import"))
      return response({
        passages: [{ passage, source_token: "owned-synthetic-preview" }],
      });
    if (url.endsWith(`/tutor/sessions/${sessionId}`))
      return response(session([activity()]));
    if (url.endsWith("/tutor/sessions"))
      return response(
        options.method === "POST" ? session([{ ...activity(), passage }]) : [],
      );
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Tutor learner={learner} offline={false} act={run} />);
  await screen.findByLabelText("Practice source");
  fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
    target: { value: "Reading inference" },
  });
  fireEvent.change(screen.getByLabelText("Practice source"), {
    target: { value: "published" },
  });
  await screen.findByRole("option", { name: "Synthetic source" });
  expect(screen.getByRole("button", { name: "Start session" })).toBeDisabled();
  expect(
    fetcher.mock.calls.some(([url]) => url.endsWith("/reading/import")),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Load published text" }));
  await screen.findByText("Synthetic public story");
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  await vi.waitFor(() => {
    const sent = fetcher.mock.calls.find(
      ([url, options]) =>
        url.endsWith("/tutor/sessions") && options.method === "POST",
    );
    expect(
      (JSON.parse(sent![1].body as string) as Schema<"TutoringSessionInput">)
        .initial_activity,
    ).toEqual({
      source: "published",
      source_token: "owned-synthetic-preview",
      reading_mode: "guided",
      section_size: "standard",
    });
  });
  await screen.findByLabelText("Your work or question");
  expect(
    screen.queryByRole("button", { name: "Load published text" }),
  ).toBeNull();
});

const studyMaterial = {
  title: "Original history source",
  text: "The town built a canal to move grain.\n\nLater, railways changed the route.",
  origin: "pasted",
  uncertainties: [],
};
const materialFocus = {
  mode: "guided",
  section_size: "short",
  section_index: 0,
  section_count: 2,
  start: 0,
  end: 36,
  text: "The town built a canal to move grain.",
};
const studyActivity = () => ({
  ...activity(),
  passage: studyMaterial,
  material_focus: materialFocus,
  learning_goal: "Explain a historical cause using source evidence.",
  success_criteria: [
    "Identify one reason for the canal and a supporting detail.",
  ],
});

it("shows bounded criteria and current history section, with learner-controlled continuation and draft protection", async () => {
  const fetcher = installSession(session([studyActivity()]));
  render(<Tutor learner={learner} offline={false} act={run} />);
  const reply = await screen.findByLabelText("Your work or question");
  expect(screen.getByLabelText("Reading passage")).toHaveTextContent(
    materialFocus.text,
  );
  expect(screen.getByLabelText("Reading passage")).not.toHaveTextContent(
    "railways",
  );
  expect(screen.getByText("Section 1 of 2")).toBeVisible();
  expect(
    screen.getByRole("region", { name: "Activity goal" }),
  ).toHaveTextContent(studyActivity().success_criteria[0]!);
  const next = screen.getByRole("button", { name: "Next section" });
  expect(next).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Previous section" }),
  ).toBeDisabled();
  fireEvent.change(reply, { target: { value: "An unfinished answer" } });
  expect(next).toBeDisabled();
  fireEvent.change(reply, { target: { value: "" } });
  fireEvent.click(next);
  await vi.waitFor(() => {
    const sent = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/activities"),
    );
    expect(JSON.parse(sent![1].body as string)).toEqual({
      source: "same_passage",
      section_index: 1,
    });
  });
});

it("changes material amount without changing question difficulty", async () => {
  const fetcher = installSession(session([studyActivity()]));
  render(<Tutor learner={learner} offline={false} act={run} />);
  await screen.findByLabelText("Your work or question");
  fireEvent.click(screen.getByText("Reading pace"));
  const navigation = screen.getByRole("region", {
    name: "Material navigation",
  });
  fireEvent.change(within(navigation).getByLabelText("Section length"), {
    target: { value: "long" },
  });
  expect(fetcher.mock.calls.some(([url]) => url.endsWith("/activities"))).toBe(
    false,
  );
  fireEvent.click(screen.getByRole("button", { name: "Apply reading pace" }));
  await vi.waitFor(() => {
    const sent = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/activities"),
    );
    expect(JSON.parse(sent![1].body as string)).toEqual({
      source: "same_passage",
      reading_mode: "guided",
      section_size: "long",
    });
  });
});

it("can recover a failed whole-text activity by choosing guided sections", async () => {
  const failed = {
    ...studyActivity(),
    activity_state: "generating",
    material_focus: {
      ...materialFocus,
      mode: "whole",
      section_index: 0,
      section_count: 1,
      text: studyMaterial.text,
    },
    operations: [
      operation({
        kind: "generation",
        status: "failed",
        reading: null,
        feedback: null,
        interpretation: null,
        safe_error:
          "This material is too large for this model. Choose guided sections.",
        error_code: "context_limit",
        retryable: false,
      }),
    ],
  };
  const fetcher = installSession(session([failed]));
  render(<Tutor learner={learner} offline={false} act={run} />);
  await screen.findByText(/This material is too large/);
  fireEvent.click(screen.getByText("Reading pace"));
  const navigation = screen.getByRole("region", {
    name: "Material navigation",
  });
  const mode = within(navigation).getByRole("combobox", {
    name: "Reading mode",
  });
  expect(mode).toBeEnabled();
  fireEvent.change(mode, { target: { value: "guided" } });
  fireEvent.click(
    within(navigation).getByRole("button", { name: "Apply reading pace" }),
  );
  await vi.waitFor(() => {
    const sent = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/activities"),
    );
    expect(JSON.parse(sent![1].body as string)).toEqual({
      source: "same_passage",
      reading_mode: "guided",
      section_size: "short",
    });
  });
});

it("retries section navigation with the original payload and idempotency key", async () => {
  const current = session([studyActivity()]);
  window.location.hash = `tutor=${sessionId}`;
  let attempts = 0;
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(current);
    if (url.endsWith("/tutor/sessions")) return response([current]);
    if (url.endsWith("/activities")) {
      attempts += 1;
      if (attempts === 1)
        return Promise.reject(new TypeError("Lost acknowledgement"));
      return response({});
    }
    throw new Error(`${url}: ${options.method}`);
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <Tutor
      learner={learner}
      offline={false}
      act={async (action) => {
        try {
          await action();
        } catch {
          /* App displays the connection error. */
        }
      }}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Next section" }));
  const retry = await screen.findByRole("button", {
    name: "Retry saved request",
  });
  expect(screen.getByRole("button", { name: "Next section" })).toBeDisabled();
  fireEvent.click(retry);
  await vi.waitFor(() => expect(attempts).toBe(2));
  const sent = fetcher.mock.calls.filter(([url]) =>
    url.endsWith("/activities"),
  );
  expect(sent[1]![1].body).toBe(sent[0]![1].body);
  expect(
    (sent[1]![1].headers as Record<string, string>)["Idempotency-Key"],
  ).toBe((sent[0]![1].headers as Record<string, string>)["Idempotency-Key"]);
});

it("allows long science material while retaining the assignment-reference limit", async () => {
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`))
      return response(session([activity()]));
    if (url.endsWith("/tutor/sessions"))
      return response(options.method === "POST" ? session([activity()]) : []);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Tutor learner={learner} offline={false} act={run} />);
  await screen.findByLabelText("Practice source");
  fireEvent.change(screen.getByLabelText("Practice source"), {
    target: { value: "reference_text" },
  });
  expect(screen.getByLabelText("Reference material")).not.toHaveAttribute(
    "maxlength",
  );
  const oversizedReference = "A".repeat(8001);
  fireEvent.change(screen.getByLabelText("Reference material"), {
    target: { value: oversizedReference },
  });
  expect(screen.getByLabelText("Reference material")).toHaveValue(
    oversizedReference,
  );
  expect(
    screen.getByText(/This material exceeds 8,000 characters/),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Start session" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Practice source"), {
    target: { value: "reading_text" },
  });
  expect(screen.getByLabelText("Reading passage")).not.toHaveAttribute(
    "maxlength",
  );
  const unicodeMaterial = "🌱".repeat(30000);
  fireEvent.change(screen.getByLabelText("Reading passage"), {
    target: { value: unicodeMaterial },
  });
  expect(screen.getByLabelText("Reading passage")).toHaveValue(unicodeMaterial);
  expect(screen.getByText("30,000 / 50,000 characters")).toBeVisible();
  const oversizedMaterial = "🌱".repeat(50001);
  fireEvent.change(screen.getByLabelText("Reading passage"), {
    target: { value: oversizedMaterial },
  });
  expect(screen.getByLabelText("Reading passage")).toHaveValue(
    oversizedMaterial,
  );
  expect(
    screen.getByText(/This material exceeds 50,000 characters/),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
    target: { value: "Science: understand energy transfer" },
  });
  const material =
    "Original science note: heat flows between objects.\n\n".repeat(200);
  fireEvent.change(screen.getByLabelText("Reading passage"), {
    target: { value: material },
  });
  fireEvent.change(screen.getByLabelText("Reading mode"), {
    target: { value: "whole" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  await vi.waitFor(() => {
    const sent = fetcher.mock.calls.find(
      ([url, options]) =>
        url.endsWith("/tutor/sessions") && options.method === "POST",
    );
    expect(
      (JSON.parse(sent![1].body as string) as Schema<"TutoringSessionInput">)
        .initial_activity,
    ).toMatchObject({
      source: "reading_text",
      reference_text: material,
      reading_mode: "whole",
    });
  });
});

it("stages sentence help in the existing composer without sending or discarding a draft", async () => {
  const fetcher = installSession(session([studyActivity()]));
  render(<Tutor learner={learner} offline={false} act={run} />);
  const reply = await screen.findByLabelText("Your work or question");
  const range = document.createRange();
  range.selectNodeContents(screen.getByLabelText("Reading passage"));
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent(document, new Event("selectionchange"));
  const ask = screen.getByRole("button", { name: "Ask about selected text" });
  expect(ask).toBeEnabled();
  fireEvent.change(reply, { target: { value: "Keep my draft" } });
  expect(ask).toBeDisabled();
  fireEvent.change(reply, { target: { value: "" } });
  fireEvent.click(ask);
  expect(reply).toHaveValue(
    `Help me understand this part of the material:\n\n${materialFocus.text}`,
  );
  expect(reply).toHaveFocus();
  expect(
    fetcher.mock.calls.some(([, options]) => options.method === "POST"),
  ).toBe(false);
});

it("clearly labels a selected mock tutor in private installations", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.endsWith("/features")
        ? response({ ...capabilities, text_processing: "mock" })
        : response([]),
    ),
  );
  const navigate = vi.fn();
  render(
    <Tutor
      learner={learner}
      offline={false}
      act={run}
      isAdult
      onNavigate={navigate}
    />,
  );
  await screen.findByText("Demo tutor — sample responses only");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Demo tutor — sample responses only",
  );
  fireEvent.click(screen.getByRole("button", { name: "Open model settings" }));
  expect(navigate).toHaveBeenCalledWith("settings");
});

it("recovers an accepted session after a lost receipt and reload without storing or replaying its text", async () => {
  let accepted = false;
  let requestKey = "";
  let starts = 0;
  let storedIdentity: unknown;
  const saved = session([studyActivity()]);
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(saved);
    if (url.includes("/tutor/request-receipts/"))
      return response({
        kind: "session",
        session_id: sessionId,
        activity_id: problemId,
        submission_id: null,
      });
    if (url.endsWith("/tutor/sessions")) {
      if (options.method !== "POST") return response(accepted ? [saved] : []);
      starts += 1;
      requestKey = (options.headers as Record<string, string>)[
        "Idempotency-Key"
      ]!;
      storedIdentity = JSON.parse(
        window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`)!,
      );
      accepted = true;
      return Promise.reject(new TypeError("Synthetic lost accepted receipt"));
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  const act = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch {
      /* Displayed by App. */
    }
  };
  let view = render(<Tutor learner={learner} offline={false} act={act} />);
  fireEvent.change(await screen.findByLabelText("Topic or learning goal"), {
    target: { value: "Private synthetic topic must remain in memory only" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  await screen.findByRole("button", { name: "Retry saved request" });
  expect(storedIdentity).toEqual({
    key: requestKey,
    kind: "session",
    owner: learner,
  });
  expect(window.location.hash).toBe("");
  view.unmount();
  view = render(<Tutor learner={learner} offline={false} act={act} />);
  await screen.findByText(/Your interrupted request was saved/);
  expect(
    await screen.findByLabelText("Your work or question"),
  ).not.toHaveAttribute("readonly");
  expect(starts).toBe(1);
  expect(window.location.hash).toBe(`#tutor=${sessionId}`);
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).toBeNull();
  expect(
    fetcher.mock.calls.some(([url]) => url.endsWith(`?learner_id=${learner}`)),
  ).toBe(true);
  view.unmount();
});

it("keeps an unaccepted request blocked until server resolution prevents a late duplicate", async () => {
  const key = "911c9abc-4e8e-424d-a914-4338187ba009";
  window.sessionStorage.setItem(
    `shepherd:tutor-request:${learner}`,
    JSON.stringify({ key, kind: "session", owner: learner }),
  );
  let resolutions = 0;
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith("/tutor/sessions")) return response([]);
    if (url.endsWith("/resolve")) {
      resolutions += 1;
      expect(JSON.parse(options.body as string)).toEqual({
        learner_id: learner,
      });
      return response({ status: "not_accepted", receipt: null });
    }
    if (url.includes("/tutor/request-receipts/"))
      return response({ detail: "No saved receipt." }, 404);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Tutor learner={learner} offline={false} act={run} />);
  await screen.findByText(/The interrupted request has no saved receipt yet/);
  expect(screen.getByLabelText("Topic or learning goal")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Start session" })).toBeDisabled();
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Check saved request" }));
  await vi.waitFor(() =>
    expect(
      fetcher.mock.calls.filter(([url]) => url.includes("?learner_id=")).length,
    ).toBe(2),
  );
  expect(screen.getByRole("button", { name: "Start session" })).toBeDisabled();
  await vi.waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Resolve interrupted request" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Resolve interrupted request" }),
  );
  await screen.findByText(/was not saved and cannot arrive later/);
  expect(resolutions).toBe(1);
  expect(screen.getByLabelText("Topic or learning goal")).toBeEnabled();
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).toBeNull();
  expect(
    fetcher.mock.calls.filter(([, options]) => options.method === "POST"),
  ).toHaveLength(1);
});

it("retains an oversized response without submitting it and permits a valid Unicode response", async () => {
  const fetcher = installSession(session([studyActivity()]));
  render(<Tutor learner={learner} offline={false} act={run} />);
  const reply = await screen.findByLabelText("Your work or question");
  const oversized = "🌱".repeat(8001);
  fireEvent.change(reply, { target: { value: oversized } });
  expect(reply).toHaveValue(oversized);
  expect(
    screen.getByText(/Your response contains 8,001 characters/),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  expect(
    fetcher.mock.calls.some(([, options]) => options.method === "POST"),
  ).toBe(false);
  const valid = "🌱".repeat(6000);
  fireEvent.change(reply, { target: { value: valid } });
  expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await vi.waitFor(() => {
    const request = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/submissions"),
    );
    expect(
      (JSON.parse(request![1].body as string) as Schema<"SubmissionInput">)
        .text,
    ).toBe(valid);
  });
});
