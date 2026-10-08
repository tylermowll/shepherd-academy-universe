import { expect, test } from "@playwright/test";
import { createLearner, login, navigate, openAttachments } from "./support";
import type { Schema } from "../../apps/web/src/client";

const text =
  "Mira carried a seedling to the shaded corner. Each morning she moved its pot toward the window. After a week, she asked her brother to build a sunny shelf.";

for (const source of ["reading_text", "reading_generated", "reading_photo"]) {
  test(`${source} passage survives feedback, harder questions, reload and History`, async ({
    page,
  }) => {
    await login(page);
    await createLearner(page);
    await page
      .getByLabel("Topic or learning goal", { exact: true })
      .fill("Reading comprehension: inference and evidence");
    await page
      .getByRole("combobox", { name: "Practice source", exact: true })
      .selectOption(source);
    if (source === "reading_text") {
      await page.getByLabel("Passage title (optional)").fill("Mira's seedling");
      await page.getByLabel("Reading passage", { exact: true }).fill(text);
    }
    await page
      .getByRole("button", { name: "Start session", exact: true })
      .click();
    if (source === "reading_photo") {
      await expect(
        page.getByRole("heading", { name: "Reading passage photograph" }),
      ).toBeVisible();
      await openAttachments(page);
      await page
        .getByLabel("Take or choose a photo")
        .setInputFiles("evals/fixtures/work.png");
      await page
        .getByRole("button", { name: "Submit this photograph", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Reading from your photo" }),
      ).toContainText("2/5");
    }
    const passage = page.locator(
      ".tutor-sidebar > .reading-passage .passage-text",
    );
    await expect(passage).toBeVisible();
    const savedText = await passage.innerText();
    if (source === "reading_text") expect(savedText).toBe(text);
    else if (source === "reading_generated")
      await expect(page.locator(".tutor-sidebar")).toContainText(
        "AI-written passage",
      );
    else {
      // The synthetic reader recognizes this fixture; it does not measure OCR quality.
      expect(savedText).toBe("2/5");
      await expect(page.locator(".tutor-sidebar")).toContainText(
        "Read from your photo",
      );
    }
    const composer = page.getByLabel("Your work or question", { exact: true });
    await expect(composer).toBeEditable();
    const log = page.getByRole("log", { name: "Learning conversation" });
    expect(await log.evaluate((node) => node.clientHeight)).toBeGreaterThan(
      240,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await composer.fill(
      "She wanted more sunlight. The sunny shelf supports that.",
    );
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(log.locator(".tutor-feedback")).toHaveCount(1);
    await page.getByText("Next activity options", { exact: true }).click();
    await page
      .getByRole("button", { name: "Harder next activity", exact: true })
      .click();
    await expect(
      page.getByText("Saved automatically · Harder difficulty", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(composer).toBeEditable();
    await expect(passage).toHaveText(savedText);
    await page.reload();
    await expect(passage).toHaveText(savedText);
    await navigate(page, "History");
    await page
      .getByRole("button", { name: "Continue session", exact: true })
      .click();
    await expect(passage).toHaveText(savedText);
    await expect(log.locator(".tutor-feedback")).toHaveCount(1);
    await page.screenshot({
      path: test.info().outputPath("reading.png"),
      fullPage: true,
    });
  });
}

test("long science material has independent section pacing, saved navigation and learner-controlled progression", async ({
  page,
}) => {
  const material = Array.from(
    { length: 36 },
    (_, index) =>
      `Observation ${index + 1}: a class studies how heat moves through different materials. ` +
      "They compare a metal spoon and a wooden spoon in warm water, recording each handle's temperature at equal intervals. " +
      "The water starts at the same temperature in both containers. They keep the spoon lengths and the amount of water equal so the material can be compared. " +
      "Measurements support their explanation, but each measurement has uncertainty. A later trial repeats the comparison with a fresh set of instruments.",
  ).join("\n\n");
  expect(material.length).toBeGreaterThan(16000);
  await login(page);
  await createLearner(page);
  await page
    .getByLabel("Topic or learning goal", { exact: true })
    .fill("Science: interpreting an investigation of heat transfer");
  await page
    .getByRole("combobox", { name: "Practice source", exact: true })
    .selectOption("reading_text");
  await page
    .getByLabel("Passage title (optional)")
    .fill("Original science investigation notes");
  await page.getByLabel("Reading passage", { exact: true }).fill(material);
  await page
    .getByRole("combobox", { name: "Section length", exact: true })
    .selectOption("short");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  const passage = page.locator(
    ".tutor-sidebar > .reading-passage .passage-text",
  );
  const position = page.locator(
    ".tutor-sidebar > .reading-passage .material-position",
  );
  await expect(position).toHaveText(/Section 1 of \d+/);
  await expect(
    page.getByRole("region", { name: "Activity goal" }).first(),
  ).toContainText("A sufficient response");
  const first = await passage.innerText();
  expect(first).toContain("Observation 1:");
  expect(first).not.toContain("Observation 36:");
  await expect(
    page.getByRole("button", { name: "Previous section", exact: true }),
  ).toBeDisabled();
  // Progress is learner controlled: no answer or AI completion gate is required.
  await page.getByRole("button", { name: "Next section", exact: true }).click();
  await expect(position).toHaveText(/Section 2 of \d+/);
  const second = await passage.innerText();
  expect(second).not.toBe(first);
  const composer = page.getByRole("textbox", {
    name: "Your work or question",
    exact: true,
  });
  await expect(composer).toBeEditable();
  await composer.fill("An unfinished explanation");
  await expect(
    page.getByRole("button", { name: "Next section", exact: true }),
  ).toBeDisabled();
  await composer.fill("");
  await page.getByText("Next activity options", { exact: true }).click();
  await page
    .getByRole("button", { name: "Harder next activity", exact: true })
    .click();
  await expect(
    page.getByText("Saved automatically · Harder difficulty", { exact: true }),
  ).toBeVisible();
  await expect(passage).toHaveText(second);
  await expect(position).toHaveText(/Section 2 of \d+/);
  await page.reload();
  await expect(passage).toHaveText(second);
  await navigate(page, "History");
  await page
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  await expect(position).toHaveText(/Section 2 of \d+/);
  await page
    .getByRole("button", { name: "Previous section", exact: true })
    .click();
  await expect(position).toHaveText(/Section 1 of \d+/);
  await expect(passage).toHaveText(first);
  await expect(composer).toBeEditable();
  const navigation = page.getByRole("region", { name: "Material navigation" });
  await navigation.getByText("Reading pace", { exact: true }).click();
  await navigation
    .getByRole("combobox", { name: "Reading mode", exact: true })
    .selectOption("whole");
  await navigation
    .getByRole("button", { name: "Apply reading pace", exact: true })
    .click();
  await expect(position).toHaveText("Whole text");
  await expect(passage).toContainText("Observation 36:");
  await expect(
    page.getByText("Saved automatically · Harder difficulty", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("literal material and Unicode input survive intact with explicit overflow and faithful selected help", async ({
  page,
}) => {
  await login(page);
  await createLearner(page);
  await page
    .getByRole("textbox", { name: "Topic or learning goal", exact: true })
    .fill("Reading: compare the stated costs and symbols");
  await page
    .getByRole("combobox", { name: "Practice source", exact: true })
    .selectOption("reading_text");
  const input = page.getByRole("textbox", {
    name: "Reading passage",
    exact: true,
  });
  const prefix =
    "The ticket cost $5 and the bus cost $10. **Literal** `source` notation.\n\n";
  const material = prefix + "🌱".repeat(30000);
  await input.fill("🌱".repeat(50001));
  await expect(input).toHaveValue("🌱".repeat(50001));
  await expect(
    page.getByText(/This material exceeds 50,000 characters/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start session", exact: true }),
  ).toBeDisabled();
  await input.fill(material);
  await expect(input).toHaveValue(material);
  await expect(
    page.getByText(
      `${Array.from(material).length.toLocaleString()} / 50,000 characters`,
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  const passage = page.locator(
    ".tutor-sidebar > .reading-passage .passage-text",
  );
  await expect(passage).toContainText(prefix.trim());
  expect(await passage.locator("math, strong, code").count()).toBe(0);
  const saved = await page.evaluate(async () => {
    const id = new URLSearchParams(location.hash.slice(1)).get("tutor");
    return (await (
      await fetch(`/api/v1/tutor/sessions/${id}`, { cache: "no-store" })
    ).json()) as Schema<"TutoringSessionPublic">;
  });
  expect(saved.problems[0]?.passage?.text).toBe(material);
  expect(await passage.textContent()).toBe(
    saved.problems[0]?.material_focus?.text,
  );
  await passage.evaluate((node, length) => {
    const range = document.createRange();
    range.setStart(node.querySelector(".explanation")!.firstChild!, 0);
    range.setEnd(node.querySelector(".explanation")!.firstChild!, length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  }, prefix.trim().length);
  await page
    .getByRole("button", { name: "Ask about selected text", exact: true })
    .click();
  const composer = page.getByRole("textbox", {
    name: "Your work or question",
    exact: true,
  });
  await expect(composer).toHaveValue(
    `Help me understand this part of the material:\n\n${prefix.trim()}`,
  );
  await composer.fill("🌱".repeat(8001));
  await expect(composer).toHaveValue("🌱".repeat(8001));
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeDisabled();
  await composer.fill("理".repeat(6000));
  const submission = page.waitForResponse(
    (response) =>
      response.url().endsWith("/submissions") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  expect((await submission).status()).toBe(202);
  await expect(page.locator(".learner-message .user-text")).toHaveText(
    "理".repeat(6000),
  );
  await expect(
    page.getByText(/This work exceeds the configured model context/),
  ).toBeVisible();
  await composer.fill("The bus cost $10, twice the ticket's $5 cost.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".tutor-feedback")).toHaveCount(1);
});
