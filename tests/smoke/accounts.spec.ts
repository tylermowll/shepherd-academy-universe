import { expect, test } from "@playwright/test";
import { login, navigate } from "./support";

test("administrator enforces the six-character boundary, prevents duplicates and resets a learner's password without losing their identity", async ({
  page,
  browser,
}) => {
  await login(page);
  await navigate(page, "Learners");
  const username = `Synthetic password boundary ${Date.now()}`;
  const password = "local6";
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
  await expect(createPassword).toHaveAttribute("minlength", "6");
  await createPassword.fill("five5");
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
    const replacement = "reset6";
    const updatedName = `${username} updated`;
    await page
      .getByLabel("Learner username", { exact: true })
      .fill(updatedName);
    const resetPassword = page.getByLabel("New password", { exact: true });
    await expect(resetPassword).toHaveAttribute("minlength", "6");
    await resetPassword.fill("five5");
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
