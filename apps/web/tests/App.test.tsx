import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { Tutor } from "../src/Tutor";
import { SafeText } from "../src/SafeText";

function summary<T extends { problems: unknown[] }>(value: T) {
  const { problems, ...metadata } = value;
  return { ...metadata, activity_count: problems.length };
}

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticated: false,
          csrf_token: "synthetic-csrf",
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("entry", () => {
  it("offers administrator and learner sign-in with a CSRF bootstrap", async () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Sign in",
    );
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Username")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Pair this device" }),
    ).toBeNull();
  });
  it("shows the signed-in account and role in the header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        return Promise.resolve(
          new Response(
            JSON.stringify(
              url.endsWith("/auth/session")
                ? {
                    authenticated: true,
                    csrf_token: "synthetic-csrf",
                    login_name: "home-admin",
                    role: "adult",
                    setup_required: false,
                  }
                : [],
            ),
            { headers: { "Content-Type": "application/json" } },
          ),
        );
      }),
    );
    render(<App />);

    const account = await screen.findByLabelText("Signed in account");
    expect(account).toHaveTextContent("home-admin");
    expect(account).toHaveTextContent("Administrator");
  });
  it("focuses a Help topic selected inside the app", async () => {
    window.history.replaceState(null, "", "/?page=help");
    render(<App />);

    fireEvent.click(await screen.findByRole("link", { name: "Phone setup" }));
    const topic = await screen.findByRole("heading", {
      level: 2,
      name: "Phone setup",
    });
    await vi.waitFor(() => expect(topic).toHaveFocus());
  });
  it("renders untrusted output without HTML, external images, or links", () => {
    const { container } = render(
      <SafeText
        text={
          '<img src="https://evil.invalid/x"> **Hint** [click](javascript:alert(1)) $\\frac{1}{2}$'
        }
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("Hint").tagName).toBe("STRONG");
    expect(container.querySelector("math")).not.toBeNull();
  });
});

describe("linked app areas", () => {
  const learnerId = "911c9abc-4e8e-424d-a914-4338187ba00a";
  const adult = {
    authenticated: true,
    csrf_token: "synthetic-adult-csrf",
    login_name: "home-admin",
    role: "adult",
    setup_required: false,
  };
  const learnerAccount = {
    authenticated: true,
    csrf_token: "synthetic-learner-csrf",
    login_name: "home-learner",
    role: "learner",
    learner_id: learnerId,
    setup_required: false,
  };
  const response = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  function signIn(login: string, password = "synthetic-password-only") {
    const submit = screen.getByRole("button", { name: "Sign in" });
    const fields = within(submit.closest("form")!);
    fireEvent.change(fields.getByLabelText("Username"), {
      target: { value: login },
    });
    fireEvent.change(fields.getByLabelText("Password"), {
      target: { value: password },
    });
    fireEvent.click(submit);
  }
  const features = {
    tutoring_available: true,
    photos_available: false,
    text_processing: "mock",
  };

  it.each([adult, learnerAccount])(
    "keeps generic root sign-in at the root for $role accounts and clears the previous selection",
    async (signedIn) => {
      window.history.replaceState(
        null,
        "",
        "/?help=setup#tutor=911c9abc-4e8e-424d-a914-4338187ba00b",
      );
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) => {
          if (url.endsWith("/auth/session"))
            return Promise.resolve(
              response({ authenticated: false, csrf_token: "synthetic-csrf" }),
            );
          if (url.endsWith("/auth/login"))
            return Promise.resolve(response(signedIn));
          if (url.endsWith("/features"))
            return Promise.resolve(response(features));
          return Promise.resolve(response([]));
        }),
      );
      render(<App />);
      await vi.waitFor(() =>
        expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
      );
      signIn(signedIn.login_name);
      expect(
        await screen.findByLabelText("Signed in account"),
      ).toHaveTextContent(signedIn.login_name);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        signedIn.role === "adult" ? "Learners" : "Practice",
      );
      expect(
        window.location.pathname +
          window.location.search +
          window.location.hash,
      ).toBe("/");
    },
  );

  it("offers both sign-in destinations to guests and preserves their URLs on reload and back", async () => {
    let view = render(<App />);
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    const areas = screen.getByRole("navigation", { name: "App areas" });
    expect(areas).toHaveTextContent("Learning environment");
    expect(areas).toHaveTextContent("Administration");
    fireEvent.click(screen.getByRole("link", { name: "Learning environment" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    expect(window.location.search).toBe("?page=practice&signin=learner");
    fireEvent.click(screen.getByRole("link", { name: "Administration" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Administrator sign-in",
    );
    window.history.back();
    await vi.waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Learner sign-in",
      ),
    );
    view.unmount();
    view = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    fireEvent.click(screen.getByRole("link", { name: "Help" }));
    expect(new URLSearchParams(window.location.search).has("signin")).toBe(
      false,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Help");
    view.unmount();
  });

  it("switches both ways with credentials and discards a late previous-administrator list", async () => {
    let resolveOld!: (value: Response) => void;
    const oldList = new Promise<Response>((resolve) => {
      resolveOld = resolve;
    });
    let lists = 0;
    const fetcher = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/session"))
        return Promise.resolve(response(adult));
      if (url.endsWith("/auth/login")) {
        const submitted = JSON.parse(options.body as string) as {
          login_name: string;
        };
        return Promise.resolve(
          response(
            submitted.login_name === "home-admin" ? adult : learnerAccount,
          ),
        );
      }
      if (url.endsWith("/admin/learners")) {
        lists += 1;
        return lists === 1 ? oldList : Promise.resolve(response([]));
      }
      if (url.endsWith("/features")) return Promise.resolve(response(features));
      return Promise.resolve(response([]));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<App />);
    await screen.findByLabelText("Signed in account");
    fireEvent.click(screen.getByRole("link", { name: "Learning environment" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    expect(screen.getByLabelText("Signed in account")).toHaveTextContent(
      "home-admin",
    );
    signIn("home-learner");
    await screen.findByRole("heading", { level: 1, name: "Practice" });
    expect(screen.getByLabelText("Signed in account")).toHaveTextContent(
      "home-learner",
    );
    expect(screen.queryByRole("link", { name: "Learners" })).toBeNull();
    await act(async () => {
      resolveOld(
        response([
          {
            id: learnerId,
            alias: "Old administrator private learner",
            enabled: true,
          },
        ]),
      );
      await oldList;
    });
    expect(screen.queryByText(/Old administrator private learner/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    await vi.waitFor(() =>
      expect(screen.getByLabelText("Topic or learning goal")).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("link", { name: "Administration" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Administrator sign-in",
    );
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    signIn("home-admin");
    await screen.findByRole("heading", { level: 1, name: "Learners" });
    expect(screen.getByLabelText("Signed in account")).toHaveTextContent(
      "home-admin",
    );
    expect(window.location.search).toBe("?page=learners");
    expect(window.location.hash).toBe("");
    const loginCalls = fetcher.mock.calls.filter(([url]) =>
      url.endsWith("/auth/login"),
    );
    expect(loginCalls.map(([, options]) => options.headers)).toEqual([
      expect.objectContaining({ "X-CSRF-Token": adult.csrf_token }),
      expect.objectContaining({ "X-CSRF-Token": learnerAccount.csrf_token }),
    ]);
    expect(
      fetcher.mock.calls.some(([url]) => url.endsWith("/auth/logout")),
    ).toBe(false);
  });

  it("keeps the learner account and actual draft after failed administrator sign-in and cancellation", async () => {
    const fetcher = vi.fn((url: string) => {
      if (url.endsWith("/auth/session"))
        return Promise.resolve(response(learnerAccount));
      if (url.endsWith("/auth/login"))
        return Promise.resolve(
          response({ detail: "Incorrect username or password." }, 401),
        );
      if (url.endsWith("/features")) return Promise.resolve(response(features));
      return Promise.resolve(response([]));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<App />);
    const topic = await screen.findByLabelText("Topic or learning goal");
    fireEvent.change(topic, {
      target: { value: "Keep my learner's unsent idea." },
    });
    fireEvent.click(screen.getByRole("link", { name: "Administration" }));
    expect(topic).not.toBeVisible();
    expect(
      screen.getByText(/A successful sign-in clears unsent text and photos/),
    ).toBeVisible();
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    signIn("home-admin", "synthetic-wrong-password");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect username or password.",
    );
    expect(screen.getByLabelText("Signed in account")).toHaveTextContent(
      "home-learner",
    );
    expect(topic).toHaveValue("Keep my learner's unsent idea.");
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel account switch" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Practice",
    );
    expect(screen.getByLabelText("Topic or learning goal")).toBe(topic);
    expect(topic).toBeVisible();
    expect(topic).toHaveValue("Keep my learner's unsent idea.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(window.location.search).toBe("?page=practice");
    const guarded = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(guarded);
    expect(guarded.defaultPrevented).toBe(true);
    expect(
      fetcher.mock.calls.some(([url]) => url.endsWith("/auth/logout")),
    ).toBe(false);
  });

  it("preserves unsaved administrator settings when a learner switch is canceled", async () => {
    window.history.replaceState(null, "", "/?page=settings");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          response(
            url.endsWith("/auth/session")
              ? adult
              : url.endsWith("/admin/providers")
                ? {
                    policy: {
                      allow_cloud_inference: false,
                      app_audience: "mixed",
                      cloud_locked: false,
                      audience_locked: false,
                      demo_mode: false,
                    },
                    routes: { tutor: "", vision: "" },
                    providers: [],
                  }
                : [],
          ),
        ),
      ),
    );
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Add new AI connection" }),
    );
    const name = screen.getByLabelText("Connection name");
    fireEvent.change(name, { target: { value: "Unsent local connection" } });
    fireEvent.click(screen.getByRole("link", { name: "Learning environment" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    expect(name).not.toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel account switch" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Settings",
    );
    expect(screen.getByLabelText("Connection name")).toBe(name);
    expect(name).toBeVisible();
    expect(name).toHaveValue("Unsent local connection");
    expect(window.location.search).toBe("?page=settings");
  });

  it("waits for account replacement before allowing another login, sign-out or page change", async () => {
    let finishLogin!: (value: Response) => void;
    const pendingLogin = new Promise<Response>((resolve) => {
      finishLogin = resolve;
    });
    const fetcher = vi.fn((url: string) => {
      if (url.endsWith("/auth/session"))
        return Promise.resolve(response(learnerAccount));
      if (url.endsWith("/auth/login")) return pendingLogin;
      if (url.endsWith("/features")) return Promise.resolve(response(features));
      return Promise.resolve(response([]));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<App />);
    await screen.findByLabelText("Topic or learning goal");
    fireEvent.click(screen.getByRole("link", { name: "Administration" }));
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    signIn("home-admin");
    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Cancel account switch" }),
    ).toBeDisabled();
    fireEvent.submit(submit.closest("form")!);
    fireEvent.click(screen.getByRole("link", { name: "History" }));
    fireEvent.click(screen.getByRole("link", { name: "Learning environment" }));
    expect(window.location.search).toBe("?page=learners&signin=adult");
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/auth/login")),
    ).toHaveLength(1);
    await act(async () => {
      finishLogin(response(adult));
      await pendingLogin;
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Learners" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("clears old drafts on successful sign-in and honestly opens the authenticated role when it differs from the destination", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/auth/session") || url.endsWith("/auth/login"))
          return Promise.resolve(response(learnerAccount));
        if (url.endsWith("/features"))
          return Promise.resolve(response(features));
        return Promise.resolve(response([]));
      }),
    );
    render(<App />);
    const oldTopic = await screen.findByLabelText("Topic or learning goal");
    fireEvent.change(oldTopic, {
      target: { value: "Previous account draft." },
    });
    fireEvent.click(screen.getByRole("link", { name: "Administration" }));
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    signIn("home-learner");
    await screen.findByRole("heading", { level: 1, name: "Practice" });
    expect(screen.getByLabelText("Topic or learning goal")).not.toBe(oldTopic);
    expect(screen.getByLabelText("Topic or learning goal")).toHaveValue("");
    expect(screen.getByText(/^Signed in as a learner/)).toHaveTextContent(
      "Signed in as a learner. Open Administration and sign in with an administrator account",
    );
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(window.location.search).toBe("?page=practice");
    const unguarded = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unguarded);
    expect(unguarded.defaultPrevented).toBe(false);
  });
});

it("protects an actual learner draft from accidental tab reload and clears the guard after the draft is cleared", async () => {
  const learner = "911c9abc-4e8e-424d-a914-4338187ba00a";
  const sessionId = "911c9abc-4e8e-424d-a914-4338187ba00b";
  window.location.hash = `tutor=${sessionId}`;
  const saved = {
    id: sessionId,
    learner_id: learner,
    topic: "Synthetic reading",
    initiative: "balanced",
    difficulty: "standard",
    status: "open",
    problems: [
      {
        id: "911c9abc-4e8e-424d-a914-4338187ba00c",
        status: "assigned",
        version: 1,
        activity_state: "ready",
        problem_text: "Explain the source.",
        reference_source: "topic",
        operations: [],
      },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.endsWith("/auth/session")
              ? {
                  authenticated: true,
                  role: "learner",
                  learner_id: learner,
                  csrf_token: "synthetic-csrf",
                }
              : url.endsWith("/features")
                ? {
                    tutoring_available: true,
                    photos_available: false,
                    text_processing: "mock",
                  }
                : url.endsWith(sessionId)
                  ? saved
                  : [summary(saved)],
          ),
        ),
      ),
    ),
  );
  render(<App />);
  const reply = await screen.findByLabelText("Your work or question");
  fireEvent.change(reply, {
    target: { value: "Keep my synthetic observation." },
  });
  const guarded = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(guarded);
  expect(guarded.defaultPrevented).toBe(true);
  fireEvent.change(reply, { target: { value: "" } });
  const cleared = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(cleared);
  expect(cleared.defaultPrevented).toBe(false);
});

it("keeps a newly created learner when an older list request finishes late", async () => {
  const row = {
    id: "4a15f6fc-8866-468e-801c-1faedc9ae88b",
    alias: "Synthetic",
    eligibility: "unknown",
    enabled: true,
  };
  let resolveOld: (response: Response) => void = () => {
    throw new Error("not initialized");
  };
  const oldResponse = new Promise<Response>((resolve) => {
    resolveOld = resolve;
  });
  let firstList = true;
  const response = (value: unknown) =>
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
    });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/session"))
        return Promise.resolve(
          response({
            authenticated: true,
            role: "adult",
            csrf_token: "synthetic-csrf",
          }),
        );
      if (url.endsWith("/admin/learners")) {
        if (options.method === "POST") return Promise.resolve(response(row));
        if (firstList) {
          firstList = false;
          return oldResponse;
        }
        return Promise.resolve(response([row]));
      }
      if (url.endsWith("/features"))
        return Promise.resolve(
          response({ tutoring_available: false, photos_available: false }),
        );
      return Promise.resolve(response([]));
    }),
  );
  render(<App />);
  fireEvent.click(await screen.findByRole("link", { name: "Learners" }));
  fireEvent.change(screen.getByLabelText("Learner username"), {
    target: { value: "Synthetic" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "synthetic-password-only" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Create learner account" }),
  );
  await vi.waitFor(() =>
    expect(screen.getByLabelText("Learner username")).toHaveValue(row.alias),
  );
  await act(async () => {
    resolveOld(response([]));
    await oldResponse;
  });
  expect(screen.getByLabelText("Learner username")).toHaveValue(row.alias);
});

it("retries a failed learner list when the adult reconnects", async () => {
  let lists = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("/auth/session"))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              authenticated: true,
              role: "adult",
              csrf_token: "synthetic-csrf",
            }),
          ),
        );
      if (url.endsWith("/admin/learners")) {
        lists += 1;
        if (lists === 1)
          return Promise.reject(new TypeError("Synthetic connection loss"));
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: "4a15f6fc-8866-468e-801c-1faedc9ae88b",
                alias: "Recovered learner",
                eligibility: "unknown",
                enabled: true,
              },
            ]),
          ),
        );
      }
      return Promise.resolve(new Response("[]"));
    }),
  );
  render(<App />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
  await screen.findByRole("button", { name: /Recovered learner/ });
  expect(lists).toBe(2);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps the selected session when a previous session response arrives late", async () => {
  const learner = "4a15f6fc-8866-468e-801c-1faedc9ae88b";
  const first = "4a15f6fc-8866-468e-801c-1faedc9ae881";
  const second = "4a15f6fc-8866-468e-801c-1faedc9ae882";
  window.location.hash = "";
  let resolveOld: (response: Response) => void = () => {
    throw new Error("not initialized");
  };
  const oldResponse = new Promise<Response>((resolve) => {
    resolveOld = resolve;
  });
  const response = (value: unknown) => new Response(JSON.stringify(value));
  const session = (id: string) => ({
    id,
    learner_id: learner,
    status: "completed",
    problems: [],
    topic: id === first ? "Old session" : "Chosen session",
    initiative: "balanced",
    difficulty: "standard",
  });
  const fetcher = vi.fn((url: string) => {
    if (url.endsWith(`/sessions/${first}`)) return oldResponse;
    if (url.endsWith(`/sessions/${second}`))
      return Promise.resolve(response(session(second)));
    if (url.endsWith("/sessions"))
      return Promise.resolve(
        response([first, second].map(session).map(summary)),
      );
    if (url.endsWith("/features"))
      return Promise.resolve(response({ photos_available: false }));
    return Promise.resolve(response([]));
  });
  vi.stubGlobal("fetch", fetcher);
  const run = async (action: () => Promise<void>) => {
    await action();
  };
  render(<Tutor learner={learner} offline={false} act={run} page="history" />);
  await vi.waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Review session" }),
    ).toHaveLength(2),
  );
  fireEvent.click(
    screen.getAllByRole("button", { name: "Review session" })[0]!,
  );
  fireEvent.click(
    screen.getAllByRole("button", { name: "Review session" })[1]!,
  );
  await vi.waitFor(() => expect(window.location.hash).toBe(`#tutor=${second}`));
  await act(async () => {
    resolveOld(response(session(first)));
    await oldResponse;
  });
  expect(
    screen.getAllByRole("heading", { name: "Chosen session", hidden: true }),
  ).toHaveLength(2);
  expect(window.location.hash).toBe(`#tutor=${second}`);
  window.location.hash = "";
});

it("rejects a URL session belonging to a different selected learner", async () => {
  const wrongSession = "4a15f6fc-8866-468e-801c-1faedc9ae883";
  const learner = "4a15f6fc-8866-468e-801c-1faedc9ae884";
  window.location.hash = `tutor=${wrongSession}`;
  const response = (body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body)));
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith(`/sessions/${wrongSession}`))
        return response({
          id: wrongSession,
          learner_id: "4a15f6fc-8866-468e-801c-1faedc9ae885",
          status: "completed",
          problems: [],
          topic: "Previous learner private profile",
          initiative: "balanced",
          difficulty: "standard",
        });
      if (url.endsWith("/features"))
        return response({ photos_available: false });
      return response([]);
    }),
  );
  const run = async (action: () => Promise<void>) => {
    await action();
  };
  render(<Tutor learner={learner} offline={false} act={run} />);
  await vi.waitFor(() => expect(window.location.hash).toBe(""));
  expect(screen.queryByText(/Previous learner private profile/)).toBeNull();
  expect(
    screen.queryByRole("heading", { name: "Current activity" }),
  ).toBeNull();
  expect(
    screen.getByRole("heading", { name: "Start a practice session" }),
  ).toBeVisible();
});

it("does not restore an old learner's URL when its request completes after switching", async () => {
  const oldLearner = "4a15f6fc-8866-468e-801c-1faedc9ae885";
  const newLearner = "4a15f6fc-8866-468e-801c-1faedc9ae886";
  const oldSession = "4a15f6fc-8866-468e-801c-1faedc9ae887";
  window.location.hash = `tutor=${oldSession}`;
  let resolveOld!: (response: Response) => void;
  const oldResponse = new Promise<Response>((resolve) => {
    resolveOld = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith(`/sessions/${oldSession}`)) return oldResponse;
      if (url.endsWith("/features"))
        return Promise.resolve(
          new Response('{"photos_available":false,"tutoring_available":true}'),
        );
      return Promise.resolve(new Response("[]"));
    }),
  );
  const run = async (action: () => Promise<void>) => {
    await action();
  };
  const view = render(
    <Tutor key={oldLearner} learner={oldLearner} offline={false} act={run} />,
  );
  window.location.hash = "";
  view.rerender(
    <Tutor key={newLearner} learner={newLearner} offline={false} act={run} />,
  );
  await act(async () => {
    resolveOld(
      new Response(
        JSON.stringify({
          id: oldSession,
          learner_id: oldLearner,
          status: "completed",
          problems: [],
          topic: "Old private session",
          initiative: "balanced",
          difficulty: "standard",
        }),
      ),
    );
    await oldResponse;
  });
  expect(window.location.hash).toBe("");
  expect(screen.queryByText(/Old private session/)).toBeNull();
});

it("allows a corrected request after its first attempt is definitively rejected", async () => {
  window.location.hash = "";
  const learner = "4a15f6fc-8866-468e-801c-1faedc9ae884";
  const session = {
    id: "4a15f6fc-8866-468e-801c-1faedc9ae883",
    learner_id: learner,
    status: "open",
    problems: [],
    topic: "Persuasive writing",
    initiative: "balanced",
    difficulty: "standard",
  };
  const keys: unknown[] = [];
  const errors: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/sessions") && options.method === "POST") {
        keys.push(
          (options.headers as Record<string, string>)["Idempotency-Key"],
        );
        return Promise.resolve(
          keys.length === 1
            ? new Response('{"detail":"Synthetic first-attempt rejection."}', {
                status: 422,
              })
            : new Response(JSON.stringify(session), { status: 201 }),
        );
      }
      if (url.endsWith(`/sessions/${session.id}`))
        return Promise.resolve(new Response(JSON.stringify(session)));
      if (url.endsWith("/features"))
        return Promise.resolve(
          new Response('{"photos_available":false,"tutoring_available":true}'),
        );
      return Promise.resolve(new Response("[]"));
    }),
  );
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      errors.push(cause);
    }
  };
  render(<Tutor learner={learner} offline={false} act={run} />);
  fireEvent.change(screen.getByLabelText("Topic or learning goal"), {
    target: { value: "Persuasive writing" },
  });
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Start session" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  await vi.waitFor(() => expect(errors).toHaveLength(1));
  expect(
    screen.queryByRole("button", { name: "Retry saved request" }),
  ).toBeNull();
  expect(screen.getByRole("group", { name: "Tutor style" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Tutor style" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Start session" }));
  await vi.waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Create practice activity" }),
    ).toBeEnabled(),
  );
  expect(keys).toHaveLength(2);
  expect(keys[1]).not.toBe(keys[0]);
  window.location.hash = "";
});
