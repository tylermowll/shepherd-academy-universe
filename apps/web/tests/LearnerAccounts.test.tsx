// @vitest-environment-options {"url":"https://academy.invalid/"}
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LearnerAccounts } from "../src/LearnerAccounts";
import { setIdentity, type Schema } from "../src/client";

const learner: Schema<"LearnerPublic"> = {
  id: "4a15f6fc-8866-468e-801c-1faedc9ae88b",
  alias: "River",
  eligibility: "adult",
  enabled: true,
  has_password: true,
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function Accounts({
  refresh,
}: {
  refresh: () => Promise<Schema<"LearnerPublic">>;
}) {
  const [savedLearner, setSavedLearner] = useState(learner);
  return (
    <LearnerAccounts
      learner={savedLearner.id}
      learners={[savedLearner]}
      onLearner={vi.fn()}
      onRefresh={async () => setSavedLearner(await refresh())}
      administrator="home-admin"
      onSessionChange={vi.fn()}
      act={async (action) => action()}
    />
  );
}

beforeEach(() => setIdentity("synthetic-age-edit-csrf", true));
afterEach(() => vi.unstubAllGlobals());

describe("learner account management", () => {
  it("labels account selection as management and leaves sign-in to the learner", () => {
    const fetcher = vi.fn(() => Promise.resolve(response([])));
    vi.stubGlobal("fetch", fetcher);
    const choose = vi.fn();
    render(
      <LearnerAccounts
        learner=""
        learners={[learner]}
        onLearner={choose}
        onRefresh={() => Promise.resolve()}
        administrator="home-admin"
        onSessionChange={vi.fn()}
        act={async (action) => action()}
      />,
    );

    const manage = screen.getByRole("button", {
      name: "River Manage account",
    });
    expect(manage).toHaveTextContent("Manage account");
    fireEvent.click(manage);

    expect(choose).toHaveBeenCalledExactlyOnceWith(learner.id);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["create", "credentials", "age", "delete"] as const)(
    "keeps the confirmed %s outcome and blocks another write until the account list refreshes",
    async (operation) => {
      const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(response(init?.method === "GET" ? [] : learner)),
      );
      vi.stubGlobal("fetch", fetcher);
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const refresh = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new TypeError("Synthetic refresh unavailable"))
        .mockRejectedValueOnce(
          new TypeError("Synthetic refresh still unavailable"),
        )
        .mockResolvedValueOnce();
      const choose = vi.fn();
      render(
        <LearnerAccounts
          learner={operation === "create" ? "" : learner.id}
          learners={operation === "create" ? [] : [learner]}
          onLearner={choose}
          onRefresh={refresh}
          administrator="home-admin"
          onSessionChange={vi.fn()}
          act={async (action) => action()}
        />,
      );
      const action = screen.getByRole("button", {
        name: {
          create: "Create learner account",
          credentials: "Save sign-in details",
          age: "Save age group",
          delete: "Delete learner",
        }[operation],
      });
      if (operation === "create" || operation === "credentials") {
        fireEvent.change(screen.getByLabelText("Learner username"), {
          target: { value: "Synthetic updated River" },
        });
        fireEvent.change(
          screen.getByLabelText(
            operation === "create" ? "Password" : "New password",
          ),
          {
            target: { value: "synthetic-new-password" },
          },
        );
      } else if (operation === "age")
        fireEvent.change(screen.getByLabelText("Age group"), {
          target: { value: "minor" },
        });
      fireEvent.click(action);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "This change was saved, but the account list could not refresh. Refresh accounts to continue.",
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        {
          create: "Learner account created.",
          credentials:
            "Password changed. This learner's browsers are signed out.",
          age: "Age group saved. Pending requests were stopped; saved work is kept.",
          delete: "Learner account deleted.",
        }[operation],
      );
      expect(action).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Add learner account" }),
      ).toBeDisabled();
      if (operation === "create" || operation === "credentials")
        expect(
          screen.getByLabelText(
            operation === "create" ? "Password" : "New password",
          ),
        ).toHaveValue("");
      if (operation === "delete") fireEvent.click(action);
      else fireEvent.submit(action.closest("form")!);
      const writes = () =>
        fetcher.mock.calls.filter(([, init]) => init?.method !== "GET");
      expect(writes()).toHaveLength(1);
      expect(choose).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Refresh accounts" }));
      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This change was saved",
      );
      await vi.waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Refresh accounts" }),
        ).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole("button", { name: "Refresh accounts" }));
      await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      expect(refresh).toHaveBeenCalledTimes(3);
      expect(writes()).toHaveLength(1);
      if (operation === "create" || operation === "delete")
        expect(choose).toHaveBeenCalledExactlyOnceWith(
          operation === "create" ? learner.id : "",
        );
      else expect(action).toBeEnabled();
    },
  );
});

describe("learner passwords on HTTPS", () => {
  it.each(["create", "reset"] as const)(
    "uses a three-character minimum for %s and preserves rejected input until corrected",
    async (operation) => {
      expect(window.location.protocol).toBe("https:");
      const fetcher = vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "POST" || init?.method === "PATCH") {
          const body = JSON.parse(init.body as string) as { password: string };
          return Promise.resolve(
            body.password.length < 3
              ? response(
                  { detail: "Use at least 3 characters for the password." },
                  422,
                )
              : response(learner),
          );
        }
        return Promise.resolve(response([]));
      });
      vi.stubGlobal("fetch", fetcher);
      const refresh = vi.fn(() => Promise.resolve());
      const choose = vi.fn();
      render(
        <LearnerAccounts
          learner={operation === "reset" ? learner.id : ""}
          learners={operation === "reset" ? [learner] : []}
          onLearner={choose}
          onRefresh={refresh}
          administrator="home-admin"
          onSessionChange={vi.fn()}
          act={async (action) => action()}
        />,
      );
      const password = screen.getByLabelText(
        operation === "create" ? "Password" : "New password",
      );
      const submit = screen.getByRole("button", {
        name:
          operation === "create"
            ? "Create learner account"
            : "Save sign-in details",
      });
      expect(password).toHaveAttribute("minlength", "3");
      expect(password).toHaveAttribute("maxlength", "256");
      expect(screen.getByText(/^At least 3 characters\./)).toBeVisible();
      fireEvent.change(screen.getByLabelText("Learner username"), {
        target: { value: learner.alias },
      });
      fireEvent.change(password, { target: { value: "12" } });
      // Submit directly to exercise the backend rejection path as well as the
      // native minlength contract; browser tests cover native form prevention.
      fireEvent.submit(submit.closest("form")!);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Use at least 3 characters for the password.",
      );
      expect(password).toHaveValue("12");
      expect(refresh).not.toHaveBeenCalled();
      fireEvent.change(password, { target: { value: "123" } });
      fireEvent.click(submit);
      await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(password).toHaveValue("");
      expect(screen.queryByRole("alert")).toBeNull();
      const writes = fetcher.mock.calls.filter(
        ([, init]) => init?.method === "POST" || init?.method === "PATCH",
      );
      expect(writes).toHaveLength(2);
      expect(writes[1]).toEqual([
        operation === "create"
          ? "/api/v1/admin/learners"
          : `/api/v1/admin/learners/${learner.id}/account`,
        expect.objectContaining({
          method: operation === "create" ? "POST" : "PATCH",
          body: JSON.stringify({
            alias: learner.alias,
            password: "123",
            ...(operation === "create" ? { eligibility: "unknown" } : {}),
          }),
        }),
      ]);
      if (operation === "create")
        expect(choose).toHaveBeenCalledWith(learner.id);
      else
        expect(screen.getByRole("status")).toHaveTextContent(
          "Password changed. This learner's browsers are signed out.",
        );
    },
  );
});

describe("administrator age-group correction", () => {
  it.each(["minor", "unknown"] as const)(
    "saves %s on the same account, updates its displayed age and explains pending work",
    async (eligibility) => {
      const updated = { ...learner, eligibility };
      const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(response(init?.method === "PATCH" ? updated : [])),
      );
      vi.stubGlobal("fetch", fetcher);
      const refresh = vi.fn(() => Promise.resolve(updated));
      render(<Accounts refresh={refresh} />);
      expect(screen.getByLabelText("Age group")).toHaveValue("adult");
      expect(
        screen.getByText(
          /A request already sent to a provider cannot be recalled/,
        ),
      ).toBeVisible();
      fireEvent.change(screen.getByLabelText("Age group"), {
        target: { value: eligibility },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save age group" }));
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Age group saved. Pending requests were stopped; saved work is kept. New requests use this age group.",
      );
      expect(fetcher).toHaveBeenCalledWith(
        `/api/v1/admin/learners/${learner.id}/account`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ alias: learner.alias, eligibility }),
        }),
      );
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("Age group")).toHaveValue(eligibility);
      expect(screen.getByLabelText("New password")).toHaveValue("");
      expect(screen.getByText(/^Age group:/)).toHaveTextContent(
        eligibility === "minor" ? "Under 18" : "Not specified",
      );
    },
  );

  it("does not claim pending requests stopped when the age group is unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(response(init?.method === "PATCH" ? learner : [])),
      ),
    );
    render(<Accounts refresh={() => Promise.resolve(learner)} />);
    fireEvent.click(screen.getByRole("button", { name: "Save age group" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Age group saved.",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("were stopped");
  });

  it("preserves the proposed correction and reports a rejected save without claiming success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          init?.method === "PATCH"
            ? response({ detail: "Adult access required." }, 403)
            : response([]),
        ),
      ),
    );
    const refresh = vi.fn(() => Promise.resolve(learner));
    render(<Accounts refresh={refresh} />);
    fireEvent.change(screen.getByLabelText("Age group"), {
      target: { value: "minor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save age group" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Adult access required.",
    );
    expect(screen.getByLabelText("Age group")).toHaveValue("minor");
    expect(screen.queryByRole("status")).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });
});
