import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProviderConnections,
  type ProviderSettingsSection,
} from "../src/ProviderConnections";
import { setIdentity, type Schema } from "../src/client";

const saved: Schema<"ProviderPublic"> = {
  id: "home-vision",
  adapter: "compatible",
  model: "installed-vision-model",
  base_url: "http://127.0.0.1:8081/v1",
  boundary: "local_network",
  audience: "mixed",
  enabled: true,
  image_input: true,
  tutor_probed: true,
  vision_probed: true,
  managed: true,
  key_configured: true,
  key_needs_replacement: false,
  requires_approval: false,
  eligibility_record: "Operator reviewed model terms.",
  configured_context_limit: 32768,
  configured_output_limit: 16384,
  reasoning_effort: "default",
  structured_output_mode: "native",
};
const configuration: Schema<"ProvidersPublic"> = {
  routes: { tutor: "demo", vision: "demo" },
  providers: [saved],
  policy: {
    allow_cloud_inference: false,
    app_audience: "mixed",
    cloud_locked: false,
    audience_locked: false,
    demo_mode: false,
  },
};
const response = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));
const run = async (action: () => Promise<void>) => action();
const terms = () =>
  screen.getByRole("checkbox", {
    name: "I reviewed the model and provider terms for the users selected above.",
  });
const openDetails = () => {
  fireEvent.click(screen.getByText("Technical details and actions"));
};

beforeEach(() => {
  setIdentity("synthetic-csrf", true);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => response({ acknowledged: true })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function show(
  value = configuration,
  section: ProviderSettingsSection = "models",
) {
  const onChanged = vi.fn(async () => {});
  const onNavigate = vi.fn();
  const onSectionChange = vi.fn();
  const props = {
    configuration: value,
    act: run,
    onChanged,
    onRoutesChanged: vi.fn(),
    onNavigate,
    onSectionChange,
  };
  const view = render(<ProviderConnections {...props} section={section} />);
  const showSection = (
    next: ProviderSettingsSection,
    nextValue: Schema<"ProvidersPublic"> = value,
  ) =>
    view.rerender(
      <ProviderConnections
        {...props}
        configuration={nextValue}
        section={next}
      />,
    );
  return { ...view, onChanged, onNavigate, onSectionChange, showSection };
}

function fillNew() {
  fireEvent.click(
    screen.getByRole("button", { name: "Add new AI connection" }),
  );
  fireEvent.change(screen.getByLabelText("Connection name"), {
    target: { value: "local-tutor" },
  });
  fireEvent.change(screen.getByLabelText("Model name"), {
    target: { value: "installed-text-model" },
  });
}

describe("adult connection setup", () => {
  it("reopens and saves Meta thinking effort without resetting the terms review", async () => {
    show({
      ...configuration,
      providers: [
        {
          ...saved,
          adapter: "meta",
          boundary: "cloud",
          reasoning_effort: "high",
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    fireEvent.click(screen.getByText("Advanced connection options"));
    expect(screen.getByLabelText("Thinking effort")).toHaveValue("high");
    fireEvent.change(screen.getByLabelText("Thinking effort"), {
      target: { value: "xhigh" },
    });
    expect(terms()).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await screen.findByText(/home-vision saved/);
    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0]?.[1]?.body as string,
    ) as Schema<"ProviderConnectionInput">;
    expect(body.reasoning_effort).toBe("xhigh");
    expect(body.api_key_action).toBe("keep");
  });

  it("resets thinking to provider default when changing away from Meta", async () => {
    show({
      ...configuration,
      providers: [
        {
          ...saved,
          adapter: "meta",
          boundary: "cloud",
          reasoning_effort: "high",
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    fireEvent.change(screen.getByLabelText("Connection type"), {
      target: { value: "ollama" },
    });
    expect(screen.queryByLabelText("Thinking effort")).toBeNull();
    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "synthetic-model" },
    });
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "remove" },
    });
    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await screen.findByText(/home-vision saved/);
    const body = JSON.parse(
      vi.mocked(fetch).mock.calls[0]?.[1]?.body as string,
    ) as Schema<"ProviderConnectionInput">;
    expect(body.reasoning_effort).toBe("default");
  });

  it("shows the API key field immediately for hosted APIs while local servers default to no key", () => {
    show();
    fireEvent.click(
      screen.getByRole("button", { name: "Add new AI connection" }),
    );
    expect(screen.getByLabelText("API key action")).toHaveValue("keep");
    expect(screen.queryByLabelText("API key")).toBeNull();
    fireEvent.change(screen.getByLabelText("Connection type"), {
      target: { value: "compatible" },
    });
    expect(screen.getByLabelText("Where this model runs")).toHaveValue("cloud");
    expect(screen.getByLabelText("API key action")).toHaveValue("replace");
    expect(screen.getByLabelText("API key")).toHaveAttribute(
      "type",
      "password",
    );
    fireEvent.change(screen.getByLabelText("Connection type"), {
      target: { value: "vllm" },
    });
    expect(screen.getByLabelText("API key action")).toHaveValue("keep");
    expect(screen.queryByLabelText("API key")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["authentication", "Edit this connection and replace the key"],
    [
      "unavailable",
      "Check Server address, make sure the model server is running",
    ],
    ["malformed_output", "Structured output under Advanced connection options"],
    ["probe_reading_failed", "selected model and server support images"],
    ["output_limit", "response token limit"],
    ["incomplete_output", "stopped without a complete response"],
    ["refusal", "declined the sample request"],
    ["adapter_failure", "could not process the model server's response"],
    ["unknown-provider-error", "No successful test was confirmed"],
    ["toString", "No successful test was confirmed"],
  ])(
    "shows fixed actionable test guidance for %s without echoing provider error text",
    async (code, expected) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          response(
            { detail: "Provider echoed synthetic-secret-do-not-display", code },
            422,
          ),
        ),
      );
      const { onChanged } = show(configuration, "models");
      vi.spyOn(window, "confirm").mockReturnValue(true);
      fireEvent.click(
        screen.getByRole("button", {
          name:
            code === "probe_reading_failed"
              ? "Test photo reader"
              : "Test tutor",
        }),
      );
      const error = await screen.findByRole("alert");
      expect(error).toHaveTextContent(expected);
      expect(error).not.toHaveTextContent("synthetic-secret-do-not-display");
      expect(onChanged).toHaveBeenCalledOnce();
      expect(screen.queryByText(/test passed/)).toBeNull();
    },
  );

  it("identifies the failed tutor step and response code without showing raw model content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        response(
          {
            detail: "synthetic-private-output",
            code: "output_limit",
            probe_step: "review",
          },
          422,
        ),
      ),
    );
    show(configuration, "models");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Test tutor" }));
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Tutor feedback (step 2 of 2)");
    expect(error).toHaveTextContent("HTTP 422; output_limit");
    expect(error).toHaveTextContent("provider may charge");
    expect(error).not.toHaveTextContent("synthetic-private-output");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("restores saved terms review after reopening and requires review for changed users", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    expect(terms()).toBeChecked();
    fireEvent.change(screen.getByLabelText("Model context limit"), {
      target: { value: "250000" },
    });
    expect(terms()).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    expect(terms()).toBeChecked();
    fireEvent.change(screen.getByLabelText("Allowed users"), {
      target: { value: "adult_only" },
    });
    expect(terms()).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Save connection" }),
    ).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not infer a terms review for a connection with no saved record", () => {
    show({
      ...configuration,
      providers: [{ ...saved, eligibility_record: "" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    expect(terms()).not.toBeChecked();
  });

  it("saves an exact local model without calling it or changing practice routes", async () => {
    const { onChanged, onSectionChange } = show();
    fillNew();
    const save = screen.getByRole("button", { name: "Save connection" });
    expect(save).toBeDisabled();
    fireEvent.click(terms());
    fireEvent.click(save);
    expect(
      await screen.findByText(/local-tutor saved. No model request was sent/),
    ).toBeVisible();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/providers/connections",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          adapter: "ollama",
          model: "installed-text-model",
          base_url: "http://127.0.0.1:11434",
          enabled: true,
          boundary: "local_network",
          audience: "mixed",
          eligibility_record:
            "Operator reviewed the model and provider terms for the mixed audience.",
          image_input: false,
          configured_context_limit: 32768,
          configured_output_limit: 16384,
          structured_output_mode: "native",
          reasoning_effort: "default",
          api_key_action: "keep",
          id: "local-tutor",
        }),
      }),
    );
    expect(onChanged).toHaveBeenCalledOnce();
    expect(onSectionChange).toHaveBeenCalledWith("models", true);
    expect(screen.queryByLabelText("Model name")).toBeNull();
    const savedToast = screen.getByRole("status");
    expect(savedToast).toHaveClass("settings-toast");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps a visible recovery action when a saved connection cannot refresh", async () => {
    const onChanged = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new TypeError("Synthetic refresh loss"))
      .mockResolvedValueOnce();
    const onSectionChange = vi.fn();
    render(
      <ProviderConnections
        configuration={configuration}
        section="models"
        onChanged={onChanged}
        onRoutesChanged={vi.fn()}
        onNavigate={vi.fn()}
        onSectionChange={onSectionChange}
        act={run}
      />,
    );
    fillNew();
    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));

    expect(
      await screen.findByText(
        "The connection was saved, but the list could not refresh. Refresh connections to continue.",
      ),
    ).toBeVisible();
    expect(screen.queryByLabelText("Model name")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh connections" }),
    );

    await screen.findByText(
      "The saved connection list is current. Test the connection next.",
    );
    expect(onChanged).toHaveBeenCalledTimes(2);
    expect(onSectionChange).toHaveBeenCalledWith("models", true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the terms review while technical settings change", () => {
    show();
    fillNew();
    fireEvent.click(terms());
    fireEvent.click(screen.getByText("Advanced connection options"));
    fireEvent.change(screen.getByLabelText("Model context limit"), {
      target: { value: "1000000" },
    });
    fireEvent.change(screen.getByLabelText("Structured output"), {
      target: { value: "json_prompt" },
    });
    fireEvent.click(screen.getByLabelText("Connection enabled"));
    fireEvent.click(screen.getByLabelText("This model supports photo input"));
    expect(terms()).toBeChecked();
  });

  it.each(["Model name", "Server address", "Allowed users"])(
    "requires a fresh terms review when %s changes",
    (label) => {
      show();
      fillNew();
      fireEvent.click(terms());
      fireEvent.change(screen.getByLabelText(label), {
        target: {
          value:
            label === "Allowed users"
              ? "adult_only"
              : label === "Server address"
                ? "http://127.0.0.1:11435"
                : "different-model",
        },
      });
      expect(terms()).not.toBeChecked();
    },
  );

  it("accepts a one-million-token model context limit", async () => {
    show();
    fillNew();
    fireEvent.click(screen.getByText("Advanced connection options"));
    const contextLimit = screen.getByLabelText("Model context limit");
    fireEvent.change(contextLimit, { target: { value: "1000000" } });
    expect(contextLimit).toHaveValue(1_000_000);
    expect(contextLimit).toBeValid();
    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await screen.findByText(/local-tutor saved/);
    const request = vi.mocked(fetch).mock.calls[0]![1]!;
    expect(JSON.parse(request.body as string)).toMatchObject({
      configured_context_limit: 1_000_000,
    });
  });

  it("requires model, connection name, valid address and explicit reviewed terms", () => {
    show();
    fireEvent.click(
      screen.getByRole("button", { name: "Add new AI connection" }),
    );
    fireEvent.click(terms());
    expect(
      screen.getByRole("button", { name: "Save connection" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Connection name"), {
      target: { value: "bad name" },
    });
    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "installed-model" },
    });
    fireEvent.change(screen.getByLabelText("Server address"), {
      target: { value: "not an address" },
    });
    expect(
      screen.getByLabelText("Connection name").closest("form")!.checkValidity(),
    ).toBe(false);
    expect(terms()).not.toBeChecked();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a new key only in the save request and clears it after save or cancel", async () => {
    const localStore = vi.spyOn(Storage.prototype, "setItem");
    show();
    fillNew();
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "replace" },
    });
    const input = screen.getByLabelText("API key");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.change(input, { target: { value: "synthetic-key-not-valid" } });
    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await screen.findByText(/local-tutor saved/);
    const request = vi.mocked(fetch).mock.calls[0]![1]!;
    expect(JSON.parse(request.body as string)).toMatchObject({
      api_key_action: "replace",
      api_key: "synthetic-key-not-valid",
    });
    expect(screen.queryByLabelText("API key")).toBeNull();
    expect(localStore).not.toHaveBeenCalled();
    fillNew();
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "replace" },
    });
    expect(screen.getByLabelText("API key")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "another-synthetic-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel changes" }));
    fillNew();
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "replace" },
    });
    expect(screen.getByLabelText("API key")).toHaveValue("");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([422, 403, 500])(
    "keeps failed-save entries without echoing credential-bearing errors (%s)",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          response({ detail: "Rejected synthetic-key-not-valid" }, status),
        ),
      );
      show();
      fillNew();
      fireEvent.change(screen.getByLabelText("API key action"), {
        target: { value: "replace" },
      });
      fireEvent.change(screen.getByLabelText("API key"), {
        target: { value: "synthetic-key-not-valid" },
      });
      fireEvent.click(terms());
      fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
      const error = await screen.findByRole("alert");
      expect(error).not.toHaveTextContent("synthetic-key-not-valid");
      expect(error).not.toHaveTextContent("Your entries are still here");
      expect(error.closest("form")).toBe(
        screen.getByRole("button", { name: "Save connection" }).closest("form"),
      );
      expect(screen.getByLabelText("API key")).toHaveValue(
        "synthetic-key-not-valid",
      );
      expect(screen.getByLabelText("Model name")).toHaveValue(
        "installed-text-model",
      );
      expect(
        screen.getByRole("button", { name: "Save connection" }),
      ).toBeEnabled();
    },
  );

  it("explains a likely stale API when a newer context limit is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response({ detail: "Invalid request." }, 422)),
    );
    show();
    fillNew();
    fireEvent.click(screen.getByText("Advanced connection options"));
    fireEvent.change(screen.getByLabelText("Model context limit"), {
      target: { value: "250000" },
    });
    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Could not save local-tutor");
    expect(error).toHaveTextContent(
      "stop and restart the app to make the page and API use the same version",
    );
    expect(error.closest("form")).not.toBeNull();
  });

  it("identifies invisible whitespace in an API key before saving", () => {
    show();
    fillNew();
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "replace" },
    });
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "synthetic-key-with-space " },
    });
    fireEvent.click(terms());
    expect(
      screen.getByText(/Remove spaces, line breaks, or non-ASCII characters/),
    ).toBeVisible();
    expect(screen.getByLabelText("API key")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Save connection" }),
    ).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("edits a stored connection without fetching or resubmitting its key", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    expect(screen.getByLabelText("Connection name")).toHaveAttribute(
      "readonly",
    );
    expect(screen.getByLabelText("API key action")).toHaveValue("keep");
    expect(screen.queryByLabelText("API key")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "another-installed-model" },
    });
    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await screen.findByText(/home-vision saved/);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/providers/connections/home-vision",
      expect.objectContaining({ method: "PUT" }),
    );
    const body: unknown = JSON.parse(
      vi.mocked(fetch).mock.calls[0]![1]!.body as string,
    );
    expect(body).toMatchObject({
      model: "another-installed-model",
      api_key_action: "keep",
    });
    expect(body).not.toHaveProperty("api_key");
    expect(body).not.toHaveProperty("id");
  });

  it("requires replacing or removing the key when changing its destination", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    fireEvent.change(screen.getByLabelText("Server address"), {
      target: { value: "http://127.0.0.1:8082/v1" },
    });
    fireEvent.click(terms());
    expect(
      screen.getByRole("button", { name: "Save connection" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Replace or remove the saved key before saving/),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "remove" },
    });
    expect(terms()).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await screen.findByText(/home-vision saved/);
    const body: unknown = JSON.parse(
      vi.mocked(fetch).mock.calls[0]![1]!.body as string,
    );
    expect(body).toMatchObject({
      api_key_action: "remove",
      base_url: "http://127.0.0.1:8082/v1",
    });
    expect(body).not.toHaveProperty("api_key");
  });

  it("clears typed keys when changing API key action or connection type", () => {
    show();
    fillNew();
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "replace" },
    });
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "synthetic-before-change" },
    });
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "keep" },
    });
    fireEvent.change(screen.getByLabelText("API key action"), {
      target: { value: "replace" },
    });
    expect(screen.getByLabelText("API key")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "synthetic-before-provider-change" },
    });
    fireEvent.change(screen.getByLabelText("Connection type"), {
      target: { value: "meta" },
    });
    expect(screen.getByLabelText("API key")).toHaveValue("");
    expect(
      screen.getByRole("option", { name: "Meta hosted API" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: "Where this model runs" }),
    ).toBeNull();
    const location = screen.getByRole("group", {
      name: "Where this model runs",
    });
    expect(location).toHaveTextContent("Cloud service Fixed");
    const audience = screen.getByRole("combobox", { name: "Allowed users" });
    expect(audience).toBeEnabled();
    expect(audience).toHaveValue("mixed");
    expect(audience).toHaveAccessibleDescription(
      /records your decision; it is not a certification from this app/i,
    );
  });

  it("saves the selected Meta audience while keeping its hosted location fixed", async () => {
    const { onSectionChange } = show();
    fireEvent.click(
      screen.getByRole("button", { name: "Add new AI connection" }),
    );
    fireEvent.change(screen.getByLabelText("Connection name"), {
      target: { value: "meta-policy" },
    });
    fireEvent.change(screen.getByLabelText("Connection type"), {
      target: { value: "meta" },
    });
    fireEvent.change(screen.getByLabelText("Model name"), {
      target: { value: "synthetic-meta-model" },
    });
    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "synthetic-meta-key" },
    });
    const audience = screen.getByRole("combobox", { name: "Allowed users" });
    fireEvent.click(terms());
    expect(terms()).toBeChecked();
    fireEvent.change(audience, { target: { value: "adult_only" } });
    expect(audience).toHaveValue("adult_only");
    expect(terms()).not.toBeChecked();
    fireEvent.change(audience, { target: { value: "mixed" } });
    expect(audience).toHaveValue("mixed");
    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    await screen.findByText(/meta-policy saved/);
    const request = vi.mocked(fetch).mock.calls[0]![1]!;
    expect(JSON.parse(request.body as string)).toMatchObject({
      adapter: "meta",
      boundary: "cloud",
      audience: "mixed",
    });
    expect(onSectionChange).toHaveBeenCalledWith("policy", true);
  });

  it("shows why saved connections are not ready and links directly to the blocking step", () => {
    const pending = {
      ...saved,
      tutor_probed: false,
      vision_probed: false,
      requires_approval: true,
    };
    const view = show({ ...configuration, providers: [pending] });
    expect(
      screen.getByText(/Run a matching test before activating this connection/),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Test tutor" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Use as tutor" })).toBeDisabled();

    view.showSection("models", {
      ...configuration,
      providers: [{ ...pending, boundary: "cloud" }],
    });
    expect(
      screen.getByText(/Saved, but blocked by Data & privacy/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Open Data & privacy" }),
    );
    expect(view.onSectionChange).toHaveBeenLastCalledWith("policy", true);
  });

  it("explains cloud data use and that these settings apply to every connection", () => {
    show(configuration, "policy");
    expect(
      screen.getByRole("heading", { name: "Data & privacy" }),
    ).toBeVisible();
    expect(
      screen.getByText(/These settings apply to every connection/i),
    ).toBeVisible();
    expect(
      screen.getByText(/Enabling this permission alone sends no requests/i),
    ).toBeVisible();
  });

  it("prefills Meta's direct API model and million-token context", () => {
    show();
    fireEvent.click(
      screen.getByRole("button", { name: "Add new AI connection" }),
    );
    fireEvent.change(screen.getByLabelText("Connection type"), {
      target: { value: "meta" },
    });
    expect(screen.getByLabelText("Model name")).toHaveValue("muse-spark-1.3");
    expect(screen.getByLabelText("Model context limit")).toHaveValue(1048576);
    expect(
      screen.getByLabelText("This model supports photo input"),
    ).toBeChecked();
    expect(screen.getByText(/Meta's current direct API model/)).toBeVisible();
  });

  it("scopes a failed test to its tab and offers a visible edit action", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(fetch).mockImplementationOnce(() =>
      response(
        {
          detail: {
            code: "invalid_request",
            message: "Synthetic rejected request.",
          },
        },
        400,
      ),
    );
    const view = show(configuration, "models");
    fireEvent.click(screen.getByRole("button", { name: "Test tutor" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "home-vision test failed",
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    view.showSection("models");
    expect(await screen.findByLabelText("Model name")).toHaveValue(
      "installed-vision-model",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each(["tutor", "photo reader"])(
    "allows assignment for the tested %s role while the other role still needs testing",
    (role) => {
      show({
        ...configuration,
        providers: [
          {
            ...saved,
            tutor_probed: role === "tutor",
            vision_probed: role === "photo reader",
            requires_approval: true,
          },
        ],
      });
      expect(
        screen.getByText(`Ready for ${role}.`, { exact: false }),
      ).toBeVisible();
      expect(screen.getByText(/The other test is still needed/)).toBeVisible();
      fireEvent.click(
        screen.getByRole("checkbox", {
          name: "I authorize home-vision to process future learner work.",
        }),
      );
      expect(
        screen.getByRole("button", { name: `Use as ${role}` }),
      ).toBeEnabled();
      expect(
        screen.getByRole("button", {
          name: `Use as ${role === "tutor" ? "photo reader" : "tutor"}`,
        }),
      ).toBeDisabled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("explains why a photo-only pass does not prove tutor readiness", () => {
    show(
      {
        ...configuration,
        providers: [{ ...saved, tutor_probed: false, vision_probed: true }],
      },
      "models",
    );
    expect(
      screen.getByText(/Photo reading passed, so this connection can accept/),
    ).toHaveTextContent(
      /Tutoring is a separate test: it must create an activity and return feedback in two structured text responses/,
    );
  });

  it.each([
    ["ollama", "cloud", "https://ollama.example.invalid"],
    ["vllm", "cloud", "https://vllm.example.invalid/v1"],
    ["compatible", "local_network", "http://127.0.0.1:8082/v1"],
  ] as const)(
    "keeps location and audience editable for %s and saves both selections",
    async (adapter, selectedBoundary, baseUrl) => {
      show();
      fireEvent.click(
        screen.getByRole("button", { name: "Add new AI connection" }),
      );
      fireEvent.change(screen.getByLabelText("Connection name"), {
        target: { value: `${adapter}-policy` },
      });
      fireEvent.change(screen.getByLabelText("Connection type"), {
        target: { value: adapter },
      });
      fireEvent.change(screen.getByLabelText("Server address"), {
        target: { value: baseUrl },
      });
      fireEvent.change(screen.getByLabelText("Model name"), {
        target: { value: "installed-policy-model" },
      });
      const boundary = screen.getByRole("combobox", {
        name: "Where this model runs",
      });
      const audience = screen.getByRole("combobox", {
        name: "Allowed users",
      });
      expect(boundary).toBeEnabled();
      expect(audience).toBeEnabled();
      fireEvent.change(boundary, { target: { value: selectedBoundary } });
      fireEvent.change(audience, { target: { value: "adult_only" } });
      expect(boundary).toHaveValue(selectedBoundary);
      expect(audience).toHaveValue("adult_only");
      if (adapter === "compatible") {
        fireEvent.change(screen.getByLabelText("API key"), {
          target: { value: "synthetic-policy-key" },
        });
      }
      fireEvent.click(terms());
      fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
      await screen.findByText(new RegExp(`${adapter}-policy saved`));
      const request = vi.mocked(fetch).mock.calls[0]![1]!;
      expect(JSON.parse(request.body as string)).toMatchObject({
        adapter,
        boundary: selectedBoundary,
        audience: "adult_only",
      });
    },
  );

  it("disables a managed connection and requires confirmation for deletion", async () => {
    const { onChanged } = show();
    openDetails();
    fireEvent.click(screen.getByRole("button", { name: "Disable connection" }));
    await screen.findByText(/home-vision disabled/);
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string),
    ).toMatchObject({ enabled: false, api_key_action: "keep" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Delete connection" }));
    expect(fetch).toHaveBeenCalledOnce();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Delete connection" }));
    await screen.findByText("home-vision and its saved API key were deleted.");
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/providers/connections/home-vision",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["disable", true, "disabled", "PUT"],
    ["enable", false, "enabled", "PUT"],
    ["delete", true, "and its saved API key were deleted", "DELETE"],
  ] as const)(
    "retains the confirmed %s receipt and retries only refreshing stale connections",
    async (action, enabled, result, method) => {
      const view = show({
        ...configuration,
        providers: [{ ...saved, enabled }],
      });
      view.onChanged
        .mockRejectedValueOnce(new TypeError("Synthetic refresh lost"))
        .mockRejectedValueOnce(new TypeError("Synthetic refresh still lost"))
        .mockResolvedValueOnce();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      openDetails();
      const button = screen.getByRole("button", {
        name: `${action[0]!.toUpperCase()}${action.slice(1)} connection`,
      });
      fireEvent.click(button);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        `home-vision ${result}`,
      );
      expect(screen.getByRole("alert")).not.toHaveTextContent("Could not");
      expect(button).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Add new AI connection" }),
      ).toBeDisabled();
      fireEvent.click(button);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/v1/admin/providers/connections/home-vision",
        expect.objectContaining({ method }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Refresh connections" }),
      );
      await vi.waitFor(() => expect(view.onChanged).toHaveBeenCalledTimes(2));
      expect(screen.getByRole("alert")).toHaveTextContent(
        `home-vision ${result}`,
      );
      await vi.waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Refresh connections" }),
        ).toBeEnabled(),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Refresh connections" }),
      );
      await screen.findByText("Saved connections refreshed.");
      expect(view.onChanged).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(button).toBeEnabled();
      expect(view.onSectionChange).not.toHaveBeenCalled();
    },
  );

  it("keeps a rejected connection action correctable without claiming it was saved", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        response(
          {
            detail:
              "Choose a replacement tutor or photo reader before deleting this connection.",
          },
          409,
        ),
      ),
    );
    const view = show();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    openDetails();
    const remove = screen.getByRole("button", { name: "Delete connection" });
    fireEvent.click(remove);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not delete home-vision. Choose a replacement tutor or photo reader before deleting this connection.",
    );
    expect(remove).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Refresh connections" }),
    ).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(view.onChanged).not.toHaveBeenCalled();
  });

  it.each(["tutor", "photo reader"] as const)(
    "identifies a pending %s test and keeps its prior results distinct",
    async (stage) => {
      let finish!: (result: Response) => void;
      vi.stubGlobal(
        "fetch",
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              finish = resolve;
            }),
        ),
      );
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const view = show(configuration, "models");
      fireEvent.click(screen.getByRole("button", { name: `Test ${stage}` }));
      expect(screen.getByRole("status")).toHaveTextContent(
        `Testing home-vision: ${stage}…`,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Previous test results stay visible while this test runs.",
      );
      expect(
        screen.getByRole("button", { name: `Test ${stage}` }),
      ).toBeDisabled();
      view.showSection("policy");
      view.showSection("models");
      expect(screen.getByRole("status")).toHaveTextContent(
        `Testing home-vision: ${stage}…`,
      );
      finish(
        new Response(JSON.stringify({ status: "passed" }), { status: 200 }),
      );
      await screen.findByText(`home-vision: ${stage} test passed.`);
      expect(screen.queryByText(/^Testing home-vision/)).toBeNull();
      expect(
        screen.getByRole("button", { name: `Test ${stage}` }),
      ).toBeEnabled();
    },
  );

  it("closes an editor when that connection is deleted", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Edit connection" }));
    expect(
      screen.getByRole("heading", { name: "Edit home-vision" }),
    ).toBeVisible();
    openDetails();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(
      within(screen.getByRole("form", { name: "Edit home-vision" })).getByRole(
        "button",
        { name: "Delete connection" },
      ),
    );
    await screen.findByText("home-vision and its saved API key were deleted.");
    expect(
      screen.queryByRole("heading", { name: "Edit home-vision" }),
    ).toBeNull();
    expect(screen.queryByLabelText("API key")).toBeNull();
  });

  it("shows file-managed connections as read-only and prevents deleting a selected connection", () => {
    const view = show({
      ...configuration,
      providers: [{ ...saved, managed: false }],
    });
    openDetails();
    expect(screen.getByText(/read-only here/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Edit connection" }),
    ).toBeNull();
    view.showSection("models", {
      ...configuration,
      routes: { tutor: saved.id, vision: saved.id },
    });
    expect(
      screen.getByRole("button", { name: "Delete connection" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Disable connection" }),
    ).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("prevents demo connection/key writes and live probes", () => {
    const view = show({
      ...configuration,
      policy: { ...configuration.policy, demo_mode: true },
    });
    expect(
      screen.getByRole("button", { name: "Add new AI connection" }),
    ).toBeDisabled();
    expect(screen.queryByLabelText("API key")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Private setup help" }));
    expect(view.onNavigate).toHaveBeenCalledWith("help", "setup");
    view.showSection("models", {
      ...configuration,
      policy: { ...configuration.policy, demo_mode: true },
    });
    expect(screen.getByRole("button", { name: "Test tutor" })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires explicit cloud/audience consent and displays server locks", async () => {
    const view = show(
      {
        ...configuration,
        providers: [{ ...saved, boundary: "cloud", audience: "adult_only" }],
      },
      "models",
    );
    expect(screen.getByRole("button", { name: "Test tutor" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Open Data & privacy" }),
    );
    expect(view.onSectionChange).toHaveBeenCalledWith("policy", true);
    view.showSection("policy", {
      ...configuration,
      providers: [{ ...saved, boundary: "cloud", audience: "adult_only" }],
    });
    fireEvent.change(screen.getByLabelText("Who uses this app?"), {
      target: { value: "adult_only" },
    });
    fireEvent.click(screen.getByLabelText("Allow cloud AI for this app"));
    expect(
      screen.getByRole("button", { name: "Save data & privacy settings" }),
    ).toBeEnabled();
    // Changing the controls alone cannot authorize or send any request.
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Save data & privacy settings" }),
    );
    await screen.findByText(/Data & privacy saved/);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/providers/policy",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          allow_cloud_inference: true,
          app_audience: "adult_only",
          acknowledge_data_boundary: true,
        }),
      }),
    );
    view.showSection("policy", {
      ...configuration,
      policy: {
        ...configuration.policy,
        cloud_locked: true,
        audience_locked: true,
      },
    });
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeDisabled();
    expect(screen.getByLabelText("Who uses this app?")).toBeDisabled();
    expect(screen.getByText(/locked cloud access/)).toBeVisible();
  });

  it("distinguishes a confirmed privacy save from failed refresh and retries only the read", async () => {
    const view = show(configuration, "policy");
    view.onChanged
      .mockRejectedValueOnce(
        new TypeError("Synthetic saved-policy refresh loss"),
      )
      .mockRejectedValueOnce(new TypeError("Synthetic repeated refresh loss"))
      .mockResolvedValueOnce();
    fireEvent.click(screen.getByLabelText("Allow cloud AI for this app"));
    const save = screen.getByRole("button", {
      name: "Save data & privacy settings",
    });
    fireEvent.click(save);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Data & privacy was saved, but the current settings could not be refreshed. Refresh settings to check them.",
    );
    expect(save).toBeDisabled();
    expect(screen.getByLabelText("Who uses this app?")).toBeDisabled();
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeDisabled();
    fireEvent.submit(save.closest("form")!);
    expect(fetch).toHaveBeenCalledTimes(1);
    view.showSection("models");
    view.showSection("policy");
    fireEvent.click(screen.getByRole("button", { name: "Refresh settings" }));
    await vi.waitFor(() => expect(view.onChanged).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Data & privacy was saved",
    );
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Refresh settings" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh settings" }));
    await screen.findByText("Current data & privacy settings loaded.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Refresh settings" }),
    ).toBeNull();
    expect(save).toBeEnabled();
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeChecked();
    expect(view.onChanged).toHaveBeenCalledTimes(3);
    expect(view.onSectionChange).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/admin/providers/policy",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps rejected privacy edits correctable without claiming a save or offering saved-state recovery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response({ detail: "Synthetic server lock." }, 403)),
    );
    const view = show(configuration, "policy");
    fireEvent.click(screen.getByLabelText("Allow cloud AI for this app"));
    fireEvent.change(screen.getByLabelText("Who uses this app?"), {
      target: { value: "adult_only" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save data & privacy settings" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Data & privacy could not be changed.",
    );
    expect(screen.getByLabelText("Allow cloud AI for this app")).toBeChecked();
    expect(screen.getByLabelText("Who uses this app?")).toHaveValue(
      "adult_only",
    );
    expect(
      screen.getByRole("button", { name: "Save data & privacy settings" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Refresh settings" }),
    ).toBeNull();
    expect(screen.queryByText(/Data & privacy was saved/)).toBeNull();
    expect(view.onChanged).not.toHaveBeenCalled();
  });

  it("offers an explicit enable action for disabled connections", async () => {
    show({ ...configuration, providers: [{ ...saved, enabled: false }] });
    openDetails();
    fireEvent.click(screen.getByRole("button", { name: "Enable connection" }));
    await screen.findByText(/home-vision enabled/);
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string),
    ).toMatchObject({ enabled: true, api_key_action: "keep" });
  });
});
