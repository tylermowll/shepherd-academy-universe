import { expect, test } from "@playwright/test";
import type { Schema } from "../../apps/web/src/client";
import {
  createLearner,
  login,
  startTutor,
  chooseLearningIntent,
  chooseMaterialInput,
  learningIntentNames,
  openLearningPreferences,
} from "./support";

test("one goal-first form keeps all seven choices readable and supports native keyboard selection without creating work", async ({
  page,
}) => {
  await login(page);
  await createLearner(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) &&
      request.url().includes("/api/v1/")
    )
      writes.push(request.url());
  });
  const initialUrl = page.url();
  const form = page.locator("form").filter({
    has: page.getByRole("button", { name: "Start learning", exact: true }),
  });
  await expect(form).toHaveCount(1);
  const goals = form.getByRole("group", {
    name: "What would you like help with?",
    exact: true,
  });
  await expect(goals.getByRole("radio")).toHaveCount(7);
  const topic = form.getByRole("textbox", {
    name: "What are you working on?",
    exact: true,
  });
  const goalBounds = await goals.boundingBox();
  const topicBounds = await topic.boundingBox();
  expect(goalBounds).not.toBeNull();
  expect(topicBounds).not.toBeNull();
  expect(goalBounds!.y + goalBounds!.height).toBeLessThanOrEqual(
    topicBounds!.y,
  );
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    for (const label of Object.values(learningIntentNames)) {
      const radio = goals.getByRole("radio", { name: label, exact: true });
      await expect(radio).toBeVisible();
      await radio.scrollIntoViewIfNeeded();
      await expect(radio).toBeInViewport();
      const bounds = await radio.evaluate((node) => {
        if (!(node instanceof HTMLInputElement) || node.type !== "radio")
          throw new Error("Goals must use native radio inputs.");
        const labelNode = node.labels?.[0];
        if (!labelNode) throw new Error("A goal needs a visible text label.");
        const rect = labelNode.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: labelNode.clientWidth,
          scrollWidth: labelNode.scrollWidth,
          height: labelNode.clientHeight,
          scrollHeight: labelNode.scrollHeight,
        };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
      expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width + 1);
      expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.height + 1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`learning-goals-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  const practice = goals.getByRole("radio", {
    name: "Practice a skill",
    exact: true,
  });
  const read = goals.getByRole("radio", {
    name: "Read and discuss a text",
    exact: true,
  });
  await practice.focus();
  await page.keyboard.press("ArrowRight");
  await expect(read).toBeFocused();
  await expect(read).toBeChecked();
  await expect(
    page.getByRole("textbox", { name: "Reading passage", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(practice).toBeFocused();
  await expect(practice).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(topic).toBeFocused();
  await expect(
    page.getByRole("textbox", { name: "Reading passage", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", {
      name: "How challenging should it be?",
      exact: true,
    }),
  ).not.toBeVisible();
  await openLearningPreferences(page);
  const difficulty = page.getByRole("combobox", {
    name: "How challenging should it be?",
    exact: true,
  });
  await difficulty.selectOption("challenge");
  await page
    .getByRole("combobox", {
      name: "How much guidance would you like?",
      exact: true,
    })
    .selectOption("learner_led");
  await page
    .getByText("Adjust difficulty and guidance", { exact: true })
    .click();
  await expect(difficulty).not.toBeVisible();
  await openLearningPreferences(page);
  await expect(difficulty).toHaveValue("challenge");
  await expect(
    page.getByRole("combobox", {
      name: "How much guidance would you like?",
      exact: true,
    }),
  ).toHaveValue("learner_led");
  await page.screenshot({
    path: test.info().outputPath("learning-preferences-1280.png"),
    fullPage: true,
  });
  expect(page.url()).toBe(initialUrl);
  expect(writes).toEqual([]);
});

test("conditional goal and material choices preserve drafts and submit one activity with the selected intent and settings", async ({
  page,
}) => {
  await login(page);
  await createLearner(page);
  const posts: Array<{ path: string; body: unknown }> = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/v1/"))
      posts.push({
        path: new URL(request.url()).pathname,
        body: request.postDataJSON(),
      });
  });
  const topic = page.getByRole("textbox", {
    name: "What are you working on?",
    exact: true,
  });
  await topic.fill("Synthetic revision: evidence from observation notes");
  await chooseLearningIntent(page, "read");
  await chooseMaterialInput(page, "reading_text");
  const passage = page.getByRole("textbox", {
    name: "Reading passage",
    exact: true,
  });
  const material =
    "A class measured three seedlings each morning. Their notebook records height, leaf color, and the position of each pot.";
  await passage.fill(material);
  await page
    .getByLabel("Passage title (optional)", { exact: true })
    .fill("Synthetic observation notebook");
  await chooseMaterialInput(page, "reading_photo");
  await expect(passage).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Add your photo", exact: true }),
  ).toHaveCount(0);
  await chooseMaterialInput(page, "reading_text");
  await expect(passage).toHaveValue(material);
  await chooseLearningIntent(page, "homework");
  await expect(
    page.getByRole("textbox", { name: "Reference material", exact: true }),
  ).toHaveValue(material);
  await chooseLearningIntent(page, "write");
  await expect(passage).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Reference material", exact: true }),
  ).toHaveCount(0);
  await chooseLearningIntent(page, "read");
  await expect(passage).toHaveValue(material);
  await expect(
    page.getByLabel("Passage title (optional)", { exact: true }),
  ).toHaveValue("Synthetic observation notebook");
  await chooseMaterialInput(page, "reading_generated");
  await expect(passage).toHaveCount(0);
  await chooseMaterialInput(page, "reading_text");
  await expect(passage).toHaveValue(material);
  await chooseLearningIntent(page, "review");
  await chooseMaterialInput(page, "reading_text");
  await expect(passage).toHaveValue(material);
  await expect(topic).toHaveValue(
    "Synthetic revision: evidence from observation notes",
  );
  await openLearningPreferences(page);
  await page
    .getByRole("combobox", { name: "Section length", exact: true })
    .selectOption("short");
  await page
    .getByRole("combobox", {
      name: "How challenging should it be?",
      exact: true,
    })
    .selectOption("challenge");
  await page
    .getByRole("combobox", {
      name: "How much guidance would you like?",
      exact: true,
    })
    .selectOption("learner_led");
  expect(posts).toEqual([]);
  const started = page.waitForResponse(
    (response) =>
      response.url().endsWith("/tutor/sessions") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  const response = await started;
  expect(response.status()).toBe(201);
  const saved = (await response.json()) as Schema<"TutoringSessionPublic">;
  expect(saved.learning_intent).toBe("review");
  expect(saved.problems).toHaveLength(1);
  expect(posts).toHaveLength(1);
  expect(posts[0]).toEqual({
    path: "/api/v1/tutor/sessions",
    body: {
      learner_id: saved.learner_id,
      topic: "Synthetic revision: evidence from observation notes",
      learning_intent: "review",
      initiative: "learner_led",
      difficulty: "challenge",
      initial_activity: {
        source: "reading_text",
        reference_text: material,
        passage_title: "Synthetic observation notebook",
        reading_mode: "guided",
        section_size: "short",
      },
    } satisfies Schema<"TutoringSessionInput">,
  });
  await expect(
    page.getByRole("textbox", { name: "Your work or question", exact: true }),
  ).toBeEditable();
  const reloaded = await page.request.get(`/api/v1/tutor/sessions/${saved.id}`);
  expect(reloaded.status()).toBe(200);
  expect(
    ((await reloaded.json()) as Schema<"TutoringSessionPublic">)
      .learning_intent,
  ).toBe("review");
});

test("starting with reference text creates exactly one activity without a second prompt", async ({
  page,
}) => {
  await login(page);
  await createLearner(page);
  await page
    .getByLabel("What are you working on?", { exact: true })
    .fill("Synthetic supporting evidence");
  await chooseLearningIntent(page, "homework");
  await chooseMaterialInput(page, "reference_text");
  await page
    .getByLabel("Reference material", { exact: true })
    .fill("Synthetic assignment: explain why a seedling grew taller.");
  const started = page.waitForResponse(
    (response) =>
      response.url().endsWith("/tutor/sessions") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  const result = await started;
  expect(result.status()).toBe(201);
  const session = (await result.json()) as Schema<"TutoringSessionPublic">;
  expect(session.problems).toHaveLength(1);
  expect(session.problems[0]?.reference_source).toBe("reference_text");
  await expect(
    page.getByLabel("Your work or question", { exact: true }),
  ).toBeEditable();
  await expect(page.locator(".tutor-activity")).toContainText("Synthetic");
  await expect(page.locator(".tutor-activity")).not.toContainText(
    "explain why a seedling grew taller",
  );
});

test("activity and message controls stay separate while menus fit and dismiss predictably", async ({
  page,
}) => {
  await startTutor(page, "Synthetic menu interaction");
  const helpToggle = page
    .locator(".composer-menu summary")
    .filter({ hasText: /^Help$/ });
  const nextToggle = page.getByText("Next activity options", { exact: true });
  const menus = page.locator(".composer-menu[open]");
  const activityControls = page.getByRole("group", {
    name: "Activity controls",
    exact: true,
  });
  const messageActions = page.locator(".composer-actions");
  await expect(
    activityControls.getByRole("button", {
      name: "Finish session",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    activityControls.getByText("Next activity options", { exact: true }),
  ).toBeVisible();
  await expect(
    messageActions.getByText("Next activity options", { exact: true }),
  ).toHaveCount(0);
  await expect(
    messageActions.getByRole("button", { name: "Finish session", exact: true }),
  ).toHaveCount(0);
  await expect(
    messageActions.getByRole("button", { name: "Send", exact: true }),
  ).toBeVisible();
  const activitySummary = page.locator(".activity-brief > summary");
  await activitySummary.click();
  await expect(activityControls).toBeVisible();
  await expect(nextToggle).toBeVisible();
  await activitySummary.click();
  await helpToggle.click();
  await expect(menus).toHaveCount(1);
  await nextToggle.click();
  await expect(menus).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Give me a hint", exact: true }),
  ).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menus).toHaveCount(0);
  await expect(nextToggle).toBeFocused();
  await helpToggle.click();
  // On narrow screens the menu covers the textarea; click a visible point
  // outside the menu rather than trying to click through its buttons.
  await page
    .getByRole("heading", { level: 1, name: "Practice", exact: true })
    .click();
  await expect(menus).toHaveCount(0);
  const assertOpenMenuFits = async (kind: "activity" | "message") => {
    const optionsBounds = await page
      .locator(".composer-menu[open] .composer-options")
      .boundingBox();
    const ownerBounds = await page
      .locator(kind === "activity" ? ".activity-controls" : ".tutor-response")
      .boundingBox();
    const triggerBounds = await (
      kind === "activity" ? nextToggle : helpToggle
    ).boundingBox();
    const chatBounds = await page.locator(".chat-column").boundingBox();
    expect(optionsBounds).not.toBeNull();
    expect(ownerBounds).not.toBeNull();
    expect(triggerBounds).not.toBeNull();
    expect(chatBounds).not.toBeNull();
    expect(optionsBounds!.x).toBeGreaterThanOrEqual(ownerBounds!.x);
    expect(optionsBounds!.x + optionsBounds!.width).toBeLessThanOrEqual(
      ownerBounds!.x + ownerBounds!.width,
    );
    expect(optionsBounds!.y).toBeGreaterThanOrEqual(chatBounds!.y);
    expect(optionsBounds!.y + optionsBounds!.height).toBeLessThanOrEqual(
      chatBounds!.y + chatBounds!.height,
    );
    if (kind === "activity")
      expect(optionsBounds!.y).toBeGreaterThanOrEqual(
        triggerBounds!.y + triggerBounds!.height,
      );
    else
      expect(optionsBounds!.y + optionsBounds!.height).toBeLessThanOrEqual(
        triggerBounds!.y,
      );
  };
  for (const width of [320, 375, 412]) {
    await page.setViewportSize({ width, height: 700 });
    for (const [kind, toggle] of [
      ["message", helpToggle],
      ["activity", nextToggle],
    ] as const) {
      await toggle.click();
      await expect(menus).toHaveCount(1);
      await assertOpenMenuFits(kind);
      await page.keyboard.press("Escape");
      await expect(menus).toHaveCount(0);
    }
  }
  await helpToggle.click();
  await page
    .getByRole("button", { name: "Give me a hint", exact: true })
    .click();
  await expect(menus).toHaveCount(0);
  await expect(page.locator(".tutor-feedback")).toHaveCount(1);
});
