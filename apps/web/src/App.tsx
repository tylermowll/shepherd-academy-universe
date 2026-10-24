import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  api,
  ApiError,
  onAuthenticationLost,
  setIdentity,
  type Schema,
} from "./client";
import { AdultPanel } from "./AdultPanel";
import { Tutor } from "./Tutor";
import { UpdateNotice } from "./UpdateNotice";
import { ContextHelp, HelpPage } from "./Help";
import {
  followPage,
  pageUrl,
  roleForPage,
  signInUrl,
  type Page,
  type Navigate,
  type SignInRole,
} from "./navigation";
import { Setup } from "./Setup";
import { SignInAccounts } from "./SignInAccounts";
import { captureSetupAuthority, type SetupAuthority } from "./setup-authority";

const pageNames: Record<Page, string> = {
  practice: "Practice",
  history: "History",
  learners: "Learners",
  settings: "Settings",
  help: "Help",
};
function readLocation(): {
  page: Page;
  help: string;
  signIn: SignInRole | null;
  switchPage: Page | null;
  switchHelp: string | undefined;
} {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("page") ?? "practice";
  const requestedSignIn = params.get("signin");
  const historyState = window.history.state as {
    switchPage?: unknown;
    switchHelp?: unknown;
  } | null;
  const page = Object.hasOwn(pageNames, requested)
    ? (requested as Page)
    : "practice";
  return {
    page,
    help: params.get("help") ?? "practice",
    signIn:
      requestedSignIn === "adult" || requestedSignIn === "learner"
        ? requestedSignIn
        : params.has("page") && Object.hasOwn(pageNames, requested)
          ? roleForPage(page)
          : null,
    switchPage:
      typeof historyState?.switchPage === "string" &&
      Object.hasOwn(pageNames, historyState.switchPage)
        ? (historyState.switchPage as Page)
        : null,
    switchHelp:
      typeof historyState?.switchHelp === "string"
        ? historyState.switchHelp
        : undefined,
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
  const [signInError, setSignInError] = useState("");
  const needsSignInRefresh = useRef(false);
  const passwordInput = useRef<HTMLInputElement>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [learner, setLearner] = useState("");
  const [busy, setBusy] = useState(false);
  const [tutorBusy, setTutorBusy] = useState(false);
  const [tutorDraft, setTutorDraft] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [accountVersion, setAccountVersion] = useState(0);
  const accountGeneration = useRef(0);
  const actionsInFlight = useRef(0);
  const leavingAccount = useRef(false);
  const [location, setLocation] = useState(readLocation);
  const [learners, setLearners] = useState<Schema<"LearnerPublic">[]>([]);
  const learnerSequence = useRef(0);
  const workspace = useRef<HTMLDivElement>(null);
  const scrollToTop = useRef(false);
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
    (switchingAccount || !authenticated) &&
    location.page !== "help";
  const entryVisible =
    !setupRequired && !checkingSetup && (!authenticated || switchingAccount);
  const showHelp = switchingAccount
    ? location.page === "help"
    : page === "help";
  const signInRole: SignInRole =
    location.signIn ??
    (location.page === "learners" || location.page === "settings"
      ? "adult"
      : "learner");
  const signInTitle =
    signInRole === "adult" ? "Administrator sign-in" : "Learner sign-in";
  const otherRole: SignInRole = signInRole === "adult" ? "learner" : "adult";
  const navigate: Navigate = useCallback(
    (nextPage, help) => {
      if (signingIn) return;
      setSignInError("");
      needsSignInRefresh.current = false;
      scrollToTop.current = true;
      const destinationRole = roleForPage(nextPage) ?? signInRole;
      const requestEntry =
        entryVisible ||
        (authenticated &&
          destinationRole !== identity.role &&
          nextPage !== "help");
      const keepWorkspace =
        requestEntry && authenticated && destinationRole !== identity.role;
      window.history.pushState(
        keepWorkspace
          ? {
              switchPage: location.switchPage ?? page,
              switchHelp: location.switchPage
                ? location.switchHelp
                : location.help,
            }
          : null,
        "",
        pageUrl(nextPage, help, requestEntry ? destinationRole : undefined),
      );
      setLocation(readLocation());
    },
    [
      signingIn,
      entryVisible,
      authenticated,
      identity,
      signInRole,
      location.switchPage,
      location.switchHelp,
      location.help,
      page,
    ],
  );
  const tutorVisible =
    !switchingAccount && (page === "practice" || page === "history");
  const openArea = (role: SignInRole) => {
    if (signingIn) return;
    setError("");
    setSignInError("");
    needsSignInRefresh.current = false;
    const home = role === "adult" ? "learners" : "practice";
    if (authenticated && identity.role === role) {
      if (switchingAccount) cancelAccountSwitch();
      else navigate(home);
      return;
    }
    scrollToTop.current = true;
    window.history.pushState(
      {
        switchPage: location.switchPage ?? page,
        switchHelp: location.switchPage ? location.switchHelp : location.help,
      },
      "",
      signInUrl(role),
    );
    setLocation(readLocation());
  };
  const cancelAccountSwitch = () => {
    setError("");
    setSignInError("");
    needsSignInRefresh.current = false;
    scrollToTop.current = true;
    window.history.replaceState(
      null,
      "",
      pageUrl(
        location.switchPage ?? (isAdult ? "learners" : "practice"),
        location.switchHelp,
      ),
    );
    setLocation(readLocation());
  };
  useEffect(() => {
    if (signInError && !signingIn) passwordInput.current?.focus();
  }, [signInError, signingIn]);
  useEffect(() => {
    const changed = () => {
      setSignInError("");
      needsSignInRefresh.current = false;
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
    document.title = `${showHelp ? "Help" : signInVisible ? signInTitle : authenticated ? pageNames[page] : setupRequired || checkingSetup ? "Create administrator account" : signInTitle} · Shepherd Academy Universe`;
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
    showHelp,
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
    if (!busy && !tutorBusy && !tutorDraft) return;
    const protectWork = (event: BeforeUnloadEvent) => {
      if (leavingAccount.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectWork);
    return () => window.removeEventListener("beforeunload", protectWork);
  }, [busy, tutorBusy, tutorDraft]);
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
          "Your account was created, but settings could not be loaded. Select Try again to continue.",
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
        "An administrator account already exists. Select Try again, then sign in with that account.",
      );
    });
  }, [clearSetupToken, refresh]);
  useEffect(
    () =>
      onAuthenticationLost(() => {
        accountGeneration.current += 1;
        actionsInFlight.current = 0;
        setAccountVersion((current) => current + 1);
        clearSetupToken();
        setSignInError("");
        needsSignInRefresh.current = false;
        setSession(null);
        setLearner("");
        learnerSequence.current += 1;
        setLearners([]);
        setTutorBusy(false);
        setTutorDraft(false);
        setBusy(false);
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
        setError("Your session ended. Sign in again.");
        void refresh().catch(() => {
          setError("Your session ended. Select Try again to load sign-in.");
        });
      }),
    [refresh, clearSetupToken],
  );
  const act = useCallback(async (action: () => Promise<void>) => {
    const generation = accountGeneration.current;
    actionsInFlight.current += 1;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      if (generation === accountGeneration.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Connection lost. Select Try again to load your saved work.",
        );
    } finally {
      if (generation === accountGeneration.current) {
        actionsInFlight.current -= 1;
        setBusy(actionsInFlight.current > 0);
      }
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
            : "Could not load learners. Select Try again to reload the list.",
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
            "Could not reach the app. Check your connection, then select Try again.",
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
          href={
            entryVisible
              ? signInUrl(signInRole)
              : pageUrl(isAdult ? "learners" : "practice")
          }
          onClick={(event) =>
            followPage(
              event,
              entryVisible ? () => openArea(signInRole) : navigate,
              isAdult ? "learners" : "practice",
            )
          }
          className="wordmark"
          aria-disabled={signingIn || undefined}
        >
          <img src="/icon.svg" alt="" width={32} height={32} />
          Shepherd Academy Universe
        </a>
        {identity?.authenticated && !entryVisible && (
          <div className="account-controls">
            <span className="account-summary" aria-label="Signed in account">
              <strong>{identity.login_name || "Signed-in account"}</strong>
              <small>
                {identity.role === "adult" ? "Administrator" : "Learner"}
              </small>
            </span>
            <button
              className="quiet"
              disabled={signingIn}
              onClick={() =>
                void act(async () => {
                  await api("/auth/logout", "POST");
                  leavingAccount.current = true;
                  setIdentity("");
                  setSession(null);
                  setLearner("");
                  window.location.replace(window.location.pathname);
                })
              }
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      {entryVisible ? (
        <nav className="account-navigation" aria-label="Sign-in navigation">
          {showHelp && (
            <a
              href={signInUrl(signInRole)}
              aria-disabled={signingIn || undefined}
              onClick={(event) =>
                followPage(event, () => openArea(signInRole), "practice")
              }
            >
              {signInTitle}
            </a>
          )}
          <div className="sign-in-switch">
            <span>Switch to</span>
            <a
              href={signInUrl(otherRole)}
              aria-disabled={signingIn || undefined}
              onClick={(event) =>
                followPage(event, () => openArea(otherRole), "practice")
              }
            >
              {otherRole === "adult"
                ? "Administrator sign-in"
                : "Learner sign-in"}
            </a>
          </div>
          <a
            href={pageUrl("help", undefined, signInRole)}
            aria-current={showHelp ? "page" : undefined}
            aria-disabled={signingIn || undefined}
            onClick={(event) => followPage(event, navigate, "help")}
          >
            Help
          </a>
        </nav>
      ) : (
        <>
          {authenticated && (
            <nav className="account-navigation" aria-label="Account navigation">
              <span>{isAdult ? "Management" : "Learning"}</span>
              <a
                href={signInUrl(isAdult ? "learner" : "adult")}
                aria-disabled={signingIn || undefined}
                onClick={(event) =>
                  followPage(
                    event,
                    () => openArea(isAdult ? "learner" : "adult"),
                    "practice",
                  )
                }
              >
                {isAdult ? "Learner sign-in" : "Administrator sign-in"}
              </a>
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
                aria-current={page === item ? "page" : undefined}
                aria-disabled={signingIn || undefined}
                onClick={(event) => followPage(event, navigate, item)}
              >
                {!authenticated && item === "practice"
                  ? "Set up account"
                  : pageNames[item]}
              </a>
            ))}
          </nav>
        </>
      )}
      <UpdateNotice
        deferRefresh={
          setupRequired ||
          checkingSetup ||
          !!setupToken ||
          busy ||
          tutorBusy ||
          tutorDraft
        }
        deferMessage={
          setupRequired || checkingSetup || !!setupToken
            ? undefined
            : busy || tutorBusy
              ? "An update is ready. Finish or recover your pending request before refreshing."
              : "An update is ready. Send or clear your draft before refreshing."
        }
      />
      {offline && (
        <p role="status" className="notice">
          You are offline. Restore your network connection to use the tutor or
          upload photos. Requests already saved on the server can keep running.
        </p>
      )}
      {error && (
        <div role="alert" className="error">
          {error}{" "}
          <button disabled={signingIn} onClick={() => void act(refresh)}>
            Try again
          </button>
        </div>
      )}
      <div id="workspace" ref={workspace} tabIndex={-1} aria-busy={busy}>
        {showHelp && (
          <HelpPage
            topic={location.help}
            onNavigate={navigate}
            entryRole={entryVisible ? signInRole : undefined}
            accountRole={
              entryVisible ? signInRole : (identity?.role ?? "learner")
            }
          />
        )}
        {(!authenticated || switchingAccount) && (
          <div hidden={showHelp}>
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
              <section className="welcome sign-in-page" key={signInRole}>
                <h1 tabIndex={-1}>{signInTitle}</h1>
                <p>
                  {signInRole === "adult"
                    ? "Sign in with an administrator account to manage learners and settings."
                    : "Sign in with a learner account to open Practice and History."}
                </p>
                {switchingAccount && (
                  <>
                    <p>
                      Your current workspace stays signed in until this sign-in
                      succeeds. Cancel to return to your work.
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
                    className={`card sign-in-card sign-in-card-${signInRole}`}
                    onChange={() => setSignInError("")}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (signingIn) return;
                      const data = new FormData(event.currentTarget);
                      const loginName = data.get("login");
                      const password = data.get("password");
                      setSignInError("");
                      setSigningIn(true);
                      void act(async () => {
                        let session: Schema<"SessionStatus">;
                        try {
                          if (needsSignInRefresh.current) {
                            await refresh();
                            needsSignInRefresh.current = false;
                          }
                          session = await api<Schema<"SessionStatus">>(
                            "/auth/login",
                            "POST",
                            {
                              login_name:
                                typeof loginName === "string" ? loginName : "",
                              password:
                                typeof password === "string" ? password : "",
                              role: signInRole,
                            } satisfies Schema<"LoginRequest">,
                          );
                        } catch (cause) {
                          const expired =
                            cause instanceof ApiError &&
                            cause.status === 403 &&
                            cause.message === "CSRF validation failed.";
                          if (expired) needsSignInRefresh.current = true;
                          setSignInError(
                            expired
                              ? "This sign-in page expired. Select Sign in to try again."
                              : cause instanceof ApiError
                                ? cause.status === 401
                                  ? "Incorrect account or password. Check your details and try again."
                                  : cause.status >= 500
                                    ? "Sign-in is temporarily unavailable. Select Sign in to try again."
                                    : cause.message
                                : "Could not reach the app. Check your connection, then select Sign in to try again.",
                          );
                          return;
                        }
                        needsSignInRefresh.current = false;
                        accountGeneration.current += 1;
                        actionsInFlight.current = 0;
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
                        const destination = new URL(
                          pageUrl(
                            session.role === "adult" ? "learners" : "practice",
                          ),
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
                    <SignInAccounts
                      role={signInRole}
                      ready={!!identity && signInVisible}
                      disabled={signingIn}
                    />
                    <label>
                      Password
                      <input
                        ref={passwordInput}
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        minLength={3}
                        maxLength={256}
                        disabled={signingIn}
                        aria-describedby={
                          signInError ? "signin-error" : undefined
                        }
                      />
                    </label>
                    {signInError && (
                      <p id="signin-error" role="alert" className="error">
                        {signInError}
                      </p>
                    )}
                    <button
                      className="primary"
                      disabled={busy || signingIn || !identity}
                    >
                      {signingIn ? "Signing in…" : "Sign in"}
                    </button>
                    <p className="fine">
                      {signInRole === "adult"
                        ? "Use the administrator account created during setup."
                        : "Use the learner account your administrator created for you."}
                    </p>

                    <p>
                      <a
                        className="sign-in-recovery"
                        href={pageUrl("help", "signin", signInRole)}
                        onClick={(event) =>
                          followPage(event, navigate, "help", "signin")
                        }
                        aria-disabled={signingIn || undefined}
                      >
                        Forgot password?
                      </a>
                    </p>
                    <ContextHelp
                      topic={
                        signInRole === "adult"
                          ? "Setting up for the first time?"
                          : "Need a learner account?"
                      }
                    >
                      {signInRole === "adult" ? (
                        <>
                          <p>
                            The person running the app creates the first
                            administrator account using a private setup link.
                            For an existing account, choose Forgot password?
                          </p>
                          <a
                            href={pageUrl("help", "setup", signInRole)}
                            onClick={(event) =>
                              followPage(event, navigate, "help", "setup")
                            }
                            aria-disabled={signingIn || undefined}
                          >
                            Setup instructions
                          </a>
                        </>
                      ) : (
                        <p>
                          Ask the person who gave you the app address to create
                          your learner account and give you your username and
                          password. If you already have an account, choose
                          Forgot password?
                        </p>
                      )}
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
            {isAdult && (
              <AdultPanel
                learner={learner}
                onLearner={chooseLearner}
                learners={learners}
                onRefresh={refreshLearners}
                page={
                  page === "learners" || page === "settings" ? page : "help"
                }
                onNavigate={navigate}
                act={act}
                administrator={identity.login_name ?? "Administrator"}
                onSessionChange={(session) => {
                  setIdentity(session.csrf_token, session.authenticated);
                  setSession(session);
                }}
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
          href={pageUrl(
            "help",
            "privacy",
            entryVisible ? signInRole : undefined,
          )}
          aria-disabled={signingIn || undefined}
          onClick={(event) => followPage(event, navigate, "help", "privacy")}
        >
          Saved work & privacy
        </a>
      </footer>
    </main>
  );
}
