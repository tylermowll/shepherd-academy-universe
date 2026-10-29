import { expect, test, type Page } from "@playwright/test";
import type { Schema } from "../../apps/web/src/client";
import { startTutor } from "./support";

async function savedExchange(page: Page) {
  await startTutor(page, "Synthetic study: connect observations and claims");
  await page
    .getByLabel("Your work or question", { exact: true })
    .fill(
      "The seedling near the window grew taller. I would also compare the water each plant received.",
    );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".tutor-feedback")).toHaveCount(1);
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
    "tutor",
  );
  expect(id).toBeTruthy();
  const response = await page.request.get(`/api/v1/tutor/sessions/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as Schema<"TutoringSessionPublic">;
}

// Rendering-only stress fixtures extend a real saved synthetic session. These
// route responses do not establish provider quality or durable backend behavior;
// the existing tutor/recovery suites exercise the real API and worker loop.
test("long activity, source and guidance remain readable with keyboard revision and progression controls", async ({
  page,
}) => {
  const nativeViewport = page.viewportSize();
  if (!nativeViewport) throw new Error("Browser project has no fixed viewport");
  const fixture = await savedExchange(page);
  const problem = fixture.problems.find((item) => item.status === "assigned");
  if (!problem) throw new Error("Synthetic session has no assigned activity");
  const saved = problem.operations.find((item) => item.feedback);
  if (!saved?.feedback) throw new Error("Synthetic response has no feedback");

  const savedFeedback = saved.feedback;

  problem.problem_text = Array.from(
    { length: 3 },
    (_, index) =>
      `Investigation ${index + 1}: Mira compares two seedlings, one near a window and one in a shaded corner. Explain what her observations can support, what remains uncertain, and which additional comparison would help her test her explanation. Connect each claim to something she actually observed.`,
  ).join("\n\n");
  problem.learning_goal =
    "Explain how observations support a claim while identifying uncertainty.";
  problem.success_criteria = [
    "Describe an observation from each condition.",
    "Connect an observation to a claim in your own words.",
    "Identify a comparison that could change the explanation.",
    "Final response criterion: explain why that comparison would be useful rather than simply listing another measurement.",
  ];
  problem.passage = {
    title: "Synthetic investigation notebook",
    origin: "pasted",
    excerpt: false,
    text: Array.from(
      { length: 20 },
      (_, index) =>
        `Notebook entry ${index + 1}: Mira measured the seedlings each morning. The plant beside the window grew taller, but she had not yet compared the amount of water or the starting heights. Her notebook separated observations from possible explanations. A useful next investigation would keep the other conditions comparable.`,
    ).join("\n\n"),
  };
  problem.material_focus = null;
  problem.operations = [
    ...problem.operations.filter((item) => item.kind === "generation"),
    ...Array.from({ length: 5 }, (_, index): Schema<"OperationPublic"> => ({
      ...saved,
      id: `00000000-0000-4000-8000-00000000000${index}`,
      text:
        index === 4
          ? "Latest independent response: compare the water and starting heights."
          : `Earlier saved response ${index + 1}: I am comparing the observations.`,
      feedback: {
        ...savedFeedback,
        strengths: ["You connected the observation to the comparison."],
        guidance: [
          Array.from(
            { length: index === 4 ? 16 : 2 },
            (_, paragraph) =>
              `Guidance paragraph ${paragraph + 1}: Separate what Mira measured from what she thinks caused the difference. Explain which evidence supports your claim, and acknowledge another explanation when the observations do not distinguish between them.`,
          ).join("\n\n"),
        ],
        next_step:
          "Choose one additional comparison and explain how it would help distinguish the explanations.",
      },
    })),
  ];
  await page.route(`**/api/v1/tutor/sessions/${fixture.id}`, async (route) => {
    if (route.request().method() === "GET")
      await route.fulfill({ json: fixture });
    else await route.continue();
  });
  await page.reload();

  const brief = page.locator(".activity-panel .activity-brief");
  const log = page.getByRole("log", { name: "Learning conversation" });
  const composer = page.getByLabel("Your work or question", { exact: true });
  await expect(brief).toContainText("Investigation 3:");
  await expect(brief).toContainText("Final response criterion:");
  expect(
    await brief.evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
  ).toBe(true);
  const passage = page.locator(".activity-panel .passage-text");
  await expect(passage).toContainText("Notebook entry 20:");
  expect(
    await passage.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  await expect(log.locator(".tutor-feedback")).toHaveCount(5);
  const lastReply = log.locator(".tutor-feedback").last();
  await expect(
    lastReply.getByRole("heading", { name: "What’s working", exact: true }),
  ).toHaveCount(1);
  await expect(
    lastReply.getByRole("heading", { name: "Guidance", exact: true }),
  ).toHaveCount(1);
  await expect(
    lastReply.getByRole("heading", { name: "Try next", exact: true }),
  ).toHaveCount(1);
  await expect(
    lastReply.getByText("AI guidance · Can be mistaken", { exact: true }),
  ).toBeVisible();

  await log.evaluate((node) => {
    node.scrollTop = 0;
    node.dispatchEvent(new Event("scroll"));
  });
  await page
    .getByRole("button", { name: "Latest messages ↓", exact: true })
    .click();
  await expect
    .poll(() =>
      log.evaluate((node) => {
        const latest = node.querySelectorAll(".tutor-operation");
        return (
          latest[latest.length - 1]!.getBoundingClientRect().top -
          node.getBoundingClientRect().top
        );
      }),
    )
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(() =>
      log.evaluate((node) => {
        const latest = node.querySelectorAll(".tutor-operation");
        return (
          latest[latest.length - 1]!.getBoundingClientRect().top -
          node.getBoundingClientRect().top
        );
      }),
    )
    .toBeLessThan(48);

  const routeBefore = page.url();
  await brief.locator("summary").click();
  await expect(brief).not.toHaveAttribute("open");
  await page
    .getByRole("button", { name: "Read activity ↑", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(brief).toHaveAttribute("open", "");
  await expect(brief.locator("summary")).toBeFocused();
  expect(page.url()).toBe(routeBefore);

  const next = page.getByRole("button", { name: "Next activity", exact: true });
  const finish = page.getByRole("button", {
    name: "Finish session",
    exact: true,
  });
  await composer.fill("A revision I have not sent yet.");
  await expect(next).toBeDisabled();
  await expect(finish).toBeDisabled();
  await page.getByRole("button", { name: "Clear draft", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(composer).toHaveValue("");
  await expect(composer).toBeFocused();
  await expect(next).toBeEnabled();
  await expect(finish).toBeEnabled();
  expect(
    await page.locator(".activity-controls").evaluate((node) => {
      const composerNode = document.querySelector(".tutor-response");
      return (
        composerNode !== null &&
        Boolean(
          composerNode.compareDocumentPosition(node) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("long-learning-workspace.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await brief.evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
  ).toBe(true);
  await expect(composer).toBeEditable();
  await page
    .getByRole("button", { name: "Send", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("learning-workspace-320.png"),
    fullPage: true,
  });

  // A compact rendering fixture also records the normal workbench at each
  // project's native viewport, separate from the long-content stress evidence.
  problem.problem_text =
    "Mira’s seedling beside the window grew taller. Explain what this observation supports and which comparison would help her investigate the cause.";
  problem.success_criteria = [
    "Connect your claim to the observation.",
    "Explain why one additional comparison would help.",
  ];
  problem.passage = {
    title: "Synthetic investigation notebook",
    origin: "pasted",
    excerpt: false,
    text: "Mira measured two seedlings each morning. The one beside the window grew taller. She had not yet compared their starting heights or how much water each received.",
  };
  problem.operations = [
    {
      ...saved,
      text: "The seedling by the window grew taller. I would compare how much water each plant received.",
      feedback: {
        ...savedFeedback,
        strengths: [
          "You used an observation and identified a useful comparison.",
        ],
        guidance: [
          "The observation shows a difference in growth. Comparing the water would help you decide whether light alone explains it.",
        ],
        next_step:
          "Explain how you would keep the water comparable in another trial.",
      },
    },
  ];
  await page.setViewportSize(nativeViewport);
  await page.reload();
  await expect(log.locator(".tutor-feedback")).toHaveCount(1);
  await expect(brief).toContainText(
    "Mira’s seedling beside the window grew taller.",
  );
  await page.locator(".tutor-workspace").screenshot({
    path: test.info().outputPath("guidance-workbench.png"),
  });
  if (test.info().project.name.startsWith("mobile")) {
    await page.screenshot({
      path: test.info().outputPath("guidance-workbench-mobile.png"),
      fullPage: true,
    });
  }

  // This checks text resizing through the root font size, not browser zoom.
  // Both native projects must reflow without horizontal page overflow or a
  // clipped activity/composer when text is enlarged to 200%.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await brief.evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
  ).toBe(true);
  await composer.focus();
  await expect(composer).toBeFocused();
  const sendGeometry = await page
    .getByRole("button", { name: "Send", exact: true })
    .evaluate((node) => {
      const chat = node.closest(".chat-column");
      if (!chat) throw new Error("Send has no workbench frame");
      const button = node.getBoundingClientRect();
      const frame = chat.getBoundingClientRect();
      return {
        left: button.left - frame.left,
        right: frame.right - button.right,
        bottom: frame.bottom - button.bottom,
      };
    });
  expect(sendGeometry.left).toBeGreaterThanOrEqual(0);
  expect(sendGeometry.right).toBeGreaterThanOrEqual(0);
  expect(sendGeometry.bottom).toBeGreaterThanOrEqual(0);
});

test("saved pending and failed responses explain their state and retry the same operation once", async ({
  page,
}) => {
  const fixture = await savedExchange(page);
  const problem = fixture.problems.find((item) => item.status === "assigned");
  if (!problem) throw new Error("Synthetic session has no assigned activity");
  const operation = problem.operations.find((item) => item.feedback);
  if (!operation) throw new Error("Synthetic session has no saved response");
  operation.status = "tutoring";
  operation.feedback = null;
  operation.message = null;
  operation.reading = null;
  operation.interpretation = null;
  operation.safe_error = null;
  operation.retryable = false;
  await page.route(`**/api/v1/tutor/sessions/${fixture.id}`, async (route) => {
    if (route.request().method() === "GET")
      await route.fulfill({ json: fixture });
    else await route.continue();
  });
  await page.reload();
  const log = page.getByRole("log", { name: "Learning conversation" });
  await expect(log.getByRole("status")).toHaveText(
    "Preparing guidance on your work…",
  );
  await expect(
    page.getByLabel("Your work or question", { exact: true }),
  ).not.toBeEditable();
  await expect(
    page.getByRole("button", { name: "Next activity", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Finish session", exact: true }),
  ).toBeDisabled();
  await expect(
    log.getByRole("button", { name: "Stop response", exact: true }),
  ).toBeEnabled();
  await page
    .locator(".chat-column")
    .screenshot({ path: test.info().outputPath("saved-response-pending.png") });

  operation.status = "failed";
  operation.safe_error =
    "The synthetic tutor is temporarily unavailable. Try this saved response again.";
  operation.retryable = true;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(log).toContainText(operation.safe_error);
  await expect(log).toContainText(
    "Your submitted work is still saved in this conversation.",
  );
  const retry = log.getByRole("button", {
    name: "Retry tutor response",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await expect(
    page.getByLabel("Your work or question", { exact: true }),
  ).toBeEditable();
  await page
    .locator(".chat-column")
    .screenshot({ path: test.info().outputPath("saved-response-error.png") });

  let retries = 0;
  await page.route(
    `**/api/v1/operations/${operation.id}/retry`,
    async (route) => {
      expect(route.request().method()).toBe("POST");
      retries += 1;
      operation.status = "queued";
      operation.safe_error = null;
      operation.retryable = false;
      await route.fulfill({ status: 202, json: operation });
    },
  );
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(log.getByRole("status")).toHaveText(
    "Request saved. Waiting for the tutor…",
  );
  await expect(retry).toHaveCount(0);
  await expect(
    log.getByRole("button", { name: "Stop response", exact: true }),
  ).toBeEnabled();
  expect(retries).toBe(1);
});
