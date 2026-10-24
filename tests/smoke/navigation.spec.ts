import { expect, test, type Page } from "@playwright/test";
import {
  createActivity,
  createLearner,
  login,
  navigate,
  openAttachments,
  openSessionTools,
  startTutor,
} from "./support";

async function expectPageFits(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("page headings keep accessible focus without a box while keyboard controls stay outlined", async ({
  page,
}) => {
  await page.goto("/");
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(signIn).toBeEnabled();
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Learner sign-in",
  });
  await expect(heading).toBeFocused();
  expect(
    await heading.evaluate((element) => element.matches(":focus-visible")),
  ).toBe(true);
  await expect(heading).toHaveCSS("outline-style", "none");

  const account = page.getByRole("combobox", { name: "Account", exact: true });
  await expect(account).toBeEnabled();
  const controls = [
    account,
    page.getByLabel("Password", { exact: true }),
    signIn,
  ];
  for (const control of controls) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
    await expect(control).toHaveCSS("outline-style", "solid");
    await expect(control).toHaveCSS("outline-width", "3px");
  }

  const help = page
    .getByRole("navigation", { name: "Sign-in navigation" })
    .getByRole("link", { name: "Help", exact: true });
  for (let step = 0; step < controls.length; step += 1)
    await page.keyboard.press("Shift+Tab");
  await expect(help).toBeFocused();
  await expect(help).toHaveCSS("outline-style", "solid");
  await expect(help).toHaveCSS("outline-width", "3px");
  await page.keyboard.press("Enter");
  const helpHeading = page.getByRole("heading", {
    level: 2,
    name: "Start practicing",
    exact: true,
  });
  await expect(helpHeading).toBeFocused();
  expect(
    await helpHeading.evaluate((element) => element.matches(":focus-visible")),
  ).toBe(true);
  await expect(helpHeading).toHaveCSS("outline-style", "none");

  const phone = page
    .getByRole("navigation", { name: "Help topics" })
    .getByRole("link", { name: "Phone setup", exact: true });
  await phone.focus();
  await page.keyboard.press("Enter");
  const phoneHeading = page.getByRole("heading", {
    level: 2,
    name: "Phone setup",
    exact: true,
  });
  await expect(phoneHeading).toBeFocused();
  await expect(phoneHeading).toHaveCSS("outline-style", "none");
});

for (const role of ["learner", "adult"] as const) {
  test(`${role} sign-in distinguishes the selected account and offers keyboard-accessible recovery that survives Back, reload and copied links`, async ({
    page,
    context,
  }) => {
    const title = role === "adult" ? "Administrator" : "Learner";
    const counterpart = role === "adult" ? "Learner" : "Administrator";
    const mutations: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() !== "GET" &&
        /\/auth\/(login|logout)$/.test(new URL(request.url()).pathname)
      )
        mutations.push(request.url());
    });
    const expectEntry = async (account: string) => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        `${account} sign-in`,
      );
      await expect(page.locator("form h2")).toHaveCount(0);
      await expect(
        page.getByRole("combobox", { name: "Account", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Username", exact: true }),
      ).toHaveCount(0);
      await expect(
        page
          .getByRole("navigation", { name: "Sign-in navigation" })
          .getByText("Switch to", { exact: true }),
      ).toBeVisible();
      await expectPageFits(page);
    };
    const expectRecovery = async (target: Page) => {
      await expect(target).toHaveURL(
        (url) =>
          url.searchParams.get("page") === "help" &&
          url.searchParams.get("help") === "signin" &&
          url.searchParams.get("signin") === role,
      );
      await expect(
        target.getByRole("heading", {
          level: 2,
          name: "Sign-in & passwords",
          exact: true,
        }),
      ).toBeVisible();
      const article = target.getByRole("article");
      if (role === "learner") {
        await expect(article).toContainText(/contact your administrator/i);
        for (const step of [
          "Users",
          "Manage account",
          "Sign-in details",
          "New password",
          "Save sign-in details",
        ])
          await expect(article).toContainText(step);
        await expect(article).not.toContainText(/make admin|docker compose/i);
        await expect(
          article.getByRole("link", {
            name: /set up the app|setup instructions|first-time setup/i,
          }),
        ).toHaveCount(0);
      } else {
        await expect(article).toContainText("make admin");
        await expect(article).toContainText(
          "docker compose -f infra/docker/compose.yaml run --rm api python -m math_tutor.cli admin",
        );
        await expect(article).toContainText(/existing username/i);
        await expect(
          article.getByRole("heading", {
            name: "First-time setup",
            exact: true,
          }),
        ).toBeVisible();
        await expect(article).toContainText(
          /cannot reset an existing account/i,
        );
      }
      await expect(target.getByLabel("Signed in account")).toHaveCount(0);
      await expect(
        target.getByRole("navigation", { name: "Main navigation" }),
      ).toHaveCount(0);
      await expectPageFits(target);
    };

    await page.goto(
      `/?page=${role === "adult" ? "learners" : "practice"}&signin=${role}`,
    );
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeEnabled();
    await expectEntry(title);
    if (role === "learner")
      await expect(
        page.getByRole("link", {
          name: /first-time setup|setup instructions/i,
        }),
      ).toHaveCount(0);
    for (const account of [counterpart, title]) {
      const switchLink = page
        .getByRole("navigation", { name: "Sign-in navigation" })
        .getByRole("link", { name: `${account} sign-in`, exact: true });
      await switchLink.focus();
      await expect(switchLink).toBeFocused();
      await expect(switchLink).toHaveCSS("text-decoration-line", "underline");
      if (test.info().project.use.hasTouch) {
        const bounds = await switchLink.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
      }
      await expect(switchLink).toHaveCSS("outline-style", "solid");
      await expect(switchLink).toHaveCSS("outline-width", "3px");
      await page.keyboard.press("Enter");
      await expectEntry(account);
    }
    const recovery = page.getByRole("link", {
      name: "Forgot password?",
      exact: true,
    });
    await expect(recovery).toBeVisible();
    expect((await recovery.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(recovery).toHaveCSS("text-decoration-line", "underline");
    const copiedUrl = new URL(
      (await recovery.getAttribute("href"))!,
      page.url(),
    ).href;
    await recovery.focus();
    await expect(recovery).toBeFocused();
    await expect(recovery).toHaveCSS("outline-style", "solid");
    await expect(recovery).toHaveCSS("outline-width", "3px");
    await page.keyboard.press("Enter");
    await expectRecovery(page);
    const topicHeading = page.getByRole("heading", {
      level: 2,
      name: "Sign-in & passwords",
      exact: true,
    });
    await expect(topicHeading).toBeFocused();
    await expect(topicHeading).toHaveCSS("outline-style", "none");
    await page.reload();
    await expectRecovery(page);
    await page.goBack();
    await expectEntry(title);

    const copied = await context.newPage();
    try {
      await copied.goto(copiedUrl);
      await expectRecovery(copied);
    } finally {
      await copied.close();
    }
    expect(mutations).toEqual([]);
  });
}

test("guests can open and reload Help without exposing account controls", async ({
  page,
}) => {
  await page.goto("/?page=help");
  const navigation = page.getByRole("navigation", {
    name: "Sign-in navigation",
  });
  await expect(navigation.getByRole("link")).toHaveText([
    "Learner sign-in",
    "Administrator sign-in",
    "Help",
  ]);
  await expect(
    navigation.getByRole("link", { name: "Help", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Help");
  await expect(
    page.getByRole("button", { name: "Add learner account" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Approve device" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Test tutor" })).toHaveCount(0);
  await expectPageFits(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Help");
  await page
    .getByRole("navigation", { name: "Help topics" })
    .getByRole("link", { name: "Phone setup", exact: true })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("page") === "help" &&
      url.searchParams.get("help") === "phone" &&
      url.searchParams.get("signin") === "learner",
  );
  await expect(
    page.getByRole("heading", {
      name: "Send a photo while you work on the computer",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Use the whole tutor on the phone",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("This address works only on this computer.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/No sign-in is needed for this photo/),
  ).toBeVisible();
  await expectPageFits(page);
  await navigation
    .getByRole("link", { name: "Learner sign-in", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Account", exact: true }),
  ).toBeVisible();
});

test("adult pages isolate each job and browser navigation preserves a new session draft", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173")
      external.push(request.url());
  });
  await login(page);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link")).toHaveText([
    "Users",
    "Settings",
    "Help",
  ]);
  await navigate(page, "Settings");
  await page.getByRole("tab", { name: /Models/ }).click();
  await expect(page.getByRole("button", { name: "Test tutor" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve device" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Download and load experiment" }),
  ).toHaveCount(0);
  await expectPageFits(page);
  await navigate(page, "Users");
  await expect(
    page.getByRole("button", { name: "Add learner account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Choose an account" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Test tutor" })).toHaveCount(0);
  await expectPageFits(page);
  await createLearner(page);
  const topic = page.getByRole("textbox", {
    name: "Topic or learning goal",
    exact: true,
  });
  await topic.fill("Synthetic draft: comparing two scientific explanations");
  const practiceHelp = page.getByText("What can I practice?", { exact: true });
  const practiceHelpDetails = practiceHelp.locator("..");
  await expect(practiceHelpDetails).not.toHaveAttribute("open", "");
  await practiceHelp.focus();
  await page.keyboard.press("Enter");
  await expect(practiceHelpDetails).toHaveAttribute("open", "");
  await expect(practiceHelpDetails).toContainText("reference material");
  await page.keyboard.press("Enter");
  await expect(practiceHelpDetails).not.toHaveAttribute("open", "");
  await expect(
    page.getByRole("button", { name: "Add learner account" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Approve device" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Test tutor" })).toHaveCount(0);
  await expectPageFits(page);

  await navigate(page, "Help");
  await expect(topic).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Help");
  await expectPageFits(page);
  await navigate(page, "History");
  await expect(topic).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Start session" })).toHaveCount(
    0,
  );
  await expectPageFits(page);
  await page.goBack();
  await expect(
    navigation.getByRole("link", { name: "Help", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    navigation.getByRole("link", { name: "Practice", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(topic).toHaveValue(
    "Synthetic draft: comparing two scientific explanations",
  );

  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(external).toEqual([]);
});

test("Help and History preserve unsent work and saved sessions reopen through History", async ({
  page,
}) => {
  const topic = "Synthetic navigation: supporting a claim with evidence";
  await startTutor(page, topic);
  await createActivity(page);
  const response = page.getByRole("textbox", {
    name: "Your work or question",
    exact: true,
  });
  await response.fill(
    "A source should contain observations supporting the claim.",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".tutor-feedback")).toHaveCount(1);
  const sessionHash = await page.evaluate(() => location.hash);
  const draft = "Unsent revision: I also need to compare another source.";
  await response.fill(draft);
  await openAttachments(page);
  const attachments = page.getByRole("region", {
    name: "Photo attachments",
    exact: true,
  });
  await expect(attachments).toBeFocused();
  const attachmentBounds = (await attachments.boundingBox())!;
  const controlBounds = (await page
    .getByRole("group", { name: "Activity controls", exact: true })
    .boundingBox())!;
  const composerBounds = (await page.locator(".tutor-response").boundingBox())!;
  expect(attachmentBounds.y).toBeGreaterThanOrEqual(
    controlBounds.y + controlBounds.height,
  );
  expect(attachmentBounds.y + attachmentBounds.height).toBeLessThanOrEqual(
    composerBounds.y,
  );
  await page.getByText("How do I use my phone?", { exact: true }).click();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Phone setup help", exact: true })
    .click();
  await expect(page).toHaveURL(/page=help&help=phone/);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Phone setup",
      exact: true,
    }),
  ).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Help", exact: true }),
  ).toBeInViewport();
  await expect(response).not.toBeVisible();
  await navigate(page, "History");
  await expect(
    page.getByRole("heading", { name: topic, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  await expect(response).toHaveValue(draft);
  expect(await page.evaluate(() => location.hash)).toBe(sessionHash);
  await response.fill("");
  await navigate(page, "History");
  await page
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Practice", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".tutor-feedback")).toHaveCount(1);
  expect(await page.evaluate(() => location.hash)).toBe(sessionHash);
  await openSessionTools(page);
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .click();
  await navigate(page, "History");
  await page
    .getByRole("button", { name: "Review session", exact: true })
    .click();
  await expect(page.locator(".tutor-feedback")).toHaveCount(1);
  await expect(response).toHaveCount(0);
});

test("an adult practices through a distinct learner account and browser Back restores the selected saved session", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Users");
  await page
    .getByRole("button", { name: "Add learner account", exact: true })
    .click();
  const learnerName = page.getByLabel("Learner username", { exact: true });
  await expect(learnerName).toHaveValue("");
  await expect(learnerName).toBeEditable();
  await page
    .getByRole("combobox", { name: "Age group", exact: true })
    .selectOption("adult");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-demo-password-only");
  const alias = `Synthetic adult ${Date.now()}`;
  await learnerName.fill(alias);
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/admin/learners") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create learner account", exact: true })
    .click();
  const createdResponse = await created;
  expect(createdResponse.status()).toBe(201);
  expect(await createdResponse.json()).toMatchObject({
    alias,
    eligibility: "adult",
  });
  await expect(
    page.getByRole("region", { name: "Selected learner", exact: true }),
  ).toContainText(alias);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, alias);

  const topicA = "Synthetic adult practice: compare scientific explanations";
  const topicB = "Synthetic adult practice: evaluate a historical source";
  const topicField = page.getByRole("textbox", {
    name: "Topic or learning goal",
    exact: true,
  });
  await topicField.fill(topicA);
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: topicA, level: 2, exact: true }),
  ).toBeVisible();
  const hashA = await page.evaluate(() => location.hash);
  expect(hashA).toMatch(/^#tutor=[a-f0-9-]{36}$/);
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await topicField.fill(topicB);
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: topicB, level: 2, exact: true }),
  ).toBeVisible();
  const hashB = await page.evaluate(() => location.hash);
  expect(hashB).toMatch(/^#tutor=[a-f0-9-]{36}$/);
  expect(hashB).not.toBe(hashA);

  await navigate(page, "History");
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: topicA, exact: true }) })
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: topicA, level: 2, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`page=practice${hashA}$`));
  await navigate(page, "History");
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: topicB, exact: true }) })
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: topicB, level: 2, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`page=practice${hashB}$`));
  await page.goBack();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "History", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: topicA, level: 2, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`page=practice${hashA}$`));
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveText(["Practice", "History", "Help"]);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
});
