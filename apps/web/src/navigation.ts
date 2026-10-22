import type { MouseEvent } from "react";

export type Page = "practice" | "history" | "learners" | "settings" | "help";
export type Navigate = (page: Page, help?: string) => void;
export type SignInRole = "adult" | "learner";

export function pageUrl(page: Page, help?: string, entryRole?: SignInRole) {
  const url = new URL(window.location.href);
  url.searchParams.set("page", page);
  if (entryRole) url.searchParams.set("signin", entryRole);
  else url.searchParams.delete("signin");
  if (page === "help" && help) url.searchParams.set("help", help);
  else url.searchParams.delete("help");
  return url.pathname + url.search + url.hash;
}

export function signInUrl(role: SignInRole) {
  const url = new URL(
    pageUrl(role === "adult" ? "learners" : "practice"),
    window.location.href,
  );
  url.searchParams.set("signin", role);
  return url.pathname + url.search + url.hash;
}

export function followPage(
  event: MouseEvent<HTMLAnchorElement>,
  navigate: Navigate,
  page: Page,
  help?: string,
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  navigate(page, help);
}
