import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiError, newKey, type Schema } from "./client";
import { AdministratorAccount } from "./AdministratorAccount";

type Props = {
  active?: boolean;
  learner: string;
  learners: Schema<"LearnerPublic">[];
  onLearner: (id: string) => void;
  onRefresh: () => Promise<void>;
  act: (action: () => Promise<void>) => Promise<void>;
  administrator: string;
  onSessionChange: (session: Schema<"SessionStatus">) => void;
};
type SavedChange = { message: string; select?: string };

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export function LearnerAccounts({
  active = true,
  learner,
  learners,
  onLearner,
  onRefresh,
  act,
  administrator,
  onSessionChange,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [managingAdministrator, setManagingAdministrator] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshRequired, setRefreshRequired] = useState<SavedChange | null>(
    null,
  );
  const inFlight = useRef(false);
  const blocked = busy || refreshRequired !== null;
  const [devices, setDevices] = useState<
    Schema<"LearnerDevicePublic">[] | null
  >(null);
  const [deviceError, setDeviceError] = useState("");
  const [deviceRefresh, setDeviceRefresh] = useState(0);
  const version = useRef(0);
  const visible = useRef(active);
  useLayoutEffect(() => {
    visible.current = active;
  }, [active]);
  const chosen = learners.find((item) => item.id === learner);
  const creating = !managingAdministrator && (adding || learners.length === 0);
  const chosenId = chosen?.id;
  const minimumPassword = 3;
  useEffect(() => {
    return () => {
      version.current += 1;
    };
  }, [learner]);
  useEffect(() => {
    let current = true;
    if (chosenId && !creating && !managingAdministrator)
      void api<Schema<"LearnerDevicePublic">[]>(
        `/admin/learners/${chosenId}/devices`,
      ).then(
        (rows) => {
          if (current) {
            setDevices(rows);
            setDeviceError("");
          }
        },
        () => {
          if (current)
            setDeviceError("Could not load signed-in browsers. Try again.");
        },
      );
    return () => {
      current = false;
    };
  }, [chosenId, creating, managingAdministrator, deviceRefresh]);
  const run = (action: (current: () => boolean) => Promise<void>) => {
    if (inFlight.current || refreshRequired) return;
    inFlight.current = true;
    const started = version.current;
    setBusy(true);
    setError("");
    setMessage("");
    void act(async () => {
      try {
        await action(() => started === version.current);
      } catch (cause) {
        if (started === version.current)
          setError(
            cause instanceof ApiError
              ? cause.message
              : "The change was not confirmed. Check your connection and try again.",
          );
      } finally {
        inFlight.current = false;
        if (started === version.current) setBusy(false);
      }
    });
  };
  const refreshChange = async (change: SavedChange, current: () => boolean) => {
    if (!current()) return;
    setMessage(change.message);
    try {
      await onRefresh();
      if (!current()) return;
      setRefreshRequired(null);
      setError("");
      if (change.select !== undefined) {
        setAdding(false);
        setBusy(false);
        if (visible.current) onLearner(change.select);
      }
    } catch {
      if (current()) {
        setRefreshRequired(change);
        setError(
          "This change was saved, but the account list could not refresh. Refresh accounts to continue.",
        );
      }
    }
  };
  return (
    <section aria-label="Learner accounts">
      <p>
        Create one account per learner. They sign in with the username and
        password you set here. Choose Manage account beside a learner to update
        their sign-in details, browsers, and saved work.
      </p>
      <div className="learner-accounts">
        <aside aria-label="Choose an account">
          <h2>Administrator</h2>
          <ul className="account-list">
            <li>
              <button
                disabled={blocked}
                aria-pressed={managingAdministrator}
                onClick={() => {
                  if (!managingAdministrator) {
                    setError("");
                    setMessage("");
                  }
                  setManagingAdministrator(true);
                }}
              >
                {administrator} <small>Manage administrator</small>
              </button>
            </li>
          </ul>
          <h2>Learners</h2>
          <ul className="account-list">
            {learners.map((item) => (
              <li key={item.id}>
                <button
                  disabled={blocked}
                  aria-pressed={
                    !managingAdministrator && !creating && learner === item.id
                  }
                  onClick={() => {
                    if (
                      managingAdministrator ||
                      creating ||
                      learner !== item.id
                    ) {
                      setError("");
                      setMessage("");
                    }
                    setManagingAdministrator(false);
                    setAdding(false);
                    onLearner(item.id);
                  }}
                >
                  {item.alias} <small>Manage account</small>
                  {!item.has_password && <small>Password not set</small>}
                </button>
              </li>
            ))}
          </ul>
          <button
            disabled={blocked}
            onClick={() => {
              setManagingAdministrator(false);
              setAdding(true);
              setError("");
              setMessage("");
            }}
          >
            Add learner account
          </button>
        </aside>
        <div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {refreshRequired && (
            <button
              disabled={busy}
              onClick={() => {
                if (inFlight.current) return;
                inFlight.current = true;
                const started = version.current;
                setBusy(true);
                void act(async () => {
                  try {
                    await refreshChange(
                      refreshRequired,
                      () => started === version.current,
                    );
                  } finally {
                    inFlight.current = false;
                    if (started === version.current) setBusy(false);
                  }
                });
              }}
            >
              Refresh accounts
            </button>
          )}
          {message && (
            <p role="status" className="success-notice">
              {message}
            </p>
          )}
          {managingAdministrator ? (
            <AdministratorAccount
              loginName={administrator}
              onSessionChange={onSessionChange}
              act={act}
            />
          ) : creating ? (
            <form
              className="card"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                run(async (current) => {
                  const row = await api<Schema<"LearnerPublic">>(
                    "/admin/learners",
                    "POST",
                    {
                      alias: field(data, "alias"),
                      password: field(data, "password"),
                      eligibility: field(
                        data,
                        "eligibility",
                      ) as Schema<"LearnerInput">["eligibility"],
                    } satisfies Schema<"LearnerInput">,
                    newKey(),
                  );
                  form.reset();
                  await refreshChange(
                    { message: "Learner account created.", select: row.id },
                    current,
                  );
                });
              }}
            >
              <h2>Add learner account</h2>
              <label>
                Learner username
                <input
                  name="alias"
                  required
                  maxLength={64}
                  autoComplete="off"
                  disabled={blocked}
                />
              </label>
              <p className="fine">
                Use a unique username. The administrator account has its own
                username.
              </p>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={minimumPassword}
                  maxLength={256}
                  autoComplete="new-password"
                  disabled={blocked}
                />
              </label>
              <p className="fine">
                At least {minimumPassword} characters. Share it with the
                learner; you can reset it here later.
              </p>
              <label>
                Age group
                <select name="eligibility" disabled={blocked}>
                  <option value="unknown">Not specified</option>
                  <option value="minor">Under 18</option>
                  <option value="adult">18 or older</option>
                </select>
              </label>
              <p className="fine">
                Used to enforce the age restrictions you selected for AI
                connections.
              </p>
              <div className="actions">
                <button className="primary" disabled={blocked}>
                  Create learner account
                </button>
                {learners.length > 0 && (
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => setAdding(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : chosen ? (
            <section className="card" aria-label="Selected learner">
              <h2>{chosen.alias}</h2>
              <p>
                Age group:{" "}
                {chosen.eligibility === "adult"
                  ? "18 or older"
                  : chosen.eligibility === "minor"
                    ? "Under 18"
                    : "Not specified"}
              </p>
              <p>
                To practice, sign in with this learner’s username and password.
              </p>
              {!chosen.has_password && (
                <p className="notice">
                  This learner's saved work is available. Set a password below
                  so they can sign in on another device.
                </p>
              )}
              <form
                key={chosen.id + chosen.alias}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const password = field(data, "password");
                  run(async (current) => {
                    await api(`/admin/learners/${chosen.id}/account`, "PATCH", {
                      alias: field(data, "alias"),
                      ...(password ? { password } : {}),
                    } satisfies Schema<"LearnerAccountUpdate">);
                    form.reset();
                    if (current()) setDeviceRefresh((value) => value + 1);
                    await refreshChange(
                      {
                        message: password
                          ? "Password changed. This learner's browsers are signed out."
                          : "Username saved.",
                      },
                      current,
                    );
                  });
                }}
              >
                <h3>Sign-in details</h3>
                <label>
                  Learner username
                  <input
                    name="alias"
                    defaultValue={chosen.alias}
                    required
                    maxLength={64}
                    disabled={blocked}
                  />
                </label>
                <label>
                  {chosen.has_password ? "New password" : "Set password"}
                  <input
                    name="password"
                    type="password"
                    required={!chosen.has_password}
                    minLength={minimumPassword}
                    maxLength={256}
                    autoComplete="new-password"
                    disabled={blocked}
                  />
                </label>
                <p className="fine">
                  At least {minimumPassword} characters.{" "}
                  {chosen.has_password
                    ? "Leave blank to keep the current password. Changing it signs out this learner's browsers."
                    : "Set a password to let this learner sign in. Setting it ends any previous browser access."}
                </p>
                <button disabled={blocked}>Save sign-in details</button>
              </form>
              <form
                key={`${chosen.id}-${chosen.eligibility}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const eligibility = field(data, "eligibility") as NonNullable<
                    Schema<"LearnerAccountUpdate">["eligibility"]
                  >;
                  run(async (current) => {
                    await api(`/admin/learners/${chosen.id}/account`, "PATCH", {
                      alias: chosen.alias,
                      eligibility,
                    } satisfies Schema<"LearnerAccountUpdate">);
                    await refreshChange(
                      {
                        message:
                          eligibility === chosen.eligibility
                            ? "Age group saved."
                            : "Age group saved. Pending requests were stopped; saved work is kept. New requests use this age group.",
                      },
                      current,
                    );
                  });
                }}
              >
                <h3>Age group</h3>
                <label>
                  Age group
                  <select
                    name="eligibility"
                    defaultValue={chosen.eligibility}
                    disabled={blocked}
                  >
                    <option value="unknown">Not specified</option>
                    <option value="minor">Under 18</option>
                    <option value="adult">18 or older</option>
                  </select>
                </label>
                <p className="fine">
                  Used to enforce the age restrictions for AI connections.
                  Changing it stops this learner&apos;s pending requests and
                  keeps their saved work. A request already sent to a provider
                  cannot be recalled.
                </p>
                <button disabled={blocked}>Save age group</button>
              </form>
              <section aria-label="Signed-in browsers">
                <h3>Signed-in browsers</h3>
                <p>
                  These browsers can access {chosen.alias}'s practice and
                  history. Scanning the photo QR code does not sign a browser
                  into this account.
                </p>
                <button
                  disabled={blocked}
                  onClick={() => setDeviceRefresh((value) => value + 1)}
                >
                  Refresh browsers
                </button>
                {deviceError ? (
                  <p role="status">
                    {deviceError}{" "}
                    <button
                      onClick={() => setDeviceRefresh((value) => value + 1)}
                    >
                      Reload browsers
                    </button>
                  </p>
                ) : devices === null ? (
                  <p>Loading browsers…</p>
                ) : devices.length === 0 ? (
                  <p>No browsers are signed in as {chosen.alias}.</p>
                ) : (
                  <ul>
                    {devices.map((device) => (
                      <li key={device.id}>
                        Signed in {new Date(device.created_at).toLocaleString()}{" "}
                        <button
                          disabled={blocked}
                          onClick={() =>
                            run(async (current) => {
                              await api(
                                `/admin/learners/${chosen.id}/devices/${device.id}`,
                                "DELETE",
                              );
                              if (current())
                                setDeviceRefresh((value) => value + 1);
                            })
                          }
                        >
                          Sign out this browser
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  disabled={blocked}
                  onClick={() =>
                    run(async (current) => {
                      await api(`/admin/learners/${chosen.id}/revoke`, "POST");
                      if (current()) {
                        setDeviceRefresh((value) => value + 1);
                        setMessage(
                          `${chosen.alias}'s browsers are signed out.`,
                        );
                      }
                    })
                  }
                >
                  Sign out all learner browsers
                </button>
              </section>
              <section aria-label="Saved work">
                <h3>Saved work</h3>
                <div className="actions">
                  <button
                    disabled={blocked}
                    onClick={() =>
                      run(async () => {
                        const result = await api<Schema<"LearnerExport">>(
                          `/admin/learners/${chosen.id}/export`,
                          "POST",
                        );
                        const url = URL.createObjectURL(
                          new Blob([JSON.stringify(result, null, 2)], {
                            type: "application/json",
                          }),
                        );
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "learner-export.json";
                        link.click();
                        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                      })
                    }
                  >
                    Download saved practice
                  </button>
                  <button
                    className="danger"
                    disabled={blocked}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete ${chosen.alias}'s account and saved work? This cannot be undone.`,
                        )
                      )
                        return;
                      run(async (current) => {
                        await api(`/admin/learners/${chosen.id}`, "DELETE");
                        await refreshChange(
                          { message: "Learner account deleted.", select: "" },
                          current,
                        );
                      });
                    }}
                  >
                    Delete learner
                  </button>
                </div>
              </section>
            </section>
          ) : (
            <p>
              Choose a learner to manage their sign-in, browsers and saved work,
              or add a new account.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
