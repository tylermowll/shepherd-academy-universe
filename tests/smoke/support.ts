import { expect, test, type Page } from "@playwright/test";

export async function navigate(
  page: Page,
  name: "Practice" | "History" | "Users" | "Settings" | "Help",
) {
  const link = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name, exact: true });
  await link.click();
  await expect(link).toHaveAttribute("aria-current", "page");
}

export async function selectSignInAccount(page: Page, username: string) {
  const account = page.getByRole("combobox", { name: "Account", exact: true });
  const manual = page.getByRole("textbox", { name: "Username", exact: true });
  await expect(account.or(manual)).toBeVisible();
  await expect(
    page.getByText("Loading account names…", { exact: true }),
  ).toHaveCount(0);
  if (await account.isVisible()) await account.selectOption(username);
  else await manual.fill(username);
}

export async function submitSignIn(page: Page) {
  const submit = async () => {
    const response = page.waitForResponse(
      (result) =>
        result.url().endsWith("/auth/login") &&
        result.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    return response;
  };
  let response = await submit();
  // Independent browser contexts share a loopback address. Keep the production
  // login budget when the suite exercises rejected credentials and retries.
  if (response.status() === 429) {
    await expect(page.getByRole("alert")).toContainText(
      "Too many login attempts",
    );
    const retryAfter = Number(response.headers()["retry-after"]);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    const delay = retryAfter * 1000 + 100;
    test.setTimeout(test.info().timeout + delay);
    await page.waitForTimeout(delay);
    response = await submit();
  }
  return response;
}

export async function login(
  page: Page,
  username = "demo",
  password = "synthetic-demo-password-only",
) {
  const signInButton = page.getByRole("button", {
    name: "Sign in",
    exact: true,
  });
  if (page.url() !== "about:blank")
    await signInButton
      .waitFor({ state: "visible", timeout: 2_000 })
      .catch(() => {});
  if (!(await signInButton.isVisible().catch(() => false)))
    await page.goto("/");
  const title =
    username === "demo" ? "Administrator sign-in" : "Learner sign-in";
  if (
    !(await page
      .getByRole("heading", { level: 1, name: title, exact: true })
      .isVisible())
  )
    await page.getByRole("link", { name: title, exact: true }).click();
  const signInForm = page.locator("form").filter({ has: signInButton });
  await selectSignInAccount(page, username);
  await signInForm.getByLabel("Password", { exact: true }).fill(password);
  const response = await submitSignIn(page);
  expect(response.status()).toBe(200);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

export async function createLearner(page: Page, signIn = true) {
  await navigate(page, "Users");
  await page
    .getByRole("button", { name: "Add learner account", exact: true })
    .click();
  const alias = `Synthetic tutor ${Date.now()}`;
  await page.getByLabel("Learner username", { exact: true }).fill(alias);
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-demo-password-only");
  await page
    .getByRole("button", { name: "Create learner account", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected learner", exact: true }),
  ).toContainText(alias);
  if (signIn) {
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await login(page, alias);
  }
  return alias;
}

export async function startTutor(page: Page, topic: string) {
  await login(page);
  const alias = await createLearner(page);
  await page
    .getByRole("textbox", { name: "Topic or learning goal", exact: true })
    .fill(topic);
  await page
    .getByRole("combobox", { name: "Tutor style", exact: true })
    .selectOption("balanced");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  // Starting now creates the first activity in the same transaction.
  await expect(page.locator(".tutor-activity")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your work or question", exact: true }),
  ).toBeEditable();
  return alias;
}

export async function createActivity(page: Page) {
  await openPracticeMaterial(page);
  await page
    .getByRole("button", { name: "Create practice activity", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your work or question", exact: true }),
  ).toBeEditable();
  await expect(page.locator(".tutor-activity")).toBeVisible();
}

export async function openPracticeMaterial(page: Page) {
  await openSessionTools(page);
  const trigger = page.getByText("Use different practice material", {
    exact: true,
  });
  if ((await trigger.locator("..").getAttribute("open")) === null)
    await trigger.click();
}

export async function openAttachments(page: Page) {
  const trigger = page.getByRole("button", {
    name: "Attach photo",
    exact: true,
  });
  if (
    (await trigger.count()) &&
    (await trigger.getAttribute("aria-expanded")) === "false"
  )
    await trigger.click();
  await expect(page.getByText("Upload a photo", { exact: true })).toBeVisible();
}

export async function openSessionTools(page: Page) {
  const trigger = page.getByText("Session & material", { exact: true });
  if ((await trigger.locator("..").getAttribute("open")) === null)
    await trigger.click();
}
