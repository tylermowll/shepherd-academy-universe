import { createServer } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { createLearner, login, navigate } from "./support";

const syntheticKey = "synthetic-connection-browser-fixture-only";

async function modelFixture() {
  let calls = 0;
  let authenticatedCalls = 0;
  let rejectAuthentication = false;
  let truncateFeedback = false;
  const server = createServer((request, response) => {
    let text = "";
    request.on("data", (part: Buffer) => {
      text += part.toString();
    });
    request.on("end", () => {
      calls += 1;
      if (request.headers.authorization === `Bearer ${syntheticKey}`)
        authenticatedCalls += 1;
      if (rejectAuthentication) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: { message: syntheticKey } }));
        return;
      }
      const wire = JSON.parse(text) as {
        format?: { properties?: Record<string, unknown> };
        response_format?: {
          json_schema?: { schema?: { properties?: Record<string, unknown> } };
        };
      };
      const properties =
        wire.format?.properties ??
        wire.response_format?.json_schema?.schema?.properties ??
        {};
      if (truncateFeedback && "strengths" in properties) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            choices: [
              {
                finish_reason: "length",
                message: { content: '{"guidance":' },
              },
            ],
          }),
        );
        return;
      }
      const payload =
        "problem_text" in properties
          ? {
              problem_text:
                "Synthetic connected-model activity: Describe two observations you could make when comparing plants grown in light and shade.",
              concept_focus: "Synthetic comparison of observations",
              success_criteria: ["Describe two observable differences."],
            }
          : "strengths" in properties
            ? {
                strengths: ["Synthetic review received."],
                guidance: ["Compare observations from both groups."],
                next_step: "Describe another observation.",
                concepts: ["Observations"],
                uncertainty_note: null,
                teaching_action: "coach",
                learning_observation: {
                  assessment: "developing",
                  evidence: "The learner shared observations for comparison.",
                  resolved_points: [],
                  open_points: ["Compare observations from both groups."],
                },
              }
            : "quality" in properties
              ? {
                  transcription: "1/2",
                  quality: "clear",
                  confidence: 1,
                  ambiguities: [],
                  organization_feedback: [],
                  rejection_reason: null,
                }
              : {
                  schema_version: "1",
                  message_kind: "question_response",
                  message_markdown: "Synthetic connection test response.",
                  suggested_next_action: "continue",
                  uncertainty_note: null,
                };
      const content = JSON.stringify(payload);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify(
          request.url === "/api/chat"
            ? {
                done: true,
                done_reason: "stop",
                message: { role: "assistant", content },
                prompt_eval_count: 1,
                eval_count: 1,
              }
            : {
                choices: [
                  {
                    message: { role: "assistant", content },
                    finish_reason: "stop",
                  },
                ],
                usage: { prompt_tokens: 1, completion_tokens: 1 },
              },
        ),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No fixture port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    calls: () => calls,
    authenticatedCalls: () => authenticatedCalls,
    rejectAuthentication: (reject: boolean) => {
      rejectAuthentication = reject;
    },
    truncateFeedback: (truncate: boolean) => {
      truncateFeedback = truncate;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function restoreDemoRoutes(page: Page) {
  const session = await page.request.get("/api/v1/auth/session");
  const identity = (await session.json()) as { csrf_token: string };
  for (const stage of ["tutor", "vision"] as const) {
    const settings = await page.request.get("/api/v1/admin/providers");
    const current = (await settings.json()) as {
      routes: { tutor: string; vision: string };
    };
    const response = await page.request.post(
      `/api/v1/admin/providers/routes/${stage}`,
      {
        headers: { "X-CSRF-Token": identity.csrf_token },
        data: {
          provider_id: "demo",
          expected_provider_id: current.routes[stage],
          acknowledge_data_boundary: true,
        },
      },
    );
    expect(response.status()).toBe(200);
    const saved = (await response.json()) as {
      tutor: string;
      vision: string;
    };
    expect(saved[stage]).toBe("demo");
  }
}

async function assertRoleConcurrency(page: Page, provider: string) {
  const session = await page.request.get("/api/v1/auth/session");
  const identity = (await session.json()) as { csrf_token: string };
  const headers = { "X-CSRF-Token": identity.csrf_token };
  // An older editor still expects demo. Its tutor save must not undo activation.
  const stale = await page.request.post(
    "/api/v1/admin/providers/routes/tutor",
    {
      headers,
      data: {
        provider_id: "demo",
        expected_provider_id: "demo",
        acknowledge_data_boundary: true,
      },
    },
  );
  expect(stale.status()).toBe(409);
  const settings = await page.request.get("/api/v1/admin/providers");
  const current = (await settings.json()) as {
    routes: { tutor: string; vision: string };
  };
  expect(current.routes).toEqual({
    tutor: provider,
    vision: provider,
  });
  // A valid photo-reader change must leave the already selected tutor alone.
  for (const [selected, expected] of [
    ["demo", provider],
    [provider, "demo"],
  ]) {
    const changed = await page.request.post(
      "/api/v1/admin/providers/routes/vision",
      {
        headers,
        data: {
          provider_id: selected,
          expected_provider_id: expected,
          acknowledge_data_boundary: true,
        },
      },
    );
    expect(changed.status()).toBe(200);
    expect(await changed.json()).toEqual({ tutor: provider, vision: selected });
  }
}

test("Meta hosted policy is explicit while local model controls remain usable", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Settings");
  await page
    .getByRole("button", { name: "Add new AI connection", exact: true })
    .click();
  const connectionType = page.getByRole("combobox", {
    name: "Connection type",
    exact: true,
  });
  await expect(
    connectionType.getByRole("option", {
      name: "Meta hosted API",
      exact: true,
    }),
  ).toHaveCount(1);
  await connectionType.selectOption("meta");
  await expect(
    page.getByRole("combobox", {
      name: "Where this model runs",
      exact: true,
    }),
  ).toHaveCount(0);
  const fixedLocation = page.getByRole("group", {
    name: "Where this model runs",
    exact: true,
  });
  await expect(fixedLocation).toContainText("Cloud service Fixed");
  const metaAudience = page.getByRole("combobox", {
    name: "Allowed users",
    exact: true,
  });
  await expect(metaAudience).toBeEnabled();
  await expect(metaAudience).toHaveValue("mixed");
  await metaAudience.selectOption("adult_only");
  await expect(metaAudience).toHaveValue("adult_only");
  await expect(page.locator("#meta-policy-help")).toContainText(
    "records your decision; it is not a certification from this app",
  );
  await expect(page.locator("#meta-policy-help")).toContainText(
    "choose Ollama or vLLM instead",
  );
  await page.getByText("Advanced connection options", { exact: true }).click();
  const thinking = page.getByRole("combobox", {
    name: "Thinking effort",
    exact: true,
  });
  await expect(thinking).toHaveValue("default");
  await thinking.selectOption("high");
  await expect(thinking).toHaveValue("high");

  await connectionType.selectOption("vllm");
  await expect(thinking).toHaveCount(0);
  const boundary = page.getByRole("combobox", {
    name: "Where this model runs",
    exact: true,
  });
  const audience = page.getByRole("combobox", {
    name: "Allowed users",
    exact: true,
  });
  await expect(boundary).toBeEnabled();
  await expect(audience).toBeEnabled();
  await boundary.selectOption("cloud");
  await audience.selectOption("adult_only");
  await expect(boundary).toHaveValue("cloud");
  await expect(audience).toHaveValue("adult_only");
});

test("a rejected save gives the exact reason beside the connection form", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Settings");
  await page
    .getByRole("button", { name: "Add new AI connection", exact: true })
    .click();
  await page
    .getByLabel("Connection name", { exact: true })
    .fill(`synthetic-stale-${Date.now()}`);
  await page
    .getByLabel("Model name", { exact: true })
    .fill("synthetic-model-v1");
  await page
    .getByLabel("Server address", { exact: true })
    .fill("http://127.0.0.1:11434?invalid=synthetic");
  await page.getByText("Advanced connection options", { exact: true }).click();
  await page.getByLabel("Model context limit", { exact: true }).fill("250000");
  await page
    .getByLabel(
      "I reviewed the model and provider terms for the users selected above.",
      { exact: true },
    )
    .check();
  const editor = page.locator("form.connection-editor");
  await editor
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    "URLs cannot contain credentials, queries, or fragments",
  );
  await expect(editor.getByRole("alert")).not.toContainText(
    "Your entries are still here",
  );
});

test("a saved connection stays selectable while setup blockers point to their exact steps", async ({
  page,
}) => {
  const fixture = await modelFixture();
  const id = `synthetic-pending-${Date.now()}`;
  try {
    await login(page);
    await navigate(page, "Settings");
    await page
      .getByRole("button", { name: "Add new AI connection", exact: true })
      .click();
    await page.getByLabel("Connection name", { exact: true }).fill(id);
    await page
      .getByRole("combobox", { name: "Connection type", exact: true })
      .selectOption("compatible");
    await page
      .getByRole("combobox", { name: "Where this model runs", exact: true })
      .selectOption("local_network");
    await page
      .getByLabel("Server address", { exact: true })
      .fill(`${fixture.url}/v1`);
    await page
      .getByLabel("Model name", { exact: true })
      .fill("synthetic-million-context-model");
    await page
      .getByLabel("This model supports photo input", { exact: true })
      .check();
    await page
      .getByRole("combobox", { name: "Allowed users", exact: true })
      .selectOption("adult_only");
    await page.getByLabel("API key", { exact: true }).fill(syntheticKey);
    await page
      .getByText("Advanced connection options", { exact: true })
      .click();
    const contextLimit = page.getByLabel("Model context limit", {
      exact: true,
    });
    await contextLimit.fill("1000000");
    await expect(contextLimit).toHaveValue("1000000");
    expect(
      await contextLimit.evaluate(
        (input) => input instanceof HTMLInputElement && input.checkValidity(),
      ),
    ).toBe(true);
    await page
      .getByLabel(
        "I reviewed the model and provider terms for the users selected above.",
        { exact: true },
      )
      .check();
    await page
      .getByRole("button", { name: "Save connection", exact: true })
      .click();
    expect(fixture.calls()).toBe(0);

    await page.getByRole("tab", { name: /Models/ }).click();
    const card = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: id, exact: true }) });
    await expect(card).toContainText("Saved, but blocked by Data & privacy.");
    await expect(
      card.getByRole("button", { name: "Open Data & privacy", exact: true }),
    ).toBeVisible();

    await expect(page.getByRole("tab")).toHaveCount(2);
    await expect(
      page.getByRole("region", { name: "Current models", exact: true }),
    ).toContainText("demo");
    await expect(
      card.getByRole("button", { name: "Test tutor", exact: true }),
    ).toBeDisabled();
    await expect(
      card.getByRole("button", { name: "Test photo reader", exact: true }),
    ).toBeDisabled();
    await card
      .getByLabel(`I authorize ${id} to process future learner work.`, {
        exact: true,
      })
      .check();
    await expect(
      card.getByRole("button", { name: "Use as tutor", exact: true }),
    ).toBeDisabled();
    await expect(
      card.getByRole("button", { name: "Use as photo reader", exact: true }),
    ).toBeDisabled();

    await page
      .getByRole("button", { name: "Open Data & privacy", exact: true })
      .first()
      .click();
    const permissionsHeading = page.getByRole("heading", {
      name: "Data & privacy",
      exact: true,
    });
    await expect(permissionsHeading).toBeVisible();
    await expect(permissionsHeading).toBeFocused();
    await expect(
      page.getByText(/These settings apply to every connection/i),
    ).toBeVisible();
    const appAudience = page.getByRole("combobox", {
      name: "Who uses this app?",
      exact: true,
    });
    await expect(appAudience).toHaveValue("mixed");
    await expect(appAudience).toBeDisabled();
    await expect(page.getByText(/locked the age-group setting/i)).toBeVisible();

    const settings = await page.request.get("/api/v1/admin/providers");
    const body = (await settings.json()) as {
      routes: { tutor: string; vision: string };
      providers: Array<{
        id: string;
        tutor_probed: boolean;
        vision_probed: boolean;
        configured_context_limit: number;
      }>;
    };
    expect(body.routes).toEqual({ tutor: "demo", vision: "demo" });
    expect(body.providers.find((provider) => provider.id === id)).toMatchObject(
      {
        tutor_probed: false,
        vision_probed: false,
        configured_context_limit: 1_000_000,
      },
    );
    expect(fixture.calls()).toBe(0);

    await page.getByRole("tab", { name: /Models/ }).click();
    await card
      .getByText("Technical details and actions", { exact: true })
      .click();
    page.once("dialog", (dialog) => dialog.accept());
    await card
      .getByRole("button", { name: "Delete connection", exact: true })
      .click();
    await expect(card).toHaveCount(0);
  } finally {
    await fixture.close();
  }
});

for (const adapter of ["vllm", "ollama", "compatible"] as const) {
  test(`adult configures ${adapter} with a write-only key, probes it, and uses it without a restart`, async ({
    page,
    browser,
  }) => {
    const fixture = await modelFixture();
    const learnerBrowser = await browser.newContext();
    const id = `synthetic-${adapter}-${Date.now()}`;
    const failedCalls = adapter === "compatible" ? 4 : 0;
    try {
      await login(page);
      await navigate(page, "Settings");
      await page
        .getByRole("button", { name: "Add new AI connection", exact: true })
        .click();
      await page.getByLabel("Connection name", { exact: true }).fill(id);
      await page
        .getByRole("combobox", { name: "Connection type", exact: true })
        .selectOption(adapter);
      if (adapter === "compatible") {
        await expect(page.getByLabel("API key", { exact: true })).toBeVisible();
      }
      await page
        .getByRole("combobox", { name: "Where this model runs", exact: true })
        .selectOption("local_network");
      await page
        .getByLabel("Server address", { exact: true })
        .fill(adapter === "ollama" ? fixture.url : `${fixture.url}/v1`);
      await page
        .getByLabel("Model name", { exact: true })
        .fill("synthetic-model-v1");
      await page
        .getByLabel("This model supports photo input", { exact: true })
        .check();
      await page
        .getByRole("combobox", { name: "API key action", exact: true })
        .selectOption("replace");
      await page.getByLabel("API key", { exact: true }).fill(syntheticKey);
      await page
        .getByLabel(
          "I reviewed the model and provider terms for the users selected above.",
          { exact: true },
        )
        .check();
      await page
        .getByRole("button", { name: "Save connection", exact: true })
        .click();
      const savedToast = page
        .getByRole("status")
        .filter({ hasText: `${id} saved` });
      await expect(savedToast).toBeVisible();
      await savedToast.getByRole("button", { name: "Dismiss" }).click();
      const card = page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name: id, exact: true }) });
      const tutorStatus = card
        .locator("dl.readiness-list > div")
        .filter({ hasText: "Tutor test" });
      const photoReaderStatus = card
        .locator("dl.readiness-list > div")
        .filter({ hasText: "Photo-reader test" });
      await expect(card).toBeVisible();
      expect(fixture.calls()).toBe(0);
      await expect(page.getByLabel("API key", { exact: true })).toHaveCount(0);
      const settings = await page.request.get("/api/v1/admin/providers");
      expect(settings.headers()["cache-control"]).toBe("no-store");
      expect(await settings.text()).not.toContain(syntheticKey);
      expect(
        await page.evaluate(() =>
          JSON.stringify({
            local: { ...localStorage },
            session: { ...sessionStorage },
          }),
        ),
      ).not.toContain(syntheticKey);

      // Cancel really means no synthetic call (and no charge).
      page.once("dialog", (dialog) => dialog.dismiss());
      await card
        .getByRole("button", { name: "Test tutor", exact: true })
        .click();
      expect(fixture.calls()).toBe(0);
      if (adapter === "compatible") {
        fixture.rejectAuthentication(true);
        page.once("dialog", (dialog) => dialog.accept());
        await card
          .getByRole("button", { name: "Test tutor", exact: true })
          .click();
        await expect(page.getByRole("alert")).toContainText(
          "Edit this connection and replace the key",
        );
        await expect(page.getByRole("alert")).not.toContainText(syntheticKey);
        await expect(tutorStatus).toContainText("Not passed yet");
        expect(fixture.calls()).toBe(1);
        fixture.rejectAuthentication(false);
        page.once("dialog", (dialog) => dialog.accept());
        await card
          .getByRole("button", { name: "Test photo reader", exact: true })
          .click();
        await expect(photoReaderStatus).toContainText("Passed");
        fixture.truncateFeedback(true);
        page.once("dialog", (dialog) => dialog.accept());
        await card
          .getByRole("button", { name: "Test tutor", exact: true })
          .click();
        await expect(page.getByRole("alert")).toContainText(
          "Tutor feedback (step 2 of 2)",
        );
        await expect(page.getByRole("alert")).toContainText("output_limit");
        await expect(tutorStatus).toContainText("Not passed yet");
        await expect(photoReaderStatus).toContainText("Passed");
        expect(fixture.calls()).toBe(4);
        await page.reload();
        await navigate(page, "Settings");
        await page.getByRole("tab", { name: /Models/ }).click();
        const history = card.getByRole("region", {
          name: "Recent connection tests",
        });
        await expect(history).toContainText("Tutor feedback (step 2 of 2)");
        await expect(history).toContainText("response token limit");
        await expect(history).toContainText("16,384 output-token limit");
        expect(fixture.calls()).toBe(4); // Reload never sends another model request.
        fixture.truncateFeedback(false);
      }
      page.once("dialog", (dialog) => dialog.accept());
      await card
        .getByRole("button", { name: "Test tutor", exact: true })
        .click();
      await expect(tutorStatus).toContainText("Passed");
      page.once("dialog", (dialog) => dialog.accept());
      await card
        .getByRole("button", { name: "Test photo reader", exact: true })
        .click();
      await expect(photoReaderStatus).toContainText("Passed");
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: `${id}: photo reader test passed.` }),
      ).toBeVisible();
      expect(fixture.calls()).toBe(3 + failedCalls);
      expect(fixture.authenticatedCalls()).toBe(3 + failedCalls);
      await expect(page.getByRole("tab", { name: /Models/ })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      for (const role of ["tutor", "photo reader"] as const) {
        await card
          .getByLabel(`I authorize ${id} to process future learner work.`, {
            exact: true,
          })
          .check();
        await card
          .getByRole("button", { name: `Use as ${role}`, exact: true })
          .click();
        await expect(
          page.getByRole("status").filter({
            hasText: `${id} / synthetic-model-v1 is now the ${role}.`,
          }),
        ).toBeVisible();
        await expect(
          card.getByText(`Active ${role}`, { exact: true }),
        ).toBeVisible();
      }
      expect(fixture.calls()).toBe(3 + failedCalls);
      if (adapter === "compatible") await assertRoleConcurrency(page, id);

      await page.reload();
      const currentModels = page.getByRole("region", {
        name: "Current models",
        exact: true,
      });
      await expect(currentModels).toContainText("Current tutor");
      await expect(currentModels).toContainText("Current photo reader");
      await expect(currentModels).toContainText(id);
      await expect(currentModels).toContainText("synthetic-model-v1");
      await expect(
        card.getByText("Active tutor", { exact: true }),
      ).toBeVisible();
      await expect(
        card.getByText("Active photo reader", { exact: true }),
      ).toBeVisible();
      const username = await createLearner(page, false);
      const learnerPage = await learnerBrowser.newPage();
      await login(learnerPage, username);
      await learnerPage
        .getByLabel("Topic or learning goal", { exact: true })
        .fill("Synthetic connection workflow");
      await learnerPage
        .getByRole("button", { name: "Start session", exact: true })
        .click();
      await expect(
        learnerPage.getByLabel("Your work or question", { exact: true }),
      ).toBeEditable();
      await expect(learnerPage.locator(".tutor-activity")).toContainText(
        "Synthetic connected-model activity",
      );
      expect(fixture.calls()).toBe(4 + failedCalls);
      expect(fixture.authenticatedCalls()).toBe(4 + failedCalls);
      await learnerPage
        .getByLabel("Your work or question", { exact: true })
        .fill("I would compare the height and the color of both plants.");
      await learnerPage
        .getByRole("button", { name: "Send", exact: true })
        .click();
      await expect(learnerPage.locator(".tutor-feedback")).toContainText(
        "Synthetic review received.",
      );
      await expect(learnerPage.locator(".tutor-feedback")).toContainText(
        "Compare observations from both groups.",
      );
      await expect(learnerPage.locator(".tutor-feedback")).not.toContainText(
        "Demo mode cannot review your answer",
      );
      expect(fixture.calls()).toBe(5 + failedCalls);
      expect(fixture.authenticatedCalls()).toBe(5 + failedCalls);

      await restoreDemoRoutes(page);
      await navigate(page, "Settings");
      await page.getByRole("tab", { name: /Models/ }).click();
      const editConnection = card.getByRole("button", {
        name: "Edit connection",
        exact: true,
      });
      await expect(editConnection).toBeVisible();
      await editConnection.click();
      await expect(
        page.getByRole("combobox", { name: "API key action", exact: true }),
      ).toHaveValue("keep");
      await expect(page.getByLabel("API key", { exact: true })).toHaveCount(0);
      await page
        .getByRole("combobox", { name: "API key action", exact: true })
        .selectOption("remove");
      const reviewedTerms = page.getByLabel(
        "I reviewed the model and provider terms for the users selected above.",
        { exact: true },
      );
      await expect(reviewedTerms).toBeChecked();
      await page
        .getByText("Advanced connection options", { exact: true })
        .click();
      await page
        .getByLabel("Model context limit", { exact: true })
        .fill("1000001");
      await expect(reviewedTerms).toBeChecked();
      await page
        .getByRole("button", { name: "Save connection", exact: true })
        .click();
      await expect(tutorStatus).toContainText("Not passed yet");
      await expect(photoReaderStatus).toContainText("Not passed yet");
      expect(fixture.calls()).toBe(5 + failedCalls);
      // Editing persisted settings doesn't redisplay the saved secret.
      const edited = await page.request.get("/api/v1/admin/providers");
      expect(await edited.text()).not.toContain(syntheticKey);
      await page.getByRole("tab", { name: /Models/ }).click();
      const details = card.getByText("Technical details and actions", {
        exact: true,
      });
      if (
        !(await details
          .locator("..")
          .evaluate((node) => node.hasAttribute("open")))
      )
        await details.click();
      await expect(card).toContainText("API key: not saved");
      page.once("dialog", (dialog) => dialog.accept());
      await card
        .getByRole("button", { name: "Delete connection", exact: true })
        .click();
      await expect(card).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      try {
        await restoreDemoRoutes(page);
        const session = await page.request.get("/api/v1/auth/session");
        const identity = (await session.json()) as { csrf_token: string };
        const removed = await page.request.delete(
          `/api/v1/admin/providers/connections/${id}`,
          {
            headers: { "X-CSRF-Token": identity.csrf_token },
          },
        );
        expect([200, 404]).toContain(removed.status());
      } finally {
        await learnerBrowser.close();
        await fixture.close();
      }
    }
  });
}
