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
    "uses one %s account selector and submits only the chosen username",
    async (role) => {
      const fetcher = vi.fn(() =>
        Promise.resolve(
          response([
            { login_name: "River", role },
            { login_name: "Sky", role },
          ]),
        ),
      );
      vi.stubGlobal("fetch", fetcher);
      render(
        <form aria-label="Sign in">
          <SignInAccounts role={role} ready disabled={false} />
          <label>
            Password
            <input name="password" type="password" />
          </label>
        </form>,
      );
      await screen.findByRole("option", { name: "River" });
      const account = screen.getByRole("combobox", { name: "Account" });
      account.focus();
      fireEvent.change(account, { target: { value: "Sky" } });
      expect(fetcher).toHaveBeenCalledWith(
        `/api/v1/auth/accounts?role=${role}`,
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(screen.queryByLabelText("Username")).toBeNull();
      expect(account).toHaveAttribute("autocomplete", "username");
      expect(account).toHaveFocus();
      expect(account).toHaveValue("Sky");
      const form = screen.getByRole<HTMLFormElement>("form", {
        name: "Sign in",
      });
      expect(new FormData(form).getAll("login")).toEqual(["Sky"]);
    },
  );
  it("requires an account while its directory is loading or empty", async () => {
    let finish!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<SignInAccounts role="learner" ready disabled={false} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading account names",
    );
    expect(screen.getByRole("combobox", { name: "Account" })).toBeInvalid();
    expect(screen.queryByLabelText("Username")).toBeNull();
    await act(async () => {
      finish(response([]));
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ask your administrator to create your learner account.",
    );
    expect(screen.getByRole("combobox", { name: "Account" })).toBeInvalid();
    expect(screen.queryByLabelText("Username")).toBeNull();
  });
  it("offers manual username entry only after loading fails and preserves a matching username on retry", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(
        response([{ login_name: "River", role: "learner" }]),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<SignInAccounts role="learner" ready disabled={false} />);
    const username = await screen.findByLabelText("Username");
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.change(username, { target: { value: "River" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Could not load account names. Enter your username",
    );
    expect(username).toHaveAttribute("autocomplete", "username");
    fireEvent.click(
      screen.getByRole("button", { name: "Reload account list" }),
    );
    await screen.findByRole("option", { name: "River" });
    expect(screen.getByRole("combobox", { name: "Account" })).toHaveValue(
      "River",
    );
    expect(screen.queryByLabelText("Username")).toBeNull();
  });
  it("requires a listed account after retry rather than submitting an unlisted manual username", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(
        response([{ login_name: "River", role: "learner" }]),
      );
    vi.stubGlobal("fetch", fetcher);
    render(
      <form aria-label="Sign in">
        <SignInAccounts role="learner" ready disabled={false} />
      </form>,
    );
    fireEvent.change(await screen.findByLabelText("Username"), {
      target: { value: "unlisted-account" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Reload account list" }),
    );
    await screen.findByRole("option", { name: "River" });
    const account = screen.getByRole("combobox", { name: "Account" });
    expect(account).toHaveValue("");
    expect(account).toBeInvalid();
    const form = screen.getByRole<HTMLFormElement>("form", {
      name: "Sign in",
    });
    expect(new FormData(form).getAll("login")).toEqual([""]);
  });
  it("waits for session bootstrap and discards a previous role's delayed list and selection", async () => {
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
    await screen.findByRole("option", { name: "home-admin" });
    await act(async () => {
      finish(response([{ login_name: "River", role: "learner" }]));
      await Promise.resolve();
    });
    expect(screen.queryByRole("option", { name: "River" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Account" })).toHaveValue("");
    fireEvent.change(screen.getByRole("combobox", { name: "Account" }), {
      target: { value: "home-admin" },
    });
    view.rerender(<SignInAccounts role="learner" ready disabled={false} />);
    expect(screen.getByRole("combobox", { name: "Account" })).toHaveValue("");
  });
  it("disables the credential control during sign-in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(response([{ login_name: "River", role: "learner" }])),
      ),
    );
    render(<SignInAccounts role="learner" ready disabled />);
    await screen.findByRole("option", { name: "River" });
    expect(screen.getByRole("combobox", { name: "Account" })).toBeDisabled();
  });
});
