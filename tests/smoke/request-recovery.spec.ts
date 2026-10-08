import { expect, test } from "@playwright/test";
import { createLearner, login, navigate, openAttachments } from "./support";
import type { Schema } from "../../apps/web/src/client";
import type { PendingRequestIdentity } from "../../apps/web/src/request-recovery";

test("accepted session and submission receipts recover across reload without duplicate work or private browser storage", async ({
  page,
}) => {
  await login(page);
  await createLearner(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  let starts = 0;
  let key = "";
  let owner = "";
  await page.route("**/api/v1/tutor/sessions", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    starts += 1;
    key = route.request().headers()["idempotency-key"]!;
    owner = (route.request().postDataJSON() as Schema<"TutoringSessionInput">)
      .learner_id;
    expect((await route.fetch()).status()).toBe(201);
    await route.abort("connectionreset");
  });
  await page
    .getByRole("textbox", { name: "Topic or learning goal", exact: true })
    .fill("Synthetic reading: support an inference");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry saved request", exact: true }),
  ).toBeVisible();
  const identities = await page.evaluate(() =>
    (Object.entries(sessionStorage) as [string, string][])
      .filter(([name]) => name.startsWith("shepherd:tutor-request:"))
      .map(([, value]) => JSON.parse(value) as PendingRequestIdentity),
  );
  expect(identities).toEqual([{ key, kind: "session", owner }]);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register(
      "/sw.js?synthetic-update=request-recovery",
    );
  });
  await expect(
    page.getByText(
      "An update is ready. Finish or recover your pending request before refreshing.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh when ready", exact: true }),
  ).toHaveCount(0);
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByText(/Your interrupted request was saved/),
  ).toBeVisible();
  const composer = page.getByRole("textbox", {
    name: "Your work or question",
    exact: true,
  });
  await expect(composer).toBeEditable();
  expect(starts).toBe(1);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((name) =>
        name.startsWith("shepherd:tutor-request:"),
      ),
    ),
  ).toEqual([]);
  await navigate(page, "History");
  await expect(page.locator(".session-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  let submissions = 0;
  await page.route("**/api/v1/problems/*/submissions", async (route) => {
    submissions += 1;
    expect((await route.fetch()).status()).toBe(202);
    await route.abort("connectionreset");
  });
  const work = "Synthetic independent response with one source detail.";
  await composer.fill(work);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry saved request", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByText(/Your interrupted request was saved/),
  ).toBeVisible();
  await expect(
    page.locator(".learner-message .user-text").filter({ hasText: work }),
  ).toHaveCount(1);
  await expect(page.locator(".tutor-feedback")).toHaveCount(1);
  expect(submissions).toBe(1);
  let photos = 0;
  await page.route("**/api/v1/problems/*/photos?*", async (route) => {
    photos += 1;
    expect((await route.fetch()).status()).toBe(202);
    await route.abort("connectionreset");
  });
  await expect(composer).toBeEditable();
  await openAttachments(page);
  await page
    .getByLabel("Take or choose a photo")
    .setInputFiles("evals/fixtures/work.png");
  await page
    .getByRole("button", { name: "Submit this photograph", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry saved photograph", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByText(/Your interrupted request was saved/),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Reading from your photo" }),
  ).toHaveCount(1);
  await expect(page.locator(".tutor-feedback")).toHaveCount(2);
  expect(photos).toBe(1);
});

test("an unaccepted interrupted request stays blocked until resolution also rejects a late original request", async ({
  page,
}) => {
  await login(page);
  await createLearner(page);
  let body: Schema<"TutoringSessionInput"> | undefined;
  let key = "";
  await page.route("**/api/v1/tutor/sessions", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    body = route.request().postDataJSON() as Schema<"TutoringSessionInput">;
    key = route.request().headers()["idempotency-key"]!;
    await route.abort("connectionreset");
  });
  await page
    .getByRole("textbox", { name: "Topic or learning goal", exact: true })
    .fill("Synthetic reading request delayed before acceptance");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry saved request", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByText(/The interrupted request has no saved receipt yet/),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Topic or learning goal", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Start session", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Resolve interrupted request", exact: true })
    .click();
  await expect(
    page.getByText(/was not saved and cannot arrive later/),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Topic or learning goal", exact: true }),
  ).toBeEditable();
  const identity = (await (
    await page.request.get("/api/v1/auth/session")
  ).json()) as Schema<"SessionStatus">;
  const late = await page.request.post("/api/v1/tutor/sessions", {
    data: body,
    headers: { "X-CSRF-Token": identity.csrf_token, "Idempotency-Key": key },
  });
  expect(late.status()).toBe(409);
  expect(
    await (await page.request.get("/api/v1/tutor/sessions")).json(),
  ).toEqual([]);
  await page
    .getByRole("textbox", { name: "Topic or learning goal", exact: true })
    .fill("Unsent synthetic draft discarded by explicit sign out");
  let signOutDialogs = 0;
  page.on("dialog", (dialog) => {
    signOutDialogs += 1;
    void dialog.dismiss();
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(signOutDialogs).toBe(0);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((name) =>
        name.startsWith("shepherd:tutor-request:"),
      ),
    ),
  ).toEqual([]);
});
