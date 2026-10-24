import { useEffect, useId, useState } from "react";
import { api, type Schema } from "./client";
import type { SignInRole } from "./navigation";

export function SignInAccounts({
  role,
  ready,
  disabled,
}: {
  role: SignInRole;
  ready: boolean;
  disabled: boolean;
}) {
  const [result, setResult] = useState<{
    key: string;
    accounts: Schema<"SignInAccount">[] | null;
    failed: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState({ role, login: "" });
  const login = selection.role === role ? selection.login : "";
  const statusId = useId();
  const requestKey = `${role}:${ready}:${attempt}`;
  const accounts = result?.key === requestKey ? result.accounts : null;
  const failed = result?.key === requestKey && result.failed;
  useEffect(() => {
    let current = true;
    if (ready)
      void api<Schema<"SignInAccount">[]>(`/auth/accounts?role=${role}`).then(
        (rows) => {
          if (current)
            setResult({ key: requestKey, accounts: rows, failed: false });
        },
        () => {
          if (current)
            setResult({ key: requestKey, accounts: null, failed: true });
        },
      );
    return () => {
      current = false;
    };
  }, [role, ready, requestKey]);
  return (
    <>
      {failed ? (
        <>
          <p id={statusId} role="status">
            Could not load account names. Enter your username or{" "}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Reload account list
            </button>
            .
          </p>
          <label>
            Username
            <input
              name="login"
              autoComplete="username"
              aria-describedby={statusId}
              required
              maxLength={64}
              disabled={disabled}
              value={login}
              onChange={(event) =>
                setSelection({ role, login: event.target.value })
              }
            />
          </label>
        </>
      ) : (
        <>
          <label>
            Account
            <select
              name="login"
              autoComplete="username"
              aria-describedby={accounts?.length ? undefined : statusId}
              required
              disabled={disabled}
              value={
                accounts?.some((account) => account.login_name === login)
                  ? login
                  : ""
              }
              onChange={(event) =>
                setSelection({ role, login: event.target.value })
              }
            >
              <option value="" disabled>
                Choose your account
              </option>
              {accounts?.map((account) => (
                <option key={account.login_name} value={account.login_name}>
                  {account.login_name}
                </option>
              ))}
            </select>
          </label>
          {accounts === null ? (
            <p id={statusId} role="status">
              Loading account names…
            </p>
          ) : accounts.length === 0 ? (
            <p id={statusId} role="status">
              No {role === "adult" ? "administrator" : "learner"} accounts are
              ready to sign in.
              {role === "learner" &&
                " Ask your administrator to create your learner account."}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
