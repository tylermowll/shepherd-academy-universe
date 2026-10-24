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
  it("separates the four setup purposes into keyboard-navigable tabs", async () => {
    render(<AdultPanel {...props()} page="settings" />);
    const connections = await screen.findByRole("tab", {
      name: /Connections.*Add and edit models/,
    });
    const permissions = screen.getByRole("tab", {
      name: /Data & privacy.*Cloud access and age groups/,
    });
    const tests = screen.getByRole("tab", {
      name: /Connection tests.*Try a sample request/,
    });
    const roles = screen.getByRole("tab", {
      name: /Active models.*Choose tutor and photo reader/,
    });
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(connections).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Connections" })).toBeVisible();

    fireEvent.click(permissions);
    expect(permissions).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "Data & privacy" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add new AI connection" }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(permissions, { key: "ArrowRight" });
    expect(tests).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "Connection tests" }),
    ).toBeVisible();
    expect(tests).toHaveFocus();

    fireEvent.keyDown(tests, { key: "End" });
    expect(roles).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "Active models" }),
    ).toBeVisible();
    expect(roles).toHaveFocus();
  });

  it("keeps an untested connection selectable while blocking final app-wide activation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          response({
            ...providers,
            routes: { tutor: "local-text", vision: "demo" },
            providers: providers.providers.map((provider) =>
              provider.id === "local-text"
                ? { ...provider, tutor_probed: false }
                : provider,
            ),
          }),
        ),
      ),
    );
    render(<AdultPanel {...props()} page="settings" />);
    const rolesTab = await screen.findByRole("tab", {
      name: /Active models/,
    });
    fireEvent.click(rolesTab);
    expect(
      screen.getByRole("heading", { name: "Active models" }),
    ).toBeVisible();
    expect(
      screen.getByText(/used across this app for future learner work/i),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Saving a connection never activates it; this final step does/i,
      ),
    ).toBeVisible();
    const tutor = screen.getByRole("combobox", { name: "Tutor connection" });
    expect(
      within(tutor).getByRole("option", { name: "local-text (setup needed)" }),
    ).toBeEnabled();
    expect(screen.getByText("Its tutor test has not passed.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Open Connection tests" }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "I authorize these connections to process future text and photos from every learner.",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Save active models" }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("lets an adult explicitly reapprove a changed, successfully tested connection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          response({
            ...providers,
            routes: { tutor: "local-text", vision: "demo" },
            providers: providers.providers.map((provider) =>
              provider.id === "local-text"
                ? { ...provider, requires_approval: true }
                : provider,
            ),
          }),
        ),
      ),
    );
    const handlers = props();
    render(<AdultPanel {...handlers} page="settings" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Active models/ }));
    const tutor = screen.getByRole("combobox", { name: "Tutor connection" });
    expect(
      within(tutor).getByRole("option", { name: "local-text (ready)" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/This connection has passed its tests. Save below/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "I authorize these connections to process future text and photos from every learner.",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save active models" }));
    await screen.findByText(
      "Active models saved. These choices apply to future work from every learner.",
    );
    const status = screen.getByRole("status");
    expect(status).toHaveClass("settings-toast");
    fireEvent.click(screen.getByRole("button", { name: "Open Users" }));
    expect(handlers.onNavigate).toHaveBeenCalledWith("learners");
    fireEvent.click(screen.getByRole("tab", { name: /Connections/ }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/providers/routes",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("protects active-model selections and prevents duplicate saves through delayed completion and page changes", async () => {
    let finish!: (value: Response) => void;
    let savedRoutes = providers.routes;
    const fetcher = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/providers/routes"))
        return new Promise<Response>((resolve) => {
          finish = (value) => {
            const body = JSON.parse(init?.body as string) as typeof savedRoutes;
            savedRoutes = { tutor: body.tutor, vision: body.vision };
            resolve(value);
          };
        });
      return Promise.resolve(response({ ...providers, routes: savedRoutes }));
    });
    vi.stubGlobal("fetch", fetcher);
    const handlers = props();
    const view = render(<AdultPanel {...handlers} page="settings" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Active models/ }));
    const tutor = screen.getByRole("combobox", { name: "Tutor connection" });
    const photoReader = screen.getByRole("combobox", {
      name: "Photo reader connection",
    });
    const consent = screen.getByRole("checkbox", {
      name: "I authorize these connections to process future text and photos from every learner.",
    });
    const save = screen.getByRole("button", { name: "Save active models" });
    fireEvent.change(tutor, { target: { value: "local-text" } });
    fireEvent.click(consent);
    fireEvent.click(save);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Saving active models…",
    );
    expect(tutor).toBeDisabled();
    expect(photoReader).toBeDisabled();
    expect(consent).toBeDisabled();
    expect(save).toBeDisabled();
    fireEvent.submit(save.closest("form")!);
    fireEvent.change(tutor, { target: { value: "demo" } });
    expect(tutor).toHaveValue("local-text");
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/providers/routes")),
    ).toHaveLength(1);

    view.rerender(<AdultPanel {...handlers} page="help" />);
    view.rerender(<AdultPanel {...handlers} page="settings" />);
    expect(
      screen.getByRole("button", { name: "Save active models" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Tutor connection" }),
    ).toHaveValue("local-text");
    await act(async () => {
      finish(response({ acknowledged: true }));
      await Promise.resolve();
    });
    await screen.findByText(
      "Active models saved. These choices apply to future work from every learner.",
    );
    expect(
      screen.getByRole("combobox", { name: "Tutor connection" }),
    ).toHaveValue("local-text");
    expect(
      screen.getByRole("combobox", { name: "Tutor connection" }),
    ).toBeEnabled();
    expect(consent).not.toBeChecked();
    expect(save).toBeDisabled();
    expect(failures).toHaveLength(0);
  });

  it("retains the selected active models and enables correction after a rejected save", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith("/providers/routes")
            ? response({ detail: "Synthetic activation rejected." }, 409)
            : response(providers),
        ),
      ),
    );
    render(<AdultPanel {...props()} page="settings" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Active models/ }));
    const tutor = screen.getByRole("combobox", { name: "Tutor connection" });
    fireEvent.change(tutor, { target: { value: "local-text" } });
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "I authorize these connections to process future text and photos from every learner.",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save active models" }));
    await vi.waitFor(() =>
      expect(failures[0]?.message).toBe("Synthetic activation rejected."),
    );
    expect(tutor).toHaveValue("local-text");
    expect(tutor).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Save active models" }),
    ).toBeEnabled();
    expect(screen.queryByText("Saving active models…")).toBeNull();
    expect(screen.queryByText(/Active models saved\./)).toBeNull();
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

  it("retains the confirmed active-model save receipt when only its settings refresh fails", async () => {
    let saved = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/providers/routes")) {
          saved = true;
          return Promise.resolve(response({ acknowledged: true }));
        }
        return Promise.resolve(
          saved
            ? response(
                { detail: "Synthetic settings refresh unavailable." },
                503,
              )
            : response(providers),
        );
      }),
    );
    render(<AdultPanel {...props()} page="settings" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Active models/ }));
    const consent = screen.getByRole("checkbox", {
      name: "I authorize these connections to process future text and photos from every learner.",
    });
    fireEvent.click(consent);
    fireEvent.click(screen.getByRole("button", { name: "Save active models" }));
    await vi.waitFor(() =>
      expect(failures[0]?.message).toBe(
        "Synthetic settings refresh unavailable.",
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Active models saved. These choices apply to future work from every learner.",
    );
    expect(
      screen.getByRole("combobox", { name: "Tutor connection" }),
    ).toBeEnabled();
    expect(consent).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Save active models" }),
    ).toBeDisabled();
    expect(screen.queryByText("Saving active models…")).toBeNull();
  });

  it("loads on Settings only, filters photo capability, and requires fresh consent after a selection change", async () => {
    const handlers = props();
    const { rerender } = render(<AdultPanel {...handlers} />);
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/v1/admin/providers",
      expect.anything(),
    );
    rerender(<AdultPanel {...handlers} page="settings" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Active models/ }));
    const tutor = screen.getByRole("combobox", { name: "Tutor connection" });
    const photoReader = screen.getByRole("combobox", {
      name: "Photo reader connection",
    });
    expect(
      within(photoReader).getByRole("option", {
        name: "local-text (no photo input)",
      }),
    ).toBeDisabled();
    expect(
      within(tutor).getByRole("option", { name: "local-text (ready)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Pairing request ID"),
    ).not.toBeInTheDocument();
    const save = screen.getByRole("button", {
      name: "Save active models",
    });
    expect(save).toBeDisabled();
    const consent = screen.getByRole("checkbox", {
      name: "I authorize these connections to process future text and photos from every learner.",
    });
    fireEvent.click(consent);
    expect(save).toBeEnabled();
    fireEvent.change(tutor, { target: { value: "local-text" } });
    expect(consent).not.toBeChecked();
    expect(save).toBeDisabled();
    fireEvent.click(consent);
    fireEvent.click(save);
    await screen.findByText(
      "Active models saved. These choices apply to future work from every learner.",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/providers/routes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tutor: "local-text",
          vision: "demo",
          acknowledge_data_boundary: true,
        }),
      }),
    );
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([url]) => url === "/api/v1/admin/providers"),
    ).toHaveLength(2);
  });

  it("does not call a live provider without approving the individual test", async () => {
    render(<AdultPanel {...props()} page="settings" />);
    fireEvent.click(
      await screen.findByRole("tab", { name: /Connection tests/ }),
    );
    const card = screen
      .getByRole("heading", { name: "local-text" })
      .closest("article")!;
    expect(
      within(card).getByRole("button", { name: "Test photo reader" }),
    ).toBeDisabled();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(within(card).getByRole("button", { name: "Test tutor" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("may charge"));
    confirm.mockReturnValue(true);
    fireEvent.click(within(card).getByRole("button", { name: "Test tutor" }));
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
  });

  it("provides a retry after settings fail to load instead of reporting empty settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ detail: "Provider configuration unavailable." }, 503),
        )
        .mockResolvedValueOnce(response(providers)),
    );
    render(<AdultPanel {...props()} page="settings" />);
    const retry = await screen.findByRole("button", {
      name: "Retry AI settings",
    });
    expect(failures[0]?.message).toBe("Provider configuration unavailable.");
    expect(screen.queryByText("Loading AI settings…")).not.toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByRole("heading", { name: "Connections" });
    expect(
      screen.queryByRole("button", { name: "Retry AI settings" }),
    ).not.toBeInTheDocument();
  });
});
