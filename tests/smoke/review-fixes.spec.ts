import { writeFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Schema } from "../../apps/web/src/client";
import {
  createLearner,
  login,
  navigate,
  openAttachments,
  startTutor,
} from "./support";

type Configuration = Schema<"ProvidersPublic">;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function activate(control: Locator) {
  if (test.info().project.use.hasTouch) await control.tap();
  else await control.click();
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: test.info().outputPath(name), fullPage: true });
}

async function expectPageFits(page: Page) {
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(layout.document).toBeLessThanOrEqual(layout.viewport);
  expect(layout.body).toBeLessThanOrEqual(layout.viewport);
}

test("signed-in Help links request the destination role and preserve drafts on cancel, copied entry and reload", async ({
  page,
}) => {
  await login(page);
  const alias = await createLearner(page, false);
  await activate(
    page.getByRole("button", { name: "Add learner account", exact: true }),
  );
  const accountDraft = page.getByLabel("Learner username", { exact: true });
  await accountDraft.fill("Synthetic retained Help draft");
  await navigate(page, "Help");
  const practice = page
    .getByRole("article")
    .getByRole("link", { name: "Practice", exact: true });
  const practiceHref = new URL(
    (await practice.getAttribute("href"))!,
    page.url(),
  );
  expect(practiceHref.searchParams.get("page")).toBe("practice");
  expect(practiceHref.searchParams.get("signin")).toBe("learner");
  await activate(practice);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Learner sign-in",
  );
  await expect(page.getByLabel("Signed in account")).toHaveCount(0);
  await activate(
    page.getByRole("button", { name: "Cancel account switch", exact: true }),
  );
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Start practicing",
      exact: true,
    }),
  ).toBeFocused();
  await navigate(page, "Users");
  await expect(accountDraft).toHaveValue("Synthetic retained Help draft");

  const copied = await page.context().newPage();
  try {
    await copied.goto(practiceHref.href);
    await expect(copied.getByRole("heading", { level: 1 })).toHaveText(
      "Learner sign-in",
    );
    await copied.reload();
    await expect(copied.getByRole("heading", { level: 1 })).toHaveText(
      "Learner sign-in",
    );
  } finally {
    await copied.close();
  }

  await activate(
    page
      .getByRole("navigation", { name: "Account navigation", exact: true })
      .getByRole("link", { name: "Learner sign-in", exact: true }),
  );
  await login(page, alias);
  const topicDraft = page.getByRole("textbox", {
    name: "Topic or learning goal",
    exact: true,
  });
  await topicDraft.fill("Synthetic retained topic draft");
  await navigate(page, "Help");
  await activate(
    page
      .getByRole("navigation", { name: "Help topics" })
      .getByRole("link", { name: "Connect an AI model", exact: true }),
  );
  const settings = page
    .getByRole("article")
    .getByRole("link", { name: "Settings", exact: true });
  const settingsHref = new URL(
    (await settings.getAttribute("href"))!,
    page.url(),
  );
  expect(settingsHref.searchParams.get("page")).toBe("settings");
  expect(settingsHref.searchParams.get("signin")).toBe("adult");
  await activate(settings);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Administrator sign-in",
  );
  await screenshot(page, "help-settings-role-entry.png");
  await activate(
    page.getByRole("button", { name: "Cancel account switch", exact: true }),
  );
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Connect an AI model",
      exact: true,
    }),
  ).toBeFocused();
  await navigate(page, "Practice");
  await expect(topicDraft).toHaveValue("Synthetic retained topic draft");
  const copiedSettings = await page.context().newPage();
  try {
    await copiedSettings.goto(settingsHref.href);
    await expect(copiedSettings.getByRole("heading", { level: 1 })).toHaveText(
      "Administrator sign-in",
    );
    await copiedSettings.reload();
    await expect(copiedSettings.getByRole("heading", { level: 1 })).toHaveText(
      "Administrator sign-in",
    );
  } finally {
    await copiedSettings.close();
  }
});

test("phone-link cancellation blocks replacement until complete and the next QR survives navigation", async ({
  page,
}) => {
  await startTutor(page, "Synthetic review: compare scientific explanations");
  await openAttachments(page);
  let creates = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/phone-uploads"))
      creates += 1;
  });
  const firstResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/phone-uploads") &&
      response.request().method() === "POST",
  );
  await activate(
    page.getByRole("button", { name: "Take photo with phone", exact: true }),
  );
  const first = (await (
    await firstResponse
  ).json()) as Schema<"PhoneUploadLink">;
  const photoPage = page.getByRole("link", {
    name: "Open photo page",
    exact: true,
  });
  await expect(photoPage).toHaveAttribute("href", first.url);
  const started = deferred();
  const release = deferred();
  await page.route(`**/api/v1/phone-uploads/${first.id}`, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    started.resolve();
    await release.promise;
    await route.continue();
  });
  try {
    await activate(
      page.getByRole("button", { name: "Cancel phone link", exact: true }),
    );
    await started.promise;
    await expect(
      page.getByRole("button", { name: "New QR code", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Canceling phone link…", exact: true }),
    ).toBeDisabled();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Canceling your phone photo link…" }),
    ).toBeVisible();
    expect(creates).toBe(1);
    const deleted = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/phone-uploads/${first.id}`) &&
        response.request().method() === "DELETE",
    );
    release.resolve();
    expect((await deleted).status()).toBe(200);
    await expect(photoPage).toHaveCount(0);
    const replacementResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/phone-uploads") &&
        response.request().method() === "POST",
    );
    await activate(
      page.getByRole("button", { name: "Take photo with phone", exact: true }),
    );
    const replacement = (await (
      await replacementResponse
    ).json()) as Schema<"PhoneUploadLink">;
    expect(replacement.id).not.toBe(first.id);
    await expect(photoPage).toHaveAttribute("href", replacement.url);
    await navigate(page, "Help");
    await navigate(page, "Practice");
    await openAttachments(page);
    await expect(photoPage).toHaveAttribute("href", replacement.url);
    expect(creates).toBe(2);
    await screenshot(page, "replacement-phone-qr-retained.png");
  } finally {
    release.resolve();
  }
});

test("role activation protects pending controls and rejects duplicate submission without provider writes", async ({
  page,
}) => {
  const started = deferred();
  const release = deferred();
  let configuration: Configuration | undefined;
  let posts = 0;
  const secondId = "synthetic-second-model";
  await page.route("**/api/v1/admin/providers", async (route) => {
    expect(route.request().method()).toBe("GET");
    if (!configuration) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      const original = (await response.json()) as Configuration;
      const mock = original.providers.find(
        (provider) => provider.adapter === "mock",
      );
      expect(mock).toBeDefined();
      configuration = {
        ...original,
        routes: { tutor: mock!.id, vision: mock!.id },
        providers: [
          mock!,
          { ...mock!, id: secondId, model: "synthetic-second-fixture" },
        ],
      };
    }
    await route.fulfill({ json: configuration });
  });
  await page.route("**/api/v1/admin/providers/routes/tutor", async (route) => {
    expect(route.request().method()).toBe("POST");
    posts += 1;
    const body = route.request().postDataJSON() as Schema<"SelectRole">;
    expect(body.expected_provider_id).toBe("demo");
    expect(body.provider_id).toBe(secondId);
    expect(body.acknowledge_data_boundary).toBe(true);
    started.resolve();
    await release.promise;
    configuration = {
      ...configuration!,
      routes: { ...configuration!.routes, tutor: body.provider_id },
    };
    await route.fulfill({ json: configuration.routes });
  });
  try {
    await login(page);
    await navigate(page, "Settings");
    await activate(page.getByRole("tab", { name: /Models/ }));
    const card = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: secondId, exact: true }),
    });
    const consent = card.getByRole("checkbox", {
      name: `I authorize ${secondId} to process future learner work.`,
      exact: true,
    });
    const save = card.getByRole("button", {
      name: "Use as tutor",
      exact: true,
    });
    const usePhoto = card.getByRole("button", {
      name: "Use as photo reader",
      exact: true,
    });
    await activate(consent);
    await activate(save);
    await started.promise;
    for (const control of [usePhoto, consent, save])
      await expect(control).toBeDisabled();
    await expect(
      page.getByRole("status").filter({ hasText: "Saving tutor…" }),
    ).toBeVisible();
    await save.evaluate((button) => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(posts).toBe(1);
    await navigate(page, "Help");
    await navigate(page, "Settings");
    await expect(save).toBeDisabled();
    await expect(consent).not.toBeChecked();
    release.resolve();
    await expect(
      page.getByRole("status").filter({
        hasText: `${secondId} / synthetic-second-fixture is now the tutor.`,
      }),
    ).toBeVisible();
    await expect(card.getByText("Active tutor", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Current models", exact: true }),
    ).toContainText(secondId);
    await expect(consent).not.toBeChecked();
    await expect(save).toBeDisabled();
    expect(posts).toBe(1);
    await screenshot(page, "active-model-save-protected.png");
    await page.setViewportSize({ width: 320, height: 800 });
    await expectPageFits(page);
    const receipt = page.getByRole("status").filter({
      hasText: `${secondId} / synthetic-second-fixture is now the tutor.`,
    });
    await expect
      .poll(() =>
        receipt.evaluate((node) => {
          const message = node.querySelector("p");
          if (!message) throw new Error("The save receipt needs its message.");
          const style = getComputedStyle(node);
          const contentWidth =
            node.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight);
          return message.getBoundingClientRect().width / contentWidth;
        }),
      )
      .toBeGreaterThanOrEqual(0.95);
    await screenshot(page, "active-model-save-protected-320.png");
  } finally {
    release.resolve();
  }
});

test("a conflicting role activation refreshes the current model without claiming success or sending a model request", async ({
  page,
}) => {
  let configuration: Configuration | undefined;
  let activations = 0;
  let probes = 0;
  const requested = "synthetic-requested-tutor";
  const changed = "synthetic-other-tab-tutor";
  await page.route("**/api/v1/admin/providers", async (route) => {
    if (!configuration) {
      const original = (await (await route.fetch()).json()) as Configuration;
      const mock = original.providers.find(
        (provider) => provider.adapter === "mock",
      )!;
      configuration = {
        ...original,
        routes: { tutor: mock.id, vision: mock.id },
        providers: [
          mock,
          { ...mock, id: requested, model: "synthetic-requested-fixture" },
          { ...mock, id: changed, model: "synthetic-other-fixture" },
        ],
      };
    }
    await route.fulfill({ json: configuration });
  });
  await page.route("**/api/v1/admin/providers/*/probe", async (route) => {
    probes += 1;
    await route.abort();
  });
  await page.route("**/api/v1/admin/providers/routes/tutor", async (route) => {
    activations += 1;
    expect(route.request().postDataJSON()).toEqual({
      provider_id: requested,
      expected_provider_id: "demo",
      acknowledge_data_boundary: true,
    } satisfies Schema<"SelectRole">);
    configuration = {
      ...configuration!,
      routes: { ...configuration!.routes, tutor: changed },
    };
    await route.fulfill({
      status: 409,
      json: {
        detail:
          "The active tutor changed in another tab. Review the current model and try again.",
      },
    });
  });
  await login(page);
  await navigate(page, "Settings");
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: requested, exact: true }),
  });
  await activate(
    card.getByRole("checkbox", {
      name: `I authorize ${requested} to process future learner work.`,
      exact: true,
    }),
  );
  await activate(
    card.getByRole("button", { name: "Use as tutor", exact: true }),
  );
  await expect(page.getByRole("alert")).toContainText("changed elsewhere");
  await expect(
    page.getByRole("region", { name: "Current models", exact: true }),
  ).toContainText(changed);
  await expect(card.getByText("Active tutor", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({
      hasText: `${requested} / synthetic-requested-fixture is now the tutor.`,
    }),
  ).toHaveCount(0);
  await expect(
    card.getByRole("checkbox", {
      name: `I authorize ${requested} to process future learner work.`,
      exact: true,
    }),
  ).not.toBeChecked();
  expect(activations).toBe(1);
  expect(probes).toBe(0);
});

test("a confirmed privacy save offers a GET-only refresh after configuration loading fails", async ({
  page,
}) => {
  let configuration: Configuration | undefined;
  let saved = false;
  let posts = 0;
  let refreshFailures = 0;
  await page.route("**/api/v1/admin/providers", async (route) => {
    expect(route.request().method()).toBe("GET");
    if (!configuration) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      const original = (await response.json()) as Configuration;
      configuration = {
        ...original,
        policy: {
          ...original.policy,
          allow_cloud_inference: false,
          cloud_locked: false,
          audience_locked: false,
          demo_mode: false,
        },
      };
    }
    if (saved && refreshFailures === 0) {
      refreshFailures += 1;
      await route.fulfill({
        status: 503,
        json: { detail: "Synthetic configuration refresh unavailable." },
      });
    } else await route.fulfill({ json: configuration });
  });
  await page.route("**/api/v1/admin/providers/policy", async (route) => {
    expect(route.request().method()).toBe("POST");
    posts += 1;
    const body = route
      .request()
      .postDataJSON() as Schema<"ProviderPolicyInput">;
    expect(body.allow_cloud_inference).toBe(true);
    saved = true;
    configuration = {
      ...configuration!,
      policy: { ...configuration!.policy, allow_cloud_inference: true },
    };
    await route.fulfill({ json: {} });
  });
  await login(page);
  await navigate(page, "Settings");
  await activate(page.getByRole("tab", { name: /Data & privacy/ }));
  const cloud = page.getByRole("checkbox", {
    name: "Allow cloud AI for this app",
    exact: true,
  });
  const save = page.getByRole("button", {
    name: "Save data & privacy settings",
    exact: true,
  });
  await activate(cloud);
  await activate(save);
  await expect(page.getByRole("alert")).toContainText(
    "Data & privacy was saved, but the current settings could not be refreshed.",
  );
  await expect(save).toBeDisabled();
  await expect(cloud).toBeDisabled();
  await screenshot(page, "privacy-saved-refresh-recovery.png");
  await activate(
    page.getByRole("button", { name: "Refresh settings", exact: true }),
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(cloud).toBeChecked();
  await expect(cloud).toBeEnabled();
  await expect(
    page.getByRole("tab", { name: /Data & privacy/ }),
  ).toHaveAttribute("aria-selected", "true");
  expect(posts).toBe(1);
  expect(refreshFailures).toBe(1);
});

test("a confirmed connection deletion retains its receipt until a GET-only refresh replaces stale controls", async ({
  page,
}) => {
  const connectionId = "synthetic-delete-connection";
  let configuration: Configuration | undefined;
  let deletes = 0;
  let reads = 0;
  let refreshFailures = 0;
  await page.route("**/api/v1/admin/providers", async (route) => {
    expect(route.request().method()).toBe("GET");
    reads += 1;
    if (!configuration) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      const original = (await response.json()) as Configuration;
      const mock = original.providers.find(
        (provider) => provider.adapter === "mock",
      );
      expect(mock).toBeDefined();
      configuration = {
        ...original,
        routes: { tutor: mock!.id, vision: mock!.id },
        providers: [
          mock!,
          {
            ...mock!,
            id: connectionId,
            adapter: "ollama",
            boundary: "local_network",
            managed: true,
            enabled: true,
            key_configured: false,
          },
        ],
      };
    }
    if (deletes && refreshFailures === 0) {
      refreshFailures += 1;
      await route.fulfill({
        status: 503,
        json: { detail: "Synthetic connection-list refresh unavailable." },
      });
    } else await route.fulfill({ json: configuration });
  });
  await page.route(
    `**/api/v1/admin/providers/connections/${connectionId}`,
    async (route) => {
      expect(route.request().method()).toBe("DELETE");
      deletes += 1;
      configuration = {
        ...configuration!,
        providers: configuration!.providers.filter(
          (provider) => provider.id !== connectionId,
        ),
      };
      await route.fulfill({ status: 200, json: {} });
    },
  );
  await login(page);
  await navigate(page, "Settings");
  const card = page.locator(".provider-list > article").filter({
    has: page.getByRole("heading", { name: connectionId, exact: true }),
  });
  await activate(
    card.getByText("Technical details and actions", { exact: true }),
  );
  page.once("dialog", (dialog) => void dialog.accept());
  const remove = card.getByRole("button", {
    name: "Delete connection",
    exact: true,
  });
  await activate(remove);
  await expect(page.getByRole("alert")).toContainText(
    `${connectionId} and its saved API key were deleted.`,
  );
  await expect(page.getByRole("alert")).toContainText(
    "The saved connections could not refresh.",
  );
  await expect(page.getByRole("alert")).not.toContainText("Could not delete");
  await expect(card).toBeVisible();
  await expect(remove).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Add new AI connection", exact: true }),
  ).toBeDisabled();
  await screenshot(page, "connection-deleted-refresh-pending.png");
  const failedReads = reads;
  await activate(
    page.getByRole("button", { name: "Refresh connections", exact: true }),
  );
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Saved connections refreshed.",
  );
  expect(reads).toBe(failedReads + 1);
  expect(deletes).toBe(1);
  expect(refreshFailures).toBe(1);
});

test("connection tests identify their pending stage while keeping previous results visible", async ({
  page,
}) => {
  const started = deferred();
  const release = deferred();
  let configuration: Configuration | undefined;
  let mockId = "";
  let probes = 0;
  await page.route("**/api/v1/admin/providers", async (route) => {
    expect(route.request().method()).toBe("GET");
    if (!configuration) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      const original = (await response.json()) as Configuration;
      const mock = original.providers.find(
        (provider) => provider.adapter === "mock",
      );
      expect(mock).toBeDefined();
      mockId = mock!.id;
      configuration = {
        ...original,
        routes: { tutor: mockId, vision: mockId },
        providers: [mock!],
      };
    }
    await route.fulfill({ json: configuration });
  });
  await page.route("**/api/v1/admin/providers/*/probe", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().url()).toContain(`/${mockId}/probe`);
    expect(route.request().postDataJSON()).toEqual({
      stage: "vision",
      authorize_synthetic_call: true,
    } satisfies Schema<"ProbeInput">);
    probes += 1;
    started.resolve();
    await release.promise;
    await route.fulfill({ json: {} });
  });
  try {
    await login(page);
    await navigate(page, "Settings");
    await activate(page.getByRole("tab", { name: /Models/ }));
    const testPhoto = page.getByRole("button", {
      name: "Test photo reader",
      exact: true,
    });
    await activate(testPhoto);
    await started.promise;
    const pending = page
      .getByRole("status")
      .filter({ hasText: `Testing ${mockId}: photo reader…` });
    await expect(pending).toBeVisible();
    await expect(pending).toContainText(
      "Previous test results stay visible while this test runs.",
    );
    await expect(page.locator(".provider-list .readiness-list")).toContainText(
      "Passed",
    );
    await expect(testPhoto).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Test tutor", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Refresh status", exact: true }),
    ).toBeDisabled();
    await activate(page.getByRole("tab", { name: /Data & privacy/ }));
    await activate(page.getByRole("tab", { name: /Models/ }));
    await expect(pending).toBeVisible();
    expect(probes).toBe(1);
    await screenshot(page, "connection-test-pending-stage.png");
    release.resolve();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: `${mockId}: photo reader test passed.` }),
    ).toBeVisible();
    await expect(pending).toHaveCount(0);
    await expect(testPhoto).toBeEnabled();
    expect(probes).toBe(1);
  } finally {
    release.resolve();
  }
});

test("History distinguishes a failed list from an empty account and reloads saved sessions without creating work", async ({
  page,
}) => {
  const savedTopic = "Synthetic History list recovery";
  await startTutor(page, savedTopic);
  const savedHash = new URL(page.url()).hash;
  let reads = 0;
  let writes = 0;
  let unavailable = true;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      (request.url().endsWith("/tutor/sessions") ||
        request.url().endsWith("/activities") ||
        request.url().endsWith("/submissions"))
    )
      writes += 1;
  });
  await page.route("**/api/v1/tutor/sessions", async (route) => {
    expect(route.request().method()).toBe("GET");
    reads += 1;
    if (unavailable)
      await route.fulfill({
        status: 503,
        json: { detail: "Synthetic saved-session list unavailable." },
      });
    else await route.continue();
  });
  await page.reload();
  await navigate(page, "History");
  const failure = page
    .getByRole("status")
    .filter({ hasText: "Saved sessions could not load." });
  await expect(failure).toContainText("Your saved work has not been removed.");
  await expect(
    page.getByRole("heading", { name: "No saved sessions yet", exact: true }),
  ).toHaveCount(0);
  const savedCard = page.locator(".session-card").filter({
    has: page.getByRole("heading", { name: savedTopic, exact: true }),
  });
  await expect(savedCard).toHaveCount(0);
  await screenshot(page, "history-list-failure-recovery.png");
  const failedReads = reads;
  unavailable = false;
  const reloaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/tutor/sessions") &&
      response.request().method() === "GET",
  );
  await activate(
    page.getByRole("button", { name: "Reload saved sessions", exact: true }),
  );
  expect((await reloaded).status()).toBe(200);
  await expect(savedCard).toBeVisible();
  await expect(failure).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "No saved sessions yet", exact: true }),
  ).toHaveCount(0);
  expect(reads).toBe(failedReads + 1);
  await activate(
    savedCard.getByRole("button", { name: "Continue session", exact: true }),
  );
  await expect(
    page.getByRole("textbox", { name: "Your work or question", exact: true }),
  ).toBeEditable();
  expect(new URL(page.url()).hash).toBe(savedHash);
  expect(writes).toBe(0);
});

test("a missing initial session leaves actual saved History, dates and new practice usable", async ({
  page,
}) => {
  const savedTopic = "Synthetic review: compare historical evidence";
  await startTutor(page, savedTopic);
  const savedHash = new URL(page.url()).hash;
  const missingId = "6a2d26f4-25d1-4be6-94aa-0bb540ff507a";
  let missingReads = 0;
  page.on("request", (request) => {
    if (request.url().endsWith(`/tutor/sessions/${missingId}`))
      missingReads += 1;
  });
  const historyResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/tutor/sessions") &&
      response.request().method() === "GET",
  );
  const missingResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/tutor/sessions/${missingId}`),
  );
  await page.goto(`/?page=practice&review=missing-session#tutor=${missingId}`);
  expect((await missingResponse).status()).toBe(404);
  const history = (await (
    await historyResponse
  ).json()) as Schema<"TutoringSessionSummaryPublic">[];
  const saved = history.find((session) => session.topic === savedTopic);
  expect(saved).toBeDefined();
  await expect(
    page.getByText(
      "This saved session is no longer available. Start a new session or choose another one in History.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await expect(
    page.getByText("Checking tutor availability…", { exact: true }),
  ).toHaveCount(0);
  const topic = page.getByRole("textbox", {
    name: "Topic or learning goal",
    exact: true,
  });
  await topic.fill("Synthetic fresh practice after a missing URL");
  await expect(
    page.getByRole("button", { name: "Start session", exact: true }),
  ).toBeEnabled();
  await topic.fill("");
  await navigate(page, "History");
  const savedCard = page.locator(".session-card").filter({
    has: page.getByRole("heading", { name: savedTopic, exact: true }),
  });
  await expect(savedCard.locator("time")).toHaveAttribute(
    "datetime",
    saved!.created_at,
  );
  await expect(savedCard.locator("time")).not.toContainText("Invalid Date");
  await expect(
    savedCard.getByRole("button", { name: "Continue session", exact: true }),
  ).toHaveAccessibleDescription(/Started/);
  await activate(
    savedCard.getByRole("button", { name: "Continue session", exact: true }),
  );
  await expect(
    page.getByRole("textbox", { name: "Your work or question", exact: true }),
  ).toBeEditable();
  expect(new URL(page.url()).hash).toBe(savedHash);
  await activate(
    page.getByRole("button", { name: "New session", exact: true }),
  );
  await topic.fill("Synthetic fresh practice after a missing URL");
  await activate(
    page.getByRole("button", { name: "Start session", exact: true }),
  );
  await expect(page.locator(".tutor-activity")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your work or question", exact: true }),
  ).toBeEditable();
  expect(new URL(page.url()).hash).not.toBe(savedHash);
  expect(missingReads).toBe(1);
  await screenshot(page, "practice-recovered-from-missing-session.png");
});

test("both unavailable photo sources explain the cause and topic practice remains available", async ({
  page,
}) => {
  const photoStatus =
    "Synthetic photo reader is unavailable. Ask an administrator to select a photo reader.";
  await page.route("**/api/v1/learners/*/features", async (route) => {
    expect(route.request().method()).toBe("GET");
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    const features = (await response.json()) as Schema<"Features">;
    expect(features.tutoring_available).toBe(true);
    await route.fulfill({
      json: {
        ...features,
        photos_available: false,
        photo_status: photoStatus,
      } satisfies Schema<"Features">,
    });
  });
  await login(page);
  await createLearner(page);
  await page
    .getByRole("textbox", { name: "Topic or learning goal", exact: true })
    .fill("Synthetic photo availability review");
  const purpose = page.getByRole("combobox", {
    name: "Practice purpose",
    exact: true,
  });
  const start = page.getByRole("button", {
    name: "Start session",
    exact: true,
  });
  for (const [selectedPurpose, source] of [
    ["study", "reading_photo"],
    ["assignment", "reference_photo"],
  ] as const) {
    await purpose.selectOption(selectedPurpose);
    await page
      .getByRole("combobox", { name: "Material input", exact: true })
      .selectOption(source);
    await expect(start).toBeDisabled();
    await expect(page.getByText(photoStatus, { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Choose a pasted-text input to continue without a photo/),
    ).toBeVisible();
  }
  await screenshot(page, "unavailable-photo-input-explained.png");
  await purpose.selectOption("topic");
  await expect(page.getByText(photoStatus, { exact: true })).toHaveCount(0);
  await expect(start).toBeEnabled();
  await activate(start);
  await expect(page.locator(".tutor-activity")).toBeVisible();
});

test("valid long names reflow at 320 pixels and enabled placeholders meet normal-text contrast", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const learnerId = "b2edbcf5-04d7-4ba2-b900-a976d783f62a";
  const learnerName = "L".repeat(64);
  const connectionName = "a".repeat(64);
  const learner: Schema<"LearnerPublic"> = {
    id: learnerId,
    alias: learnerName,
    eligibility: "adult",
    enabled: true,
    has_password: true,
  };
  await page.route("**/api/v1/admin/learners", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: [learner] });
  });
  await page.route(
    `**/api/v1/admin/learners/${learnerId}/devices`,
    async (route) => {
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: [] });
    },
  );
  await page.route("**/api/v1/admin/providers", async (route) => {
    expect(route.request().method()).toBe("GET");
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    const configuration = (await response.json()) as Configuration;
    const mock = configuration.providers.find(
      (provider) => provider.adapter === "mock",
    );
    expect(mock).toBeDefined();
    await route.fulfill({
      json: {
        ...configuration,
        providers: [mock!, { ...mock!, id: connectionName }],
      } satisfies Configuration,
    });
  });
  await login(page);
  await activate(
    page.getByRole("button", {
      name: `${learnerName} Manage account`,
      exact: true,
    }),
  );
  await expect(
    page.getByRole("region", { name: "Selected learner", exact: true }),
  ).toContainText(learnerName);
  await expectPageFits(page);
  await screenshot(page, "long-learner-name-reflow-320.png");
  await navigate(page, "Settings");
  await expect(
    page.getByRole("heading", { name: connectionName, exact: true }),
  ).toBeVisible();
  await expectPageFits(page);
  await screenshot(page, "long-connection-name-reflow-320.png");
  await activate(
    page.getByRole("button", { name: "Add new AI connection", exact: true }),
  );
  const model = page.getByRole("textbox", { name: "Model name", exact: true });
  await expect(model).toBeEnabled();
  await expect(model).toHaveValue("");
  const contrast = await model.evaluate((element) => {
    const style = getComputedStyle(element);
    const placeholder = getComputedStyle(element, "::placeholder");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Canvas is required to measure resolved colors.");
    const channels = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const foreground = channels(placeholder.color);
    const background = channels(style.backgroundColor);
    if (background[3] !== 255 || Number(style.opacity) !== 1)
      throw new Error("Measure an opaque, enabled input.");
    const alpha = (foreground[3]! / 255) * Number(placeholder.opacity);
    const effective = foreground
      .slice(0, 3)
      .map(
        (channel, index) => channel * alpha + background[index]! * (1 - alpha),
      );
    const luminance = (rgb: number[]) =>
      rgb
        .slice(0, 3)
        .map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, channel, index) =>
            sum + channel * [0.2126, 0.7152, 0.0722][index]!,
          0,
        );
    const levels = [luminance(effective), luminance(background)];
    return {
      foreground: placeholder.color,
      placeholderOpacity: placeholder.opacity,
      background: style.backgroundColor,
      ratio: (Math.max(...levels) + 0.05) / (Math.min(...levels) + 0.05),
    };
  });
  expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
  const contrastPath = test
    .info()
    .outputPath("enabled-placeholder-contrast.json");
  await writeFile(contrastPath, JSON.stringify(contrast, null, 2));
  await test.info().attach("enabled-placeholder-contrast.json", {
    contentType: "application/json",
    path: contrastPath,
  });
});
