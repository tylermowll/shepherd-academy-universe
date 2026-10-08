import { expect, test } from "@playwright/test";
import { createLearner, login, navigate, openAttachments } from "./support";

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
