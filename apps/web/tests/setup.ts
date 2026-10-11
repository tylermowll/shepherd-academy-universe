import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node's native storage globals can shadow jsdom's browser storage.
const domWindow = (
  globalThis as typeof globalThis & { jsdom: { window: Window } }
).jsdom.window;
Object.defineProperties(globalThis, {
  localStorage: {
    configurable: true,
    writable: true,
    value: domWindow.localStorage,
  },
  sessionStorage: {
    configurable: true,
    writable: true,
    value: domWindow.sessionStorage,
  },
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});
