import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdministratorAccount } from "../src/AdministratorAccount";
import { setIdentity, type Schema } from "../src/client";

const session: Schema<"SessionStatus"> = {
  authenticated: true,
  csrf_token: "synthetic-rotated-csrf",
  login_name: "home-admin",
  role: "adult",
  setup_required: false,
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => setIdentity("synthetic-original-csrf", true));
afterEach(() => vi.unstubAllGlobals());
function mount() {
  const onSessionChange = vi.fn();
  const view = render(
    <AdministratorAccount
      loginName="home-admin"
      onSessionChange={onSessionChange}
      act={async (action) => action()}
    />,
  );
  return { ...view, onSessionChange };
}
function fill(password = "123", confirmation = password) {
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "old" },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirmation },
  });
}
describe("administrator password change", () => {
  it("submits the current password with a three-character password, applies the rotated session and clears inputs", async () => {
    const fetcher = vi.fn(() => Promise.resolve(response(session)));
    vi.stubGlobal("fetch", fetcher);
    const { onSessionChange } = mount();
    fill();
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "minlength",
      "3",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Change administrator password" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Administrator password changed. Other administrator browsers are signed out.",
    );
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/auth/password",
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-CSRF-Token": "synthetic-original-csrf",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: "old",
          new_password: "123",
          password_confirmation: "123",
        }),
      }),
    );
    expect(onSessionChange).toHaveBeenCalledExactlyOnceWith(session);
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });
  it("shows the three-character minimum and rejects a mismatched confirmation without a mutation", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    mount();
    fill("12");
    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "minlength",
      "3",
    );
    fill("123", "different");
    fireEvent.click(
      screen.getByRole("button", { name: "Change administrator password" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The new passwords do not match.",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves input and the signed-in account after an incorrect current password", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          response({ detail: "Current password is incorrect." }, 403),
        ),
      ),
    );
    const { onSessionChange } = mount();
    fill();
    fireEvent.click(
      screen.getByRole("button", { name: "Change administrator password" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Current password is incorrect.",
    );
    expect(screen.getByLabelText("Current password")).toHaveValue("old");
    expect(screen.getByLabelText("New password")).toHaveValue("123");
    expect(onSessionChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Change administrator password" }),
    ).toBeEnabled();
  });
  it("applies the rotated session even if navigation unmounts the form while saving", async () => {
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
    const { onSessionChange, unmount } = mount();
    fill();
    fireEvent.click(
      screen.getByRole("button", { name: "Change administrator password" }),
    );
    unmount();
    await act(async () => {
      finish(response(session));
      await Promise.resolve();
    });
    expect(onSessionChange).toHaveBeenCalledExactlyOnceWith(session);
  });
});
