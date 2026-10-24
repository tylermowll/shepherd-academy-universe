import { expect, test } from "@playwright/test";
import { login, selectSignInAccount, submitSignIn } from "./support";

for (const role of ["learner", "adult"] as const) {
  const username = role === "adult" ? "demo" : "Orbit";
  test(`${role} sign-in uses one account control and corrects an incorrect password in place`, async ({
    page,
  }) => {
    await page.goto(`/?signin=${role}`);
    const account = page.getByRole("combobox", {
      name: "Account",
      exact: true,
    });
    const password = page.getByLabel("Password", { exact: true });
    await selectSignInAccount(page, username);
    await expect(
      page.getByRole("textbox", { name: "Username", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("form h2")).toHaveCount(0);
    const originalViewport = page.viewportSize()!;
    const viewports = test.info().project.use.hasTouch
      ? [originalViewport, { width: 320, height: 700 }]
      : [originalViewport];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const formBounds = await page.locator(".sign-in-card").boundingBox();
      expect(formBounds).not.toBeNull();
      expect(formBounds!.width).toBeLessThanOrEqual(480);
      if (test.info().project.use.hasTouch) {
        for (const control of [
          account,
          password,
          page.getByRole("button", { name: "Sign in", exact: true }),
        ]) {
          const bounds = await control.boundingBox();
          expect(bounds).not.toBeNull();
          expect(bounds!.height).toBeGreaterThanOrEqual(44);
        }
      } else {
        const submitBounds = await page
          .getByRole("button", { name: "Sign in", exact: true })
          .boundingBox();
        expect(submitBounds).not.toBeNull();
        expect(submitBounds!.height).toBeLessThan(44);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize(originalViewport);
    await account.focus();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    if (role === "learner" && test.info().project.use.hasTouch)
      await page.screenshot({
        path: test.info().outputPath("learner-sign-in-mobile.png"),
        fullPage: true,
      });
    await password.fill("synthetic-incorrect-password-only");
    expect((await submitSignIn(page)).status()).toBe(401);
    const error = page.locator("form").getByRole("alert");
    await expect(error).toHaveText(
      "Incorrect account or password. Check your details and try again.",
    );
    await expect(password).toHaveAttribute(
      "aria-describedby",
      /(^| )signin-error( |$)/,
    );
    await expect(account).toHaveValue(username);
    await expect(
      page.getByRole("button", { name: "Reconnect", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Try again", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      role === "adult" ? "Administrator sign-in" : "Learner sign-in",
    );
    if (role === "learner" && !test.info().project.use.hasTouch)
      await page.screenshot({
        path: test
          .info()
          .outputPath("learner-sign-in-incorrect-password-desktop.png"),
        fullPage: true,
      });
    await login(page, username);
    await expect(error).toHaveCount(0);
    expect(
      await (await page.request.get("/api/v1/auth/session")).json(),
    ).toMatchObject({
      authenticated: true,
      role,
      login_name: username,
    });
  });
}

test("account-list failure offers manual entry and preserves a valid account and password when names reload", async ({
  page,
}) => {
  let first = true;
  await page.route("**/auth/accounts?*", (route) => {
    if (first) {
      first = false;
      return route.fulfill({
        status: 503,
        json: { detail: "Synthetic directory failure" },
      });
    }
    return route.continue();
  });
  await page.goto("/?signin=learner");
  const manual = page.getByRole("textbox", { name: "Username", exact: true });
  await expect(manual).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Account", exact: true }),
  ).toHaveCount(0);
  await manual.fill("Orbit");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("synthetic-demo-password-only");
  await page
    .getByRole("button", { name: "Reload account list", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Account", exact: true }),
  ).toHaveValue("Orbit");
  await expect(manual).toHaveCount(0);
  await expect(password).toHaveValue("synthetic-demo-password-only");
  expect((await submitSignIn(page)).status()).toBe(200);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
});

test("a sign-in connection failure explains how to retry without changing the selected account", async ({
  page,
}) => {
  let first = true;
  await page.route("**/auth/login", (route) => {
    if (first) {
      first = false;
      return route.abort("failed");
    }
    return route.continue();
  });
  await page.goto("/?signin=learner");
  await selectSignInAccount(page, "Orbit");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-demo-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Could not reach the app. Check your connection, then select Sign in to try again.",
  );
  await expect(
    page.getByRole("combobox", { name: "Account", exact: true }),
  ).toHaveValue("Orbit");
  await expect(
    page.getByRole("button", { name: "Reconnect", exact: true }),
  ).toHaveCount(0);
  expect((await submitSignIn(page)).status()).toBe(200);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
});

test("an empty account list blocks an incomplete sign-in without adding a conflicting username field", async ({
  page,
}) => {
  await page.route("**/auth/accounts?*", (route) =>
    route.fulfill({ json: [] }),
  );
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/auth/login"))
      submissions.push(request.url());
  });
  await page.goto("/?signin=learner");
  const account = page.getByRole("combobox", { name: "Account", exact: true });
  await expect(account).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Username", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText(
    "No learner accounts are ready to sign in. Ask your administrator to create your learner account.",
  );
  await page.getByLabel("Password", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect(
    await account.evaluate(
      (element: HTMLSelectElement) => element.validity.valueMissing,
    ),
  ).toBe(true);
  expect(submissions).toEqual([]);
});

test("an expired sign-in page preserves the chosen account and refreshes its permission only after another Sign in", async ({
  page,
}) => {
  let first = true;
  await page.route("**/auth/login", (route) => {
    if (first) {
      first = false;
      return route.continue({
        headers: {
          ...route.request().headers(),
          "x-csrf-token": "synthetic-expired-csrf",
        },
      });
    }
    return route.continue();
  });
  await page.goto("/?signin=learner");
  await selectSignInAccount(page, "Orbit");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("synthetic-demo-password-only");
  const requests: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/auth/session") || path.endsWith("/auth/login"))
      requests.push(`${request.method()} ${path}`);
  });
  expect((await submitSignIn(page)).status()).toBe(403);
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "This sign-in page expired. Select Sign in to try again.",
  );
  await expect(
    page.getByRole("combobox", { name: "Account", exact: true }),
  ).toHaveValue("Orbit");
  await expect(password).toHaveValue("synthetic-demo-password-only");
  expect(requests).toEqual(["POST /api/v1/auth/login"]);
  expect((await submitSignIn(page)).status()).toBe(200);
  expect(requests.slice(0, 3)).toEqual([
    "POST /api/v1/auth/login",
    "GET /api/v1/auth/session",
    "POST /api/v1/auth/login",
  ]);
  expect(
    requests.filter((request) => request === "GET /api/v1/auth/session"),
  ).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
});
