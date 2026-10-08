import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UpdateNotice } from "../src/UpdateNotice";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("defers a waiting update while a request or draft needs recovery", async () => {
  vi.stubEnv("PROD", true);
  const worker = { postMessage: vi.fn() };
  vi.stubGlobal("navigator", {
    serviceWorker: {
      register: vi
        .fn()
        .mockResolvedValue({ waiting: worker, addEventListener: vi.fn() }),
      addEventListener: vi.fn(),
    },
  });
  const view = render(
    <UpdateNotice
      deferRefresh
      deferMessage="Recover your pending request before refreshing."
    />,
  );
  await screen.findByText("Recover your pending request before refreshing.");
  expect(
    screen.queryByRole("button", { name: "Refresh when ready" }),
  ).toBeNull();
  expect(worker.postMessage).not.toHaveBeenCalled();
  view.rerender(<UpdateNotice />);
  expect(
    await screen.findByRole("button", { name: "Refresh when ready" }),
  ).toBeEnabled();
});
