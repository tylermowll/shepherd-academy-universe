import { expect, test, type Page } from "@playwright/test";
import { createLearner, login, navigate, startTutor } from "./support";

function appAreas(page: Page) {
  return page.getByRole("navigation", { name: "App areas", exact: true });
}

async function rejectAdministratorSignIn(page: Page) {
  await page.getByLabel("Username", { exact: true }).fill("demo");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-incorrect-password-only");
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
  expect(response.status()).toBe(401);
  await expect(page.getByRole("alert")).toBeVisible();
}

test("app area links connect administration and learning through the appropriate sign-in", async ({
  page,
}) => {
  await login(page);
  const alias = await createLearner(page, false);
  await expect(appAreas(page).getByRole("link")).toHaveText([
    "Learning environment",
    "Administration",
  ]);
  await appAreas(page)
    .getByRole("link", { name: "Learning environment", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Learner sign-in",
  );
  await expect(page).toHaveURL(/[?&]signin=learner(?:[&#]|$)/);
  expect(
    await (await page.request.get("/api/v1/auth/session")).json(),
  ).toMatchObject({ authenticated: true, role: "adult" });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Learner sign-in",
  );
  await login(page, alias);
  await expect(page).not.toHaveURL(/[?&]signin=/);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveText(["Practice", "History", "Help"]);
  expect((await page.request.get("/api/v1/admin/learners")).status()).toBe(403);
  await expect(
    page.getByRole("button", { name: "Add learner account" }),
  ).toHaveCount(0);

  await appAreas(page)
    .getByRole("link", { name: "Administration", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Administrator sign-in",
  );
  await expect(page).toHaveURL(/[?&]signin=adult(?:[&#]|$)/);
  await expect(
    page.getByRole("button", { name: "Add learner account" }),
  ).toHaveCount(0);
  await login(page);
  await expect(page).not.toHaveURL(/[?&]signin=/);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveText(["Learners", "Settings", "Help"]);
  await expect(
    page.getByRole("button", { name: "Add learner account" }),
  ).toBeVisible();
  expect(
    await (await page.request.get("/api/v1/auth/session")).json(),
  ).toMatchObject({ authenticated: true, role: "adult" });
});

test("canceling a failed administrator switch preserves learner work and successful switching clears its context", async ({
  page,
}) => {
  const topic = "Synthetic workspace navigation: compare scientific evidence";
  const alias = await startTutor(page, topic);
  const learner = (await (
    await page.request.get("/api/v1/auth/session")
  ).json()) as { learner_id: string };
  const sessionHash = new URL(page.url()).hash;
  expect(sessionHash).toMatch(/^#tutor=[a-f0-9-]{36}$/);
  const work = page.getByRole("textbox", {
    name: "Your work or question",
    exact: true,
  });
  const draft = "Synthetic unsent work: I will compare the two observations.";
  await work.fill(draft);
  await appAreas(page)
    .getByRole("link", { name: "Administration", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Administrator sign-in",
  );
  await rejectAdministratorSignIn(page);
  expect(
    await (await page.request.get("/api/v1/auth/session")).json(),
  ).toMatchObject({
    authenticated: true,
    role: "learner",
    learner_id: learner.learner_id,
  });
  expect((await page.request.get("/api/v1/admin/providers")).status()).toBe(
    403,
  );
  await expect(
    page.getByRole("button", { name: "Add new AI connection" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cancel account switch", exact: true })
    .click();
  await expect(work).toHaveValue(draft);
  expect(new URL(page.url()).hash).toBe(sessionHash);
  await appAreas(page)
    .getByRole("link", { name: "Learning environment", exact: true })
    .click();
  await expect(work).toHaveValue(draft);

  await appAreas(page)
    .getByRole("link", { name: "Administration", exact: true })
    .click();
  await login(page);
  await expect(
    page.getByRole("button", { name: "Add learner account" }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await expect(work).toHaveCount(0);
  await expect(page.locator(".tutor-activity")).toHaveCount(0);

  await appAreas(page)
    .getByRole("link", { name: "Learning environment", exact: true })
    .click();
  await login(page, alias);
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.locator(".tutor-activity")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Topic or learning goal", exact: true }),
  ).toHaveValue("");
  await expect(page.getByText(draft, { exact: true })).toHaveCount(0);
  await navigate(page, "History");
  await expect(
    page.getByRole("heading", { name: topic, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  await expect(work).toHaveValue("");
});
