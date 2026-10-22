import { expect, test } from "@playwright/test";
import { login, navigate } from "./support";

test("administrator enforces the three-character boundary, prevents duplicates and resets a learner's password without losing their identity", async ({
  page,
  browser,
}) => {
  await login(page);
  await navigate(page, "Learners");
  const username = `Synthetic password boundary ${Date.now()}`;
  const password = "123";
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/api/v1/admin/learners") &&
      ["POST", "PATCH"].includes(request.method())
    )
      mutations.push(request.method());
  });
  await page
    .getByRole("button", { name: "Add learner account", exact: true })
    .click();
  await page.getByLabel("Learner username", { exact: true }).fill(username);
  const createPassword = page.getByLabel("Password", { exact: true });
  await expect(createPassword).toHaveAttribute("minlength", "3");
  await createPassword.fill("12");
  await page
    .getByRole("button", { name: "Create learner account", exact: true })
    .click();
  expect(
    await createPassword.evaluate(
      (input: HTMLInputElement) => input.validity.tooShort,
    ),
  ).toBe(true);
  expect(mutations).toEqual([]);
  await createPassword.fill(password);
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/admin/learners") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create learner account", exact: true })
    .click();
  expect((await created).status()).toBe(201);
  await expect(
    page.getByRole("region", { name: "Selected learner", exact: true }),
  ).toContainText(username);
  await expect(
    page.getByRole("combobox", { name: "Learner", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add learner account", exact: true })
    .click();
  await page
    .getByLabel("Learner username", { exact: true })
    .fill(` ${username.toUpperCase()} `);
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-demo-password-only");
  await page
    .getByRole("button", { name: "Create learner account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "username is already in use",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const context = await browser.newContext();
  try {
    const learner = await context.newPage();
    await learner.goto("/?signin=learner");
    const accounts = learner.getByRole("group", { name: "Choose an account" });
    await expect(
      accounts.getByRole("button", { name: username, exact: true }),
    ).toBeVisible();
    await expect(
      accounts.getByRole("button", { name: "demo", exact: true }),
    ).toHaveCount(0);
    await accounts.getByRole("button", { name: username, exact: true }).click();
    await expect(learner.getByLabel("Username", { exact: true })).toHaveValue(
      username,
    );
    await expect(learner.getByLabel("Password", { exact: true })).toBeFocused();
    await login(learner, username, password);
    const signedIn = (await (
      await learner.request.get("/api/v1/auth/session")
    ).json()) as { learner_id: string };
    const learnerId = signedIn.learner_id;
    await expect(
      learner
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link"),
    ).toHaveText(["Practice", "History", "Help"]);
    const replacement = "234";
    const updatedName = `${username} updated`;
    await page
      .getByLabel("Learner username", { exact: true })
      .fill(updatedName);
    const resetPassword = page.getByLabel("New password", { exact: true });
    await expect(resetPassword).toHaveAttribute("minlength", "3");
    await resetPassword.fill("12");
    const priorMutations = mutations.length;
    await page
      .getByRole("button", { name: "Save sign-in details", exact: true })
      .click();
    expect(
      await resetPassword.evaluate(
        (input: HTMLInputElement) => input.validity.tooShort,
      ),
    ).toBe(true);
    expect(mutations).toHaveLength(priorMutations);
    expect(
      await (await learner.request.get("/api/v1/auth/session")).json(),
    ).toMatchObject({
      authenticated: true,
      learner_id: learnerId,
      login_name: username,
    });
    expect((await learner.request.get("/api/v1/tutor/sessions")).status()).toBe(
      200,
    );
    await resetPassword.fill(replacement);
    await page
      .getByRole("button", { name: "Save sign-in details", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "This learner's browsers are signed out",
    );
    await expect(page.getByLabel("New password", { exact: true })).toHaveValue(
      "",
    );
    expect((await learner.request.get("/api/v1/tutor/sessions")).status()).toBe(
      401,
    );
    await login(learner, updatedName, replacement);
    const identity = await learner.request.get("/api/v1/auth/session");
    expect(await identity.json()).toMatchObject({ learner_id: learnerId });
    expect((await learner.request.get("/api/v1/admin/learners")).status()).toBe(
      403,
    );
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link"),
    ).toHaveText(["Learners", "Settings", "Help"]);
    await page.screenshot({
      path: test.info().outputPath("learner-accounts.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("listed administrator changes a three-character password while retaining this browser and signing out another", async ({
  page,
  browser,
}) => {
  const original = "synthetic-demo-password-only";
  const replacement = "123";
  const otherContext = await browser.newContext();
  let changed = false;
  try {
    await page.goto("/?signin=adult");
    const accounts = page.getByRole("group", { name: "Choose an account" });
    await expect(accounts.getByRole("button")).toHaveText(["demo"]);
    await accounts.getByRole("button", { name: "demo", exact: true }).click();
    await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
      "demo",
    );
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
    await login(page);
    const other = await otherContext.newPage();
    await login(other);
    await navigate(page, "Learners");
    await page
      .getByRole("button", { name: "demo Manage administrator", exact: true })
      .click();
    const current = page.getByLabel("Current password", { exact: true });
    const password = page.getByLabel("New password", { exact: true });
    const confirmation = page.getByLabel("Confirm new password", {
      exact: true,
    });
    const save = page.getByRole("button", {
      name: "Change administrator password",
      exact: true,
    });
    const changes: string[] = [];
    page.on("request", (request) => {
      if (
        request.url().endsWith("/auth/password") &&
        request.method() === "POST"
      )
        changes.push(request.method());
    });
    await current.fill(original);
    await expect(password).toHaveAttribute("minlength", "3");
    await password.fill("12");
    await confirmation.fill("12");
    await save.click();
    expect(
      await password.evaluate(
        (input: HTMLInputElement) => input.validity.tooShort,
      ),
    ).toBe(true);
    expect(changes).toEqual([]);
    await password.fill(replacement);
    await confirmation.fill("234");
    await save.click();
    await expect(page.getByRole("alert")).toContainText(/match/i);
    expect(changes).toEqual([]);

    await current.fill("incorrect");
    await confirmation.fill(replacement);
    const rejected = page.waitForResponse((response) =>
      response.url().endsWith("/auth/password"),
    );
    await save.click();
    expect((await rejected).status()).toBe(403);
    await expect(page.getByRole("alert")).toBeVisible();
    expect((await page.request.get("/api/v1/admin/learners")).status()).toBe(
      200,
    );
    expect((await other.request.get("/api/v1/admin/learners")).status()).toBe(
      200,
    );

    await current.fill(original);
    await password.fill(replacement);
    await confirmation.fill(replacement);
    const updated = page.waitForResponse((response) =>
      response.url().endsWith("/auth/password"),
    );
    await save.click();
    const response = await updated;
    expect(response.status()).toBe(200);
    changed = true;
    await expect(page.getByRole("status")).toContainText(
      "Administrator password changed. Other administrator browsers are signed out.",
    );
    for (const field of [current, password, confirmation])
      await expect(field).toHaveValue("");
    expect(
      await (await page.request.get("/api/v1/auth/session")).json(),
    ).toMatchObject({ authenticated: true, role: "adult", login_name: "demo" });
    expect((await page.request.get("/api/v1/admin/learners")).status()).toBe(
      200,
    );
    expect((await other.request.get("/api/v1/admin/learners")).status()).toBe(
      401,
    );

    await other.goto("/?signin=adult");
    await other.getByLabel("Username", { exact: true }).fill("demo");
    await other.getByLabel("Password", { exact: true }).fill(original);
    const tryOldPassword = async () => {
      const response = other.waitForResponse((result) =>
        result.url().endsWith("/auth/login"),
      );
      await other.getByRole("button", { name: "Sign in", exact: true }).click();
      return response;
    };
    let oldPassword = await tryOldPassword();
    if (oldPassword.status() === 429) {
      // Keep the production login budget when this journey follows other cases.
      const retryAfter = Number(oldPassword.headers()["retry-after"]);
      expect(Number.isInteger(retryAfter)).toBe(true);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
      const delay = retryAfter * 1000 + 100;
      test.setTimeout(test.info().timeout + delay);
      await other.waitForTimeout(delay);
      oldPassword = await tryOldPassword();
    }
    expect(oldPassword.status()).toBe(401);
    await expect(other.getByRole("alert")).toBeVisible();
    await login(other, "demo", replacement);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    if (changed) {
      // The disposable browser server shares its seeded account across cases.
      // Restore it even when a later assertion fails, using fresh session CSRF.
      const session = (await (
        await page.request.get("/api/v1/auth/session")
      ).json()) as { csrf_token: string };
      const restored = await page.request.post("/api/v1/auth/password", {
        headers: { "X-CSRF-Token": session.csrf_token },
        data: {
          current_password: replacement,
          new_password: original,
          password_confirmation: original,
        },
      });
      expect(restored.status()).toBe(200);
    }
    await otherContext.close();
  }
});
