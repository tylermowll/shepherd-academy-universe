import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Schema } from "./client";

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export function AdministratorAccount({
  loginName,
  onSessionChange,
  act,
}: {
  loginName: string;
  onSessionChange: (session: Schema<"SessionStatus">) => void;
  act: (action: () => Promise<void>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <section className="card" aria-label="Administrator account">
      <h2>{loginName}</h2>
      <p>Administrator account</p>
      <p>
        Change your password here. Other administrator browsers will be signed
        out.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success-notice">
          {message}
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          const form = event.currentTarget;
          const data = new FormData(form);
          const currentPassword = field(data, "current_password");
          const password = field(data, "new_password");
          const confirmation = field(data, "password_confirmation");
          setError("");
          setMessage("");
          if (password !== confirmation) {
            setError("The new passwords do not match.");
            return;
          }
          setBusy(true);
          void act(async () => {
            try {
              const session = await api<Schema<"SessionStatus">>(
                "/auth/password",
                "POST",
                {
                  current_password: currentPassword,
                  new_password: password,
                  password_confirmation: confirmation,
                } satisfies Schema<"PasswordChangeRequest">,
              );
              onSessionChange(session);
              if (!mounted.current) return;
              form.reset();
              setMessage(
                "Administrator password changed. Other administrator browsers are signed out.",
              );
            } catch (cause) {
              if (mounted.current)
                setError(
                  cause instanceof ApiError
                    ? cause.message
                    : "The password change was not confirmed. Check your connection and try again.",
                );
            } finally {
              if (mounted.current) setBusy(false);
            }
          });
        }}
      >
        <h3>Change password</h3>
        <label>
          Current password
          <input
            name="current_password"
            type="password"
            required
            minLength={3}
            maxLength={256}
            autoComplete="current-password"
            disabled={busy}
          />
        </label>
        <label>
          New password
          <input
            name="new_password"
            type="password"
            required
            minLength={3}
            maxLength={256}
            autoComplete="new-password"
            disabled={busy}
          />
        </label>
        <label>
          Confirm new password
          <input
            name="password_confirmation"
            type="password"
            required
            minLength={3}
            maxLength={256}
            autoComplete="new-password"
            disabled={busy}
          />
        </label>
        <p className="fine">
          Use 3–256 characters. No uppercase or symbol rules apply.
        </p>
        <button disabled={busy}>Change administrator password</button>
      </form>
    </section>
  );
}
