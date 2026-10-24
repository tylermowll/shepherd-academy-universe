import {
  act,
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
  learning_intent: "practice" as NonNullable<
    Schema<"TutoringSessionInput">["learning_intent"]
  >,
  initiative: "balanced",
  difficulty: "standard",
  status: "open",
  created_at: "2026-10-23T12:34:00Z",
  problems,
});
const summary = (value: ReturnType<typeof session>) => {
  const { problems, ...metadata } = value;
  return { ...metadata, activity_count: problems.length };
};
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
    if (url.endsWith("/tutor/sessions")) return response([summary(value)]);
    if (options.method === "POST") return response({});
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

function selectSource(source: string) {
  const startForm = screen.queryByRole("group", {
    name: "What would you like help with?",
  });
  if (startForm) {
    const goal = source.startsWith("reference_")
      ? "Learn from my homework"
      : source === "topic"
        ? "Practice a skill"
        : "Read and discuss a text";
    fireEvent.click(screen.getByRole("radio", { name: goal }));
  }
  const input = [
    ...document.querySelectorAll<HTMLInputElement>(
      'input[name="material-source"]',
    ),
  ].find((node) => node.value === source);
  if (input) fireEvent.click(input);
}

function openLearningPreferences() {
  const summary = screen.getByText("Adjust difficulty and guidance");
  if (!summary.closest("details")!.open) fireEvent.click(summary);
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

it("recovers an unavailable initial session while keeping availability and saved sessions usable", async () => {
  const missingId = "911c9abc-4e8e-424d-a914-4338187ba00e";
  const saved = session([activity()]);
  window.history.replaceState(null, "", `/?page=practice#tutor=${missingId}`);
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith("/auth/session"))
      return response({
        authenticated: true,
        role: "learner",
        learner_id: learner,
        csrf_token: "synthetic",
      });
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${missingId}`))
      return response({ detail: "Not found." }, 404);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(saved);
    if (url.endsWith("/tutor/sessions")) return response([summary(saved)]);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<App />);
  expect(
    await screen.findByText(
      "This saved session is no longer available. Start a new session or choose another one in History.",
    ),
  ).toBeVisible();
  expect(window.location.hash).toBe("");
  expect(window.location.search).toBe("?page=practice");
  expect(screen.queryByText("Checking tutor availability…")).toBeNull();
  expect(screen.queryByRole("button", { name: "Reconnect" })).toBeNull();
  const topic = screen.getByLabelText("What are you working on?");
  fireEvent.change(topic, { target: { value: "A new synthetic topic" } });
  expect(screen.getByRole("button", { name: "Start learning" })).toBeEnabled();
  fireEvent.change(topic, { target: { value: "" } });
  const navigation = screen.getByRole("navigation", {
    name: "Main navigation",
  });
  fireEvent.click(within(navigation).getByRole("link", { name: "History" }));
  const continueSession = await screen.findByRole("button", {
    name: "Continue session",
  });
  expect(continueSession).toBeEnabled();
  expect(continueSession).toHaveAccessibleDescription(
    /Persuasive writing Started/,
  );
  expect(
    continueSession.closest("article")!.querySelector("time"),
  ).toHaveAttribute("datetime", saved.created_at);
  fireEvent.click(continueSession);
  expect(await screen.findByLabelText("Your work or question")).toBeVisible();
  expect(window.location.hash).toBe(`#tutor=${sessionId}`);
  expect(
    fetcher.mock.calls.filter(([url]) =>
      url.endsWith(`/tutor/sessions/${missingId}`),
    ),
  ).toHaveLength(1);
});

it("keeps the current session after another saved session returns not found", async () => {
  const missingId = "911c9abc-4e8e-424d-a914-4338187ba00e";
  const current = session([activity()]);
  const navigate = vi.fn();
  window.history.replaceState(null, "", `/?page=history#tutor=${sessionId}`);
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`))
        return response(current);
      if (url.endsWith(`/tutor/sessions/${missingId}`))
        return response({ detail: "Not found." }, 404);
      if (url.endsWith("/tutor/sessions"))
        return response([
          summary(current),
          {
            ...summary(current),
            id: missingId,
            topic: "Expired synthetic work",
          },
        ]);
      throw new Error(url);
    }),
  );
  const view = render(
    <Tutor
      learner={learner}
      offline={false}
      page="history"
      act={run}
      onNavigate={navigate}
    />,
  );
  const missing = await screen.findByRole("heading", {
    name: "Expired synthetic work",
  });
  fireEvent.click(
    within(missing.closest("article")!).getByRole("button", {
      name: "Continue session",
    }),
  );
  expect(
    await screen.findByText(/That saved session is no longer available/),
  ).toBeVisible();
  expect(window.location.hash).toBe(`#tutor=${sessionId}`);
  expect(navigate).not.toHaveBeenCalled();
  view.rerender(<Tutor learner={learner} offline={false} act={run} />);
  expect(await screen.findByLabelText("Your work or question")).toBeVisible();
});

it("distinguishes repeated History topics by their saved creation dates and action descriptions", async () => {
  const first = summary(session());
  const second = {
    ...first,
    id: "911c9abc-4e8e-424d-a914-4338187ba00e",
    created_at: "2026-10-22T12:34:00Z",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith("/tutor/sessions")) return response([first, second]);
      throw new Error(url);
    }),
  );
  render(<Tutor learner={learner} offline={false} page="history" act={run} />);
  const buttons = await screen.findAllByRole("button", {
    name: "Continue session",
  });
  const cards = buttons.map((button) => button.closest("article")!);
  expect(cards[0]!.querySelector("time")).toHaveAttribute(
    "datetime",
    first.created_at,
  );
  expect(cards[1]!.querySelector("time")).toHaveAttribute(
    "datetime",
    second.created_at,
  );
  expect(cards[0]!.textContent).not.toBe(cards[1]!.textContent);
  for (const button of buttons)
    expect(button).toHaveAccessibleDescription(/Persuasive writing Started/);
});

it("guards the composer while opening an unavailable browser destination and restores the current session URL", async () => {
  const missingId = "911c9abc-4e8e-424d-a914-4338187ba00e";
  const current = session([activity()]);
  let resolveMissing!: (value: Response) => void;
  const missingRequest = new Promise<Response>((resolve) => {
    resolveMissing = resolve;
  });
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(current);
    if (url.endsWith(`/tutor/sessions/${missingId}`)) return missingRequest;
    if (url.endsWith("/tutor/sessions")) return response([summary(current)]);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  window.history.replaceState(null, "", `/?page=practice#tutor=${sessionId}`);
  render(<Tutor learner={learner} offline={false} act={run} />);
  const composer = await screen.findByLabelText("Your work or question");
  window.history.replaceState(null, "", `/?page=practice#tutor=${missingId}`);
  fireEvent(window, new PopStateEvent("popstate"));
  await vi.waitFor(() =>
    expect(
      fetcher.mock.calls.some(([url]) =>
        url.endsWith(`/tutor/sessions/${missingId}`),
      ),
    ).toBe(true),
  );
  expect(composer).toHaveAttribute("readonly");
  expect(screen.getByText("Opening saved session…")).toBeVisible();
  fireEvent.change(composer, {
    target: {
      value: "Do not move this current-session text into another session.",
    },
  });
  expect(composer).toHaveValue("");
  resolveMissing(
    new Response(JSON.stringify({ detail: "Not found." }), { status: 404 }),
  );
  expect(
    await screen.findByText(/Your current work is still here/),
  ).toBeVisible();
  expect(composer).toBeVisible();
  expect(composer).not.toHaveAttribute("readonly");
  expect(composer).toHaveValue("");
  expect(window.location.hash).toBe(`#tutor=${sessionId}`);
});

it("does not accept current-session text or actions during a successful delayed browser session change", async () => {
  const secondId = "911c9abc-4e8e-424d-a914-4338187ba00e";
  const current = session([activity()]);
  const next = {
    ...current,
    id: secondId,
    topic: "Photosynthesis",
    problems: [{ ...activity(), id: "911c9abc-4e8e-424d-a914-4338187ba00f" }],
  };
  let resolveNext!: (value: Response) => void;
  const nextRequest = new Promise<Response>((resolve) => {
    resolveNext = resolve;
  });
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(current);
    if (url.endsWith(`/tutor/sessions/${secondId}`)) return nextRequest;
    if (url.endsWith("/tutor/sessions"))
      return response([summary(current), summary(next)]);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  window.history.replaceState(null, "", `/?page=practice#tutor=${sessionId}`);
  render(<Tutor learner={learner} offline={false} act={run} />);
  const composer = await screen.findByLabelText("Your work or question");
  fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
  const picker = screen.getByLabelText("Take or choose a photo");
  const dropzone = screen.getByRole("group", { name: "Photo upload" });
  expect(picker).toBeEnabled();
  expect(picker).toBeVisible();
  window.history.replaceState(null, "", `/?page=practice#tutor=${secondId}`);
  fireEvent(window, new PopStateEvent("popstate"));
  await vi.waitFor(() =>
    expect(
      fetcher.mock.calls.some(([url]) =>
        url.endsWith(`/tutor/sessions/${secondId}`),
      ),
    ).toBe(true),
  );
  expect(composer).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: "Attach photo" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Finish session" })).toBeDisabled();
  expect(picker).toBeDisabled();
  const transfer = {
    files: [
      new File(["synthetic photo"], "synthetic.jpg", { type: "image/jpeg" }),
    ],
    dropEffect: "copy",
  };
  fireEvent.dragOver(dropzone, { dataTransfer: transfer });
  expect(transfer.dropEffect).toBe("none");
  fireEvent.drop(dropzone, { dataTransfer: transfer });
  fireEvent.change(picker, { target: { files: transfer.files } });
  expect(
    fetcher.mock.calls.some(([url]) => url.includes("/images/preview")),
  ).toBe(false);
  fireEvent.change(composer, {
    target: {
      value: "Current-session text must not become the new session’s draft.",
    },
  });
  expect(composer).toHaveValue("");
  resolveNext(new Response(JSON.stringify(next)));
  await screen.findByRole("heading", { name: "Photosynthesis" });
  await vi.waitFor(() => expect(composer).not.toHaveAttribute("readonly"));
  expect(composer).toHaveValue("");
  expect(screen.getByRole("button", { name: "Attach photo" })).toBeEnabled();
  expect(screen.getByLabelText("Take or choose a photo")).toBeEnabled();
  fireEvent.dragOver(screen.getByRole("group", { name: "Photo upload" }), {
    dataTransfer: transfer,
  });
  expect(transfer.dropEffect).toBe("copy");
  expect(window.location.hash).toBe(`#tutor=${secondId}`);
});

it("keeps a displayed session and its unsent draft if polling finds it unavailable", async () => {
  let available = true;
  const current = session([activity()]);
  window.history.replaceState(null, "", `/?page=practice#tutor=${sessionId}`);
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`))
        return available
          ? response(current)
          : response({ detail: "Not found." }, 404);
      if (url.endsWith("/tutor/sessions")) return response([summary(current)]);
      throw new Error(url);
    }),
  );
  render(<Tutor learner={learner} offline={false} act={run} />);
  const composer = await screen.findByLabelText("Your work or question");
  fireEvent.change(composer, {
    target: { value: "Keep my unsent explanation." },
  });
  available = false;
  fireEvent(window, new Event("online"));
  expect(
    await screen.findByText(/Your current work is still here/),
  ).toBeVisible();
  expect(composer).toBeVisible();
  expect(composer).toHaveValue("Keep my unsent explanation.");
  expect(window.location.hash).toBe(`#tutor=${sessionId}`);
});

it.each(["reference_photo", "reading_photo"])(
  "explains unavailable %s input before starting or changing material",
  async (photoSource) => {
    const photoStatus =
      "Synthetic photo reading is unavailable for this account.";
    const current = session([activity()]);
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (options.method === "POST") throw new Error("Unexpected submission");
      if (url.endsWith("/features"))
        return response({
          ...capabilities,
          photos_available: false,
          photo_status: photoStatus,
        });
      if (url.endsWith(`/tutor/sessions/${sessionId}`))
        return response(current);
      if (url.endsWith("/tutor/sessions")) return response([summary(current)]);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    const view = render(<Tutor learner={learner} offline={false} act={run} />);
    await screen.findByText("Text processing: local.");
    selectSource(photoSource);
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Synthetic photo practice" },
    });
    expect(screen.getByText(photoStatus)).toBeVisible();
    expect(screen.getByText(/Choose a pasted-text input/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Start learning" }),
    ).toBeDisabled();
    selectSource("topic");
    expect(screen.queryByText(photoStatus)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Start learning" }),
    ).toBeEnabled();

    view.unmount();
    window.history.replaceState(null, "", `/?page=practice#tutor=${sessionId}`);
    render(<Tutor learner={learner} offline={false} act={run} />);
    await screen.findByLabelText("Your work or question");
    fireEvent.click(screen.getByText("Session & material"));
    fireEvent.click(screen.getByText("Use different practice material"));
    selectSource(photoSource);
    expect(screen.getByText(/Choose a pasted-text input/)).toBeVisible();
    expect(
      screen.getByText(photoStatus, { selector: ".notice p" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Create practice activity" }),
    ).toBeDisabled();
    expect(
      fetcher.mock.calls.every(([, options]) => options?.method !== "POST"),
    ).toBe(true);
  },
);

it("refreshes current work and processing disclosures without downloading unrelated history again", async () => {
  const secondId = "911c9abc-4e8e-424d-a914-4338187ba00e";
  let current = session([activity()]);
  let processing = "local";
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith("/features"))
      return response({ ...capabilities, text_processing: processing });
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(current);
    if (url.endsWith("/tutor/sessions"))
      return response([
        summary(current),
        { ...summary(session()), id: secondId, topic: "Another saved topic" },
      ]);
    throw new Error(url);
  });
  window.location.hash = `tutor=${sessionId}`;
  vi.stubGlobal("fetch", fetcher);
  await act(() => {
    render(<Tutor learner={learner} offline={false} act={run} />);
    return Promise.resolve();
  });
  await screen.findByLabelText("Your work or question");
  const historyLoads = () =>
    fetcher.mock.calls.filter(([url]) => url.endsWith("/tutor/sessions"))
      .length;
  expect(historyLoads()).toBe(1);

  current = session([
    {
      ...activity([operation({ text: "Saved on another device." })]),
      status: "completed",
    },
    { ...activity(), id: secondId },
  ]);
  processing = "cloud";
  fireEvent(window, new Event("online"));
  expect(await screen.findByText("Saved on another device.")).toBeVisible();
  expect(screen.getByText("Text processing: cloud provider.")).toBeVisible();
  expect(screen.getByText("In progress · 2 activities")).toBeInTheDocument();
  expect(historyLoads()).toBe(1);
  expect(
    fetcher.mock.calls.some(([url]) =>
      url.endsWith(`/tutor/sessions/${secondId}`),
    ),
  ).toBe(false);
});

it("renders activity counts from history summaries without fetching their conversations", async () => {
  const saved = { ...summary(session([activity()])), activity_count: 12 };
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith("/tutor/sessions")) return response([saved]);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Tutor learner={learner} offline={false} page="history" act={run} />);
  expect(await screen.findByText("In progress · 12 activities")).toBeVisible();
  expect(
    fetcher.mock.calls.some(([url]) =>
      url.endsWith(`/tutor/sessions/${sessionId}`),
    ),
  ).toBe(false);
});

it("explains the history limit when the most recent 100 summaries are shown", async () => {
  const saved = Array.from({ length: 100 }, (_, index) => ({
    ...summary(session()),
    id: `911c9abc-4e8e-424d-a914-${String(index).padStart(12, "0")}`,
    topic: `Saved topic ${index}`,
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      response(url.endsWith("/features") ? capabilities : saved),
    ),
  );
  render(<Tutor learner={learner} offline={false} page="history" act={run} />);
  expect(
    await screen.findByText(
      "Showing the 100 most recent sessions. Older retained work is available through your administrator’s data export.",
    ),
  ).toBeVisible();
  expect(
    screen.getAllByRole("button", { name: "Continue session" }),
  ).toHaveLength(100);
});

it("offers all existing material methods as wrapping radio choices when changing a session", async () => {
  installSession(session());
  render(<Tutor learner={learner} offline={false} act={run} />);
  await screen.findByText("Choose practice material");
  expect(
    document.querySelectorAll('input[name="material-source"]'),
  ).toHaveLength(7);
  expect(screen.queryByLabelText("Practice purpose")).toBeNull();
  expect(screen.queryByLabelText("Material input")).toBeNull();
});

it.each(["reference_photo", "reading_photo"])(
  "lets a rejected %s be discussed and explicitly repaired with typed material",
  async (source) => {
    const rejected = operation({
      kind: "reference_photo",
      status: "failed",
      feedback: null,
      interpretation:
        "Uncertain synthetic material: the second line is unclear.",
      reading: {
        quality: "uncertain",
        confidence: 0.4,
        can_continue: false,
        organization_feedback: [],
        rejection_reason: "Please clarify the second line.",
      },
    });
    const capture = {
      ...activity([rejected], "reference_capture"),
      reference_source: source,
    };
    const fetcher = installSession(session([capture]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    const composer = await screen.findByLabelText(
      "Your question or clarification",
    );
    expect(screen.queryByLabelText("Reference material")).toBeNull();
    expect(screen.queryByLabelText("Reading passage")).toBeNull();
    expect(screen.queryByRole("button", { name: "Give me a hint" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Attach photo" })).toBeNull();
    fireEvent.change(composer, {
      target: { value: "Which line needs a clearer photograph?" },
    });
    expect(
      screen.getByRole("button", { name: "Edit uncertain reading as text" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Finish session" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await vi.waitFor(() => {
      const sent = fetcher.mock.calls.find(([url]) =>
        url.endsWith("/submissions"),
      );
      expect(JSON.parse(sent![1].body as string)).toEqual({
        version: 1,
        kind: "question",
        text: "Which line needs a clearer photograph?",
        help_level: 0,
        work_text: "",
      });
      expect(composer).toHaveValue("");
    });
    expect(
      screen.getByLabelText("Your question or clarification"),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit uncertain reading as text" }),
    );
    const material = screen.getByLabelText(
      source === "reading_photo" ? "Reading passage" : "Reference material",
    );
    expect(material).toBeVisible();
    expect(material).toHaveValue(rejected.interpretation);
    expect(screen.getByText(/The photo reading is uncertain/)).toBeVisible();
    expect(
      fetcher.mock.calls.some(([url]) => url.endsWith("/activities")),
    ).toBe(false);
    const limit = source === "reading_photo" ? 50000 : 8000;
    fireEvent.change(material, { target: { value: "A".repeat(limit + 1) } });
    expect(
      screen.getByRole("button", { name: "Create practice activity" }),
    ).toBeDisabled();
    fireEvent.change(material, {
      target: {
        value: "Corrected synthetic material supplied by the learner.",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create practice activity" }),
    );
    await vi.waitFor(() => {
      const sent = fetcher.mock.calls.find(([url]) =>
        url.endsWith("/activities"),
      );
      expect(JSON.parse(sent![1].body as string)).toMatchObject({
        source: source === "reading_photo" ? "reading_text" : "reference_text",
        reference_text: "Corrected synthetic material supplied by the learner.",
      });
    });
    expect(screen.getByText(rejected.interpretation)).toBeVisible();
    expect(screen.getByText("This photo needs clarification.")).toBeVisible();
  },
);

it("preserves an existing typed material draft when opening a photo repair", async () => {
  const rejected = operation({
    status: "failed",
    feedback: null,
    reading: {
      quality: "uncertain",
      confidence: 0.3,
      can_continue: false,
      organization_feedback: [],
      rejection_reason: "The second line is unreadable.",
    },
  });
  installSession(
    session([
      {
        ...activity([rejected], "reference_capture"),
        reference_source: "reference_photo",
      },
    ]),
  );
  render(<Tutor learner={learner} offline={false} act={run} />);
  await screen.findByLabelText("Your question or clarification");
  selectSource("reference_text");
  fireEvent.change(screen.getByLabelText("Reference material"), {
    target: { value: "My typed material draft." },
  });
  selectSource("topic");
  fireEvent.click(
    screen.getByRole("button", { name: "Edit uncertain reading as text" }),
  );
  expect(screen.getByLabelText("Reference material")).toHaveValue(
    "My typed material draft.",
  );
});

it.each(["reading_photo", "reference_photo"])(
  "keeps rejected work photos in the work composer after an accepted %s source",
  async (source) => {
    const rejected = operation({
      kind: "answer",
      status: "failed",
      feedback: null,
      reading: {
        quality: "uncertain",
        confidence: 0.3,
        can_continue: false,
        organization_feedback: [],
        rejection_reason: "Please clarify your second sentence.",
      },
    });
    installSession(
      session([{ ...activity([rejected]), reference_source: source }]),
    );
    render(<Tutor learner={learner} offline={false} act={run} />);
    expect(await screen.findByLabelText("Your work or question")).toBeVisible();
    expect(
      screen.getByText(/You can ask about this reading below/),
    ).toBeVisible();
    expect(screen.queryByText(/use the material controls/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Edit uncertain reading as text" }),
    ).toBeNull();
  },
);

it("finishes beside the activity controls and recaps only saved work and guidance", async () => {
  let current = session([
    activity([
      operation({
        reading: null,
        interpretation: null,
        text: "My saved response.",
      }),
      operation({
        id: "empty-guidance-follow-up",
        kind: "question",
        reading: null,
        interpretation: null,
        text: "A saved follow-up.",
        feedback: { ...guidance, guidance: [], next_step: "" },
      }),
    ]),
  ]);
  window.location.hash = `tutor=${sessionId}`;
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/sessions/${sessionId}/finish`)) {
      current = { ...current, status: "finished" };
      return response({});
    }
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(current);
    if (url.endsWith("/tutor/sessions")) return response([summary(current)]);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Tutor learner={learner} offline={false} act={run} />);
  const composer = await screen.findByLabelText("Your work or question");
  const finish = screen.getByRole("button", { name: "Finish session" });
  const activityControls = screen.getByRole("group", {
    name: "Activity controls",
  });
  expect(finish).toBeVisible();
  expect(activityControls).toContainElement(finish);
  expect(composer.closest("form")).not.toContainElement(finish);
  fireEvent.change(composer, { target: { value: "Unsent draft" } });
  expect(finish).toBeDisabled();
  fireEvent.change(composer, { target: { value: "" } });
  fireEvent.click(finish);
  const recap = await screen.findByRole("region", { name: "Session recap" });
  expect(recap).toHaveTextContent("Persuasive writing");
  expect(recap).toHaveTextContent("1 saved activity · 2 saved messages");
  expect(recap).toHaveTextContent(guidance.next_step);
  expect(recap).toHaveTextContent("not a verified grade or mastery assessment");
  expect(
    fetcher.mock.calls.filter(([url]) => url.endsWith("/finish")),
  ).toHaveLength(1);
});

it.each(["reference_capture", "generating"])(
  "offers Finish session after an idle %s step",
  async (state) => {
    installSession(session([activity([], state)]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    const finish = await screen.findByRole("button", {
      name: "Finish session",
    });
    expect(finish).toBeEnabled();
    expect(
      screen.getByRole("group", { name: "Activity controls" }),
    ).toContainElement(finish);
    expect(screen.queryByText("Next activity options")).toBeNull();
  },
);

it("keeps Finish session disabled while a response is active", async () => {
  installSession(
    session([
      activity([
        operation({ status: "tutoring", feedback: null, reading: null }),
      ]),
    ]),
  );
  render(<Tutor learner={learner} offline={false} act={run} />);
  expect(
    await screen.findByRole("button", { name: "Finish session" }),
  ).toBeDisabled();
});

describe("AI learning conversation", () => {
  it("separates activity controls from the message composer and protects unsent drafts", async () => {
    const fetcher = installSession(session([activity()]));
    render(<Tutor learner={learner} offline={false} act={run} />);
    const reply = await screen.findByLabelText("Your work or question");
    const activityControls = screen.getByRole("group", {
      name: "Activity controls",
    });
    const messageForm = reply.closest("form")!;
    expect(activityControls).toContainElement(
      screen.getByText("Next activity options"),
    );
    expect(activityControls).toContainElement(
      screen.getByRole("button", { name: "Finish session" }),
    );
    expect(messageForm).not.toContainElement(activityControls);
    expect(
      within(messageForm).getByRole("button", { name: "Attach photo" }),
    ).toBeVisible();
    expect(
      within(messageForm).getByText("Help", { exact: true }),
    ).toBeVisible();
    expect(within(messageForm).queryByText("Next activity options")).toBeNull();
    expect(
      within(messageForm).queryByRole("button", { name: "Finish session" }),
    ).toBeNull();
    expect(
      activityControls.compareDocumentPosition(reply) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("log", { name: "Learning conversation" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Send" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ask about this" })).toBeNull();
    expect(screen.getByText("Upload a photo")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    expect(screen.getByText("Upload a photo")).toBeVisible();
    expect(screen.getByLabelText("Take or choose a photo")).toBeVisible();
    const attachments = screen.getByRole("region", {
      name: "Photo attachments",
    });
    expect(attachments).toHaveFocus();
    expect(attachments.parentElement).toContainElement(
      screen.getByRole("log", { name: "Learning conversation" }),
    );
    expect(attachments.parentElement).not.toContainElement(activityControls);
    expect(attachments.parentElement).not.toContainElement(messageForm);
    expect(
      within(attachments).getByLabelText("Take or choose a photo"),
    ).toBeEnabled();
    fireEvent.click(screen.getByText("Next activity options"));
    await vi.waitFor(() =>
      expect(screen.getByText("Upload a photo")).not.toBeVisible(),
    );
    const easier = screen.getByRole("button", { name: "Easier next activity" });
    expect(easier).toBeVisible();
    fireEvent.change(reply, { target: { value: "My unsent work" } });
    for (const action of within(activityControls).getAllByRole("button"))
      expect(action).toBeDisabled();
    expect(
      within(messageForm).getByRole("button", { name: "Send" }),
    ).toBeEnabled();
    expect(
      fetcher.mock.calls.some(([, options]) => options.method === "POST"),
    ).toBe(false);
    fireEvent.change(reply, { target: { value: "" } });
    expect(easier).toBeEnabled();
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
        if (url.endsWith("/tutor/sessions"))
          return response([summary(current)]);
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
      screen.getByRole("region", { name: "Photo attachments" }),
    ).toHaveFocus();
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
    const reply = screen.getByLabelText("Your work or question");
    reply.focus();
    fireEvent(window, new Event("online"));
    await vi.waitFor(() => expect(currentLoads).toBeGreaterThanOrEqual(2));
    await vi.waitFor(() =>
      expect(screen.getByText("Upload a photo")).not.toBeVisible(),
    );
    expect(
      screen.getByAltText("Your photograph before submission"),
    ).not.toBeVisible();
    expect(reply).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Attach photo" }));
    expect(
      screen.getByRole("region", { name: "Photo attachments" }),
    ).toHaveFocus();
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
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Persuasive writing" },
    });
    openLearningPreferences();
    fireEvent.change(
      screen.getByLabelText("How much guidance would you like?"),
      {
        target: { value: "learner_led" },
      },
    );
    fireEvent.change(screen.getByLabelText("How challenging should it be?"), {
      target: { value: "challenge" },
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start learning" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
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
      learning_intent: "practice",
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
    selectSource("reference_text");
    expect(
      screen.getByText(/We’ll use the ideas in your homework/),
    ).toHaveTextContent("make different practice");
    expect(
      screen.getByText(/We’ll use the ideas in your homework/),
    ).toHaveTextContent("without completing the assignment");
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

  it.each([false, true])(
    "keeps a lost source-photo receipt after capture completes with historical capture=%s",
    async (withHistory) => {
      const historical = withHistory
        ? [
            {
              ...activity([], "reference_capture"),
              id: "911c9abc-4e8e-424d-a914-4338187ba00f",
              status: "skipped",
            },
          ]
        : [];
      let current = session([...historical, activity([], "reference_capture")]);
      const uploads: Array<{ key: string; blob: BodyInit | null | undefined }> =
        [];
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
        vi.fn((url: string, options: RequestInit) => {
          if (url.endsWith("/features")) return response(capabilities);
          if (url.endsWith(`/tutor/sessions/${sessionId}`)) {
            currentLoads += 1;
            return response(current);
          }
          if (url.endsWith("/tutor/sessions"))
            return response([summary(current)]);
          if (url.endsWith("/images/preview"))
            return Promise.resolve(
              new Response(new Blob(["preview"], { type: "image/png" })),
            );
          if (url.includes(`/problems/${problemId}/photos?`)) {
            uploads.push({
              key: (options.headers as Record<string, string>)[
                "Idempotency-Key"
              ]!,
              blob: options.body,
            });
            return uploads.length === 1
              ? Promise.reject(new TypeError("Synthetic lost receipt"))
              : response({});
          }
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
      const preview = screen.getByAltText("Your photograph before submission");

      current = session([
        ...historical,
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
      expect(
        screen.getByRole("button", { name: "Attach photo" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Attach photo" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByAltText("Your photograph before submission")).toBe(
        preview,
      );
      expect(preview).toBeVisible();
      fireEvent.click(
        screen.getByRole("button", { name: "Retry saved photograph" }),
      );
      await vi.waitFor(() => expect(uploads).toHaveLength(2));
      expect(uploads[1]!.key).toBe(uploads[0]!.key);
      expect(uploads[1]!.blob).toBe(uploads[0]!.blob);
      expect(errors).toHaveLength(1);
      expect(
        screen.queryByRole("button", { name: "Retry saved photograph" }),
      ).toBeNull();
    },
  );

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
    fireEvent.change(
      screen.getByLabelText("How much guidance would you like?"),
      {
        target: { value: "tutor_led" },
      },
    );
    fireEvent.change(screen.getByLabelText("How challenging should it be?"), {
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
      screen.getByText(
        /Homework is used to create different practice on the same concepts/,
      ),
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
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Persuasive writing" },
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start learning" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
    const retry = await screen.findByRole("button", {
      name: "Retry saved request",
    });
    expect(screen.getByLabelText("What are you working on?")).toBeDisabled();
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
        return response(saved ? [summary(created)] : []);
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
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Persuasive writing" },
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start learning" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start learning" }));

    expect(
      await screen.findByText(
        "Your session was saved, but its latest state could not be refreshed. Reconnect to continue.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Your work or question")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start learning" })).toBeNull();
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
      await screen.findByLabelText("What are you working on?"),
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
    expect(screen.queryByLabelText("What are you working on?")).toBeNull();
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
    expect(screen.getByLabelText("What are you working on?")).toBeVisible();
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
    selectSource("reference_text");
    fireEvent.change(screen.getByLabelText("Reference material"), {
      target: { value: "A reference draft to preserve." },
    });
    expect(screen.getByRole("button", { name: "New session" })).toBeDisabled();
    expect(draftChanged).toHaveBeenLastCalledWith(true);

    selectSource("topic");
    expect(screen.queryByLabelText("Reference material")).toBeNull();
    expect(screen.getByRole("button", { name: "New session" })).toBeEnabled();
    await vi.waitFor(() =>
      expect(draftChanged).toHaveBeenLastCalledWith(false),
    );

    selectSource("reference_text");
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
        if (url.endsWith("/tutor/sessions"))
          return response([summary(own), summary(other)]);
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
        if (url.endsWith("/tutor/sessions"))
          return response([summary(current), summary(other)]);
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
        if (url.endsWith("/tutor/sessions"))
          return response([summary(current), summary(other)]);
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
        if (url.endsWith("/tutor/sessions"))
          return response([summary(current), summary(other)]);
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
        if (url.endsWith("/tutor/sessions"))
          return response([summary(first), summary(second)]);
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
      if (url.endsWith("/tutor/sessions"))
        return response([summary(first), summary(second)]);
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
      if (url.endsWith("/tutor/sessions")) return response([summary(value)]);
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

  it("guides learners to setup help and refreshes capabilities when returning", async () => {
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
      onNavigate: navigate,
    };
    const view = render(<Tutor {...props} />);
    expect(
      await screen.findByText("Tutoring is not available yet"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Photosynthesis" },
    });
    expect(
      screen.getByRole("button", { name: "Start learning" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Ask the adult who manages this app to check its setup.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Open Settings" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Setup help" }));
    expect(navigate).toHaveBeenLastCalledWith("help", "setup");
    view.rerender(<Tutor {...props} active={false} />);
    available = true;
    view.rerender(<Tutor {...props} active />);
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start learning" }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("What are you working on?")).toHaveValue(
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
    await screen.findByRole("group", {
      name: "What would you like help with?",
    });
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Reading comprehension" },
    });
    selectSource(source);
    if (source !== "reading_generated")
      fireEvent.change(screen.getByLabelText("Passage title (optional)"), {
        target: { value: "Original synthetic passage" },
      });
    if (source === "reading_text") {
      expect(
        screen.getByRole("button", { name: "Start learning" }),
      ).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Reading passage"), {
        target: { value: "Mira built a sunny shelf for the seedling." },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
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
  await screen.findByRole("group", { name: "What would you like help with?" });
  fireEvent.change(screen.getByLabelText("What are you working on?"), {
    target: { value: "Reading inference" },
  });
  selectSource("published");
  await screen.findByRole("option", { name: "Synthetic source" });
  expect(screen.getByRole("button", { name: "Start learning" })).toBeDisabled();
  expect(
    fetcher.mock.calls.some(([url]) => url.endsWith("/reading/import")),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Load published text" }));
  await screen.findByText("Synthetic public story");
  fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
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
    if (url.endsWith("/tutor/sessions")) return response([summary(current)]);
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
  await screen.findByRole("group", { name: "What would you like help with?" });
  selectSource("reference_text");
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
  expect(screen.getByRole("button", { name: "Start learning" })).toBeDisabled();
  selectSource("reading_text");
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
  fireEvent.change(screen.getByLabelText("What are you working on?"), {
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
  fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
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
  // Settle the session load and passive selection listener before dispatching
  // browser selection events; element presence alone does not establish that.
  await act(() => {
    render(<Tutor learner={learner} offline={false} act={run} />);
    return Promise.resolve();
  });
  const reply = await screen.findByLabelText("Your work or question");
  await vi.waitFor(() => expect(reply).not.toHaveAttribute("readonly"));
  const selection = window.getSelection()!;
  await act(() => {
    const range = document.createRange();
    range.selectNodeContents(screen.getByLabelText("Reading passage"));
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent(document, new Event("selectionchange"));
    return Promise.resolve();
  });
  expect(selection.toString()).toBe(materialFocus.text);
  const ask = screen.getByRole("button", { name: "Ask about selected text" });
  await vi.waitFor(() => expect(ask).toBeEnabled());
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

it("labels a mock tutor and directs learners to the adult managing the app", async () => {
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
    <Tutor learner={learner} offline={false} act={run} onNavigate={navigate} />,
  );
  await screen.findByText("Demo tutor — sample responses only");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Demo tutor — sample responses only",
  );
  expect(
    screen.getByText(
      /Ask the adult who manages this app to connect an AI model/,
    ),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Open model settings" }),
  ).toBeNull();
  expect(navigate).not.toHaveBeenCalled();
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
      if (options.method !== "POST")
        return response(accepted ? [summary(saved)] : []);
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
  fireEvent.change(await screen.findByLabelText("What are you working on?"), {
    target: { value: "Private synthetic topic must remain in memory only" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
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
  await screen.findByText(
    /The server has not confirmed whether your request was saved/,
  );
  expect(screen.getByLabelText("What are you working on?")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Start learning" })).toBeDisabled();
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Check saved request" }));
  await vi.waitFor(() =>
    expect(
      fetcher.mock.calls.filter(([url]) => url.includes("?learner_id=")).length,
    ).toBe(2),
  );
  expect(screen.getByRole("button", { name: "Start learning" })).toBeDisabled();
  await vi.waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Resolve interrupted request" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Resolve interrupted request" }),
  );
  await screen.findByText(/The server will reject it if it arrives later/);
  expect(resolutions).toBe(1);
  expect(screen.getByLabelText("What are you working on?")).toBeEnabled();
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).toBeNull();
  expect(
    fetcher.mock.calls.filter(([, options]) => options.method === "POST"),
  ).toHaveLength(1);
});

it("distinguishes failed History loading from an empty account and reloads with GET only", async () => {
  const saved = session([activity()]);
  let failed = true;
  window.location.hash = `tutor=${sessionId}`;
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    expect(options.method).toBe("GET");
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(saved);
    if (url.endsWith("/tutor/sessions"))
      return failed
        ? response({ detail: "Synthetic list unavailable" }, 503)
        : response([summary(saved)]);
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Tutor learner={learner} offline={false} page="history" act={run} />);
  await screen.findByText(
    "Saved sessions could not load. Your saved work has not been removed.",
  );
  expect(screen.queryByText("No saved sessions yet")).toBeNull();
  expect(screen.queryByRole("button", { name: "Continue session" })).toBeNull();
  failed = false;
  fireEvent.click(
    screen.getByRole("button", { name: "Reload saved sessions" }),
  );
  expect(
    await screen.findByRole("button", { name: "Continue session" }),
  ).toBeEnabled();
  expect(screen.queryByText(/Saved sessions could not load/)).toBeNull();
  expect(
    fetcher.mock.calls.every(
      ([, options]) => !options || options.method === "GET",
    ),
  ).toBe(true);
});

it("keeps failed activity preparation recoverable without presenting an internal learner message", async () => {
  installSession(
    session([
      activity(
        [
          operation({
            kind: "generation",
            status: "failed",
            text: "Create a new practice activity.",
            reading: null,
            interpretation: null,
            feedback: null,
            safe_error:
              "The tutor could not prepare this activity. Your session is saved.",
            retryable: true,
          }),
        ],
        "generating",
      ),
    ]),
  );
  render(<Tutor learner={learner} offline={false} act={run} />);
  expect(
    await screen.findByText(
      "The tutor could not prepare this activity. Your session is saved.",
    ),
  ).toBeVisible();
  expect(screen.queryByText("Create a new practice activity.")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Retry tutor response" }),
  ).toBeEnabled();
});

it("resolves a permanently stale in-tab request without losing or replaying its draft", async () => {
  let saved = session([activity()]);
  let submissions = 0;
  let resolutions = 0;
  let checks = 0;
  const fetcher = vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(saved);
    if (url.endsWith("/tutor/sessions")) return response([summary(saved)]);
    if (url.endsWith("/submissions")) {
      submissions++;
      if (submissions === 1)
        return Promise.reject(new TypeError("Lost acknowledgement"));
      return response(
        { detail: "Problem changed. Refresh before continuing." },
        409,
      );
    }
    if (url.endsWith("/resolve")) {
      resolutions++;
      expect(JSON.parse(options.body as string)).toEqual({
        learner_id: learner,
      });
      return response({ status: "not_accepted", receipt: null });
    }
    if (url.includes("/tutor/request-receipts/")) {
      checks++;
      return response({ detail: "No saved request" }, 404);
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  window.location.hash = `tutor=${sessionId}`;
  const errors: unknown[] = [];
  const act = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      errors.push(cause);
    }
  };
  render(<Tutor learner={learner} offline={false} act={act} />);
  const draft = "Retain my reasoning while the other browser moves on.";
  const composer = await screen.findByRole("textbox", {
    name: "Your work or question",
  });
  fireEvent.change(composer, { target: { value: draft } });
  fireEvent.click(screen.getByRole("button", { name: /^Send$/ }));
  const retry = await screen.findByRole("button", {
    name: "Retry saved request",
  });
  saved = session([{ ...activity(), version: 2 }]);
  fireEvent.click(retry);
  await vi.waitFor(() => expect(errors).toHaveLength(2));
  fireEvent.click(screen.getByRole("button", { name: "Check saved request" }));
  await screen.findByText(
    /The server has not confirmed whether your request was saved/,
  );
  expect(checks).toBe(1);
  expect(composer).toHaveValue(draft);
  expect(composer).toHaveAttribute("readonly");
  expect(resolutions).toBe(0);
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).not.toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Resolve interrupted request" }),
  );
  await screen.findByText(/The server will reject it if it arrives later/);
  await vi.waitFor(() => expect(composer).not.toHaveAttribute("readonly"));
  expect(composer).toHaveValue(draft);
  expect(screen.getByRole("button", { name: /^Send$/ })).toBeEnabled();
  expect(submissions).toBe(2);
  expect(resolutions).toBe(1);
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).toBeNull();
});

it("checks an accepted in-tab submission without replay and clears only its submitted draft", async () => {
  const draft = "My claim is supported by observations of nesting birds.";
  const initial = session([activity()]);
  const saved = session([
    activity([operation({ text: draft, reading: null, interpretation: null })]),
  ]);
  let accepted = false;
  let sessionUnavailable = false;
  let submissions = 0;
  let checks = 0;
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith("/features")) return response(capabilities);
    if (url.endsWith(`/tutor/sessions/${sessionId}`))
      return sessionUnavailable
        ? response({ detail: "Not found" }, 404)
        : response(accepted ? saved : initial);
    if (url.endsWith("/tutor/sessions")) return response([summary(initial)]);
    if (url.endsWith("/submissions")) {
      submissions++;
      accepted = true;
      return Promise.reject(new TypeError("Lost accepted acknowledgement"));
    }
    if (url.includes("/tutor/request-receipts/")) {
      checks++;
      expect(url).toContain(`?learner_id=${learner}`);
      return response({
        kind: "submission",
        session_id: sessionId,
        activity_id: problemId,
        submission_id: "911c9abc-4e8e-424d-a914-4338187ba00d",
      });
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  window.location.hash = `tutor=${sessionId}`;
  const act = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch {
      /* App shows safe acknowledgement error. */
    }
  };
  render(<Tutor learner={learner} offline={false} act={act} />);
  const composer = await screen.findByRole("textbox", {
    name: "Your work or question",
  });
  fireEvent.change(composer, { target: { value: draft } });
  fireEvent.click(screen.getByRole("button", { name: /^Send$/ }));
  await screen.findByRole("button", { name: "Retry saved request" });
  expect(checks).toBe(0);
  sessionUnavailable = true;
  fireEvent.click(screen.getByRole("button", { name: "Check saved request" }));
  await screen.findByText(
    /Your request was saved, but its current state could not be refreshed/,
  );
  expect(composer).toHaveValue(draft);
  expect(composer).toHaveAttribute("readonly");
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).not.toBeNull();
  sessionUnavailable = false;
  fireEvent.click(screen.getByRole("button", { name: "Check saved request" }));
  await screen.findByText(/Your interrupted request was saved/);
  expect(composer).toHaveValue("");
  expect(composer).not.toHaveAttribute("readonly");
  expect(screen.getByText(draft)).toBeVisible();
  expect(submissions).toBe(1);
  expect(checks).toBe(2);
  expect(
    window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
  ).toBeNull();
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

describe("goal-first session setup", () => {
  const goals = [
    ["understand", "Understand a topic", "topic"],
    ["practice", "Practice a skill", "topic"],
    ["read", "Read and discuss a text", "reading_generated"],
    ["write", "Work on my writing", "topic"],
    ["review", "Review for a test", "topic"],
    ["homework", "Learn from my homework", "reference_text"],
    ["other", "Something else", "topic"],
  ] as const;

  function startServer() {
    let saved = session([activity()]);
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/features")) return response(capabilities);
      if (url.endsWith(`/tutor/sessions/${sessionId}`)) return response(saved);
      if (url.endsWith("/tutor/sessions")) {
        if (options.method !== "POST") return response([]);
        const body = JSON.parse(
          options.body as string,
        ) as Schema<"TutoringSessionInput">;
        saved = {
          ...saved,
          topic: body.topic,
          learning_intent: body.learning_intent ?? "practice",
        };
        return response({ ...saved, learning_intent: body.learning_intent });
      }
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetcher);
    return fetcher;
  }

  it.each(goals)(
    "starts %s with a real saved intent and only its relevant material fields",
    async (intent, label, source) => {
      const fetcher = startServer();
      render(<Tutor learner={learner} offline={false} act={run} />);
      const goal = screen.getByRole("group", {
        name: "What would you like help with?",
      });
      expect(within(goal).getAllByRole("radio")).toHaveLength(7);
      fireEvent.click(screen.getByRole("radio", { name: label }));
      const topic = screen.getByRole("textbox", {
        name: "What are you working on?",
      });
      expect(
        goal.compareDocumentPosition(topic) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      fireEvent.change(topic, {
        target: { value: "An original synthetic learning goal" },
      });
      expect(
        screen.getByText("Adjust difficulty and guidance").closest("details"),
      ).not.toHaveAttribute("open");
      if (source === "reading_generated")
        fireEvent.click(
          screen.getByRole("radio", { name: "Ask the tutor to write a text" }),
        );
      if (source === "reference_text")
        fireEvent.change(screen.getByLabelText("Reference material"), {
          target: {
            value: "Synthetic assignment used only for different practice.",
          },
        });
      if (intent === "write" || intent === "practice")
        expect(
          screen.queryByRole("group", { name: "What will we use?" }),
        ).toBeNull();
      await vi.waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Start learning" }),
        ).toBeEnabled(),
      );
      expect(
        fetcher.mock.calls.filter(([, options]) => options.method === "POST"),
      ).toHaveLength(0);
      fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
      await screen.findByLabelText("Your work or question");
      const posts = fetcher.mock.calls.filter(
        ([, options]) => options.method === "POST",
      );
      expect(posts).toHaveLength(1);
      expect(JSON.parse(posts[0]![1].body as string)).toMatchObject({
        learning_intent: intent,
        difficulty: "standard",
        initiative: "balanced",
        initial_activity: { source },
      });
    },
  );

  it("retains topic, material and optional preferences across changing goals without sending hidden drafts", async () => {
    const fetcher = startServer();
    const onDraftChange = vi.fn();
    render(
      <Tutor
        learner={learner}
        offline={false}
        act={run}
        onDraftChange={onDraftChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "Read and discuss a text" }),
    );
    fireEvent.change(screen.getByLabelText("Reading passage"), {
      target: { value: "Keep this original text while choosing a goal." },
    });
    fireEvent.change(screen.getByLabelText("Passage title (optional)"), {
      target: { value: "Keep this title" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Work on my writing" }));
    expect(screen.queryByLabelText("Reading passage")).toBeNull();
    await vi.waitFor(() =>
      expect(onDraftChange).toHaveBeenLastCalledWith(true),
    );
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Make a clear argument" },
    });
    openLearningPreferences();
    fireEvent.change(
      screen.getByLabelText("How much guidance would you like?"),
      {
        target: { value: "learner_led" },
      },
    );
    fireEvent.change(screen.getByLabelText("How challenging should it be?"), {
      target: { value: "challenge" },
    });
    fireEvent.click(screen.getByText("Adjust difficulty and guidance"));
    fireEvent.click(screen.getByRole("radio", { name: "Review for a test" }));
    fireEvent.click(screen.getByRole("radio", { name: "Paste my notes" }));
    expect(screen.getByLabelText("Reading passage")).toHaveValue(
      "Keep this original text while choosing a goal.",
    );
    expect(screen.getByLabelText("Passage title (optional)")).toHaveValue(
      "Keep this title",
    );
    expect(screen.getByLabelText("What are you working on?")).toHaveValue(
      "Make a clear argument",
    );
    openLearningPreferences();
    expect(
      screen.getByLabelText("How much guidance would you like?"),
    ).toHaveValue("learner_led");
    expect(screen.getByLabelText("How challenging should it be?")).toHaveValue(
      "challenge",
    );
    expect(
      screen.getByText(
        "You choose the direction; the tutor follows your questions.",
      ),
    ).toBeVisible();
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start learning" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
    await screen.findByLabelText("Your work or question");
    const post = fetcher.mock.calls.find(
      ([, options]) => options.method === "POST",
    )!;
    expect(JSON.parse(post[1].body as string)).toMatchObject({
      learning_intent: "review",
      topic: "Make a clear argument",
      initiative: "learner_led",
      difficulty: "challenge",
      initial_activity: {
        source: "reading_text",
        reference_text: "Keep this original text while choosing a goal.",
        passage_title: "Keep this title",
      },
    });
  });

  it("retries an uncertain start with the same intent, payload and request key", async () => {
    const posts: Array<{ key: string; body: unknown }> = [];
    const saved = { ...session([activity()]), learning_intent: "review" };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, options: RequestInit) => {
        if (url.endsWith("/features")) return response(capabilities);
        if (url.endsWith(`/tutor/sessions/${sessionId}`))
          return response(saved);
        if (url.endsWith("/tutor/sessions")) {
          if (options.method !== "POST") return response([]);
          posts.push({
            key: (options.headers as Record<string, string>)[
              "Idempotency-Key"
            ]!,
            body: JSON.parse(options.body as string),
          });
          return posts.length === 1
            ? Promise.reject(new TypeError("Synthetic lost acknowledgement"))
            : response(saved);
        }
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
          } catch {
            /* App displays the failure. */
          }
        }}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Review for a test" }));
    fireEvent.change(screen.getByLabelText("What are you working on?"), {
      target: { value: "Original synthetic review topic" },
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Start learning" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
    const retry = await screen.findByRole("button", {
      name: "Retry saved request",
    });
    expect(
      screen.getByRole("radio", { name: "Review for a test" }),
    ).toBeDisabled();
    fireEvent.click(retry);
    await screen.findByLabelText("Your work or question");
    expect(posts).toHaveLength(2);
    expect(posts[1]).toEqual(posts[0]);
    expect(posts[0]!.body).toMatchObject({ learning_intent: "review" });
  });

  it("opens source-photo intake inline and keeps normal photo attachments separate", async () => {
    const saved = session([
      {
        ...activity([], "reference_capture"),
        reference_source: "reading_photo",
      },
    ]);
    installSession(saved);
    render(<Tutor learner={learner} offline={false} act={run} />);
    const intake = await screen.findByRole("region", {
      name: "Add your photo",
    });
    expect(
      within(intake).getByLabelText("Take or choose a photo"),
    ).toBeVisible();
    expect(
      within(intake).getByRole("button", { name: "Take photo with phone" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Photo attachments" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Submit this photograph" }),
    ).toBeNull();
  });
});
