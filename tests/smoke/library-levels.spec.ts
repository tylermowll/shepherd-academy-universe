import { expect, test, type Page, type Response } from "@playwright/test";
import type { Schema } from "../../apps/web/src/client";
import {
  chooseLearningIntent,
  chooseMaterialInput,
  createLearner,
  login,
  navigate,
  openLearningPreferences,
  openSessionTools,
} from "./support";

const catalogResponse = (response: Response) =>
  new URL(response.url()).pathname === "/api/v1/reading/sources" &&
  response.request().method() === "GET";
async function openLibrary(page: Page) {
  await login(page);
  await createLearner(page);
  await chooseLearningIntent(page, "read");
  const loaded = page.waitForResponse(catalogResponse);
  await chooseMaterialInput(page, "published");
  const response = await loaded;
  expect(response.status()).toBe(200);
  const catalog = (await response.json()) as Schema<"SourceCatalogPublic">;
  const library = page.getByRole("region", {
    name: "Published text library",
    exact: true,
  });
  await expect(
    library.getByRole("button", { name: "Search library", exact: true }),
  ).toBeEnabled();
  return { library, catalog };
}
async function searchLibrary(page: Page, value: string) {
  const library = page.getByRole("region", {
    name: "Published text library",
    exact: true,
  });
  await openBrowse(page);
  await library
    .getByRole("searchbox", { name: "Search texts", exact: true })
    .fill(value);
  const loaded = page.waitForResponse(catalogResponse);
  await library
    .getByRole("button", { name: "Search library", exact: true })
    .click();
  const response = await loaded;
  expect(response.status()).toBe(200);
  await expect(
    library.getByRole("button", { name: "Search library", exact: true }),
  ).toBeEnabled();
  return (await response.json()) as Schema<"SourceCatalogPublic">;
}
async function openBrowse(page: Page) {
  const browser = page.locator(".published-sources > .library-browser");
  if ((await browser.getAttribute("open")) === null)
    await browser.locator(":scope > summary").click();
  return browser;
}
async function openSettings(page: Page) {
  await openSessionTools(page);
  const summary = page.getByText("Session settings", { exact: true });
  if ((await summary.locator("..").getAttribute("open")) === null)
    await summary.click();
  return summary.locator("..");
}
async function currentSession(page: Page) {
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
    "tutor",
  );
  expect(id).not.toBeNull();
  const response = await page.request.get(`/api/v1/tutor/sessions/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as Schema<"TutoringSessionPublic">;
}
async function saveSettings(page: Page) {
  const response = page.waitForResponse(
    (result) =>
      result.url().endsWith("/settings") &&
      result.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Save session settings", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByRole("button", { name: "Save session settings", exact: true }),
  ).toBeEnabled();
}

test("the local library searches and filters without imports, paginates, clears empty results and wraps at 320px", async ({
  page,
}) => {
  const { library, catalog } = await openLibrary(page);
  expect(catalog.total).toBeGreaterThanOrEqual(500);
  expect(catalog.total).toBeLessThanOrEqual(1000);
  expect(catalog.categories.length).toBeGreaterThan(3);
  await expect(library.locator(".library-results > article")).toHaveCount(12);
  const initialUrl = page.url();
  const writes: string[] = [];
  const catalogRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
    if (new URL(request.url()).pathname === "/api/v1/reading/sources")
      catalogRequests.push(request.url());
  });
  const query = library.getByRole("searchbox", {
    name: "Search texts",
    exact: true,
  });
  await query.fill("Aesop");
  const searched = page.waitForResponse(catalogResponse);
  await query.press("Enter");
  const aesop = (await (
    await searched
  ).json()) as Schema<"SourceCatalogPublic">;
  expect(aesop.total).toBeGreaterThan(12);
  await expect(
    library.getByRole("button", { name: "Next results", exact: true }),
  ).toBeEnabled();
  const next = library.getByRole("button", {
    name: "Next results",
    exact: true,
  });
  await next.focus();
  const paged = page.waitForResponse(catalogResponse);
  await page.keyboard.press("Enter");
  const second = (await (await paged).json()) as Schema<"SourceCatalogPublic">;
  expect(second.offset).toBe(12);
  expect(second.items.map((item) => item.id)).not.toEqual(
    aesop.items.map((item) => item.id),
  );
  await expect(
    library.getByRole("button", { name: "Search library", exact: true }),
  ).toBeEnabled();
  const example = second.items[0]!;
  const length =
    example.word_count < 500
      ? "short"
      : example.word_count < 1500
        ? "medium"
        : example.word_count < 5000
          ? "long"
          : "extended";
  const beforeFilters = catalogRequests.length;
  await library
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption(example.category);
  await library
    .getByRole("combobox", { name: "Length", exact: true })
    .selectOption(length);
  await library
    .getByRole("combobox", { name: "Approximate reading level", exact: true })
    .selectOption(example.reading_level ?? "unrated");
  expect(catalogRequests).toHaveLength(beforeFilters);
  const filteredResponse = page.waitForResponse(catalogResponse);
  await library
    .getByRole("button", { name: "Search library", exact: true })
    .click();
  const filtered = (await (
    await filteredResponse
  ).json()) as Schema<"SourceCatalogPublic">;
  expect(filtered.total).toBeGreaterThan(0);
  for (const item of filtered.items) {
    expect(item.category).toBe(example.category);
    expect(item.reading_level).toBe(example.reading_level);
    if (length === "short") expect(item.word_count).toBeLessThan(500);
    else if (length === "medium") {
      expect(item.word_count).toBeGreaterThanOrEqual(500);
      expect(item.word_count).toBeLessThan(1500);
    } else if (length === "long") {
      expect(item.word_count).toBeGreaterThanOrEqual(1500);
      expect(item.word_count).toBeLessThan(5000);
    } else expect(item.word_count).toBeGreaterThanOrEqual(5000);
  }
  await expect(
    library.getByRole("button", { name: "Search library", exact: true }),
  ).toBeEnabled();
  const empty = await searchLibrary(page, `shepherd-no-match-${Date.now()}`);
  expect(empty.total).toBe(0);
  await expect(library.getByText(/No texts match these filters/)).toBeVisible();
  await expect(library.locator(".library-results > article")).toHaveCount(0);
  const clearedResponse = page.waitForResponse(catalogResponse);
  await library
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  const cleared = (await (
    await clearedResponse
  ).json()) as Schema<"SourceCatalogPublic">;
  expect(cleared.total).toBe(catalog.total);
  await expect(query).toHaveValue("");
  for (const name of ["Category", "Length", "Approximate reading level"])
    await expect(
      library.getByRole("combobox", { name, exact: true }),
    ).toHaveValue("");
  await expect(library.locator(".library-results > article")).toHaveCount(12);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    for (const card of await library
      .locator(".library-results > article")
      .all()) {
      const geometry = await card.evaluate((node) => ({
        width: node.clientWidth,
        scrollWidth: node.scrollWidth,
        left: node.getBoundingClientRect().left,
        right: node.getBoundingClientRect().right,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`published-library-${width}.png`),
      fullPage: true,
    });
  }
  expect(page.url()).toBe(initialUrl);
  expect(writes).toEqual([]);
});

test("an explicitly chosen local text becomes the immutable first reading snapshot with its optional reading level", async ({
  page,
}) => {
  const { library } = await openLibrary(page);
  const preferences = page.getByText("Adjust difficulty and guidance", {
    exact: true,
  });
  await expect(preferences).toBeHidden();
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173")
      external.push(request.url());
  });
  const catalog = await searchLibrary(page, "Hare and the Tortoise");
  const item = catalog.items.find((choice) =>
    /Hare and the Tortoise/i.test(choice.title),
  );
  expect(item).toBeDefined();
  await expect(
    page.getByRole("button", { name: "Start learning", exact: true }),
  ).toBeDisabled();
  const importedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/reading/import") &&
      response.request().method() === "POST",
  );
  await library
    .getByRole("article", { name: item!.title, exact: true })
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  const imported = (await (
    await importedResponse
  ).json()) as Schema<"SourceImportPublic">;
  expect(imported.passages).toHaveLength(1);
  let preview = imported.passages[0]!;
  const selected = library.getByRole("region", {
    name: "Selected text",
    exact: true,
  });
  await expect(
    selected.getByLabel("Reading passage", { exact: true }),
  ).toHaveText(preview.passage.text);
  const browser = library.locator(":scope > .library-browser");
  await expect(browser).not.toHaveAttribute("open");
  await expect(
    selected.getByRole("heading", { name: "Selected text", exact: true }),
  ).toBeFocused();
  await expect(preferences).toBeVisible();
  await expect(
    library.getByRole("button", { name: "Search library", exact: true }),
  ).toBeHidden();
  const selectedBox = await selected.boundingBox();
  const browseBox = await browser.boundingBox();
  expect(selectedBox!.y + selectedBox!.height).toBeLessThanOrEqual(
    browseBox!.y,
  );
  const preferencesBox = await preferences.boundingBox();
  expect(browseBox!.y + browseBox!.height).toBeLessThanOrEqual(
    preferencesBox!.y,
  );
  await browser.locator(":scope > summary").focus();
  await page.keyboard.press("Tab");
  await expect(preferences).toBeFocused();
  const start = page.getByRole("button", {
    name: "Start learning",
    exact: true,
  });
  await start.scrollIntoViewIfNeeded();
  await expect(start).toBeInViewport();
  const compactHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await openBrowse(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeGreaterThan(compactHeight);
  await expect(selected).toBeVisible();
  await expect(
    library.getByRole("searchbox", { name: "Search texts", exact: true }),
  ).toHaveValue("Hare and the Tortoise");
  await browser.locator(":scope > summary").click();
  const topic = page.getByRole("textbox", {
    name: "What are you working on?",
    exact: true,
  });
  await expect(topic).toHaveValue(preview.passage.title);
  await topic.fill("Reading: compare a character's words with actions");
  await openLearningPreferences(page);
  await expect(
    page.getByRole("combobox", { name: "Reading level", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Reading level", exact: true })
    .selectOption("grades_6_8");
  const subject = page.getByRole("combobox", {
    name: "Subject for this level",
    exact: true,
  });
  await subject.selectOption("other");
  await page
    .getByRole("textbox", { name: "Course or level", exact: true })
    .fill("Synthetic course draft retained while choosing a text");
  await subject.selectOption("reading");
  const difficulty = page.getByRole("combobox", {
    name: "How challenging should it be?",
    exact: true,
  });
  const guidance = page.getByRole("combobox", {
    name: "How much guidance would you like?",
    exact: true,
  });
  await difficulty.selectOption("challenge");
  await guidance.selectOption("learner_led");
  await selected
    .getByRole("button", { name: "Remove selected text", exact: true })
    .click();
  await expect(preferences).toBeHidden();
  await expect(start).toBeDisabled();
  await expect(browser.locator(":scope > summary")).toBeFocused();
  const reselected = page.waitForResponse(
    (response) =>
      response.url().endsWith("/reading/import") &&
      response.request().method() === "POST",
  );
  await library
    .getByRole("article", { name: item!.title, exact: true })
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  preview = ((await (await reselected).json()) as Schema<"SourceImportPublic">)
    .passages[0]!;
  await expect(preferences).toBeVisible();
  await expect(preferences.locator("..")).toHaveAttribute("open");
  await expect(difficulty).toHaveValue("challenge");
  await expect(guidance).toHaveValue("learner_led");
  await expect(subject).toHaveValue("reading");
  await expect(
    page.getByRole("combobox", { name: "Reading level", exact: true }),
  ).toHaveValue("grades_6_8");
  await subject.selectOption("other");
  await expect(
    page.getByRole("textbox", { name: "Course or level", exact: true }),
  ).toHaveValue("Synthetic course draft retained while choosing a text");
  await subject.selectOption("reading");
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
  expect(response.request().postDataJSON()).toMatchObject({
    learning_intent: "read",
    difficulty: "challenge",
    initiative: "learner_led",
    learning_level: { subject: "reading", level: "grades_6_8" },
    initial_activity: {
      source: "published",
      source_token: preview.source_token,
    },
  });
  await expect(
    page.getByLabel("Your work or question", { exact: true }),
  ).toBeEditable();
  let saved = await currentSession(page);
  expect(saved.problems).toHaveLength(1);
  expect(saved.learning_level).toEqual({
    subject: "reading",
    level: "grades_6_8",
  });
  expect(saved.problems[0]?.passage).toEqual(preview.passage);
  const text = page.locator(".tutor-sidebar > .reading-passage .passage-text");
  await expect(text).toHaveText(saved.problems[0]!.material_focus!.text);
  await page.reload();
  await expect(text).toHaveText(saved.problems[0]!.material_focus!.text);
  await navigate(page, "History");
  await page
    .getByRole("button", { name: "Continue session", exact: true })
    .click();
  let settings = await openSettings(page);
  await expect(
    settings.getByRole("combobox", { name: "Reading level", exact: true }),
  ).toHaveValue("grades_6_8");
  await settings
    .getByRole("combobox", { name: "Subject for this level", exact: true })
    .selectOption("");
  await saveSettings(page);
  saved = await currentSession(page);
  expect(saved.learning_level).toBeNull();
  expect(saved.problems[0]?.passage).toEqual(preview.passage);
  await page.reload();
  settings = await openSettings(page);
  await expect(
    settings.getByRole("combobox", { name: "Reading level", exact: true }),
  ).toHaveValue("");
  expect(external).toEqual([]);
});

test("math and course levels remain optional, retain drafts and persist explicit changes and clearing", async ({
  page,
}) => {
  await login(page);
  await createLearner(page);
  await page
    .getByLabel("What are you working on?", { exact: true })
    .fill("Math: equivalent fractions");
  await openLearningPreferences(page);
  const subject = page.getByRole("combobox", {
    name: "Subject for this level",
    exact: true,
  });
  await expect(subject).toHaveValue("");
  await subject.selectOption("math");
  await page
    .getByRole("combobox", { name: "Math grade or course", exact: true })
    .selectOption("grade_5");
  await subject.selectOption("reading");
  await page
    .getByRole("combobox", { name: "Reading level", exact: true })
    .selectOption("grades_3_5");
  await subject.selectOption("other");
  await page
    .getByRole("textbox", { name: "Course or level", exact: true })
    .fill("Keep my course draft");
  await subject.selectOption("math");
  await expect(
    page.getByRole("combobox", { name: "Math grade or course", exact: true }),
  ).toHaveValue("grade_5");
  await page
    .getByRole("combobox", {
      name: "How challenging should it be?",
      exact: true,
    })
    .selectOption("introductory");
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
  expect(response.request().postDataJSON()).toMatchObject({
    learning_level: { subject: "math", level: "grade_5" },
    difficulty: "introductory",
  });
  await expect(
    page.getByLabel("Your work or question", { exact: true }),
  ).toBeEditable();
  await expect(
    page.getByText("Saved automatically · Challenge: Start with the basics", {
      exact: true,
    }),
  ).toBeVisible();
  let settings = await openSettings(page);
  await expect(
    settings.getByRole("combobox", {
      name: "Math grade or course",
      exact: true,
    }),
  ).toHaveValue("grade_5");
  await settings
    .getByRole("combobox", { name: "Math grade or course", exact: true })
    .selectOption("algebra_1");
  await saveSettings(page);
  expect((await currentSession(page)).learning_level).toEqual({
    subject: "math",
    level: "algebra_1",
  });
  settings = await openSettings(page);
  await settings
    .getByRole("combobox", { name: "Subject for this level", exact: true })
    .selectOption("other");
  await settings
    .getByRole("textbox", { name: "Course or level", exact: true })
    .fill("  Introductory statistics  ");
  await navigate(page, "Help");
  await navigate(page, "Practice");
  settings = await openSettings(page);
  await expect(
    settings.getByRole("textbox", { name: "Course or level", exact: true }),
  ).toHaveValue("  Introductory statistics  ");
  await saveSettings(page);
  expect((await currentSession(page)).learning_level).toEqual({
    subject: "other",
    level: "Introductory statistics",
  });
  await page.reload();
  settings = await openSettings(page);
  await expect(
    settings.getByRole("textbox", { name: "Course or level", exact: true }),
  ).toHaveValue("Introductory statistics");
  await settings
    .getByRole("combobox", { name: "Subject for this level", exact: true })
    .selectOption("");
  await saveSettings(page);
  expect((await currentSession(page)).learning_level).toBeNull();
  await page.reload();
  settings = await openSettings(page);
  await expect(
    settings.getByRole("combobox", {
      name: "Subject for this level",
      exact: true,
    }),
  ).toHaveValue("");
  await expect(
    settings.getByRole("combobox", {
      name: "Math grade or course",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("failed local searches and explicitly requested NASA retrieval preserve the selected local preview", async ({
  page,
}) => {
  const { library } = await openLibrary(page);
  const searched = await searchLibrary(page, "Hare and the Tortoise");
  const item = searched.items.find((choice) =>
    /Hare and the Tortoise/i.test(choice.title),
  )!;
  const imported = page.waitForResponse(
    (response) =>
      response.url().endsWith("/reading/import") &&
      response.request().method() === "POST",
  );
  await library
    .getByRole("article", { name: item.title, exact: true })
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  const preview = (
    (await (await imported).json()) as Schema<"SourceImportPublic">
  ).passages[0]!;
  const selected = library.getByRole("region", {
    name: "Selected text",
    exact: true,
  });
  await expect(
    selected.getByLabel("Reading passage", { exact: true }),
  ).toHaveText(preview.passage.text);
  await openBrowse(page);
  let failSearch = true;
  await page.route(/\/api\/v1\/reading\/sources\?/, async (route) => {
    if (failSearch) {
      failSearch = false;
      await route.fulfill({
        status: 503,
        json: { detail: "Synthetic local search outage." },
      });
    } else await route.continue();
  });
  await library
    .getByRole("searchbox", { name: "Search texts", exact: true })
    .fill("Aesop");
  await library
    .getByRole("button", { name: "Search library", exact: true })
    .click();
  await expect(library.getByRole("alert")).toContainText(
    "Your selected text is still here",
  );
  await expect(
    page.getByText("Adjust difficulty and guidance", { exact: true }),
  ).toBeVisible();
  await expect(library.locator(":scope > .library-browser")).toHaveAttribute(
    "open",
  );
  await expect(
    selected.getByLabel("Reading passage", { exact: true }),
  ).toHaveText(preview.passage.text);
  const retried = page.waitForResponse(catalogResponse);
  await library
    .getByRole("button", { name: "Retry library search", exact: true })
    .click();
  expect((await retried).status()).toBe(200);
  await expect(library.getByRole("alert")).toHaveCount(0);
  let nasaRequests = 0;
  await page.route("**/api/v1/reading/import", async (route) => {
    if (
      (route.request().postDataJSON() as { source_id?: string }).source_id ===
      "nasa_news"
    ) {
      nasaRequests += 1;
      await route.fulfill({
        status: 502,
        json: { detail: "Synthetic NASA outage." },
      });
    } else await route.continue();
  });
  await library.getByText("Live NASA news", { exact: true }).click();
  expect(nasaRequests).toBe(0);
  await library
    .getByRole("button", { name: "Load NASA news", exact: true })
    .click();
  await expect(library.getByRole("alert")).toContainText(
    "NASA news could not be loaded",
  );
  expect(nasaRequests).toBe(1);
  await expect(
    selected.getByLabel("Reading passage", { exact: true }),
  ).toHaveText(preview.passage.text);
  await expect(
    page.getByRole("button", { name: "Start learning", exact: true }),
  ).toBeEnabled();
});
