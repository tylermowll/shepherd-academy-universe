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
      act={async (action) => action()}
    />
  );
}

beforeEach(() => setIdentity("synthetic-age-edit-csrf", true));
afterEach(() => vi.unstubAllGlobals());

describe("learner passwords on HTTPS", () => {
  it.each(["create", "reset"] as const)(
    "uses a six-character minimum for %s and preserves rejected input until corrected",
    async (operation) => {
      expect(window.location.protocol).toBe("https:");
      const fetcher = vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "POST" || init?.method === "PATCH") {
          const body = JSON.parse(init.body as string) as { password: string };
          return Promise.resolve(
            body.password.length < 6
              ? response(
                  { detail: "Use at least 6 characters for the password." },
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
      expect(password).toHaveAttribute("minlength", "6");
      expect(password).toHaveAttribute("maxlength", "256");
      expect(screen.getByText(/^At least 6 characters\./)).toBeVisible();
      fireEvent.change(screen.getByLabelText("Learner username"), {
        target: { value: learner.alias },
      });
      fireEvent.change(password, { target: { value: "short" } });
      // Submit directly to exercise the backend rejection path as well as the
      // native minlength contract; browser tests cover native form prevention.
      fireEvent.submit(submit.closest("form")!);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Use at least 6 characters for the password.",
      );
      expect(password).toHaveValue("short");
      expect(refresh).not.toHaveBeenCalled();
      fireEvent.change(password, { target: { value: "simple" } });
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
            password: "simple",
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
