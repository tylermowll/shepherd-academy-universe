import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdultPanel } from "../src/AdultPanel";
import { setIdentity, type Schema } from "../src/client";

const learner: Schema<"LearnerPublic"> = {
  id: "4a15f6fc-8866-468e-801c-1faedc9ae88b",
  alias: "Orbit",
  eligibility: "unknown",
  enabled: true,
  has_password: true,
};
const accountId = "c50a2621-21eb-4670-9269-d9c491479635";
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
      model: "fixture-v1",
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
      eligibility_record: "Synthetic test fixture.",
      configured_context_limit: 8192,
      configured_output_limit: 16384,
      reasoning_effort: "default",
      structured_output_mode: "native",
    },
    {
      id: "local-text",
      adapter: "ollama",
      model: "synthetic-model",
      boundary: "local_network",
      audience: "mixed",
      enabled: true,
      image_input: false,
      tutor_probed: true,
      vision_probed: false,
      managed: false,
      key_configured: false,
      key_needs_replacement: false,
      requires_approval: false,
      eligibility_record: "Synthetic test fixture.",
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
const failures: Error[] = [];
const run = async (action: () => Promise<void>) => {
  try {
    await action();
  } catch (cause) {
    failures.push(cause as Error);
  }
};
const props = () => ({
  administrator: "home-admin",
  onSessionChange: vi.fn(),
  learner: learner.id,
  learners: [learner],
  onLearner: vi.fn(),
  onRefresh: vi.fn(() => Promise.resolve()),
  page: "learners" as const,
  onNavigate: vi.fn(),
  act: run,
});

beforeEach(() => {
  failures.length = 0;
  setIdentity("synthetic-csrf", true);
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        response(
          (typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url
          ).endsWith("/devices")
            ? []
            : providers,
        ),
      ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("learner accounts", () => {
  it("places account actions beside the learner and explains browser access", async () => {
    render(<AdultPanel {...props()} />);
    expect(
      screen.getByRole("region", { name: "Selected learner" }),
    ).toContainHTML("Orbit");
    expect(screen.queryByRole("button", { name: "Open practice" })).toBeNull();
    expect(
      await screen.findByText("No browsers are signed in as Orbit."),
    ).toBeVisible();
    expect(
      screen.getByText(/Scanning the photo QR code does not sign a browser/),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create my practice profile" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve device" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Add new AI connection" }),
    ).toBeNull();
  });

  it("creates one account with a write-only password and selects the returned learner", async () => {
    const fetcher = vi.fn(() => Promise.resolve(response(learner)));
    vi.stubGlobal("fetch", fetcher);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(accountId);
    const handlers = props();
    render(<AdultPanel {...handlers} learner="" learners={[]} />);
    fireEvent.change(screen.getByLabelText("Learner username"), {
      target: { value: learner.alias },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "synthetic-password-only" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create learner account" }),
    );
    await vi.waitFor(() => expect(handlers.onRefresh).toHaveBeenCalledTimes(1));
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/admin/learners",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          alias: "Orbit",
          password: "synthetic-password-only",
          eligibility: "unknown",
        }),
      }),
    );
    expect(handlers.onLearner).toHaveBeenCalledWith(learner.id);
    expect(handlers.onNavigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("keeps the entered username when the server rejects a duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          response(
            {
              detail:
                "That username is already in use. Choose a different username.",
            },
            409,
          ),
        ),
      ),
    );
    const handlers = props();
    render(<AdultPanel {...handlers} learners={[]} learner="" />);
    fireEvent.change(screen.getByLabelText("Learner username"), {
      target: { value: "Orbit" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "synthetic-password-only" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create learner account" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "already in use",
    );
    expect(screen.getByLabelText("Learner username")).toHaveValue("Orbit");
    expect(handlers.onLearner).not.toHaveBeenCalled();
  });

  it.each(["add", "delete"])(
    "refreshes after a delayed %s without changing the selection after leaving",
    async (action) => {
      let resolveChange: (response: Response) => void = () => {
        throw new Error("not started");
      };
      vi.stubGlobal(
        "fetch",
        vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
          init?.method === "POST" || init?.method === "DELETE"
            ? new Promise<Response>((resolve) => {
                resolveChange = resolve;
              })
            : Promise.resolve(
                response(
                  (typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.href
                      : input.url
                  ).endsWith("/devices")
                    ? []
                    : providers,
                ),
              ),
        ),
      );
      const handlers = props();
      const view = render(
        <AdultPanel
          {...handlers}
          learners={action === "add" ? [] : [learner]}
        />,
      );
      if (action === "add") {
        fireEvent.change(screen.getByLabelText("Learner username"), {
          target: { value: "Orbit" },
        });
        fireEvent.change(screen.getByLabelText("Password"), {
          target: { value: "synthetic-password-only" },
        });
        fireEvent.click(
          screen.getByRole("button", { name: "Create learner account" }),
        );
      } else {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        fireEvent.click(screen.getByRole("button", { name: "Delete learner" }));
      }
      view.rerender(<AdultPanel {...handlers} page="settings" />);
      await act(async () => {
        resolveChange(response(action === "add" ? learner : {}));
        await Promise.resolve();
      });
      await vi.waitFor(() => expect(handlers.onRefresh).toHaveBeenCalled());
      expect(handlers.onLearner).not.toHaveBeenCalled();
    },
  );

  it("saves a reset without ever displaying a stored password", async () => {
    const fetcher = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        response(
          (typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url
          ).endsWith("/devices")
            ? []
            : learner,
        ),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const handlers = props();
    render(<AdultPanel {...handlers} />);
    const password = screen.getByLabelText("New password");
    expect(password).toHaveValue("");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.change(password, {
      target: { value: "synthetic-reset-password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save sign-in details" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "This learner's browsers are signed out",
    );
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/admin/learners/${learner.id}/account`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          alias: "Orbit",
          password: "synthetic-reset-password",
        }),
      }),
    );
    expect(password).toHaveValue("");
  });

  it("requires confirmation before deleting an account and its work", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const handlers = props();
    render(<AdultPanel {...handlers} />);
    await screen.findByText("No browsers are signed in as Orbit.");
    fireEvent.click(screen.getByRole("button", { name: "Delete learner" }));
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("Orbit's account and saved work"),
    );
    expect(fetch).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(handlers.onRefresh).not.toHaveBeenCalled();
  });
});

describe("AI settings page", () => {
  const card = (id = "local-text") =>
    within(screen.getByRole("heading", { name: id }).closest("article")!);
  const authorize = (id = "local-text") =>
    fireEvent.click(
      card(id).getByRole("checkbox", {
        name: `I authorize ${id} to process future learner work.`,
      }),
    );

  it("combines setup in two keyboard-navigable tabs and preserves editor drafts", async () => {
    const settings = {
      ...providers,
      providers: providers.providers.map((provider) => ({
        ...provider,
        managed: provider.id === "local-text",
      })),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(response(settings))),
    );
    render(<AdultPanel {...props()} page="settings" />);
    const models = await screen.findByRole("tab", {
      name: /Models.*Add, test and activate AI/,
    });
    const privacy = screen.getByRole("tab", { name: /Data & privacy/ });
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(models).toHaveAttribute("aria-selected", "true");
    expect(card().getByRole("button", { name: "Test tutor" })).toBeEnabled();
    expect(card().getByRole("button", { name: "Use as tutor" })).toBeDisabled();
    fireEvent.click(card().getByRole("button", { name: "Edit connection" }));
    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "Keep this unsaved model" },
    });
    fireEvent.keyDown(models, { key: "ArrowRight" });
    expect(privacy).toHaveAttribute("aria-selected", "true");
    expect(privacy).toHaveFocus();
    expect(
      screen.getByRole("region", { name: "Current models" }),
    ).toBeVisible();
    fireEvent.keyDown(privacy, { key: "Home" });
    expect(models).toHaveFocus();
    expect(screen.getByLabelText("Model name")).toHaveValue(
      "Keep this unsaved model",
    );
    fireEvent.keyDown(models, { key: "End" });
    expect(privacy).toHaveFocus();
    fireEvent.keyDown(privacy, { key: "ArrowRight" });
    expect(models).toHaveFocus();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("distinguishes authoritative active roles from a tested connection", async () => {
    render(<AdultPanel {...props()} page="settings" />);
    const summary = await screen.findByRole("region", {
      name: "Current models",
    });
    expect(summary).toHaveTextContent("Current tutor demo / fixture-v1");
    expect(summary).toHaveTextContent("Current photo reader demo / fixture-v1");
    expect(
      card("demo").getByText("Active tutor", { exact: true }),
    ).toBeVisible();
    expect(
      card("demo").getByText("Active photo reader", { exact: true }),
    ).toBeVisible();
    expect(card().getByText("Ready for tutor.", { exact: true })).toBeVisible();
    expect(card().queryByText("Active tutor", { exact: true })).toBeNull();
    expect(
      card().getByRole("button", { name: "Test photo reader" }),
    ).toBeDisabled();
  });

  it("shows changed selected connections as needing activation and permits explicit reapproval", async () => {
    const settings = {
      ...providers,
      routes: { tutor: "local-text", vision: "demo" },
      providers: providers.providers.map((provider) =>
        provider.id === "local-text"
          ? { ...provider, requires_approval: true }
          : provider,
      ),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(response(settings))),
    );
    render(<AdultPanel {...props()} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    expect(
      screen.getByRole("region", { name: "Current models" }),
    ).toHaveTextContent("Activation needed");
    expect(
      card().getByText("Selected tutor — activation needed", { exact: true }),
    ).toBeVisible();
    expect(card().queryByText("Active tutor", { exact: true })).toBeNull();
    authorize();
    expect(card().getByRole("button", { name: "Use as tutor" })).toBeEnabled();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("blocks activation until the matching role has passed without requiring the other role", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          response({
            ...providers,
            providers: providers.providers.map((provider) =>
              provider.id === "local-text"
                ? {
                    ...provider,
                    image_input: true,
                    tutor_probed: false,
                    vision_probed: true,
                  }
                : provider,
            ),
          }),
        ),
      ),
    );
    render(<AdultPanel {...props()} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    authorize();
    expect(card().getByRole("button", { name: "Use as tutor" })).toBeDisabled();
    expect(
      card().getByRole("button", { name: "Use as photo reader" }),
    ).toBeEnabled();
    expect(card().getByText(/Photo reading passed/)).toBeVisible();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("activates just the requested role and confirms the named server-returned choice", async () => {
    let routes = providers.routes;
    const fetcher = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/providers/routes/tutor")) {
        expect(JSON.parse(init!.body as string)).toEqual({
          provider_id: "local-text",
          expected_provider_id: "demo",
          acknowledge_data_boundary: true,
        });
        routes = { tutor: "local-text", vision: "demo" };
        return Promise.resolve(response(routes));
      }
      return Promise.resolve(response({ ...providers, routes }));
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AdultPanel {...props()} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    authorize();
    fireEvent.click(card().getByRole("button", { name: "Use as tutor" }));
    await screen.findByText("local-text / synthetic-model is now the tutor.");
    const summary = screen.getByRole("region", { name: "Current models" });
    expect(summary).toHaveTextContent(
      "Current tutor local-text / synthetic-model",
    );
    expect(summary).toHaveTextContent("Current photo reader demo / fixture-v1");
    expect(card().getByText("Active tutor", { exact: true })).toBeVisible();
    expect(card().getByRole("checkbox")).not.toBeChecked();
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(failures).toHaveLength(0);
  });

  it("locks activation controls and prevents duplicate saves across page changes", async () => {
    let finish: (value: Response) => void = () => {
      throw new Error("not started");
    };
    let routes = providers.routes;
    const fetcher = vi.fn((url: string) =>
      url.endsWith("/providers/routes/tutor")
        ? new Promise<Response>((resolve) => {
            finish = (value) => {
              routes = { tutor: "local-text", vision: "demo" };
              resolve(value);
            };
          })
        : Promise.resolve(response({ ...providers, routes })),
    );
    vi.stubGlobal("fetch", fetcher);
    const handlers = props();
    const view = render(<AdultPanel {...handlers} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    authorize();
    const use = card().getByRole("button", { name: "Use as tutor" });
    fireEvent.click(use);
    fireEvent.click(use);
    expect(screen.getByText("Saving tutor…")).toBeVisible();
    expect(use).toBeDisabled();
    expect(card().getByRole("checkbox")).toBeDisabled();
    view.rerender(<AdultPanel {...handlers} page="help" />);
    view.rerender(<AdultPanel {...handlers} page="settings" />);
    expect(card().getByRole("button", { name: "Use as tutor" })).toBeDisabled();
    await act(async () => {
      finish(response({ tutor: "local-text", vision: "demo" }));
      await Promise.resolve();
    });
    await screen.findByText("local-text / synthetic-model is now the tutor.");
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/routes/tutor")),
    ).toHaveLength(1);
  });

  it("refreshes a conflict without overwriting a newer choice or discarding an editor draft", async () => {
    let conflict = false;
    const settings = {
      ...providers,
      providers: providers.providers.map((provider) => ({
        ...provider,
        managed: provider.id === "local-text",
      })),
    };
    const fetcher = vi.fn((url: string) => {
      if (url.endsWith("/providers/routes/tutor")) {
        conflict = true;
        return Promise.resolve(
          response({ detail: "Synthetic stale choice." }, 409),
        );
      }
      return Promise.resolve(
        response({
          ...settings,
          routes: conflict
            ? { tutor: "local-text", vision: "demo" }
            : settings.routes,
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AdultPanel {...props()} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    fireEvent.click(card().getByRole("button", { name: "Edit connection" }));
    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "Preserve unsaved correction" },
    });
    authorize();
    fireEvent.click(card().getByRole("button", { name: "Use as tutor" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The current tutor changed elsewhere",
    );
    await vi.waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Current models" }),
      ).toHaveTextContent("Current tutor local-text / synthetic-model"),
    );
    expect(screen.getByLabelText("Model name")).toHaveValue(
      "Preserve unsaved correction",
    );
    expect(card().getByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByText(/is now the tutor/)).toBeNull();
    expect(
      fetcher.mock.calls.filter(([url]) => url.includes("/probe")),
    ).toHaveLength(0);
  });

  it("does not claim activation when the returned role differs and recovers with reads only", async () => {
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        response(
          url.endsWith("/providers/routes/tutor")
            ? providers.routes
            : providers,
        ),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<AdultPanel {...props()} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    authorize();
    fireEvent.click(card().getByRole("button", { name: "Use as tutor" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not confirm local-text as the tutor",
    );
    expect(screen.queryByText(/is now the tutor/)).toBeNull();
    expect(card().getByRole("checkbox")).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh connections" }),
    );
    await screen.findByText("Saved connections refreshed.");
    expect(card().getByRole("checkbox")).toBeEnabled();
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/routes/tutor")),
    ).toHaveLength(1);
  });

  it("retains a confirmed activation when only refreshing details fails and blocks stale mutations", async () => {
    let saved = false;
    let recover = false;
    const routes = { tutor: "local-text", vision: "demo" };
    const fetcher = vi.fn((url: string) => {
      if (url.endsWith("/providers/routes/tutor")) {
        saved = true;
        return Promise.resolve(response(routes));
      }
      return Promise.resolve(
        saved && !recover
          ? response({ detail: "Synthetic refresh loss" }, 503)
          : response({
              ...providers,
              routes: saved ? routes : providers.routes,
            }),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AdultPanel {...props()} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    authorize();
    fireEvent.click(card().getByRole("button", { name: "Use as tutor" }));
    await screen.findByText("local-text / synthetic-model is now the tutor.");
    await screen.findByText(
      /was confirmed as the tutor, but the connection details could not refresh/,
    );
    expect(
      screen.getByRole("region", { name: "Current models" }),
    ).toHaveTextContent("Current tutor local-text / synthetic-model");
    expect(card().getByRole("button", { name: "Test tutor" })).toBeDisabled();
    recover = true;
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh connections" }),
    );
    await screen.findByText("Saved connections refreshed.");
    expect(card().getByRole("button", { name: "Test tutor" })).toBeEnabled();
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/routes/tutor")),
    ).toHaveLength(1);
  });

  it("requires individual consent before any paid model test and never auto-activates it", async () => {
    render(<AdultPanel {...props()} page="settings" />);
    await screen.findByRole("heading", { name: /^Models$/ });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(card().getByRole("button", { name: "Test tutor" }));
    expect(fetch).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("may charge"));
    confirm.mockReturnValue(true);
    fireEvent.click(card().getByRole("button", { name: "Test tutor" }));
    await screen.findByText("local-text: tutor test passed.");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/providers/local-text/probe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          stage: "tutor",
          authorize_synthetic_call: true,
        }),
      }),
    );
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(
          ([url]) => typeof url === "string" && url.includes("/routes/"),
        ),
    ).toHaveLength(0);
  });

  it("loads Settings only and offers recovery after an initial retrieval failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          response(
            url.endsWith("/devices")
              ? []
              : { detail: "Synthetic settings unavailable" },
            url.endsWith("/devices") ? 200 : 503,
          ),
        ),
      ),
    );
    const handlers = props();
    const view = render(<AdultPanel {...handlers} />);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([url]) => typeof url === "string" && url.endsWith("/providers"),
        ),
    ).toBe(false);
    view.rerender(<AdultPanel {...handlers} page="settings" />);
    const retry = await screen.findByRole("button", {
      name: "Retry AI settings",
    });
    vi.mocked(fetch).mockResolvedValueOnce(response(providers));
    fireEvent.click(retry);
    await screen.findByRole("heading", { name: /^Models$/ });
    expect(
      screen.queryByRole("button", { name: "Retry AI settings" }),
    ).toBeNull();
  });
  it("reloads authoritative privacy settings after a confirmed save without sending the policy twice", async () => {
    let saved = false;
    let failRefresh = true;
    const fetcher = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/providers/policy")) {
        expect(init?.method).toBe("POST");
        saved = true;
        return Promise.resolve(response({ acknowledged: true }));
      }
      if (saved && failRefresh) {
        failRefresh = false;
        return Promise.resolve(
          response({ detail: "Synthetic refresh unavailable." }, 503),
        );
      }
      return Promise.resolve(
        response({
          ...providers,
          policy: { ...providers.policy, allow_cloud_inference: saved },
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AdultPanel {...props()} page="settings" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Data & privacy/ }));
    fireEvent.click(screen.getByLabelText("Allow cloud AI for this app"));
    fireEvent.click(
      screen.getByRole("button", { name: "Save data & privacy settings" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Data & privacy was saved, but the current settings could not be refreshed. Refresh settings to check them.",
    );
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save data & privacy settings" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh settings" }));
    await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeChecked();
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeEnabled();
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(
      fetcher.mock.calls.filter(
        ([url, init]) => url.endsWith("/providers") && init?.method === "GET",
      ),
    ).toHaveLength(3);
    expect(
      fetcher.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body,
    ).toBe(
      JSON.stringify({
        allow_cloud_inference: true,
        app_audience: "mixed",
        acknowledge_data_boundary: true,
      }),
    );
    expect(screen.getByRole("tab", { name: /Data & privacy/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(failures).toHaveLength(0);
  });
});
