import { afterEach, describe, expect, it } from "vitest";
import { pageUrl, roleForPage, signInUrl } from "../src/navigation";

const browser = (
  globalThis as typeof globalThis & {
    jsdom: { reconfigure(options: { url: string }): void };
  }
).jsdom;
const originalUrl = window.location.href;

afterEach(() => browser.reconfigure({ url: originalUrl }));

describe.each([
  "http://localhost:5173/?deployment=local&page=help&signin=adult&help=accounts#tutor=synthetic",
  "https://learn.example.test/household/tutor/?deployment=private&page=settings&signin=learner&help=accounts#tutor=synthetic",
])("deployment-relative navigation at %s", (currentUrl) => {
  it("links both account entries on the current origin and path while preserving unrelated query values", () => {
    browser.reconfigure({ url: currentUrl });
    const current = new URL(currentUrl);

    for (const role of ["adult", "learner"] as const) {
      const target = signInUrl(role);
      const resolved = new URL(target, currentUrl);
      expect(target).toBe(
        `${current.pathname}?deployment=${current.searchParams.get("deployment")}&page=${role === "adult" ? "learners" : "practice"}&signin=${role}#tutor=synthetic`,
      );
      expect(resolved.origin).toBe(current.origin);
      expect(resolved.pathname).toBe(current.pathname);
      expect(resolved.searchParams.get("deployment")).toBe(
        current.searchParams.get("deployment"),
      );
      expect(resolved.searchParams.has("help")).toBe(false);
      expect(target).not.toMatch(/^https?:/);
    }
  });

  it("uses the same deployment for Help topics and removes stale entry selection from ordinary page links", () => {
    browser.reconfigure({ url: currentUrl });
    const current = new URL(currentUrl);
    const help = new URL(pageUrl("help", "phone-setup"), currentUrl);
    expect(help.origin).toBe(current.origin);
    expect(help.pathname).toBe(current.pathname);
    expect(help.searchParams.get("deployment")).toBe(
      current.searchParams.get("deployment"),
    );
    expect(help.searchParams.get("page")).toBe("help");
    expect(help.searchParams.get("help")).toBe("phone-setup");
    expect(help.searchParams.has("signin")).toBe(false);

    const workspace = new URL(pageUrl("practice"), currentUrl);
    expect(workspace.origin).toBe(current.origin);
    expect(workspace.pathname).toBe(current.pathname);
    expect(workspace.searchParams.get("deployment")).toBe(
      current.searchParams.get("deployment"),
    );
    expect(workspace.searchParams.has("signin")).toBe(false);
    expect(workspace.searchParams.has("help")).toBe(false);
  });

  it.each(["adult", "learner"] as const)(
    "keeps the %s reader context for Help and uses the target workspace role for copied inline URLs",
    (role) => {
      browser.reconfigure({ url: currentUrl });
      const current = new URL(currentUrl);

      for (const [page, topic, expectedRole] of [
        ["help", undefined, role],
        ["help", "privacy", role],
        ["help", "practice", role],
        ["practice", undefined, "learner"],
        ["history", undefined, "learner"],
        ["learners", undefined, "adult"],
        ["settings", undefined, "adult"],
      ] as const) {
        const href = pageUrl(page, topic, roleForPage(page) ?? role);
        const resolved = new URL(href, currentUrl);
        expect(resolved.origin).toBe(current.origin);
        expect(resolved.pathname).toBe(current.pathname);
        expect(resolved.searchParams.get("deployment")).toBe(
          current.searchParams.get("deployment"),
        );
        expect(resolved.searchParams.get("page")).toBe(page);
        expect(resolved.searchParams.get("signin")).toBe(expectedRole);
        expect(resolved.searchParams.get("help")).toBe(topic ?? null);
        expect(resolved.hash).toBe(current.hash);
        expect(href).not.toMatch(/^https?:/);
      }
    },
  );
});
