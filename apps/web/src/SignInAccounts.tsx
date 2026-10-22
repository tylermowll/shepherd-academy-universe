import { useEffect, useRef, useState } from "react";
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
  const [login, setLogin] = useState("");
  const input = useRef<HTMLInputElement>(null);
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
      <fieldset disabled={disabled}>
        <legend>Choose an account</legend>
        {failed ? (
          <p role="status">
            Could not load account names. Enter your username below or{" "}
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Reload account list
            </button>
            .
          </p>
        ) : accounts === null ? (
          <p role="status">Loading account names…</p>
        ) : accounts.length === 0 ? (
          <p>
            No {role === "adult" ? "administrator" : "learner"} accounts are
            ready to sign in.
          </p>
        ) : (
          <ul className="account-list">
            {accounts.map((account) => (
              <li key={account.login_name}>
                <button
                  type="button"
                  aria-pressed={login === account.login_name}
                  onClick={() => {
                    setLogin(account.login_name);
                    input.current?.form
                      ?.querySelector<HTMLInputElement>(
                        'input[name="password"]',
                      )
                      ?.focus();
                  }}
                >
                  {account.login_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <label>
        Username
        <input
          ref={input}
          name="login"
          autoComplete="username"
          required
          maxLength={64}
          disabled={disabled}
          value={login}
          onChange={(event) => setLogin(event.target.value)}
        />
      </label>
    </>
  );
}
