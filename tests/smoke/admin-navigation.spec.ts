import { expect, test, type Page } from "@playwright/test";
import type { Schema } from "../../apps/web/src/client";
import { login, navigate } from "./support";

function accountPanel(page: Page) {
  return page.getByRole("region", { name: "Learner accounts", exact: true });
}

test("administrator account drafts survive Help, Settings and browser Back", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Learners");
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      ["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) &&
      request.url().includes("/api/v1/")
    )
      writes.push(request.url());
  });
  const accounts = accountPanel(page);
  await accounts
    .getByRole("button", { name: "Add learner account", exact: true })
    .click();
  const draftName = "Synthetic unsaved navigation learner";
  const draftPassword = "synthetic-unsaved-navigation-password-only";
  await accounts
    .getByLabel("Learner username", { exact: true })
    .fill(draftName);
  await accounts.getByLabel("Password", { exact: true }).fill(draftPassword);
  await accounts
    .getByRole("combobox", { name: "Age group", exact: true })
    .selectOption("minor");
  const originalViewport = page.viewportSize()!;
  if (test.info().project.use.hasTouch)
    await page.setViewportSize({ width: 320, height: 700 });
  const createBounds = await accounts
    .getByRole("button", { name: "Create learner account", exact: true })
    .boundingBox();
  const cancelBounds = await accounts
    .getByRole("button", { name: "Cancel", exact: true })
    .boundingBox();
  expect(createBounds).not.toBeNull();
  expect(cancelBounds).not.toBeNull();
  expect(cancelBounds!.width).toBeLessThan(createBounds!.width);
  if (test.info().project.use.hasTouch) {
    expect(createBounds!.height).toBeGreaterThanOrEqual(44);
    expect(cancelBounds!.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize(originalViewport);

  await navigate(page, "Help");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Start practicing",
      exact: true,
    }),
  ).toBeFocused();
  await expect(accounts).toBeHidden();
  await navigate(page, "Settings");
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings", exact: true }),
  ).toBeFocused();
  await navigate(page, "Learners");
  await expect(
    accounts.getByLabel("Learner username", { exact: true }),
  ).toHaveValue(draftName);
  await expect(accounts.getByLabel("Password", { exact: true })).toHaveValue(
    draftPassword,
  );
  await expect(
    accounts.getByRole("combobox", { name: "Age group", exact: true }),
  ).toHaveValue("minor");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Help");
  await page.goBack();
  await expect(
    accounts.getByLabel("Learner username", { exact: true }),
  ).toHaveValue(draftName);
  await page.screenshot({
    path: test.info().outputPath("learner-draft-return.png"),
    fullPage: true,
  });
  await accounts
    .getByRole("button", { name: "demo Manage administrator", exact: true })
    .click();
  const administrator = page.getByRole("region", {
    name: "Administrator account",
    exact: true,
  });
  await administrator
    .getByLabel("Current password", { exact: true })
    .fill("synthetic-current-navigation-password-only");
  await administrator
    .getByLabel("New password", { exact: true })
    .fill(draftPassword);
  await administrator
    .getByLabel("Confirm new password", { exact: true })
    .fill(draftPassword);
  await navigate(page, "Help");
  await navigate(page, "Settings");
  await navigate(page, "Learners");
  await expect(
    administrator.getByLabel("Current password", { exact: true }),
  ).toHaveValue("synthetic-current-navigation-password-only");
  await expect(
    administrator.getByLabel("New password", { exact: true }),
  ).toHaveValue(draftPassword);
  await expect(
    administrator.getByLabel("Confirm new password", { exact: true }),
  ).toHaveValue(draftPassword);
  await page.screenshot({
    path: test.info().outputPath("administrator-password-return.png"),
    fullPage: true,
  });
  expect(writes).toEqual([]);
  const browserStorage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(browserStorage).not.toContain(draftPassword);
  expect(browserStorage).not.toContain(draftName);
});

test("administrator connection and privacy drafts survive Settings tabs and Help", async ({
  page,
}) => {
  await login(page);
  // The fixture server locks privacy controls. Unlock only this GET response to
  // exercise unsaved choices; no policy save or provider request is authorized.
  await page.route("**/api/v1/admin/providers", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const result = await route.fetch();
    expect(result.ok()).toBe(true);
    const configuration = (await result.json()) as Schema<"ProvidersPublic">;
    await route.fulfill({
      response: result,
      json: {
        ...configuration,
        policy: {
          ...configuration.policy,
          cloud_locked: false,
          audience_locked: false,
        },
      } satisfies Schema<"ProvidersPublic">,
    });
  });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      ["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) &&
      request.url().includes("/api/v1/")
    )
      writes.push(request.url());
  });
  await navigate(page, "Settings");
  await page
    .getByRole("button", { name: "Add new AI connection", exact: true })
    .click();
  const editor = page.getByRole("form", {
    name: "Add an AI connection",
    exact: true,
  });
  const syntheticKey = "synthetic-unsaved-navigation-key-only";
  await editor
    .getByLabel("Connection name", { exact: true })
    .fill("synthetic-navigation-draft");
  await editor
    .getByLabel("Model name", { exact: true })
    .fill("synthetic-unsaved-model");
  await editor
    .getByRole("combobox", { name: "API key action", exact: true })
    .selectOption("replace");
  await editor.getByLabel("API key", { exact: true }).fill(syntheticKey);
  await page.getByRole("tab", { name: /Data & privacy/ }).click();
  const audience = page.getByRole("combobox", {
    name: "Who uses this app?",
    exact: true,
  });
  const expectedAudience =
    (await audience.inputValue()) === "mixed" ? "adult_only" : "mixed";
  await audience.selectOption(expectedAudience);
  const cloud = page.getByRole("checkbox", {
    name: "Allow cloud AI for this app",
    exact: true,
  });
  const expectedCloud = !(await cloud.isChecked());
  await cloud.setChecked(expectedCloud);
  await page.getByRole("tab", { name: /Connections/ }).click();
  await page.getByRole("tab", { name: /Data & privacy/ }).click();
  await expect(audience).toHaveValue(expectedAudience);
  await expect(cloud).toBeChecked({ checked: expectedCloud });
  await navigate(page, "Help");
  await navigate(page, "Learners");
  await navigate(page, "Settings");
  await expect(
    page.getByRole("tab", { name: /Data & privacy/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(audience).toHaveValue(expectedAudience);
  await expect(cloud).toBeChecked({ checked: expectedCloud });
  await page.screenshot({
    path: test.info().outputPath("privacy-draft-return.png"),
    fullPage: true,
  });
  await page.getByRole("tab", { name: /Connections/ }).click();
  await expect(
    editor.getByLabel("Connection name", { exact: true }),
  ).toHaveValue("synthetic-navigation-draft");
  await expect(editor.getByLabel("Model name", { exact: true })).toHaveValue(
    "synthetic-unsaved-model",
  );
  await expect(editor.getByLabel("API key", { exact: true })).toHaveValue(
    syntheticKey,
  );
  await page.screenshot({
    path: test.info().outputPath("connection-draft-return.png"),
    fullPage: true,
  });
  expect(writes).toEqual([]);
  const browserStorage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(browserStorage).not.toContain(syntheticKey);
  expect(browserStorage).not.toContain("synthetic-unsaved-model");
});
