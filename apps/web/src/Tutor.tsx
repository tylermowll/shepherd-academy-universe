import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, newKey, type Schema } from "./client";
import { BusyStatus } from "./BusyStatus";
import { ContextHelp } from "./Help";
import { PhoneLink } from "./PhoneLink";
import { PhotoInput } from "./PhotoInput";
import { SafeText } from "./SafeText";
import { ComposerMenu } from "./ComposerMenu";
import { TutorConversation } from "./TutorConversation";
import { ReadingPassage } from "./ReadingPassage";
import { ReadingSources } from "./ReadingSources";
import { ActivityPurpose } from "./ActivityPurpose";
import { PracticeSource } from "./PracticeSource";
import { SessionReview } from "./SessionReview";
import { characterCount } from "./text-limits";
import {
  forgetRequest,
  readRememberedRequest,
  rememberRequest,
  type PendingRequestIdentity,
} from "./request-recovery";
import {
  MaterialNavigation,
  MaterialOptions,
  type MaterialChange,
  type MaterialPreferences,
} from "./MaterialNavigation";

type Props = {
  learner: string;
  offline: boolean;
  act: (action: () => Promise<void>) => Promise<void>;
  page?: "practice" | "history";
  active?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onDraftChange?: (draft: boolean) => void;
  onNavigate?: (
    page: "practice" | "history" | "learners" | "settings" | "help",
    help?: string,
  ) => void;
};
type Initiative = "tutor_led" | "balanced" | "learner_led";
type Difficulty = "introductory" | "standard" | "challenge";
type Source = NonNullable<Schema<"TutorActivityInput">["source"]>;
type Command = {
  path: string;
  body: unknown;
  key: string;
  sessionId: string;
  kind: "session" | "activity" | "submission" | "settings" | "finish";
  ambiguous: boolean;
};
const activeStatuses = [
  "queued",
  "checking",
  "generating",
  "tutoring",
  "interpreting",
];

function InitiativeOptions() {
  return (
    <>
      <option value="tutor_led">Suggest what to do next</option>
      <option value="balanced">Decide together</option>
      <option value="learner_led">Follow my questions</option>
    </>
  );
}

function DifficultyOptions() {
  return (
    <>
      <option value="introductory">Easier</option>
      <option value="standard">Standard</option>
      <option value="challenge">Harder</option>
    </>
  );
}

function difficultyLabel(value: Difficulty) {
  return {
    introductory: "Easier",
    standard: "Standard",
    challenge: "Harder",
  }[value];
}

export function Tutor({
  learner,
  offline,
  act,
  page = "practice",
  active: pageActive = true,
  onBusyChange,
  onDraftChange,
  onNavigate,
}: Props) {
  const [history, setHistory] = useState<
    Schema<"TutoringSessionSummaryPublic">[]
  >([]);
  const [session, setSession] =
    useState<Schema<"TutoringSessionPublic"> | null>(null);
  const [features, setFeatures] = useState<Schema<"Features"> | null>(null);
  const [topic, setTopic] = useState("");
  const [initiative, setInitiative] = useState<Initiative>("balanced");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [source, setSource] = useState<Source>("topic");
  const [reference, setReference] = useState("");
  const [passageTitle, setPassageTitle] = useState("");
  const [materialPreferences, setMaterialPreferences] =
    useState<MaterialPreferences>({
      reading_mode: "guided",
      section_size: "standard",
    });
  const composer = useRef<HTMLTextAreaElement>(null);
  const materialComposer = useRef<HTMLTextAreaElement>(null);
  const materialTools = useRef<HTMLDetailsElement>(null);
  const sourceTools = useRef<HTMLDetailsElement>(null);
  const [photoRepair, setPhotoRepair] = useState("");
  const [published, setPublished] = useState<Schema<"ImportedPassage"> | null>(
    null,
  );
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState<Command | null>(null);
  const [recovery, setRecovery] = useState(() =>
    readRememberedRequest(learner),
  );
  const [recovering, setRecovering] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsOpenedAt, setAttachmentsOpenedAt] = useState("");
  const [newSession, setNewSession] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [navigationNotice, setNavigationNotice] = useState("");
  const pendingCommand = useRef<Command | null>(null);
  const mounted = useRef(true);
  const selectedSession = useRef("");
  const loadSequence = useRef(0);
  const polling = useRef(false);
  const selectingSession = useRef(0);
  const blocked =
    working || pending !== null || photoPending || recovery !== null;

  const commitSession = useCallback(
    (loaded: Schema<"TutoringSessionPublic">, addToHistory = false) => {
      if (loaded.learner_id !== learner) {
        selectedSession.current = "";
        setSession(null);
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        return false;
      }
      selectedSession.current = loaded.id;
      setSession(loaded);
      setHistory((current) => {
        const summary: Schema<"TutoringSessionSummaryPublic"> = {
          id: loaded.id,
          learner_id: loaded.learner_id,
          status: loaded.status,
          topic: loaded.topic,
          initiative: loaded.initiative,
          difficulty: loaded.difficulty,
          activity_count: loaded.problems.length,
        };
        return current.some((item) => item.id === loaded.id)
          ? current.map((item) => (item.id === loaded.id ? summary : item))
          : addToHistory
            ? [summary, ...current].slice(0, 100)
            : current;
      });
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#tutor=${loaded.id}`,
      );
      return true;
    },
    [learner],
  );

  const load = useCallback(
    async (id?: string, includeHistory = true) => {
      const sequence = ++loadSequence.current;
      const [sessions, capabilities, loaded] = await Promise.all([
        includeHistory
          ? api<Schema<"TutoringSessionSummaryPublic">[]>("/tutor/sessions")
          : Promise.resolve(null),
        api<Schema<"Features">>(`/learners/${learner}/features`),
        id
          ? api<Schema<"TutoringSessionPublic">>(`/tutor/sessions/${id}`)
          : Promise.resolve(null),
      ]);
      if (!mounted.current || sequence !== loadSequence.current) return;
      if (sessions)
        setHistory(sessions.filter((item) => item.learner_id === learner));
      setFeatures(capabilities);
      setConnectionError("");
      if (loaded) commitSession(loaded);
    },
    [commitSession, learner],
  );

  const selectSession = useCallback(
    async (id: string) => {
      selectingSession.current += 1;
      try {
        await load(id);
        return selectedSession.current === id;
      } catch (cause) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${selectedSession.current ? `#tutor=${selectedSession.current}` : ""}`,
        );
        throw cause;
      } finally {
        selectingSession.current -= 1;
      }
    },
    [load],
  );

  const openRecoveredRequest = useCallback(
    async (receipt: Schema<"TutorRequestReceiptPublic">) => {
      if (!recovery || receipt.kind !== recovery.kind)
        throw new Error(
          "The interrupted request could not be matched. Choose Check saved request to try again.",
        );
      await load(receipt.session_id);
      if (!mounted.current || selectedSession.current !== receipt.session_id)
        return;
      forgetRequest(recovery);
      setRecovery(null);
      setNewSession(false);
      setRecoveryNotice(
        "Your interrupted request was saved. Its session is open below. Your work has not been sent again.",
      );
    },
    [load, recovery],
  );

  const recoverSavedRequest = useCallback(async () => {
    if (!recovery) return;
    setRecovering(true);
    try {
      const receipt = await api<Schema<"TutorRequestReceiptPublic">>(
        `/tutor/request-receipts/${recovery.key}?learner_id=${learner}`,
      );
      if (mounted.current) await openRecoveredRequest(receipt);
    } catch (cause) {
      if (mounted.current) {
        setRecoveryNotice(
          cause instanceof ApiError && cause.status === 404
            ? "The server has not confirmed whether your request was saved. Choose Check saved request to try again. Resolve interrupted request will reopen saved work or clear the request so you can continue. After a reload, this tab remembers which request to check, but loses unsent text and photos."
            : "Your interrupted request could not be checked. Reconnect and choose Check saved request before continuing.",
        );
      }
      if (!(cause instanceof ApiError && cause.status === 404)) throw cause;
    } finally {
      if (mounted.current) setRecovering(false);
    }
  }, [learner, openRecoveredRequest, recovery]);

  const resolveSavedRequest = async () => {
    if (!recovery) return;
    setRecovering(true);
    try {
      const result = await api<Schema<"TutorRequestResolutionPublic">>(
        `/tutor/request-receipts/${recovery.key}/resolve`,
        "POST",
        { learner_id: learner },
      );
      if (!mounted.current) return;
      if (result.status === "accepted" && result.receipt)
        await openRecoveredRequest(result.receipt);
      else if (result.status === "not_accepted") {
        forgetRequest(recovery);
        setRecovery(null);
        setRecoveryNotice(
          "The interrupted request was not saved. The server will reject it if it arrives later. Re-enter any lost text or photo when you are ready.",
        );
      }
    } finally {
      if (mounted.current) setRecovering(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    const id = new URLSearchParams(window.location.hash.slice(1)).get("tutor");
    selectedSession.current = id && /^[a-f0-9-]{36}$/.test(id) ? id : "";
    return () => {
      mounted.current = false;
      loadSequence.current += 1;
    };
  }, [learner]);

  useEffect(() => {
    if (pageActive && !offline && selectingSession.current === 0)
      void act(async () => {
        await load(selectedSession.current || undefined);
        if (recovery) await recoverSavedRequest();
      });
  }, [act, load, offline, page, pageActive, recovery, recoverSavedRequest]);

  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId || !pageActive) return;
    const refresh = () => {
      if (
        polling.current ||
        selectingSession.current > 0 ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      )
        return;
      polling.current = true;
      void load(selectedSession.current, false)
        .catch((cause: unknown) => {
          if (mounted.current)
            setConnectionError(
              cause instanceof Error
                ? cause.message
                : "Reconnect to recover your saved discussion.",
            );
        })
        .finally(() => {
          polling.current = false;
        });
    };
    const timer = window.setInterval(refresh, 2500);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [sessionId, load, pageActive]);

  const refresh = useCallback(async () => {
    if (selectedSession.current) await load(selectedSession.current, false);
  }, [load]);
  const problem = session?.problems.find((item) => item.status === "assigned");
  const activeOperation = problem?.operations.find((operation) =>
    activeStatuses.includes(operation.status),
  );
  const photoOperationRevision =
    problem?.operations
      .map((operation) => `${operation.id}:${operation.status}`)
      .join("|") ?? "";
  const active = Boolean(activeOperation);
  const rejectedCapture =
    problem?.activity_state === "reference_capture"
      ? [...problem.operations]
          .reverse()
          .find(
            (operation) => operation.reading && !operation.reading.can_continue,
          )
      : undefined;
  const disabled =
    blocked ||
    active ||
    offline ||
    Boolean(session && session.status !== "open");
  const topicOverflow = characterCount(topic) > 500;
  const titleOverflow = characterCount(passageTitle) > 200;
  const referenceLength = characterCount(reference);
  const referenceLimit = source === "reading_text" ? 50000 : 8000;
  const referenceOverflow =
    ["reading_text", "reference_text"].includes(source) &&
    referenceLength > referenceLimit;
  const materialOverflow =
    referenceOverflow ||
    (["reading_text", "reading_photo"].includes(source) && titleOverflow);
  const responseLength = characterCount(text);
  const hasResponseDraft = Boolean(
    text.trim() ||
    ((source === "reference_text" || source === "reading_text") &&
      reference.trim()) ||
    (source === "published" && published) ||
    photoDraft,
  );
  const hasDraft =
    hasResponseDraft || Boolean((newSession || !session) && topic.trim());
  const changingSessionDisabled = blocked || active || offline || hasDraft;
  const attachmentsVisible =
    photoPending ||
    (attachmentsOpen && photoOperationRevision === attachmentsOpenedAt);
  useEffect(() => {
    const restoreSession = () => {
      const requested = new URLSearchParams(window.location.hash.slice(1)).get(
        "tutor",
      );
      const target =
        requested && /^[a-f0-9-]{36}$/.test(requested) ? requested : "";
      if (target === selectedSession.current) return;
      if (changingSessionDisabled) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${selectedSession.current ? `#tutor=${selectedSession.current}` : ""}`,
        );
        setNavigationNotice(
          blocked
            ? "Finish or retry your pending request in Practice before switching sessions."
            : hasDraft
              ? "Send or clear your draft in Practice before switching sessions."
              : offline
                ? "Reconnect before opening another session. Your current work is still here."
                : "Wait for the tutor to finish before switching sessions.",
        );
        return;
      }
      setNavigationNotice("");
      setNewSession(false);
      if (target)
        void act(async () => {
          await selectSession(target);
        });
      else {
        loadSequence.current += 1;
        selectedSession.current = "";
        setSession(null);
      }
    };
    window.addEventListener("popstate", restoreSession);
    return () => window.removeEventListener("popstate", restoreSession);
  }, [act, blocked, changingSessionDisabled, hasDraft, offline, selectSession]);
  useEffect(() => {
    onBusyChange?.(blocked);
  }, [blocked, onBusyChange]);
  useEffect(() => {
    onDraftChange?.(hasResponseDraft || Boolean(topic.trim()));
  }, [hasResponseDraft, topic, onDraftChange]);
  useEffect(
    () => () => {
      onBusyChange?.(false);
      onDraftChange?.(false);
    },
    [onBusyChange, onDraftChange],
  );

  const sendCommand = async (request: Command) => {
    const identity: PendingRequestIdentity | null =
      request.kind === "session" ||
      request.kind === "activity" ||
      request.kind === "submission"
        ? { key: request.key, kind: request.kind, owner: learner }
        : null;
    setWorking(true);
    try {
      let created: Schema<"TutoringSessionPublic"> | undefined;
      try {
        if (request.kind === "session")
          created = await api<Schema<"TutoringSessionPublic">>(
            request.path,
            "POST",
            request.body,
            request.key,
          );
        else await api(request.path, "POST", request.body, request.key);
      } catch (cause) {
        // Keep the original payload/key after an uncertain acknowledgement.
        if (
          !request.ambiguous &&
          cause instanceof ApiError &&
          cause.status < 500 &&
          cause.status !== 408
        ) {
          pendingCommand.current = null;
          setPending(null);
          if (identity) forgetRequest(identity);
        } else request.ambiguous = true;
        throw cause;
      }
      pendingCommand.current = null;
      if (identity) forgetRequest(identity);
      if (!mounted.current) return;
      setPending(null);
      if (
        request.kind === "submission" &&
        (request.body as Schema<"SubmissionInput">).kind !== "hint"
      )
        setText("");
      if (
        request.kind === "activity" &&
        ["reference_text", "reading_text"].includes(
          (request.body as Schema<"TutorActivityInput">).source ?? "topic",
        )
      )
        setReference("");
      if (request.kind === "activity") {
        setPublished(null);
        if (
          (request.body as Schema<"TutorActivityInput">).source === "published"
        )
          setSource("topic");
      }
      if (created) {
        setNewSession(false);
        setTopic("");
        setReference("");
        setPublished(null);
        if (
          (request.body as Schema<"TutoringSessionInput">).initial_activity
            ?.source === "published"
        )
          setSource("topic");
        if (!commitSession(created, true)) {
          setConnectionError(
            "The saved session could not be opened for this learner. Reconnect to refresh your sessions.",
          );
          return;
        }
        try {
          await load(created.id);
        } catch {
          if (mounted.current && selectedSession.current === created.id)
            setConnectionError(
              "Your session was saved, but its latest state could not be refreshed. Reconnect to continue.",
            );
        }
      } else if (selectedSession.current === request.sessionId) await refresh();
    } finally {
      if (mounted.current) setWorking(false);
    }
  };
  const command = async (
    kind: Command["kind"],
    path: string,
    body: unknown,
  ) => {
    if (pendingCommand.current || photoPending || recovery) return;
    const request: Command = {
      kind,
      path,
      body,
      key: newKey(),
      sessionId: selectedSession.current,
      ambiguous: false,
    };
    if (kind === "session" || kind === "activity" || kind === "submission")
      rememberRequest({ key: request.key, kind, owner: learner });
    setRecoveryNotice("");
    pendingCommand.current = request;
    setPending(request);
    await sendCommand(request);
  };
  const activity = async (
    nextSource: Source = source,
    nextDifficulty?: Difficulty,
    materialChange?: MaterialChange,
  ) => {
    if (!session) return;
    const body: Schema<"TutorActivityInput"> = {
      source: nextSource,
      ...([
        "reading_text",
        "reading_photo",
        "reading_generated",
        "published",
      ].includes(nextSource)
        ? materialPreferences
        : {}),
      ...materialChange,
      ...(nextDifficulty ? { difficulty: nextDifficulty } : {}),
      ...(nextSource === "reference_text" || nextSource === "reading_text"
        ? { reference_text: reference }
        : {}),
      ...(nextSource === "reading_text" || nextSource === "reading_photo"
        ? { passage_title: passageTitle.trim() || null }
        : {}),
      ...(nextSource === "published"
        ? { source_token: published?.source_token ?? null }
        : {}),
    };
    await command("activity", `/tutor/sessions/${session.id}/activities`, body);
  };
  const submit = async (kind: "answer" | "question" | "hint", level = 0) => {
    if (!problem || (kind !== "hint" && responseLength > 8000)) return;
    await command("submission", `/problems/${problem.id}/submissions`, {
      version: problem.version,
      kind,
      text: kind === "hint" ? "" : text,
      help_level: level,
      work_text: "",
    } satisfies Schema<"SubmissionInput">);
  };

  const repairPhoto = (copyReading: boolean) => {
    if (!problem || !rejectedCapture || disabled || hasResponseDraft) return;
    setSource(
      problem.reference_source === "reading_photo"
        ? "reading_text"
        : "reference_text",
    );
    setPublished(null);
    if (copyReading && !reference.trim())
      setReference(rejectedCapture.interpretation ?? "");
    setPhotoRepair(problem.id);
    if (materialTools.current) materialTools.current.open = true;
    if (sourceTools.current) sourceTools.current.open = true;
    window.requestAnimationFrame(() => materialComposer.current?.focus());
  };

  const sessionSettings = session?.status === "open" && (
    <details className="session-settings">
      <summary>Session settings</summary>
      <form
        key={`${session.id}-${session.initiative}-${session.difficulty}`}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void act(() =>
            command("settings", `/tutor/sessions/${session.id}/settings`, {
              initiative: data.get("initiative") as Initiative,
              difficulty: data.get("difficulty") as Difficulty,
            } satisfies Schema<"TutorSettingsInput">),
          );
        }}
      >
        <label>
          Tutor style for this session
          <select
            name="initiative"
            defaultValue={session.initiative}
            disabled={disabled}
          >
            <InitiativeOptions />
          </select>
        </label>
        <label>
          Activity difficulty
          <select
            name="difficulty"
            defaultValue={session.difficulty}
            disabled={disabled}
          >
            <DifficultyOptions />
          </select>
        </label>
        <button disabled={disabled}>Save session settings</button>
        <p className="fine">
          Difficulty changes future activities and guidance. Tutor style changes
          how often the tutor suggests next steps. Homework is used to create
          different practice on the same concepts.
        </p>
      </form>
    </details>
  );
  const sourceFields = (
    <>
      <PracticeSource
        source={source}
        onChange={(nextSource) => {
          setSource(nextSource);
          setPublished(null);
        }}
        disabled={blocked || active}
      />
      {photoRepair === problem?.id &&
        ["reading_text", "reference_text"].includes(source) && (
          <p className="notice">
            The photo reading is uncertain. Check and correct the material, then
            choose Create practice activity. The original report stays uncertain
            in the conversation.
          </p>
        )}
      {[
        "reading_text",
        "reading_photo",
        "reading_generated",
        "published",
      ].includes(source) && (
        <>
          <p className="fine">
            Use stories, articles, science explanations, history sources, or
            other study text. Work through sections or discuss the whole text.
          </p>
          <MaterialOptions
            value={materialPreferences}
            onChange={setMaterialPreferences}
            disabled={blocked || active}
          />
        </>
      )}
      {(source === "reference_text" || source === "reference_photo") && (
        <p className="notice">
          The tutor uses your material to create different practice on the same
          concepts. It does not answer the original assignment. For reading
          practice, include the passage; the tutor cannot access a book from its
          title.
        </p>
      )}
      {(source === "reading_text" || source === "reading_photo") && (
        <label>
          Passage title (optional)
          <input
            value={passageTitle}
            aria-invalid={titleOverflow || undefined}
            disabled={blocked || active}
            onChange={(event) => setPassageTitle(event.target.value)}
          />
          {titleOverflow && (
            <span role="status">
              Keep the passage title to 200 characters. Your text is still here.
            </span>
          )}
        </label>
      )}
      {source === "reading_generated" && (
        <p>
          The tutor writes an original passage about your learning goal, then
          asks a question. Next activities use the same passage until you choose
          new material.
        </p>
      )}
      {source === "published" && (
        <ReadingSources
          key={learner}
          learner={learner}
          disabled={blocked || active || offline}
          onChange={setPublished}
        />
      )}
      {(source === "reference_text" || source === "reading_text") && (
        <>
          <label>
            {source === "reading_text"
              ? "Reading passage"
              : "Reference material"}
            <textarea
              ref={materialComposer}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              required
              aria-invalid={referenceOverflow || undefined}
              rows={6}
              disabled={blocked || active}
            />
          </label>
          <p className="fine">
            {referenceLength.toLocaleString()} /{" "}
            {source === "reading_text" ? "50,000" : "8,000"} characters
          </p>
          {referenceOverflow && (
            <p role="status" className="notice">
              This material exceeds {referenceLimit.toLocaleString()}{" "}
              characters. Your full text is still here. Shorten it before
              sending.
            </p>
          )}
        </>
      )}
      {(source === "reference_photo" || source === "reading_photo") && (
        <p>
          After you start, send a photo from your phone or upload one here. The
          tutor reads it to create practice. Reading passages stay available for
          questions and feedback.
        </p>
      )}
    </>
  );
  const sessionControls = session?.status === "open" && (
    <>
      <details
        ref={sourceTools}
        className="activity-source"
        open={!problem || undefined}
      >
        <summary>
          {problem
            ? "Use different practice material"
            : "Choose practice material"}
        </summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void act(() => activity());
          }}
        >
          {sourceFields}
          <button
            className="primary"
            disabled={
              disabled ||
              materialOverflow ||
              Boolean(text.trim() || photoDraft) ||
              ((source === "reference_text" || source === "reading_text") &&
                !reference.trim()) ||
              ((source === "reference_photo" || source === "reading_photo") &&
                !features?.photos_available) ||
              (source === "published" && !published)
            }
          >
            Create practice activity
          </button>
        </form>
        <ContextHelp topic="How is my reference used?">
          <p>
            Reading passages stay available for questions and feedback. Paste or
            photograph text, ask for an original passage, or load one of the
            published sources. Assignments guide different practice on related
            concepts. A book title alone does not supply its text.
          </p>
        </ContextHelp>
      </details>
      {sessionSettings}
    </>
  );

  return (
    <section
      className="tutor"
      aria-label="AI tutor"
      aria-busy={working || active}
    >
      {navigationNotice && changingSessionDisabled && (
        <p role="status" className="notice">
          {navigationNotice}
        </p>
      )}
      <section
        hidden={page !== "history"}
        aria-labelledby="saved-sessions-heading"
      >
        <h2 id="saved-sessions-heading">Saved sessions</h2>
        <p>Open a saved session to review your work or keep practicing.</p>
        {history.length === 100 && (
          <p className="fine">
            Showing the 100 most recent sessions. Older retained work is
            available through your administrator’s data export.
          </p>
        )}
        {hasDraft && (
          <p className="notice">
            You have an unsent draft in Practice. Send or clear it before
            opening a different session.
          </p>
        )}
        {blocked && (
          <p role="status">
            Finish or retry your pending request in Practice before opening
            another session.
          </p>
        )}
        {features && history.length === 0 && (
          <div className="card empty-state">
            <h3>No saved sessions yet</h3>
            <p>Your sessions will appear here after you start practicing.</p>
            <button onClick={() => onNavigate?.("practice")}>
              Go to Practice
            </button>
          </div>
        )}
        <div className="session-list">
          {history.map((item) => (
            <article className="card session-card" key={item.id}>
              <h3>{item.topic}</h3>
              <p className="fine">
                {item.status === "open" ? "In progress" : "Finished"} ·{" "}
                {item.activity_count}{" "}
                {item.activity_count === 1 ? "activity" : "activities"}
              </p>
              <button
                disabled={
                  item.id === session?.id ? blocked : changingSessionDisabled
                }
                onClick={() =>
                  void act(async () => {
                    if (
                      item.id !== session?.id &&
                      !(await selectSession(item.id))
                    )
                      return;
                    setNewSession(false);
                    onNavigate?.("practice");
                  })
                }
              >
                {item.status === "open" ? "Continue session" : "Review session"}
              </button>
            </article>
          ))}
        </div>
      </section>
      <div hidden={page !== "practice"}>
        <div className="section-heading">
          <div>
            <h2>
              {newSession || !session
                ? "Start a practice session"
                : session.topic}
            </h2>
            {!session && (
              <p>
                Choose a topic or add reference material. Start session creates
                your first activity.
              </p>
            )}
          </div>
          {session && !newSession && (
            <button
              disabled={changingSessionDisabled}
              onClick={() => setNewSession(true)}
            >
              New session
            </button>
          )}
        </div>
        {!features && <p role="status">Checking tutor availability…</p>}
        {features?.tutoring_available &&
          (features.text_processing === "mock" ? (
            <div className="notice" role="status">
              <strong>Demo tutor — sample responses only</strong>
              <p>
                An actual AI model is needed for tutoring. Ask the adult who
                manages this app to connect an AI model.
              </p>
            </div>
          ) : (
            <p className="fine">
              Text processing:{" "}
              {features.text_processing === "local_network"
                ? "your local network"
                : features.text_processing === "cloud"
                  ? "cloud provider"
                  : features.text_processing}
              .
            </p>
          ))}
        {features && !features.tutoring_available && (
          <div className="notice" role="status">
            <h3>Tutoring is not available yet</h3>
            <p>{features.tutor_status}</p>
            <p>Ask the adult who manages this app to check its setup.</p>
            <div className="actions">
              <button onClick={() => onNavigate?.("help", "setup")}>
                Setup help
              </button>
            </div>
          </div>
        )}
        {(newSession || !session) && (
          <form
            className="card"
            onSubmit={(event) => {
              event.preventDefault();
              void act(() =>
                command("session", "/tutor/sessions", {
                  learner_id: learner,
                  topic,
                  initiative,
                  difficulty,
                  initial_activity: {
                    source,
                    ...([
                      "reading_text",
                      "reading_photo",
                      "reading_generated",
                      "published",
                    ].includes(source)
                      ? materialPreferences
                      : {}),
                    ...(source === "reference_text" || source === "reading_text"
                      ? { reference_text: reference }
                      : {}),
                    ...(source === "reading_text" || source === "reading_photo"
                      ? { passage_title: passageTitle.trim() || null }
                      : {}),
                    ...(source === "published"
                      ? { source_token: published?.source_token ?? null }
                      : {}),
                  },
                } satisfies Schema<"TutoringSessionInput">),
              );
            }}
          >
            <label>
              Topic or learning goal
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                aria-invalid={topicOverflow || undefined}
                required
                disabled={blocked}
                placeholder="e.g. photosynthesis, persuasive writing, or a book passage"
              />
              {topicOverflow && (
                <span role="status">
                  Keep the topic to 500 characters. Your text is still here.
                </span>
              )}
            </label>
            <ContextHelp topic="What can I practice?">
              <p>
                Use any subject or question: fractions, persuasive writing,
                photosynthesis, or a passage you are reading. You can add
                reference material below before starting the session.
              </p>
            </ContextHelp>
            <label>
              Activity difficulty
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as Difficulty)
                }
                disabled={blocked}
              >
                <DifficultyOptions />
              </select>
            </label>
            <p className="fine">
              Choose Easier to work on the basics or Harder for questions that
              need more steps and explanation. You can change this during the
              session.
            </p>
            <fieldset className="tutor-preferences">
              <legend>Tutor style</legend>
              <label>
                Tutor style
                <select
                  value={initiative}
                  onChange={(event) =>
                    setInitiative(event.target.value as Initiative)
                  }
                  disabled={blocked}
                >
                  <InitiativeOptions />
                </select>
              </label>
              <p className="fine">
                “Suggest what to do next” suggests next steps regularly. “Decide
                together” offers a suggestion and lets you choose. “Follow my
                questions” waits for you to ask for help. All three give
                feedback on your work.
              </p>
            </fieldset>
            {sourceFields}
            <div className="actions">
              <button
                className="primary"
                disabled={
                  blocked ||
                  offline ||
                  !topic.trim() ||
                  topicOverflow ||
                  materialOverflow ||
                  !features?.tutoring_available ||
                  ((source === "reference_text" || source === "reading_text") &&
                    !reference.trim()) ||
                  ((source === "reference_photo" ||
                    source === "reading_photo") &&
                    !features?.photos_available) ||
                  (source === "published" && !published)
                }
              >
                Start session
              </button>
              {session && (
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => setNewSession(false)}
                >
                  Back to current session
                </button>
              )}
            </div>
          </form>
        )}
        {working && <BusyStatus message="Saving your request…" />}
        {(recovery || recoveryNotice) && (
          <div role="status" className="notice">
            <p>
              {recoveryNotice ||
                "Checking whether the server saved your interrupted request…"}
            </p>
            {recovery && (
              <div className="actions">
                <button
                  disabled={offline || recovering}
                  onClick={() => void act(recoverSavedRequest)}
                >
                  Check saved request
                </button>
                <button
                  disabled={offline || recovering}
                  onClick={() => void act(resolveSavedRequest)}
                >
                  Resolve interrupted request
                </button>
              </div>
            )}
          </div>
        )}
        {pending && !working && (
          <div role="status" className="notice">
            <p>
              Your request may have reached the server. Retry it to check; this
              keeps the original request and avoids a duplicate.
            </p>
            <button
              disabled={offline}
              onClick={() => void act(() => sendCommand(pending))}
            >
              Retry saved request
            </button>
          </div>
        )}
        {connectionError && (
          <p role="status" className="error">
            {connectionError}
          </p>
        )}
        {session && (
          <div hidden={newSession}>
            {hasResponseDraft && (
              <p className="fine">
                Send or clear your draft before starting a different activity or
                session.
              </p>
            )}
            {session.status !== "open" && <SessionReview session={session} />}
            <div
              className={`tutor-workspace${problem?.passage ? " reading-workspace" : ""}`}
            >
              {(session.status === "open" || problem?.passage) && (
                <aside
                  className="tutor-sidebar"
                  aria-label="Passage and session tools"
                >
                  {problem?.passage && (
                    <ReadingPassage
                      key={problem.id}
                      passage={problem.passage}
                      focus={problem.material_focus}
                      disabled={
                        disabled ||
                        hasResponseDraft ||
                        problem.activity_state !== "ready"
                      }
                      onAsk={
                        session.status === "open"
                          ? (question) => {
                              setText(question);
                              composer.current?.focus();
                            }
                          : undefined
                      }
                    />
                  )}
                  {problem?.material_focus && session.status === "open" && (
                    <MaterialNavigation
                      key={`${problem.id}-${problem.material_focus.mode}-${problem.material_focus.section_size}-${problem.material_focus.section_index}`}
                      focus={problem.material_focus}
                      disabled={disabled || hasResponseDraft}
                      onChange={(change) =>
                        void act(() =>
                          activity("same_passage", undefined, change),
                        )
                      }
                    />
                  )}
                  {session.status === "open" && (
                    <details ref={materialTools} open={!problem || undefined}>
                      <summary>Session &amp; material</summary>
                      {sessionControls}
                    </details>
                  )}
                </aside>
              )}
              <article className="tutor-activity chat-column">
                {problem && (
                  <details className="activity-brief" open>
                    <summary>
                      <h3>
                        {problem.activity_state === "reference_capture"
                          ? problem.reference_source === "reading_photo"
                            ? "Reading passage photograph"
                            : "Reference material"
                          : "Current activity"}
                      </h3>
                    </summary>
                    <SafeText text={problem.problem_text} />
                    <ActivityPurpose problem={problem} />
                    <p className="fine">
                      Saved automatically ·{" "}
                      {difficultyLabel(session.difficulty)} difficulty
                    </p>
                    {problem.concept_focus && !problem.learning_goal && (
                      <p className="fine">Focus: {problem.concept_focus}</p>
                    )}
                  </details>
                )}
                <TutorConversation
                  session={session}
                  offline={offline}
                  disabled={blocked}
                  active={pageActive && page === "practice" && !newSession}
                  act={act}
                  refresh={refresh}
                />
                <div className="tutor-response">
                  {active && (
                    <BusyStatus
                      message={
                        activeOperation?.status === "interpreting"
                          ? "Reading your photograph…"
                          : problem?.activity_state === "generating"
                            ? "Preparing your activity…"
                            : "Preparing tutor response…"
                      }
                    />
                  )}
                  {problem?.activity_state === "generating" && !active && (
                    <p role="status">
                      No activity is ready yet. Retry the failed request above,
                      or choose new practice material.
                    </p>
                  )}
                  {problem?.activity_state === "reference_capture" && (
                    <div>
                      <p>
                        {problem.reference_source === "reading_photo"
                          ? "Attach a photo of the passage to study it."
                          : "Attach a photo of your reference material to create related practice."}
                      </p>
                      {rejectedCapture && (
                        <>
                          <p>
                            Ask about the uncertain reading below, send a
                            clearer photo, or type corrected material to create
                            an activity. Sending a question keeps this photo
                            step open.
                          </p>
                          <div className="actions">
                            <button
                              disabled={disabled || hasResponseDraft}
                              onClick={() => repairPhoto(false)}
                            >
                              Type corrected material
                            </button>
                            {rejectedCapture.interpretation && (
                              <button
                                disabled={disabled || hasResponseDraft}
                                onClick={() => repairPhoto(true)}
                              >
                                Edit uncertain reading as text
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {problem &&
                    (problem.activity_state === "ready" || rejectedCapture) && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void act(() =>
                            submit(rejectedCapture ? "question" : "answer"),
                          );
                        }}
                      >
                        <label>
                          {rejectedCapture
                            ? "Your question or clarification"
                            : "Your work or question"}
                          <textarea
                            ref={composer}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            aria-invalid={responseLength > 8000 || undefined}
                            rows={2}
                            readOnly={disabled}
                            placeholder={
                              rejectedCapture
                                ? "Ask about the uncertain reading or explain the unclear part…"
                                : "Share your thinking, ask a question, or discuss a photo…"
                            }
                          />
                        </label>
                        {responseLength > 8000 && (
                          <p role="status" className="notice">
                            Your response contains{" "}
                            {responseLength.toLocaleString()} characters. Your
                            full text is still here. Shorten it to 8,000
                            characters before sending.
                          </p>
                        )}
                        <div className="composer-actions">
                          {!rejectedCapture && (
                            <button
                              type="button"
                              aria-expanded={attachmentsVisible}
                              aria-controls="tutor-attachments"
                              disabled={blocked}
                              onClick={() => {
                                const next = !attachmentsVisible;
                                setAttachmentsOpen(next);
                                if (next)
                                  setAttachmentsOpenedAt(
                                    photoOperationRevision,
                                  );
                              }}
                            >
                              Attach photo
                            </button>
                          )}
                          {!rejectedCapture && (
                            <ComposerMenu
                              title="Help"
                              disabled={blocked}
                              onOpen={() => setAttachmentsOpen(false)}
                            >
                              <div className="composer-options">
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    void act(() => submit("hint", 1))
                                  }
                                >
                                  Give me a hint
                                </button>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    void act(() => submit("hint", 2))
                                  }
                                >
                                  Explain the concept
                                </button>
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() =>
                                    void act(() => submit("hint", 3))
                                  }
                                >
                                  Show a different example
                                </button>
                              </div>
                            </ComposerMenu>
                          )}
                          {!rejectedCapture && (
                            <ComposerMenu
                              title="Next activity options"
                              className="next-menu"
                              disabled={blocked}
                              onOpen={() => setAttachmentsOpen(false)}
                            >
                              <div className="composer-options">
                                <button
                                  type="button"
                                  disabled={disabled || hasResponseDraft}
                                  onClick={() =>
                                    void act(() =>
                                      activity(
                                        problem.passage
                                          ? "same_passage"
                                          : "topic",
                                      ),
                                    )
                                  }
                                >
                                  Next activity
                                </button>
                                <button
                                  type="button"
                                  disabled={disabled || hasResponseDraft}
                                  onClick={() =>
                                    void act(() =>
                                      activity(
                                        problem.passage
                                          ? "same_passage"
                                          : "topic",
                                        "introductory",
                                      ),
                                    )
                                  }
                                >
                                  Easier next activity
                                </button>
                                <button
                                  type="button"
                                  disabled={disabled || hasResponseDraft}
                                  onClick={() =>
                                    void act(() =>
                                      activity(
                                        problem.passage
                                          ? "same_passage"
                                          : "topic",
                                        "challenge",
                                      ),
                                    )
                                  }
                                >
                                  Harder next activity
                                </button>
                              </div>
                            </ComposerMenu>
                          )}
                          {session.status === "open" && (
                            <button
                              type="button"
                              disabled={disabled || hasResponseDraft}
                              onClick={() =>
                                void act(() =>
                                  command(
                                    "finish",
                                    `/sessions/${session.id}/finish`,
                                    {},
                                  ),
                                )
                              }
                            >
                              Finish session
                            </button>
                          )}
                          <button
                            className="primary send-message"
                            disabled={
                              disabled || !text.trim() || responseLength > 8000
                            }
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    )}
                  {session.status === "open" &&
                    problem?.activity_state !== "ready" &&
                    !rejectedCapture && (
                      <button
                        disabled={disabled || hasResponseDraft}
                        onClick={() =>
                          void act(() =>
                            command(
                              "finish",
                              `/sessions/${session.id}/finish`,
                              {},
                            ),
                          )
                        }
                      >
                        Finish session
                      </button>
                    )}
                  {problem && (
                    <div
                      id="tutor-attachments"
                      className="tutor-attachments"
                      hidden={
                        !attachmentsVisible &&
                        problem.activity_state !== "reference_capture"
                      }
                    >
                      <p className="fine">{features?.photo_status}</p>
                      {(features?.photos_available ||
                        photoDraft ||
                        photoPending) && (
                        <>
                          <PhoneLink
                            key={`phone-${problem.id}-${problem.version}`}
                            problem={problem.id}
                            version={problem.version}
                            disabled={disabled || !features?.photos_available}
                            act={act}
                            onHelp={() => onNavigate?.("help", "phone")}
                          />
                          <PhotoInput
                            expanded
                            learner={learner}
                            key={problem.id}
                            problem={problem.id}
                            version={problem.version}
                            disabled={
                              active ||
                              working ||
                              pending !== null ||
                              recovery !== null ||
                              offline ||
                              !features?.photos_available ||
                              session.status !== "open"
                            }
                            onPendingChange={setPhotoPending}
                            onDraftChange={setPhotoDraft}
                            act={act}
                            onSaved={async () => {
                              await refresh();
                              setAttachmentsOpen(false);
                            }}
                            reference={
                              problem.activity_state === "reference_capture"
                            }
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </article>
            </div>
          </div>
        )}
        {features?.tutoring_available && (
          <ContextHelp topic="Where does my work go?">
            <p>
              {features.tutor_status} Text and references are processed by:{" "}
              {features.text_processing}.
            </p>
            <p>AI feedback can be mistaken and is not a verified grade.</p>
            <button onClick={() => onNavigate?.("help", "privacy")}>
              Privacy help
            </button>
          </ContextHelp>
        )}
      </div>
    </section>
  );
}
