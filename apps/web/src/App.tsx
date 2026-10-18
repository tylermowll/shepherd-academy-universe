import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { api, onAuthenticationLost, setIdentity, type Schema } from "./client";
import { AdultPanel } from "./AdultPanel";
import { Tutor } from "./Tutor";
import { UpdateNotice } from "./UpdateNotice";
import { ContextHelp, HelpPage } from "./Help";
import {
  followPage,
  pageUrl,
  signInUrl,
  type Page,
  type Navigate,
  type SignInRole,
} from "./navigation";
import { Setup } from "./Setup";
import { captureSetupAuthority, type SetupAuthority } from "./setup-authority";

const pageNames: Record<Page, string> = {
  practice: "Practice",
  history: "History",
  learners: "Learners",
  settings: "Settings",
  help: "Help",
};
function readLocation() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("page") ?? "practice";
  const requestedSignIn = params.get("signin");
  const historyState = window.history.state as {
    switchPage?: unknown;
  } | null;
  return {
    page: Object.hasOwn(pageNames, requested)
      ? (requested as Page)
      : ("practice" as Page),
    help: params.get("help") ?? "practice",
    signIn:
      requestedSignIn === "adult" || requestedSignIn === "learner"
        ? requestedSignIn
        : null,
    switchPage:
      typeof historyState?.switchPage === "string" &&
      Object.hasOwn(pageNames, historyState.switchPage)
        ? (historyState.switchPage as Page)
        : null,
  };
}

export function App({ setupAuthority }: { setupAuthority?: SetupAuthority }) {
  const setupHolder = useRef(setupAuthority ?? { token: "" });
  const [setupToken, setSetupToken] = useState(setupAuthority?.token ?? "");
  const clearSetupToken = useCallback(() => {
    setupHolder.current.token = "";
    setSetupToken("");
  }, []);
  const [identity, setSession] = useState<Schema<"SessionStatus"> | null>(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [learner, setLearner] = useState("");
  const [busy, setBusy] = useState(false);
  const [tutorBusy, setTutorBusy] = useState(false);
  const [tutorDraft, setTutorDraft] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [accountVersion, setAccountVersion] = useState(0);
  const accountGeneration = useRef(0);
  const [accountNotice, setAccountNotice] = useState("");
  const leavingAccount = useRef(false);
  const [location, setLocation] = useState(readLocation);
  const [learners, setLearners] = useState<Schema<"LearnerPublic">[]>([]);
  const learnerSequence = useRef(0);
  const workspace = useRef<HTMLDivElement>(null);
  const scrollToTop = useRef(false);
  const navigate: Navigate = useCallback(
    (page, help) => {
      if (signingIn) return;
      scrollToTop.current = true;
      window.history.pushState(null, "", pageUrl(page, help));
      setLocation(readLocation());
    },
    [signingIn],
  );
  const isAdult = identity?.authenticated === true && identity.role === "adult";
  const authenticated = identity?.authenticated === true;
  const setupRequired = !authenticated && identity?.setup_required === true;
  const checkingSetup = !identity && !!setupToken;
  const switchingAccount = Boolean(
    authenticated && location.signIn && identity.role !== location.signIn,
  );
  const workspacePage = switchingAccount
    ? (location.switchPage ?? (isAdult ? "learners" : "practice"))
    : location.page;
  const page: Page =
    workspacePage === "help"
      ? "help"
      : !authenticated
        ? "practice"
        : !isAdult &&
            (workspacePage === "settings" || workspacePage === "learners")
          ? "practice"
          : isAdult &&
              (workspacePage === "practice" || workspacePage === "history")
            ? "learners"
            : workspacePage;
  const signInVisible =
    !setupRequired &&
    !checkingSetup &&
    (switchingAccount || (!authenticated && page !== "help"));
  const signInTitle =
    location.signIn === "adult"
      ? "Administrator sign-in"
      : location.signIn === "learner"
        ? "Learner sign-in"
        : "Sign in";
  const tutorVisible =
    !switchingAccount && (page === "practice" || page === "history");
  const openArea = (role: SignInRole) => {
    if (signingIn) return;
    setError("");
    setAccountNotice("");
    const home = role === "adult" ? "learners" : "practice";
    if (authenticated && identity.role === role) {
      navigate(home);
      return;
    }
    scrollToTop.current = true;
    window.history.pushState(
      { switchPage: location.switchPage ?? page },
      "",
      signInUrl(role),
    );
    setLocation(readLocation());
  };
  const cancelAccountSwitch = () => {
    setError("");
    scrollToTop.current = true;
    window.history.replaceState(
      null,
      "",
      pageUrl(location.switchPage ?? (isAdult ? "learners" : "practice")),
    );
    setLocation(readLocation());
  };
  useEffect(() => {
    const changed = () => {
      const authority = captureSetupAuthority();
      if (
        authority.token &&
        !authenticated &&
        (!identity || identity.setup_required)
      ) {
        setupHolder.current.token = authority.token;
        setSetupToken(authority.token);
      }
      setLocation(readLocation());
    };
    window.addEventListener("popstate", changed);
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("popstate", changed);
      window.removeEventListener("hashchange", changed);
    };
  }, [authenticated, identity]);
  useLayoutEffect(() => {
    document.title = `${signInVisible ? signInTitle : authenticated || page === "help" ? pageNames[page] : setupRequired || checkingSetup ? "Create administrator account" : "Sign in"} · Shepherd Academy Universe`;
    const focusTarget =
      Array.from(
        workspace.current?.querySelectorAll<HTMLElement>("[data-page-focus]") ??
          [],
      ).find((element) => !element.closest("[hidden]")) ??
      Array.from(
        workspace.current?.querySelectorAll<HTMLElement>("h1") ?? [],
      ).find((element) => !element.closest("[hidden]"));
    focusTarget?.focus({ preventScroll: true });
    if (scrollToTop.current) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      scrollToTop.current = false;
    }
  }, [
    page,
    location,
    authenticated,
    setupRequired,
    checkingSetup,
    signInVisible,
    signInTitle,
  ]);
  const refreshLearners = useCallback(async () => {
    const sequence = ++learnerSequence.current;
    const rows = await api<Schema<"LearnerPublic">[]>("/admin/learners");
    if (sequence !== learnerSequence.current) return;
    setLearners(rows);
    setLearner((current) =>
      rows.some((row) => row.id === current) ? current : "",
    );
  }, []);
  useEffect(() => {
    if (!tutorBusy && !tutorDraft) return;
    const protectWork = (event: BeforeUnloadEvent) => {
      if (leavingAccount.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectWork);
    return () => window.removeEventListener("beforeunload", protectWork);
  }, [tutorBusy, tutorDraft]);
  const chooseLearner = (id: string) => setLearner(id);
  const refresh = useCallback(async () => {
    const session = await api<Schema<"SessionStatus">>("/auth/session");
    if (session.authenticated || !session.setup_required) clearSetupToken();
    setIdentity(session.csrf_token, session.authenticated);
    setSession(session);
    setLearner((current) =>
      session.role === "adult" ? current : (session.learner_id ?? ""),
    );
    if (session.authenticated && session.role === "adult")
      await refreshLearners();
  }, [refreshLearners, clearSetupToken]);
  const setupComplete = useCallback(
    (session: Schema<"SessionStatus">) => {
      clearSetupToken();
      setIdentity(session.csrf_token, session.authenticated);
      setSession(session);
      setLearner(session.learner_id ?? "");
      navigate("settings");
      void refresh().catch(() => {
        setError(
          "Your account was created, but settings could not be refreshed. Reconnect to continue.",
        );
      });
    },
    [clearSetupToken, navigate, refresh],
  );
  const setupAlreadyClaimed = useCallback(() => {
    clearSetupToken();
    setSession((current) =>
      current ? { ...current, setup_required: false } : current,
    );
    void refresh().catch(() => {
      setError(
        "An administrator account already exists. Reconnect, then sign in with that account.",
      );
    });
  }, [clearSetupToken, refresh]);
  useEffect(
    () =>
      onAuthenticationLost(() => {
        accountGeneration.current += 1;
        setAccountVersion((current) => current + 1);
        clearSetupToken();
        setSession(null);
        setLearner("");
        learnerSequence.current += 1;
        setLearners([]);
        setTutorBusy(false);
        setTutorDraft(false);
        setBusy(false);
        setAccountNotice("");
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
        setError("Your session ended. Sign in again.");
        void refresh().catch(() => {
          setError("Your session ended. Reconnect to sign in again.");
        });
      }),
    [refresh, clearSetupToken],
  );
  const act = useCallback(async (action: () => Promise<void>) => {
    const generation = accountGeneration.current;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      if (generation === accountGeneration.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Connection lost. Reconnect to recover your saved work.",
        );
    } finally {
      if (generation === accountGeneration.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (!isAdult) return;
    let canceled = false;
    void refreshLearners().catch((cause: unknown) => {
      if (!canceled)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load learners. Reconnect to try again.",
        );
    });
    return () => {
      canceled = true;
      learnerSequence.current += 1;
    };
  }, [isAdult, accountVersion, refreshLearners]);
  useEffect(() => {
    let canceled = false;
    void api<Schema<"SessionStatus">>("/auth/session")
      .then((session) => {
        if (canceled) return;
        if (session.authenticated || !session.setup_required) clearSetupToken();
        setIdentity(session.csrf_token, session.authenticated);
        setSession(session);
        setLearner(session.learner_id ?? "");
      })
      .catch(() => {
        if (!canceled)
          setError(
            "The server is unavailable. Reconnect to access your saved tutoring sessions.",
          );
      });
    return () => {
      canceled = true;
    };
  }, [clearSetupToken]);
  useEffect(() => {
    const online = () => setOffline(false);
    const lost = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", lost);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", lost);
    };
  }, []);
  return (
    <main>
      <a className="skip-link" href="#workspace">
        Skip to page content
      </a>
      <header className="masthead">
        <a
          href={pageUrl("practice")}
          onClick={(event) => followPage(event, navigate, "practice")}
          className="wordmark"
          aria-disabled={signingIn || undefined}
        >
          <img src="/icon.svg" alt="" width={32} height={32} />
          Shepherd Academy Universe
        </a>
        {identity?.authenticated && (
          <>
            <span className="account-summary" aria-label="Signed in account">
              <strong>{identity.login_name || "Signed-in account"}</strong>
              <small>
                {identity.role === "adult" ? "Administrator" : "Learner"}
              </small>
            </span>
            <button
              disabled={signingIn}
              onClick={() =>
                void act(async () => {
                  await api("/auth/logout", "POST");
                  leavingAccount.current = true;
                  setIdentity("");
                  setSession(null);
                  setLearner("");
                  window.location.replace("/");
                })
              }
            >
              Sign out
            </button>
          </>
        )}
      </header>
      {!setupRequired && !checkingSetup && (
        <nav className="app-areas" aria-label="App areas">
          {(
            [
              ["learner", "Learning environment"],
              ["adult", "Administration"],
            ] as const
          ).map(([role, label]) => (
            <a
              key={role}
              href={
                authenticated && identity.role === role
                  ? pageUrl(role === "adult" ? "learners" : "practice")
                  : signInUrl(role)
              }
              aria-current={
                (
                  switchingAccount || !authenticated
                    ? location.signIn === role
                    : identity.role === role
                )
                  ? "location"
                  : undefined
              }
              aria-disabled={signingIn || undefined}
              onClick={(event) =>
                followPage(
                  event,
                  () => openArea(role),
                  role === "adult" ? "learners" : "practice",
                )
              }
            >
              {label}
            </a>
          ))}
        </nav>
      )}
      <nav className="page-tabs" aria-label="Main navigation">
        {(authenticated
          ? isAdult
            ? (["learners", "settings", "help"] as Page[])
            : (["practice", "history", "help"] as Page[])
          : (["practice", "help"] as Page[])
        ).map((item) => (
          <a
            key={item}
            href={pageUrl(item)}
            aria-current={
              !switchingAccount && page === item ? "page" : undefined
            }
            aria-disabled={signingIn || undefined}
            onClick={(event) => followPage(event, navigate, item)}
          >
            {!authenticated && item === "practice"
              ? setupRequired || checkingSetup
                ? "Set up account"
                : "Sign in"
              : pageNames[item]}
          </a>
        ))}
      </nav>
      <UpdateNotice
        deferRefresh={
          setupRequired ||
          checkingSetup ||
          !!setupToken ||
          tutorBusy ||
          tutorDraft
        }
        deferMessage={
          setupRequired || checkingSetup || !!setupToken
            ? undefined
            : tutorBusy
              ? "An update is ready. Finish or recover your pending request before refreshing."
              : "An update is ready. Send or clear your draft before refreshing."
        }
      />
      {offline && (
        <p role="status" className="notice">
          You are offline. Reconnect to use the tutor or upload photos. Requests
          already saved on the server can keep running.
        </p>
      )}
      {error && (
        <div role="alert" className="error">
          {error}{" "}
          <button disabled={signingIn} onClick={() => void act(refresh)}>
            Reconnect
          </button>
        </div>
      )}
      {accountNotice && (
        <p role="status" className="notice">
          {accountNotice}
        </p>
      )}
      <div id="workspace" ref={workspace} tabIndex={-1} aria-busy={busy}>
        {page === "help" && !switchingAccount && (
          <HelpPage topic={location.help} onNavigate={navigate} />
        )}
        {(!authenticated || switchingAccount) && (
          <div hidden={page === "help" && !switchingAccount}>
            {setupRequired ? (
              <Setup
                token={setupToken}
                onClearToken={clearSetupToken}
                onComplete={setupComplete}
                onExistingAccount={setupAlreadyClaimed}
                onNavigate={navigate}
              />
            ) : checkingSetup ? (
              <section className="welcome">
                <h1 tabIndex={-1}>Create administrator account</h1>
                <p role="status">Checking account setup…</p>
              </section>
            ) : (
              <section className="welcome" key={location.signIn}>
                <h1 tabIndex={-1}>{signInTitle}</h1>
                <p>
                  {location.signIn === "adult"
                    ? "Sign in with an administrator account to manage learners and settings."
                    : location.signIn === "learner"
                      ? "Sign in with a learner account to open Practice and History."
                      : "Use your administrator or learner username and password."}
                </p>
                {switchingAccount && (
                  <>
                    <p>
                      You are still signed in as{" "}
                      {identity?.login_name || "your current account"}. Your
                      current workspace stays available until another sign-in
                      succeeds.
                    </p>
                    {(tutorBusy || tutorDraft) && (
                      <p className="notice">
                        A successful sign-in clears unsent text and photos from
                        this browser. Saved work stays with the current learner.
                        {tutorBusy &&
                          " Cancel to finish or recover your pending request before switching accounts."}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={signingIn}
                      onClick={cancelAccountSwitch}
                    >
                      Cancel account switch
                    </button>
                  </>
                )}
                <div className="grid">
                  <form
                    className="card"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (signingIn) return;
                      const data = new FormData(event.currentTarget);
                      setSigningIn(true);
                      void act(async () => {
                        const session = await api<Schema<"SessionStatus">>(
                          "/auth/login",
                          "POST",
                          {
                            login_name: data.get("login"),
                            password: data.get("password"),
                          },
                        );
                        accountGeneration.current += 1;
                        setAccountVersion((current) => current + 1);
                        learnerSequence.current += 1;
                        clearSetupToken();
                        setIdentity(session.csrf_token, session.authenticated);
                        setLearners([]);
                        setSession(session);
                        setLearner(session.learner_id ?? "");
                        setTutorBusy(false);
                        setTutorDraft(false);
                        setBusy(false);
                        setError("");
                        setAccountNotice(
                          location.signIn && session.role !== location.signIn
                            ? session.role === "adult"
                              ? "Signed in as an administrator. Open Learning environment and sign in with a learner account to practice."
                              : "Signed in as a learner. Open Administration and sign in with an administrator account to manage the app."
                            : "",
                        );
                        const destination = new URL(
                          location.signIn
                            ? pageUrl(
                                session.role === "adult"
                                  ? "learners"
                                  : "practice",
                              )
                            : window.location.href,
                          window.location.href,
                        );
                        destination.searchParams.delete("signin");
                        destination.searchParams.delete("help");
                        destination.hash = "";
                        scrollToTop.current = true;
                        window.history.replaceState(
                          null,
                          "",
                          destination.pathname + destination.search,
                        );
                        setLocation(readLocation());
                      }).finally(() => setSigningIn(false));
                    }}
                  >
                    <h2>Account sign-in</h2>
                    <p>
                      Learner accounts open only that learner’s practice and
                      history.
                    </p>
                    <label>
                      Username
                      <input
                        name="login"
                        autoComplete="username"
                        required
                        maxLength={64}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        maxLength={256}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || signingIn || !identity}
                    >
                      Sign in
                    </button>
                    <p className="fine">
                      Learners: use the account your administrator created for
                      you.
                    </p>

                    <ContextHelp topic="Need an account or a password reset?">
                      <p>
                        Ask your administrator to reset a learner password in
                        Learners. The administrator account is created with the
                        private setup link printed by <code>make start</code>.
                        If an account already exists, only the person running
                        the app can reset its password with{" "}
                        <code>make admin</code> on that computer.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("help", "setup")}
                      >
                        Setup instructions
                      </button>
                    </ContextHelp>
                  </form>
                </div>
              </section>
            )}
          </div>
        )}
        {authenticated && (
          <div key={accountVersion} hidden={switchingAccount}>
            {page !== "help" && (
              <div className="page-heading">
                <div>
                  <h1 tabIndex={-1}>{pageNames[page]}</h1>
                  <p>
                    {page === "practice"
                      ? "Choose a topic and work through an activity."
                      : page === "history"
                        ? "Review or continue a saved session."
                        : page === "learners"
                          ? "Manage learner accounts, passwords, and signed-in browsers."
                          : "Choose the AI models that process your work."}
                  </p>
                </div>
              </div>
            )}
            {isAdult && (page === "learners" || page === "settings") && (
              <AdultPanel
                key={page}
                learner={learner}
                onLearner={chooseLearner}
                learners={learners}
                onRefresh={refreshLearners}
                page={page}
                onNavigate={navigate}
                act={act}
              />
            )}
            {learner && !isAdult && (
              <div hidden={!tutorVisible}>
                <Tutor
                  key={learner}
                  learner={learner}
                  act={act}
                  offline={offline}
                  page={page === "history" ? "history" : "practice"}
                  active={tutorVisible}
                  onNavigate={navigate}
                  onBusyChange={setTutorBusy}
                  onDraftChange={setTutorDraft}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <footer>
        <span>Shepherd Academy Universe</span>
        <a
          href={pageUrl("help", "privacy")}
          aria-disabled={signingIn || undefined}
          onClick={(event) => followPage(event, navigate, "help", "privacy")}
        >
          Saved work & privacy
        </a>
      </footer>
    </main>
  );
}
