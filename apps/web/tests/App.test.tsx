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

const browser = (
  globalThis as typeof globalThis & {
    jsdom: { reconfigure(options: { url: string }): void };
  }
).jsdom;
const originalUrl = window.location.href;

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
  browser.reconfigure({ url: originalUrl });
  vi.unstubAllGlobals();
});
describe("entry", () => {
  it("opens learner sign-in with a CSRF bootstrap and an administrator entry link", async () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Username")).toBeVisible();
    const navigation = screen.getByRole("navigation", {
      name: "Sign-in navigation",
    });
    expect(
      within(navigation).getByRole("link", { name: "Administrator sign-in" }),
    ).toHaveAttribute("href", "/?page=learners&signin=adult");
    expect(
      within(navigation).getByRole("link", { name: "Help" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Account navigation" }),
    ).toBeNull();
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
  it.each(["learners", "settings"])(
    "opens administrator sign-in for an anonymous %s bookmark",
    async (page) => {
      window.history.replaceState(null, "", `/?page=${page}`);
      render(<App />);
      await vi.waitFor(() =>
        expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Administrator sign-in",
      );
      expect(
        screen.getByRole("link", { name: "Learner sign-in" }),
      ).toBeVisible();
      expect(
        screen.queryByRole("navigation", { name: "Main navigation" }),
      ).toBeNull();
    },
  );
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
    "submits the selected $role entry and clears the previous selection on success",
    async (signedIn) => {
      window.history.replaceState(
        null,
        "",
        signedIn.role === "adult"
          ? "/?page=learners&signin=adult&help=setup#tutor=911c9abc-4e8e-424d-a914-4338187ba00b"
          : "/?help=setup#tutor=911c9abc-4e8e-424d-a914-4338187ba00b",
      );
      const fetcher = vi.fn<
        (url: string, options?: RequestInit) => Promise<Response>
      >((url) => {
        if (url.endsWith("/auth/session"))
          return Promise.resolve(
            response({ authenticated: false, csrf_token: "synthetic-csrf" }),
          );
        if (url.endsWith("/auth/login"))
          return Promise.resolve(response(signedIn));
        if (url.endsWith("/features"))
          return Promise.resolve(response(features));
        return Promise.resolve(response([]));
      });
      vi.stubGlobal("fetch", fetcher);
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
      ).toBe(signedIn.role === "adult" ? "/?page=learners" : "/?page=practice");
      const login = fetcher.mock.calls.find(([url]) =>
        url.endsWith("/auth/login"),
      );
      expect(login).toBeDefined();
      expect(JSON.parse((login![1] as RequestInit).body as string)).toEqual({
        login_name: signedIn.login_name,
        password: "synthetic-password-only",
        role: signedIn.role,
      });
    },
  );

  it("offers both sign-in destinations to guests and preserves their URLs on reload and back", async () => {
    let view = render(<App />);
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("link", { name: "Administrator sign-in" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Administrator sign-in",
    );
    expect(window.location.search).toBe("?page=learners&signin=adult");
    fireEvent.click(screen.getByRole("link", { name: "Learner sign-in" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    window.history.back();
    await vi.waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Administrator sign-in",
      ),
    );
    view.unmount();
    view = render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Administrator sign-in",
    );
    fireEvent.click(screen.getByRole("link", { name: "Help" }));
    expect(new URLSearchParams(window.location.search).get("signin")).toBe(
      "adult",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Help");
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("link", { name: "Administrator sign-in" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Administrator sign-in",
    );
    view.unmount();
  });

  it.each([
    { deployment: "http://localhost:5173/", role: "adult" },
    { deployment: "http://localhost:5173/", role: "learner" },
    {
      deployment: "https://learn.example.test/household/tutor/",
      role: "adult",
    },
    {
      deployment: "https://learn.example.test/household/tutor/",
      role: "learner",
    },
  ])(
    "preserves the $role entry in actual Help and copied inline hrefs at $deployment",
    async ({ deployment, role }) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve(
            response({ authenticated: false, csrf_token: "synthetic-csrf" }),
          ),
        ),
      );
      browser.reconfigure({
        url: `${deployment}?deployment=synthetic&page=${role === "adult" ? "learners" : "practice"}&signin=${role}`,
      });
      const current = new URL(window.location.href);
      const assertLink = (link: HTMLElement, page: string, help?: string) => {
        const href = link.getAttribute("href");
        expect(href).not.toBeNull();
        const destination = new URL(href!, window.location.href);
        expect(destination.origin).toBe(current.origin);
        expect(destination.pathname).toBe(current.pathname);
        expect(destination.searchParams.get("deployment")).toBe("synthetic");
        expect(destination.searchParams.get("signin")).toBe(role);
        expect(destination.searchParams.get("page")).toBe(page);
        expect(destination.searchParams.get("help")).toBe(help ?? null);
      };

      let view = render(<App />);
      await vi.waitFor(() =>
        expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
      );
      const navigation = within(
        screen.getByRole("navigation", { name: "Sign-in navigation" }),
      );
      assertLink(navigation.getByRole("link", { name: "Help" }), "help");
      const footerPrivacy = within(
        view.container.querySelector("footer")!,
      ).getByRole("link", { name: "Saved work & privacy" });
      assertLink(footerPrivacy, "help", "privacy");
      fireEvent.click(footerPrivacy);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Help",
      );
      const topics = within(
        screen.getByRole("navigation", { name: "Help topics" }),
      );
      for (const link of topics.getAllByRole("link")) {
        const topic = new URL(
          link.getAttribute("href")!,
          current.href,
        ).searchParams.get("help");
        expect(topic).toBeTruthy();
        assertLink(link, "help", topic!);
      }
      const practiceTopic = topics.getByRole("link", {
        name: "Start practicing",
      });
      assertLink(practiceTopic, "help", "practice");
      fireEvent.click(practiceTopic);
      const practice = screen.getByRole("link", { name: "Practice" });
      assertLink(practice, "practice");
      fireEvent.click(screen.getByText("Why is Start session unavailable?"));
      const settings = screen.getByRole("link", { name: "Settings" });
      assertLink(settings, "settings");
      const copiedHrefs = [
        practice.getAttribute("href")!,
        settings.getAttribute("href")!,
      ];

      for (const href of copiedHrefs) {
        view.unmount();
        window.history.replaceState(null, "", href);
        view = render(<App />);
        await vi.waitFor(() =>
          expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          role === "adult" ? "Administrator sign-in" : "Learner sign-in",
        );
        expect(screen.queryByLabelText("Signed in account")).toBeNull();
        expect(
          screen.queryByRole("navigation", { name: "Main navigation" }),
        ).toBeNull();
      }
      view.unmount();
    },
  );

  it.each([
    { account: adult, target: "Learner sign-in", role: "learner" },
    { account: learnerAccount, target: "Administrator sign-in", role: "adult" },
  ])(
    "keeps the $role switch entry separate after Help, Back and reload",
    async ({ account, target, role }) => {
      const fetcher = vi.fn((url: string) =>
        Promise.resolve(
          response(
            url.endsWith("/auth/session")
              ? account
              : url.endsWith("/features")
                ? features
                : [],
          ),
        ),
      );
      vi.stubGlobal("fetch", fetcher);
      let view = render(<App />);
      await screen.findByLabelText("Signed in account");
      const navigation = within(
        screen.getByRole("navigation", { name: "Account navigation" }),
      );
      expect(navigation.getAllByRole("link")).toHaveLength(1);
      fireEvent.click(navigation.getByRole("link", { name: target }));
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        target,
      );
      fireEvent.click(screen.getByRole("link", { name: "Help" }));
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Help",
      );
      expect(new URLSearchParams(window.location.search).get("signin")).toBe(
        role,
      );
      expect(screen.queryByLabelText("Signed in account")).toBeNull();
      expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
      expect(
        screen.queryByRole("navigation", { name: "Main navigation" }),
      ).toBeNull();

      window.history.back();
      await vi.waitFor(() =>
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          target,
        ),
      );
      view.unmount();
      view = render(<App />);
      await vi.waitFor(() =>
        expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        target,
      );
      expect(screen.queryByLabelText("Signed in account")).toBeNull();
      expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
      expect(
        screen.queryByRole("navigation", { name: "Main navigation" }),
      ).toBeNull();
      expect(
        fetcher.mock.calls.some(
          ([url]) =>
            url.endsWith("/auth/logout") || url.endsWith("/auth/login"),
        ),
      ).toBe(false);
      view.unmount();
    },
  );

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
    const accountNavigation = screen.getByRole("navigation", {
      name: "Account navigation",
    });
    expect(within(accountNavigation).getAllByRole("link")).toHaveLength(1);
    fireEvent.click(
      within(accountNavigation).getByRole("link", { name: "Learner sign-in" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    expect(screen.queryByLabelText("Signed in account")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Account navigation" }),
    ).toBeNull();
    expect(screen.queryByText("home-admin")).toBeNull();
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
    fireEvent.click(
      screen.getByRole("link", { name: "Administrator sign-in" }),
    );
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
      loginCalls.map(
        ([, options]) => JSON.parse(options.body as string) as unknown,
      ),
    ).toEqual([
      {
        login_name: "home-learner",
        password: "synthetic-password-only",
        role: "learner",
      },
      {
        login_name: "home-admin",
        password: "synthetic-password-only",
        role: "adult",
      },
    ]);
    expect(
      fetcher.mock.calls.some(([url]) => url.endsWith("/auth/logout")),
    ).toBe(false);
  });

  it.each([
    {
      status: 401,
      login: "home-admin",
      detail: "Incorrect username or password.",
    },
    {
      status: 403,
      login: "home-learner",
      detail: "Use an administrator account for Administrator sign-in.",
    },
  ])(
    "keeps the learner account and actual draft after a $status administrator sign-in failure and cancellation",
    async ({ status, login, detail }) => {
      const fetcher = vi.fn((url: string) => {
        if (url.endsWith("/auth/session"))
          return Promise.resolve(response(learnerAccount));
        if (url.endsWith("/auth/login"))
          return Promise.resolve(response({ detail }, status));
        if (url.endsWith("/features"))
          return Promise.resolve(response(features));
        return Promise.resolve(response([]));
      });
      vi.stubGlobal("fetch", fetcher);
      render(<App />);
      const topic = await screen.findByLabelText("Topic or learning goal");
      fireEvent.change(topic, {
        target: { value: "Keep my learner's unsent idea." },
      });
      fireEvent.click(
        screen.getByRole("link", { name: "Administrator sign-in" }),
      );
      expect(topic).not.toBeVisible();
      expect(
        screen.getByText(/A successful sign-in clears unsent text and photos/),
      ).toBeVisible();
      await vi.waitFor(() =>
        expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
      );
      signIn(login, "synthetic-password-only");
      expect(await screen.findByRole("alert")).toHaveTextContent(detail);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Administrator sign-in",
      );
      expect(screen.getByLabelText("Username")).toHaveValue(login);
      expect(screen.queryByLabelText("Signed in account")).toBeNull();
      expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
      expect(
        screen.queryByRole("navigation", { name: "Main navigation" }),
      ).toBeNull();
      expect(topic).toHaveValue("Keep my learner's unsent idea.");
      fireEvent.click(
        screen.getByRole("button", { name: "Cancel account switch" }),
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Practice",
      );
      expect(screen.getByLabelText("Signed in account")).toHaveTextContent(
        "home-learner",
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
    },
  );

  it("keeps the exact administrator settings after a role mismatch, Help and returning through the administrator entry", async () => {
    window.history.replaceState(null, "", "/?page=settings");
    const fetcher = vi.fn<
      (url: string, options?: RequestInit) => Promise<Response>
    >((url) =>
      Promise.resolve(
        response(
          url.endsWith("/auth/session")
            ? adult
            : url.endsWith("/auth/login")
              ? { detail: "Use a learner account for Learner sign-in." }
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
          url.endsWith("/auth/login") ? 403 : 200,
        ),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Add new AI connection" }),
    );
    const name = screen.getByLabelText("Connection name");
    fireEvent.change(name, { target: { value: "Unsent local connection" } });
    fireEvent.click(screen.getByRole("link", { name: "Learner sign-in" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    expect(name).not.toBeVisible();
    signIn("home-admin");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Use a learner account for Learner sign-in.",
    );
    expect(name).toHaveValue("Unsent local connection");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    expect(screen.queryByLabelText("Signed in account")).toBeNull();
    const login = fetcher.mock.calls.find(([url]) =>
      url.endsWith("/auth/login"),
    );
    expect(JSON.parse(login![1]!.body as string)).toEqual({
      login_name: "home-admin",
      password: "synthetic-password-only",
      role: "learner",
    });
    fireEvent.click(screen.getByRole("link", { name: "Help" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Help");
    expect(name).not.toBeVisible();
    expect(screen.queryByLabelText("Signed in account")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Learner sign-in" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Learner sign-in",
    );
    expect(name).not.toBeVisible();
    fireEvent.click(
      screen.getByRole("link", { name: "Administrator sign-in" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Settings",
    );
    expect(screen.getByLabelText("Connection name")).toBe(name);
    expect(name).toBeVisible();
    expect(name).toHaveValue("Unsent local connection");
    expect(window.location.search).toBe("?page=settings");
    expect(
      fetcher.mock.calls.some(([url]) => url.endsWith("/auth/logout")),
    ).toBe(false);
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
    fireEvent.click(
      screen.getByRole("link", { name: "Administrator sign-in" }),
    );
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    signIn("home-admin");
    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Cancel account switch" }),
    ).toBeDisabled();
    fireEvent.submit(submit.closest("form")!);
    const signInNavigation = screen.getByRole("navigation", {
      name: "Sign-in navigation",
    });
    for (const link of within(signInNavigation).getAllByRole("link")) {
      expect(link).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(link);
    }
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel account switch" }),
    );
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

  it("clears old drafts only after a successful matching account replacement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, options?: RequestInit) => {
        if (url.endsWith("/auth/session"))
          return Promise.resolve(response(learnerAccount));
        if (url.endsWith("/auth/login")) {
          const { role } = JSON.parse(options!.body as string) as {
            role: string;
          };
          return Promise.resolve(
            response(role === "adult" ? adult : learnerAccount),
          );
        }
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
    fireEvent.click(
      screen.getByRole("link", { name: "Administrator sign-in" }),
    );
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    expect(oldTopic).toHaveValue("Previous account draft.");
    signIn("home-admin");
    await screen.findByRole("heading", { level: 1, name: "Learners" });
    expect(oldTopic).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Learner sign-in" }));
    signIn("home-learner");
    await screen.findByRole("heading", { level: 1, name: "Practice" });
    expect(screen.getByLabelText("Topic or learning goal")).not.toBe(oldTopic);
    expect(screen.getByLabelText("Topic or learning goal")).toHaveValue("");
    expect(screen.queryByText(/^Signed in as a learner/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(window.location.search).toBe("?page=practice");
    await vi.waitFor(() => {
      const unguarded = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(unguarded);
      expect(unguarded.defaultPrevented).toBe(false);
    });
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
