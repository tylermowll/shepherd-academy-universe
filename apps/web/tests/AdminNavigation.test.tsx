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
import { setIdentity, type Schema } from "../src/client";

const learner: Schema<"LearnerPublic"> = {
  id: "91518e6d-a73f-4ca4-b481-919d24c068ca",
  alias: "River",
  eligibility: "minor",
  enabled: true,
  has_password: true,
};
const adult: Schema<"SessionStatus"> = {
  authenticated: true,
  csrf_token: "synthetic-navigation-adult-csrf",
  login_name: "home-admin",
  role: "adult",
  setup_required: false,
};
const learnerSession: Schema<"SessionStatus"> = {
  authenticated: true,
  csrf_token: "synthetic-navigation-learner-csrf",
  login_name: learner.alias,
  learner_id: learner.id,
  role: "learner",
  setup_required: false,
};
const anonymous: Schema<"SessionStatus"> = {
  authenticated: false,
  csrf_token: "synthetic-navigation-anonymous-csrf",
  setup_required: false,
};
const providers: Schema<"ProvidersPublic"> = {
  policy: {
    allow_cloud_inference: false,
    app_audience: "mixed",
    cloud_locked: false,
    audience_locked: false,
    demo_mode: false,
  },
  routes: { tutor: "demo", vision: "demo" },
  providers: [
    {
      id: "demo",
      adapter: "mock",
      model: "synthetic-navigation-model",
      boundary: "synthetic",
      audience: "mixed",
      enabled: true,
      image_input: true,
      tutor_probed: true,
      vision_probed: true,
      managed: false,
      key_configured: false,
      key_needs_replacement: false,
      requires_approval: false,
      eligibility_record: "Synthetic fixture only.",
      configured_context_limit: 8192,
      configured_output_limit: 16384,
      reasoning_effort: "default",
      structured_output_mode: "native",
    },
  ],
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function fixture() {
  const state = {
    session: adult,
    expireSettings: false,
    passwordResponse: null as Promise<Response> | null,
    settingsResponse: null as Promise<Response> | null,
  };
  const fetcher = vi.fn((url: string, options?: RequestInit) => {
    if (url.endsWith("/auth/session"))
      return Promise.resolve(response(state.session));
    if (url.includes("/auth/accounts?"))
      return Promise.resolve(
        response([
          {
            login_name: url.includes("role=adult")
              ? "home-admin"
              : learner.alias,
            role: url.includes("role=adult") ? "adult" : "learner",
          },
        ]),
      );
    if (url.endsWith("/auth/login")) {
      const input = JSON.parse(options?.body as string) as { role: string };
      state.session = input.role === "adult" ? adult : learnerSession;
      return Promise.resolve(response(state.session));
    }
    if (url.endsWith("/auth/password"))
      return (
        state.passwordResponse ??
        Promise.resolve(
          response({ ...adult, csrf_token: "synthetic-rotated-csrf" }),
        )
      );
    if (url.endsWith("/admin/providers")) {
      if (state.expireSettings) {
        state.session = anonymous;
        return Promise.resolve(response({ detail: "Session ended." }, 401));
      }
      return state.settingsResponse ?? Promise.resolve(response(providers));
    }
    if (url.endsWith("/admin/learners"))
      return Promise.resolve(response([learner]));
    if (url.endsWith(`/admin/learners/${learner.id}/account`))
      return Promise.resolve(response(learner));
    if (url.endsWith("/devices") || url.endsWith("/tutor/sessions"))
      return Promise.resolve(response([]));
    if (url.endsWith("/features"))
      return Promise.resolve(
        response({
          tutoring_available: true,
          photos_available: false,
          text_processing: "mock",
        }),
      );
    throw new Error(`Unexpected synthetic request: ${url}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return { state, fetcher };
}

function navigate(name: "Users" | "Settings" | "Help") {
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).getByRole("link", { name }),
  );
}

async function openApp() {
  render(<App />);
  await screen.findByRole("button", {
    name: "home-admin Manage administrator",
  });
}

function fillPassword() {
  const panel = within(
    screen.getByRole("region", { name: "Administrator account" }),
  );
  for (const [label, value] of [
    ["Current password", "synthetic-current-password-only"],
    ["New password", "synthetic-new-password-only"],
    ["Confirm new password", "synthetic-new-password-only"],
  ])
    fireEvent.change(panel.getByLabelText(label!), { target: { value } });
  return panel;
}

beforeEach(() => {
  setIdentity("");
  window.history.replaceState(null, "", "/?page=learners");
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("administrator navigation", () => {
  it("preserves unsaved learner fields through Help and Settings without saving or storing them", async () => {
    const { fetcher } = fixture();
    await openApp();
    fireEvent.click(
      screen.getByRole("button", { name: "Add learner account" }),
    );
    fireEvent.change(screen.getByLabelText("Learner username"), {
      target: { value: "Synthetic unsaved learner" },
    });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), {
      target: { value: "synthetic-unsaved-learner-password-only" },
    });
    fireEvent.change(screen.getByLabelText("Age group"), {
      target: { value: "adult" },
    });
    navigate("Help");
    expect(screen.queryByRole("region", { name: "User accounts" })).toBeNull();
    navigate("Settings");
    await screen.findByRole("button", { name: "Add new AI connection" });
    navigate("Users");
    expect(screen.getByLabelText("Learner username")).toHaveValue(
      "Synthetic unsaved learner",
    );
    expect(screen.getByLabelText("Password", { exact: true })).toHaveValue(
      "synthetic-unsaved-learner-password-only",
    );
    expect(screen.getByLabelText("Age group")).toHaveValue("adult");
    expect(
      fetcher.mock.calls.filter(([, options]) => options?.method !== "GET"),
    ).toHaveLength(0);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("keeps password drafts and a delayed successful change receipt across page navigation", async () => {
    const { state, fetcher } = fixture();
    let finish!: (value: Response) => void;
    state.passwordResponse = new Promise((resolve) => {
      finish = resolve;
    });
    await openApp();
    fireEvent.click(
      screen.getByRole("button", { name: "home-admin Manage administrator" }),
    );
    fillPassword();
    navigate("Help");
    navigate("Settings");
    await screen.findByRole("button", { name: "Add new AI connection" });
    navigate("Users");
    const panel = within(
      screen.getByRole("region", { name: "Administrator account" }),
    );
    expect(panel.getByLabelText("Current password")).toHaveValue(
      "synthetic-current-password-only",
    );
    expect(panel.getByLabelText("New password", { exact: true })).toHaveValue(
      "synthetic-new-password-only",
    );
    expect(panel.getByLabelText("Confirm new password")).toHaveValue(
      "synthetic-new-password-only",
    );
    fireEvent.click(
      panel.getByRole("button", { name: "Change administrator password" }),
    );
    let finishSettings!: (value: Response) => void;
    state.settingsResponse = new Promise((resolve) => {
      finishSettings = resolve;
    });
    navigate("Settings");
    await vi.waitFor(() =>
      expect(
        fetcher.mock.calls.filter(([url]) => url.endsWith("/admin/providers")),
      ).toHaveLength(2),
    );
    await act(async () => {
      finishSettings(response(providers));
      await state.settingsResponse;
    });
    state.settingsResponse = null;
    navigate("Help");
    const leavingPendingChange = new Event("beforeunload", {
      cancelable: true,
    });
    window.dispatchEvent(leavingPendingChange);
    expect(leavingPendingChange.defaultPrevented).toBe(true);
    await act(async () => {
      finish(response({ ...adult, csrf_token: "synthetic-rotated-csrf" }));
      await state.passwordResponse;
    });
    expect(
      screen.queryByRole("region", { name: "Administrator account" }),
    ).toBeNull();
    navigate("Settings");
    await screen.findByRole("button", { name: "Add new AI connection" });
    navigate("Users");
    const restored = within(
      screen.getByRole("region", { name: "Administrator account" }),
    );
    expect(restored.getByRole("status")).toHaveTextContent(
      "Administrator password changed. Other administrator browsers are signed out.",
    );
    expect(restored.getByLabelText("Current password")).toHaveValue("");
    expect(
      restored.getByLabelText("New password", { exact: true }),
    ).toHaveValue("");
    const afterSave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(afterSave);
    expect(afterSave.defaultPrevented).toBe(false);
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/auth/password")),
    ).toHaveLength(1);
    expect(
      fetcher.mock.calls
        .filter(([url]) => url.endsWith("/admin/providers"))
        .at(-1)?.[1]?.headers,
    ).toMatchObject({ "X-CSRF-Token": "synthetic-rotated-csrf" });
  });

  it("retains connection credentials and privacy drafts through Settings tabs and Help without sending them", async () => {
    const { fetcher } = fixture();
    await openApp();
    navigate("Settings");
    fireEvent.click(
      await screen.findByRole("button", { name: "Add new AI connection" }),
    );
    fireEvent.change(screen.getByLabelText("Connection name"), {
      target: { value: "synthetic-navigation" },
    });
    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "synthetic-unsaved-model" },
    });
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "replace" },
    });
    fireEvent.change(screen.getByLabelText("API key", { exact: true }), {
      target: { value: "synthetic-unsaved-key-only" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Data & privacy/ }));
    fireEvent.change(screen.getByLabelText("Who uses this app?"), {
      target: { value: "adult_only" },
    });
    fireEvent.click(screen.getByLabelText("Allow cloud AI for this app"));
    fireEvent.click(screen.getByRole("tab", { name: /Models/ }));
    fireEvent.click(screen.getByRole("tab", { name: /Data & privacy/ }));
    expect(screen.getByLabelText("Who uses this app?")).toHaveValue(
      "adult_only",
    );
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeChecked();
    navigate("Help");
    navigate("Users");
    navigate("Settings");
    expect(screen.getByRole("tab", { name: /Data & privacy/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Who uses this app?")).toHaveValue(
      "adult_only",
    );
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeChecked();
    fireEvent.click(screen.getByRole("tab", { name: /Models/ }));
    expect(screen.getByLabelText("Connection name")).toHaveValue(
      "synthetic-navigation",
    );
    expect(screen.getByLabelText("Model name")).toHaveValue(
      "synthetic-unsaved-model",
    );
    expect(screen.getByLabelText("API key", { exact: true })).toHaveValue(
      "synthetic-unsaved-key-only",
    );
    expect(
      fetcher.mock.calls.filter(([, options]) => options?.method !== "GET"),
    ).toHaveLength(0);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("removes hidden administrator drafts when switching successfully to a learner", async () => {
    fixture();
    const view = render(<App />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "home-admin Manage administrator",
      }),
    );
    fillPassword();
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Account navigation" }),
      ).getByRole("link", { name: "Learner sign-in" }),
    );
    const signIn = screen.getByRole("button", { name: "Sign in" });
    const fields = within(signIn.closest("form")!);
    await fields.findByRole("option", { name: learner.alias });
    fireEvent.change(fields.getByRole("combobox", { name: "Account" }), {
      target: { value: learner.alias },
    });
    fireEvent.change(fields.getByLabelText("Password", { exact: true }), {
      target: { value: "synthetic-login-password-only" },
    });
    fireEvent.click(signIn);
    await vi.waitFor(() =>
      expect(screen.getByLabelText("Signed in account")).toHaveTextContent(
        learner.alias,
      ),
    );
    expect(
      screen.queryByRole("region", {
        name: "Administrator account",
        hidden: true,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "User accounts", hidden: true }),
    ).toBeNull();
    expect(
      Array.from(view.container.querySelectorAll("input")).map(
        (input) => input.value,
      ),
    ).not.toContain("synthetic-new-password-only");
  });

  it("clears hidden administrator content on authentication loss and rejects a late password response", async () => {
    const { state } = fixture();
    let finish!: (value: Response) => void;
    state.passwordResponse = new Promise((resolve) => {
      finish = resolve;
    });
    await openApp();
    fireEvent.click(
      screen.getByRole("button", { name: "home-admin Manage administrator" }),
    );
    const panel = fillPassword();
    fireEvent.click(
      panel.getByRole("button", { name: "Change administrator password" }),
    );
    state.expireSettings = true;
    navigate("Settings");
    await vi.waitFor(() =>
      expect(screen.queryByLabelText("Signed in account")).toBeNull(),
    );
    expect(
      screen.queryByRole("region", {
        name: "Administrator account",
        hidden: true,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: "User accounts", hidden: true }),
    ).toBeNull();
    await act(async () => {
      finish(
        response({ ...adult, csrf_token: "synthetic-stale-rotated-csrf" }),
      );
      await state.passwordResponse;
    });
    expect(screen.queryByLabelText("Signed in account")).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(
      screen.queryByText(
        "Administrator password changed. Other administrator browsers are signed out.",
      ),
    ).toBeNull();
  });

  it("keeps a learner completion notice on return but clears it when selecting administrator management", async () => {
    fixture();
    await openApp();
    fireEvent.click(
      await screen.findByRole("button", { name: "River Manage account" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save sign-in details" }),
    );
    await screen.findByText("Username saved.");
    navigate("Help");
    navigate("Settings");
    await screen.findByRole("button", { name: "Add new AI connection" });
    navigate("Users");
    expect(screen.getByRole("status")).toHaveTextContent("Username saved.");
    fireEvent.click(
      screen.getByRole("button", { name: "home-admin Manage administrator" }),
    );
    expect(screen.queryByText("Username saved.")).toBeNull();
  });
});
