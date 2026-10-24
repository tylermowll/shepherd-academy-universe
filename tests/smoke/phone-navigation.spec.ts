import { openAttachments } from "./support";
import { expect, test } from "@playwright/test";
import { createActivity, login, startTutor } from "./support";
import type { Schema } from "../../apps/web/src/client";

test("phone tasks render math and keep long text and formulas within a narrow page", async ({
  page,
}) => {
  const identifier = "synthetic".repeat(16);
  const sum = Array.from({ length: 40 }, (_, index) => `x_{${index + 1}}`).join(
    "+",
  );
  const formula = `\\frac{${sum}}{2}`;
  const info: Schema<"PhoneUploadInfo"> = {
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    received: false,
    problem_text: `**Compare** $\\frac{1}{2}$ with a diagram. Label it ${identifier}. Explain $${formula}$.`,
    processing:
      "Synthetic test: the photo reader and tutor use sample responses.",
  };
  await page.route("**/api/v1/phone-upload", (route) =>
    route.fulfill({ json: info }),
  );
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#capture=synthetic-phone-layout-token");
  const task = page.getByRole("region", { name: "Photo task", exact: true });
  await expect(task.locator("strong")).toHaveText("Compare");
  await expect(task.locator(".katex")).toHaveCount(2);
  await expect(task.locator("math")).toHaveCount(2);
  await expect(task).toContainText(identifier);
  await expect(task).not.toContainText("$\\frac{1}{2}$");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const geometry = await page.evaluate(() => ({
    window: innerWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.client).toBe(320);
  expect(geometry.window).toBe(320);
  expect(geometry.document).toBeLessThanOrEqual(320);
  expect(geometry.body).toBeLessThanOrEqual(320);
  const math = await task
    .locator(".katex")
    .last()
    .evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
  expect(math.client).toBeGreaterThan(0);
  expect(math.scroll).toBeGreaterThan(math.client);
  await test.info().attach("phone-task-layout", {
    body: JSON.stringify({ geometry, math }),
    contentType: "application/json",
  });
  await page.screenshot({
    path: test.info().outputPath("phone-task-reflow-320.png"),
    fullPage: true,
  });
});

test("a signed-in phone opens and replaces photo links in its existing tab without signing out", async ({
  page,
  browser,
}) => {
  await startTutor(page, "Synthetic fraction models");
  await createActivity(page);
  await openAttachments(page);
  await page
    .getByRole("button", { name: "Take photo with phone", exact: true })
    .click();
  const link = await page
    .getByRole("link", { name: "Open photo page" })
    .getAttribute("href");
  expect(link).toContain("/#capture=");

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const phone = await mobile.newPage();
    await login(phone);
    // Start at the photo URL's base so the navigation below changes only the
    // fragment. Explicit administrator sign-in has its own page query.
    const photoBase = new URL(link!);
    photoBase.hash = "";
    await phone.goto(photoBase.href);
    await expect(
      phone.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible();
    expect(
      await (await phone.request.get("/api/v1/auth/session")).json(),
    ).toMatchObject({
      authenticated: true,
      role: "adult",
    });
    await phone.evaluate(() => {
      document.documentElement.dataset.qrDocument = "original";
    });
    const secrets = [new URL(link!).hash.slice("#capture=".length)];
    const signouts: string[] = [];
    phone.on("request", (request) => {
      for (const secret of secrets) expect(request.url()).not.toContain(secret);
      if (request.url().endsWith("/auth/logout")) signouts.push(request.url());
    });
    await phone.goto(link!);
    await expect(phone.getByRole("heading", { level: 1 })).toHaveText(
      "Photograph your work.",
    );
    expect(
      await phone.evaluate(() => document.documentElement.dataset.qrDocument),
    ).toBe("original");
    expect(await phone.evaluate(() => location.hash)).toBe("#capture");

    // An expired/revoked link must remain a photo error, without ending login.
    await page.getByRole("button", { name: "Cancel phone link" }).click();
    await expect(phone.getByRole("alert")).toContainText("photo link ended", {
      timeout: 10_000,
    });
    await openAttachments(page);
    await page
      .getByRole("button", { name: "Take photo with phone", exact: true })
      .click();
    const replacement = await page
      .getByRole("link", { name: "Open photo page" })
      .getAttribute("href");
    expect(replacement).not.toBe(link);
    secrets.push(new URL(replacement!).hash.slice("#capture=".length));
    await phone.goto(replacement!);
    await expect(phone.getByLabel("Take or choose a photo")).toBeVisible();
    await expect(phone.getByRole("alert")).toHaveCount(0);
    expect(await phone.evaluate(() => location.hash)).toBe("#capture");

    await phone
      .getByLabel("Take or choose a photo")
      .setInputFiles("evals/fixtures/work.png");
    await expect(
      phone.getByAltText("Your photograph before submission"),
    ).toBeVisible();
    const upload = phone.waitForRequest((request) =>
      request.url().endsWith("/phone-upload/photos"),
    );
    await phone
      .getByRole("button", { name: "Send to computer", exact: true })
      .click();
    const headers = await (await upload).allHeaders();
    expect(headers.cookie).toBeUndefined();
    expect(headers["x-csrf-token"]).toBeUndefined();
    expect(headers["x-photo-token"]).toBe(secrets[1]);
    await expect(phone.getByRole("heading", { level: 1 })).toHaveText(
      "Photo sent to your computer.",
    );
    await expect(page.locator(".tutor-feedback")).toHaveCount(1);
    expect(await phone.evaluate(() => Object.keys(localStorage))).toEqual([]);
    expect(signouts).toEqual([]);

    await phone.evaluate(() => {
      window.location.hash = "";
    });
    await expect(phone.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(
      await phone.evaluate(() => document.documentElement.dataset.qrDocument),
    ).toBe("original");
  } finally {
    await mobile.close();
  }
});
