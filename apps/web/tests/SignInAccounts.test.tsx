import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInAccounts } from "../src/SignInAccounts";
import { setIdentity } from "../src/client";

const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => setIdentity("synthetic-csrf"));
afterEach(() => vi.unstubAllGlobals());

describe("sign-in account names", () => {
  it.each(["adult", "learner"] as const)(
    "lists the %s names, fills Username and focuses Password",
    async (role) => {
      const fetcher = vi.fn(() =>
        Promise.resolve(response([{ login_name: "River", role }])),
      );
      vi.stubGlobal("fetch", fetcher);
      render(
        <form>
          <SignInAccounts role={role} ready disabled={false} />
          <label>
            Password
            <input name="password" type="password" />
          </label>
        </form>,
      );
      fireEvent.click(await screen.findByRole("button", { name: "River" }));
      expect(fetcher).toHaveBeenCalledWith(
        `/api/v1/auth/accounts?role=${role}`,
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(screen.getByLabelText("Username")).toHaveValue("River");
      expect(screen.getByLabelText("Password")).toHaveFocus();
      expect(screen.getByRole("button", { name: "River" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    },
  );
  it("preserves typed credentials while account loading fails and retries without blocking manual entry", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(
        response([{ login_name: "River", role: "learner" }]),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<SignInAccounts role="learner" ready disabled={false} />);
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "manual-user" },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Could not load account names. Enter your username below",
    );
    expect(screen.getByLabelText("Username")).toHaveValue("manual-user");
    fireEvent.click(
      screen.getByRole("button", { name: "Reload account list" }),
    );
    expect(await screen.findByRole("button", { name: "River" })).toBeVisible();
    expect(screen.getByLabelText("Username")).toHaveValue("manual-user");
  });
  it("waits for session bootstrap and discards a previous role's delayed list", async () => {
    let finish!: (value: Response) => void;
    const fetcher = vi.fn((url: string) =>
      url.endsWith("role=learner")
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(
            response([{ login_name: "home-admin", role: "adult" }]),
          ),
    );
    vi.stubGlobal("fetch", fetcher);
    const view = render(
      <SignInAccounts role="learner" ready={false} disabled={false} />,
    );
    expect(fetcher).not.toHaveBeenCalled();
    view.rerender(<SignInAccounts role="learner" ready disabled={false} />);
    view.rerender(<SignInAccounts role="adult" ready disabled={false} />);
    await screen.findByRole("button", { name: "home-admin" });
    await act(async () => {
      finish(response([{ login_name: "River", role: "learner" }]));
      await Promise.resolve();
    });
    expect(screen.queryByRole("button", { name: "River" })).toBeNull();
    expect(screen.getByRole("button", { name: "home-admin" })).toBeVisible();
  });
});
