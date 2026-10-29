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
import { LearningGoal } from "./LearningGoal";
import { LearningLevelPicker } from "./LearningLevelPicker";
import { SessionSettings } from "./SessionSettings";
import {
  invalidLearningLevel,
  normalizeLearningLevel,
  type LearningLevelValue,
} from "./learning-levels";
import {
  challengeOptions,
  guidanceOptions,
  materialChoices,
  preferenceLabels,
  type LearningIntent,
} from "./practice-options";
import { SessionReview } from "./SessionReview";
import { RequestRecovery } from "./RequestRecovery";
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
      {guidanceOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}
function DifficultyOptions() {
  return (
    <>
      {challengeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}
function difficultyLabel(value: Difficulty) {
  return (
    challengeOptions.find((option) => option.value === value)?.label ??
    "Apply and explain"
  );
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
  const [historyState, setHistoryState] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [session, setSession] =
    useState<Schema<"TutoringSessionPublic"> | null>(null);
  const [features, setFeatures] = useState<Schema<"Features"> | null>(null);
  const [topic, setTopic] = useState("");
  const [learningIntent, setLearningIntent] =
    useState<LearningIntent>("practice");
  const [initiative, setInitiative] = useState<Initiative>("balanced");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [learningLevel, setLearningLevel] = useState<LearningLevelValue | null>(
    null,
  );
  const [source, setSource] = useState<Source>("topic");
  const [reference, setReference] = useState("");
  const [passageTitle, setPassageTitle] = useState("");
  const [materialPreferences, setMaterialPreferences] =
    useState<MaterialPreferences>({
      reading_mode: "guided",
      section_size: "standard",
    });
  const composer = useRef<HTMLTextAreaElement>(null);
  const activityBrief = useRef<HTMLDetailsElement>(null);
  const attachmentsPanel = useRef<HTMLDivElement>(null);
  const focusAttachmentsOnOpen = useRef(false);
  const materialComposer = useRef<HTMLTextAreaElement>(null);
  const materialTools = useRef<HTMLDetailsElement>(null);
  const sourceTools = useRef<HTMLDetailsElement>(null);
  const [photoRepair, setPhotoRepair] = useState("");
  const [published, setPublished] = useState<Schema<"ImportedPassage"> | null>(
    null,
  );
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [pending, setPending] = useState<Command | null>(null);
  const [recovery, setRecovery] = useState(() =>
    readRememberedRequest(learner),
  );
  const [recovering, setRecovering] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(false);
  const [capturePhotoId, setCapturePhotoId] = useState<string | null>(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsOpenedAt, setAttachmentsOpenedAt] = useState("");
  const [newSession, setNewSession] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [navigationNotice, setNavigationNotice] = useState("");
  const pendingCommand = useRef<Command | null>(null);
  const mounted = useRef(true);
  const selectedSession = useRef("");
  const displayedSession = useRef("");
  const loadSequence = useRef(0);
  const polling = useRef(false);
  const selectingSession = useRef(0);
  const blocked =
    working ||
    selecting ||
    pending !== null ||
    photoPending ||
    recovery !== null;
  const recoveryIdentity: PendingRequestIdentity | null =
    recovery ??
    (pending && ["session", "activity", "submission"].includes(pending.kind)
      ? {
          key: pending.key,
          kind: pending.kind as PendingRequestIdentity["kind"],
          owner: learner,
        }
      : null);
  const clearCommandDraft = useCallback((request: Command) => {
    if (
      request.kind === "submission" &&
      (request.body as Schema<"SubmissionInput">).kind !== "hint"
    )
      setText("");
    if (request.kind === "activity") {
      const restoreFocus = materialTools.current?.contains(
        document.activeElement,
      );
      if (sourceTools.current) sourceTools.current.open = false;
      if (materialTools.current) materialTools.current.open = false;
      if (restoreFocus)
        materialTools.current?.querySelector("summary")?.focus();
      const source = (request.body as Schema<"TutorActivityInput">).source;
      if (source === "reference_text" || source === "reading_text")
        setReference("");
      setPublished(null);
      if (source === "published") setSource("topic");
    }
    if (request.kind === "session") {
      setTopic("");
      setReference("");
      setPublished(null);
      const body = request.body as Schema<"TutoringSessionInput">;
      if (body.initial_activity?.source === "published")
        setSource(
          materialChoices(body.learning_intent ?? "practice")[0]!.value,
        );
    }
  }, []);

  const commitSession = useCallback(
    (loaded: Schema<"TutoringSessionPublic">, addToHistory = false) => {
      if (loaded.learner_id !== learner) {
        selectedSession.current = "";
        displayedSession.current = "";
        setSession(null);
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        return false;
      }
      selectedSession.current = loaded.id;
      displayedSession.current = loaded.id;
      setSession(loaded);
      const capture = loaded.problems.find(
        (item) =>
          item.status === "assigned" &&
          item.activity_state === "reference_capture",
      );
      if (capture) setCapturePhotoId(capture.id);
      setHistory((current) => {
        const summary: Schema<"TutoringSessionSummaryPublic"> = {
          id: loaded.id,
          learner_id: loaded.learner_id,
          status: loaded.status,
          topic: loaded.topic,
          learning_intent: loaded.learning_intent,
          learning_level: loaded.learning_level ?? null,
          initiative: loaded.initiative,
          difficulty: loaded.difficulty,
          activity_count: loaded.problems.length,
          created_at: loaded.created_at,
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
      const [sessions, capabilities, loaded] = await Promise.allSettled([
        includeHistory
          ? api<Schema<"TutoringSessionSummaryPublic">[]>("/tutor/sessions")
          : Promise.resolve(null),
        api<Schema<"Features">>(`/learners/${learner}/features`),
        id
          ? api<Schema<"TutoringSessionPublic">>(`/tutor/sessions/${id}`)
          : Promise.resolve(null),
      ]);
      if (!mounted.current || sequence !== loadSequence.current) return false;
      let opened = false;
      if (sessions.status === "fulfilled" && sessions.value) {
        setHistory(
          sessions.value.filter((item) => item.learner_id === learner),
        );
        setHistoryState("ready");
      } else if (sessions.status === "rejected") setHistoryState("failed");
      if (capabilities.status === "fulfilled") setFeatures(capabilities.value);
      setConnectionError("");
      if (loaded.status === "fulfilled") {
        if (loaded.value) opened = commitSession(loaded.value);
      } else if (
        loaded.reason instanceof ApiError &&
        loaded.reason.status === 404
      ) {
        if (selectedSession.current === id && displayedSession.current !== id) {
          selectedSession.current = "";
          setSession(null);
          setNewSession(false);
          setConnectionError(
            "This saved session is no longer available. Start a new session or choose another one in History.",
          );
        } else {
          setConnectionError(
            "That saved session is no longer available. Your current work is still here. Choose another session in History or start a new one.",
          );
        }
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${selectedSession.current ? `#tutor=${selectedSession.current}` : ""}`,
        );
      } else throw loaded.reason;
      if (capabilities.status === "rejected") throw capabilities.reason;
      return opened;
    },
    [commitSession, learner],
  );

  const selectSession = useCallback(
    async (id: string) => {
      selectingSession.current += 1;
      setSelecting(true);
      try {
        const opened = await load(id);
        return opened && selectedSession.current === id;
      } catch (cause) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${selectedSession.current ? `#tutor=${selectedSession.current}` : ""}`,
        );
        throw cause;
      } finally {
        selectingSession.current -= 1;
        if (mounted.current) setSelecting(selectingSession.current > 0);
      }
    },
    [load],
  );

  const releaseUnacceptedRequest = async (identity: PendingRequestIdentity) => {
    forgetRequest(identity);
    if (pendingCommand.current?.key === identity.key) {
      pendingCommand.current = null;
      setPending(null);
    }
    setRecovery(null);
    setRecoveryNotice(
      "The interrupted request was not saved. The server will reject it if it arrives later. Your draft is still here; re-enter anything lost before this tab was reopened.",
    );
    if (selectedSession.current) {
      setWorking(true);
      try {
        await refresh();
      } catch {
        if (mounted.current)
          setConnectionError(
            "The interrupted request was cleared, but the current activity could not refresh. Reconnect to continue; your draft is still here.",
          );
      } finally {
        if (mounted.current) setWorking(false);
      }
    }
  };

  const openRecoveredRequest = useCallback(
    async (
      receipt: Schema<"TutorRequestReceiptPublic">,
      identity: PendingRequestIdentity,
    ) => {
      const opened = await load(receipt.session_id);
      if (!mounted.current) return;
      if (!opened || selectedSession.current !== receipt.session_id)
        throw new Error(
          "The saved request could not be opened. Check its saved request again before continuing.",
        );
      const request = pendingCommand.current;
      if (request?.key === identity.key) {
        clearCommandDraft(request);
        pendingCommand.current = null;
        setPending(null);
      }
      forgetRequest(identity);
      setRecovery(null);
      setNewSession(false);
      setRecoveryNotice(
        "Your interrupted request was saved. Its session is open below. Your work has not been sent again.",
      );
    },
    [clearCommandDraft, load],
  );

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
      });
  }, [act, load, offline, page, pageActive]);

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
  const refreshHistory = async () => {
    if (refreshingHistory) return;
    setRefreshingHistory(true);
    try {
      await load(selectedSession.current || undefined);
    } finally {
      if (mounted.current) setRefreshingHistory(false);
    }
  };
  const problem = session?.problems.find((item) => item.status === "assigned");
  const sourcePhotoFlow =
    problem?.activity_state === "reference_capture" ||
    Boolean(
      problem && capturePhotoId === problem.id && (photoDraft || photoPending),
    );
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
  const hasSetupDraft = Boolean(
    (newSession || !session) &&
    (topic.trim() ||
      reference.trim() ||
      passageTitle.trim() ||
      published ||
      learningLevel),
  );
  const hasDraft = hasResponseDraft || hasSetupDraft;
  const changingSessionDisabled = blocked || active || offline || hasDraft;
  const attachmentsVisible =
    photoPending ||
    (attachmentsOpen && photoOperationRevision === attachmentsOpenedAt);
  useEffect(() => {
    if (!focusAttachmentsOnOpen.current) return;
    focusAttachmentsOnOpen.current = false;
    if (attachmentsVisible && pageActive && page === "practice" && !newSession)
      attachmentsPanel.current?.focus();
  }, [attachmentsVisible, pageActive, page, newSession]);
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
        displayedSession.current = "";
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
    onDraftChange?.(hasResponseDraft || hasSetupDraft || Boolean(topic.trim()));
  }, [hasResponseDraft, hasSetupDraft, topic, onDraftChange]);
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
      clearCommandDraft(request);
      if (created) {
        setNewSession(false);
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
    <SessionSettings
      key={session.id}
      session={session}
      disabled={disabled}
      onSave={(settings) =>
        void act(() =>
          command(
            "settings",
            `/tutor/sessions/${session.id}/settings`,
            settings,
          ),
        )
      }
    />
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
        intent={newSession || !session ? learningIntent : undefined}
      />
      {(source === "reference_photo" || source === "reading_photo") &&
        features &&
        !features.photos_available && (
          <div className="notice" role="status">
            <p>{features.photo_status}</p>
            <p>
              Choose a pasted-text input to continue without a photo, or ask the
              adult who manages this app to check the photo reader in Settings.
            </p>
          </div>
        )}
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
          {session && !newSession && (
            <MaterialOptions
              value={materialPreferences}
              onChange={setMaterialPreferences}
              disabled={blocked || active}
            />
          )}
        </>
      )}
      {(source === "reference_text" || source === "reference_photo") && (
        <p className="notice">
          We’ll use the ideas in your homework to make different practice. The
          tutor will help you learn without completing the assignment for you.
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
          onChange={(selection) => {
            setPublished(selection);
            if (selection && (newSession || !session))
              setTopic((current) =>
                current.trim() ? current : selection.passage.title,
              );
          }}
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
          Choose{" "}
          {newSession || !session
            ? "Start learning"
            : "Create practice activity"}
          , then add your photo right here. You can upload one or use your
          phone. The tutor will read it before we continue.
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

  const photoTools = problem && (
    <>
      <p className="fine">{features?.photo_status}</p>
      {(features?.photos_available || photoDraft || photoPending) && (
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
              selecting ||
              pending !== null ||
              recovery !== null ||
              offline ||
              !features?.photos_available ||
              session?.status !== "open"
            }
            onPendingChange={setPhotoPending}
            onDraftChange={setPhotoDraft}
            act={act}
            onSaved={async () => {
              await refresh();
              setAttachmentsOpen(false);
              setCapturePhotoId(null);
            }}
            reference={problem.activity_state === "reference_capture"}
          />
        </>
      )}
    </>
  );

  return (
    <section
      className="tutor"
      aria-label="AI tutor"
      aria-busy={working || selecting || active || recovering}
    >
      {selecting && <BusyStatus message="Opening saved session…" />}
      {navigationNotice && changingSessionDisabled && (
        <p role="status" className="notice">
          {navigationNotice}
        </p>
      )}
      {connectionError && (
        <p role="status" className="error">
          {connectionError}
        </p>
      )}
      <section
        hidden={page !== "history"}
        aria-labelledby="saved-sessions-heading"
      >
        <h2 id="saved-sessions-heading">Saved sessions</h2>
        <p>Open a saved session to review your work or keep practicing.</p>
        {historyState === "loading" && (
          <p role="status">Loading saved sessions…</p>
        )}
        {historyState === "failed" && (
          <div role="status" className="error">
            <p>
              Saved sessions could not load. Your saved work has not been
              removed.
            </p>
            <button
              disabled={offline || refreshingHistory}
              onClick={() => void act(refreshHistory)}
            >
              {refreshingHistory
                ? "Loading saved sessions…"
                : "Reload saved sessions"}
            </button>
          </div>
        )}
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
        {historyState === "ready" && history.length === 0 && (
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
              <h3 id={`saved-session-${item.id}-topic`}>{item.topic}</h3>
              <p className="fine" id={`saved-session-${item.id}-date`}>
                Started{" "}
                <time dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </p>
              <p className="fine">
                {item.status === "open" ? "In progress" : "Finished"} ·{" "}
                {item.activity_count}{" "}
                {item.activity_count === 1 ? "activity" : "activities"}
              </p>
              <button
                aria-describedby={`saved-session-${item.id}-topic saved-session-${item.id}-date`}
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
            <h2>{newSession || !session ? "Start learning" : session.topic}</h2>
            {!session && (
              <p>Choose what you want to work on. We’ll take it from there.</p>
            )}
          </div>
          {session && !newSession && (
            <button
              disabled={changingSessionDisabled}
              onClick={() => {
                const choices = materialChoices(learningIntent);
                if (!choices.some((choice) => choice.value === source))
                  setSource(choices[0]!.value);
                setNewSession(true);
              }}
            >
              New session
            </button>
          )}
        </div>
        {!features && <p role="status">Checking tutor availability…</p>}
        {features?.tutoring_available &&
          (features.text_processing === "mock" ? (
            <div className="notice tutor-disclosure" role="status">
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
              if (blocked || invalidLearningLevel(learningLevel)) return;
              void act(() =>
                command("session", "/tutor/sessions", {
                  learner_id: learner,
                  topic,
                  learning_intent: learningIntent,
                  ...(normalizeLearningLevel(learningLevel)
                    ? { learning_level: normalizeLearningLevel(learningLevel) }
                    : {}),
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
            <LearningGoal
              value={learningIntent}
              disabled={blocked || offline}
              onChange={(intent) => {
                setLearningIntent(intent);
                const choices = materialChoices(intent);
                if (!choices.some((choice) => choice.value === source))
                  setSource(choices[0]!.value);
              }}
            />
            <label>
              What are you working on?
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                aria-invalid={topicOverflow || undefined}
                required
                disabled={blocked}
                placeholder={
                  {
                    understand: "e.g. how photosynthesis works",
                    practice: "e.g. adding fractions",
                    read: "e.g. the characters in this story",
                    write: "e.g. writing a clear argument",
                    review: "e.g. reviewing cell biology",
                    homework: "e.g. the ideas in this assignment",
                    other: "Tell the tutor what you have in mind",
                  }[learningIntent]
                }
              />
              {topicOverflow && (
                <span role="status">
                  Keep the topic to 500 characters. Your text is still here.
                </span>
              )}
            </label>
            {sourceFields}
            <details
              className="session-preferences"
              hidden={source === "published" && !published}
            >
              <summary>{preferenceLabels(learningIntent).summary}</summary>
              {learningIntent === "read" && (
                <p className="fine">
                  Start with the defaults, or adjust the tutor’s questions and
                  guidance.{" "}
                  {source !== "reading_generated" &&
                    "The original text stays unchanged. "}
                  You can change these choices later in Session settings.
                </p>
              )}
              <LearningLevelPicker
                value={learningLevel}
                onChange={setLearningLevel}
                disabled={blocked}
                defaultSubject={learningIntent === "read" ? "reading" : ""}
              />
              <label>
                {preferenceLabels(learningIntent).challenge}
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
              <label>
                How much guidance would you like?
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
                {
                  {
                    tutor_led:
                      "The tutor will suggest a useful next step while you work.",
                    balanced: "You and the tutor will decide what to try next.",
                    learner_led:
                      "You choose the direction; the tutor follows your questions.",
                  }[initiative]
                }
              </p>
              {[
                "reading_text",
                "reading_photo",
                "reading_generated",
                "published",
              ].includes(source) && (
                <MaterialOptions
                  value={materialPreferences}
                  onChange={setMaterialPreferences}
                  disabled={blocked}
                />
              )}
            </details>
            <div className="actions">
              <button
                className="primary"
                disabled={
                  blocked ||
                  offline ||
                  !topic.trim() ||
                  topicOverflow ||
                  invalidLearningLevel(learningLevel) ||
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
                Start learning
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
        {recoveryNotice && (
          <div role="status" className="notice">
            <p>{recoveryNotice}</p>
          </div>
        )}
        {recoveryIdentity && !working && (
          <RequestRecovery
            key={recoveryIdentity.key}
            identity={recoveryIdentity}
            offline={offline}
            autoCheck={Boolean(recovery)}
            act={act}
            onBusyChange={setRecovering}
            onAccepted={(receipt) =>
              openRecoveredRequest(receipt, recoveryIdentity)
            }
            onNotAccepted={() => releaseUnacceptedRequest(recoveryIdentity)}
          />
        )}
        {pending && !working && (
          <div role="status" className="notice">
            <p>
              Your request may have reached the server. Retry it to check; this
              keeps the original request and avoids a duplicate.
            </p>
            <button
              disabled={offline || recovering}
              onClick={() => void act(() => sendCommand(pending))}
            >
              Retry saved request
            </button>
          </div>
        )}
        {session && (
          <div className="active-session" hidden={newSession}>
            {hasResponseDraft && (
              <p className="fine">
                Send or clear your draft before starting a different activity or
                session.
              </p>
            )}
            {session.status !== "open" && <SessionReview session={session} />}
            <div className="session-toolbar">
              {session.status === "open" && (
                <details ref={materialTools} open={!problem || undefined}>
                  <summary>Session &amp; material</summary>
                  {sessionControls}
                </details>
              )}
            </div>
            <div className="tutor-workspace tutor-activity">
              {(session.status === "open" || problem?.passage) && (
                <aside
                  className="activity-panel"
                  aria-label="Activity and source"
                >
                  {problem && (
                    <details
                      ref={activityBrief}
                      className="activity-brief"
                      open
                    >
                      <summary>
                        <h3>
                          {problem.activity_state === "reference_capture"
                            ? problem.reference_source === "reading_photo"
                              ? "Reading passage photograph"
                              : "Reference material"
                            : "Current activity"}
                        </h3>
                      </summary>
                      <p className="eyebrow">
                        Activity {session.problems.indexOf(problem) + 1} ·{" "}
                        {problem.activity_state === "ready"
                          ? "Explore and respond"
                          : "Getting ready"}
                      </p>
                      <SafeText text={problem.problem_text} />
                      <ActivityPurpose problem={problem} />
                      <p className="fine">
                        Saved automatically · Challenge:{" "}
                        {difficultyLabel(session.difficulty)}
                      </p>
                      {problem.concept_focus && !problem.learning_goal && (
                        <p className="fine">Focus: {problem.concept_focus}</p>
                      )}
                    </details>
                  )}
                  {problem?.activity_state === "ready" &&
                    session.status === "open" && (
                      <div className="activity-start">
                        <p className="fine">
                          Type your thinking, or work on paper and attach a
                          photo.
                        </p>
                        <button
                          type="button"
                          onClick={() => composer.current?.focus()}
                        >
                          Respond to this activity ↓
                        </button>
                      </div>
                    )}
                  {sourcePhotoFlow && problem && session.status === "open" && (
                    <section
                      className="card source-photo-intake"
                      aria-label="Add your photo"
                    >
                      <h3>Add your photo</h3>
                      <p>
                        {problem.reference_source === "reading_photo"
                          ? "Upload the text you want to read, or use your phone."
                          : "Upload your homework, or use your phone. We’ll make different practice from its ideas."}
                      </p>
                      {photoTools}
                    </section>
                  )}
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
                      key={session.id}
                      focus={problem.material_focus}
                      disabled={disabled || hasResponseDraft}
                      onChange={(change) =>
                        void act(() =>
                          activity("same_passage", undefined, change),
                        )
                      }
                    />
                  )}
                </aside>
              )}
              <article className="chat-column" aria-label="Work and guidance">
                <header className="conversation-heading">
                  <div>
                    <p className="eyebrow">Think it through</p>
                    <h3>Your work &amp; tutor guidance</h3>
                  </div>
                  {problem &&
                    (session.status === "open" || problem.passage) && (
                      <button
                        type="button"
                        className="quiet response-link"
                        onClick={() => {
                          if (!activityBrief.current) return;
                          activityBrief.current.open = true;
                          activityBrief.current
                            .querySelector("summary")
                            ?.focus();
                        }}
                      >
                        Read activity ↑
                      </button>
                    )}
                </header>
                <div className="conversation-stack">
                  <TutorConversation
                    session={session}
                    offline={offline}
                    disabled={blocked}
                    active={pageActive && page === "practice" && !newSession}
                    act={act}
                    refresh={refresh}
                  />
                  {problem && !sourcePhotoFlow && (
                    <div
                      ref={attachmentsPanel}
                      id="tutor-attachments"
                      className="tutor-attachments"
                      role="region"
                      aria-label="Photo attachments"
                      tabIndex={-1}
                      hidden={!attachmentsVisible}
                    >
                      {photoTools}
                    </div>
                  )}
                </div>
                <div className="tutor-response" id="response-composer">
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
                      No activity is ready yet. Use a retry in the conversation
                      if one is available, or open Session &amp; material to
                      create another activity.
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
                        <p className="fine">
                          {rejectedCapture
                            ? "Ask what needs clarification, or explain the unclear part."
                            : "Share your thinking. You can revise your work or ask a question at any time."}
                        </p>
                        <label>
                          {rejectedCapture
                            ? "Your question or clarification"
                            : "Your work or question"}
                          <textarea
                            ref={composer}
                            value={text}
                            onChange={(event) => {
                              if (!disabled) setText(event.target.value);
                            }}
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
                          {text && (
                            <button
                              type="button"
                              className="quiet"
                              disabled={disabled}
                              onClick={() => {
                                setText("");
                                composer.current?.focus();
                              }}
                            >
                              Clear draft
                            </button>
                          )}
                          {!rejectedCapture && (
                            <button
                              type="button"
                              aria-expanded={attachmentsVisible}
                              aria-controls="tutor-attachments"
                              disabled={blocked}
                              onClick={() => {
                                const next = !attachmentsVisible;
                                focusAttachmentsOnOpen.current = next;
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
                </div>
                {session.status === "open" && (
                  <div
                    className="activity-controls"
                    role="group"
                    aria-label="Activity controls"
                  >
                    <span className="continue-label">Ready to move on?</span>
                    {problem?.activity_state === "ready" && (
                      <>
                        <button
                          type="button"
                          disabled={disabled || hasResponseDraft}
                          onClick={() =>
                            void act(() =>
                              activity(
                                problem.passage ? "same_passage" : "topic",
                              ),
                            )
                          }
                        >
                          Next activity
                        </button>
                        <ComposerMenu
                          title="Next activity options"
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
                                    problem.passage ? "same_passage" : "topic",
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
                                    problem.passage ? "same_passage" : "topic",
                                    "challenge",
                                  ),
                                )
                              }
                            >
                              Harder next activity
                            </button>
                          </div>
                        </ComposerMenu>
                      </>
                    )}
                    <button
                      type="button"
                      className="quiet"
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
                  </div>
                )}
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
