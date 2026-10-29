import { useEffect, useRef, useState } from "react";
import { api, type Schema } from "./client";
import { SafeText } from "./SafeText";
import { ReadingPassage } from "./ReadingPassage";
import { ActivityPurpose } from "./ActivityPurpose";
import { BusyStatus } from "./BusyStatus";

/** Auto-follow new guidance; explicit latest navigation opens the whole exchange. */
function revealLatest(viewport: HTMLDivElement, response = false) {
  const messages = viewport.querySelectorAll<HTMLElement>(
    ".tutor-operation, .conversation-start",
  );
  const latest = messages.item(messages.length - 1);
  if (latest) {
    const destination = response
      ? (latest.querySelector<HTMLElement>(
          ".photo-reading, .tutor-feedback, .error",
        ) ?? latest)
      : latest;
    viewport.scrollTop +=
      destination.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      8;
  } else {
    viewport.scrollTop = viewport.scrollHeight;
  }
}

function latestVisible(viewport: HTMLDivElement) {
  if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 72)
    return true;
  const messages = viewport.querySelectorAll<HTMLElement>(
    ".tutor-operation, .conversation-start",
  );
  const latest = messages.item(messages.length - 1);
  if (!latest) return true;
  const frame = viewport.getBoundingClientRect();
  const last = latest.getBoundingClientRect();
  return last.top < frame.bottom && last.bottom > frame.top;
}

type Props = {
  session: Schema<"TutoringSessionPublic">;
  offline: boolean;
  disabled: boolean;
  active: boolean;
  act: (action: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
};

export function TutorConversation(props: Props) {
  const { session, active } = props;
  const viewport = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const positioning = useRef(false);
  const previousSession = useRef("");
  const [atBottom, setAtBottom] = useState(true);
  const currentProblem = session.problems.find(
    (problem) => problem.status === "assigned",
  );
  const currentNeedsResponse =
    session.status === "open" &&
    currentProblem &&
    currentProblem.activity_state !== "generating" &&
    !currentProblem.operations.some(
      (operation) =>
        operation.kind !== "generation" || operation.status !== "completed",
    ) &&
    session.problems.some(
      (problem) =>
        problem.id !== currentProblem.id &&
        problem.operations.some((operation) => operation.kind !== "generation"),
    );
  const revision = session.problems
    .map(
      (problem) =>
        `${problem.id}:${problem.status}:${problem.activity_state}:${problem.operations.map((item) => `${item.id}:${item.status}`).join(",")}`,
    )
    .join("|");
  useEffect(() => {
    const node = viewport.current;
    if (!active || !node) return;
    if (follow.current || previousSession.current !== session.id) {
      if (previousSession.current !== session.id) follow.current = true;
      positioning.current = true;
      revealLatest(node, true);
    }
    // Appending an exchange need not trigger a scroll event. Recheck the jump
    // control after layout while leaving an earlier reading position untouched.
    const frame = window.requestAnimationFrame(() => {
      positioning.current = false;
      setAtBottom(latestVisible(node));
    });
    previousSession.current = session.id;
    return () => window.cancelAnimationFrame(frame);
  }, [active, revision, session.id]);

  return (
    <div className="conversation-frame">
      <div
        ref={viewport}
        className="conversation-scroll"
        role="log"
        aria-label="Learning conversation"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget;
          const bottom =
            node.scrollHeight - node.scrollTop - node.clientHeight < 72;
          if (!positioning.current) follow.current = bottom;
          setAtBottom(latestVisible(node));
        }}
      >
        {session.problems.map((problem, index) => (
          <section
            key={problem.id}
            aria-label={`Activity ${index + 1} conversation`}
          >
            {problem.status !== "assigned" && (
              <details className="conversation-activity">
                <summary>Earlier activity {index + 1}</summary>
                {problem.passage && (
                  <ReadingPassage
                    passage={problem.passage}
                    focus={problem.material_focus}
                  />
                )}
                <SafeText text={problem.problem_text} />
                <ActivityPurpose problem={problem} />
              </details>
            )}
            {problem.operations.map((operation) => (
              <TutorMessage
                key={operation.id}
                {...props}
                operation={operation}
                referencePhoto={
                  problem.activity_state === "reference_capture" &&
                  ["reference_photo", "reading_photo"].includes(
                    problem.reference_source ?? "",
                  )
                }
              />
            ))}
          </section>
        ))}
        {currentNeedsResponse && (
          <section
            className="conversation-start conversation-empty"
            aria-label="Current activity start"
          >
            <p className="eyebrow">
              {currentProblem.activity_state === "reference_capture"
                ? "Current activity · Add your photo"
                : "Current activity · Ready for your response"}
            </p>
            <p>
              {currentProblem.activity_state === "reference_capture"
                ? "Add a photo in the activity area. Its reading will appear here before we continue."
                : "Start with your own thinking. Type a response, attach your work, or ask for help."}
            </p>
          </section>
        )}
        {!session.problems.some((problem) =>
          problem.operations.some(
            (item) => item.kind !== "generation" || item.status !== "completed",
          ),
        ) && (
          <p className="conversation-empty">
            {session.status !== "open"
              ? "No responses were saved. You can review the activity above."
              : session.problems.some(
                    (problem) =>
                      problem.status === "assigned" &&
                      problem.activity_state === "reference_capture",
                  )
                ? "Add a photo in the activity area. Its reading will appear here before we continue."
                : "Start with your own thinking. Type a response, attach your work, or ask for help."}
          </p>
        )}
      </div>
      {!atBottom && (
        <button
          className="conversation-latest"
          onClick={() => {
            follow.current = true;
            if (viewport.current) revealLatest(viewport.current);
            setAtBottom(true);
          }}
        >
          Latest messages ↓
        </button>
      )}
    </div>
  );
}

function TutorMessage({
  operation,
  referencePhoto,
  offline,
  disabled,
  act,
  refresh,
}: Props & {
  operation: Schema<"OperationPublic">;
  referencePhoto: boolean;
}) {
  const reading = operation.reading;
  const feedback = operation.feedback;
  const ambiguities = operation.ambiguities ?? [];
  const requestedHelp =
    operation.kind === "hint"
      ? [
          "Requested help with this activity.",
          "Requested a hint with this activity.",
          "Requested a concept explanation.",
          "Requested a different worked example.",
        ][operation.assistance_level ?? 0]
      : undefined;
  // The backend owns whether a reading may advance. Localized uncertainty can
  // coexist with usable evidence; do not reconstruct a stricter frontend gate.
  const rejected = Boolean(reading && !reading.can_continue);
  const pending = [
    "queued",
    "generating",
    "interpreting",
    "tutoring",
    "checking",
  ].includes(operation.status);
  if (operation.kind === "generation" && operation.status === "completed")
    return null;
  return (
    <article
      className="operation tutor-operation"
      aria-label={reading ? "Photo exchange" : "Message exchange"}
    >
      {operation.kind === "generation" && (
        <p className="eyebrow">Activity preparation</p>
      )}
      {operation.kind !== "generation" &&
        (operation.text || reading || operation.kind === "hint") && (
          <div className="learner-message">
            <p className="eyebrow">You{reading ? " · Photo" : ""}</p>
            {operation.text && <p className="user-text">{operation.text}</p>}
            {operation.kind === "hint" && !operation.text && (
              <p>{requestedHelp ?? "Requested help with this activity."}</p>
            )}
            {operation.work_text && (
              <p className="user-text">{operation.work_text}</p>
            )}
          </div>
        )}
      {reading && (
        <section className="photo-reading" aria-label="Reading from your photo">
          <details open>
            <summary>
              <h5>Reading from your photo</h5>
            </summary>
            <p className="user-text">
              {operation.interpretation || "The photo could not be read."}
            </p>
          </details>
          {(ambiguities.length > 0 ||
            reading.organization_feedback.length > 0 ||
            operation.interpretation_version != null) && (
            <details className="reading-details">
              <summary>Reading details</summary>
              {ambiguities.length > 0 && (
                <ul>
                  {ambiguities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
              {reading.organization_feedback.length > 0 && (
                <ul>
                  {reading.organization_feedback.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
              {operation.interpretation_version != null && (
                <p className="fine">
                  Photo reading version: {operation.interpretation_version}
                </p>
              )}
            </details>
          )}
          {rejected && (
            <div role="status" className="reading-question">
              <strong>This photo needs clarification.</strong>
              <p>
                {reading.rejection_reason ||
                  ambiguities[0] ||
                  "The tutor could not read enough of your work to give useful feedback. Type the unclear line or send a closer photo of it."}
              </p>
              <p>
                This reading is uncertain.{" "}
                {referencePhoto
                  ? "Ask about it below, attach a clearer photo, or use the material controls to type corrected text."
                  : "You can ask about this reading below, clarify the uncertain part, or attach another photo."}
              </p>
            </div>
          )}
        </section>
      )}
      {feedback && !rejected ? (
        <section className="tutor-feedback" aria-label="Tutor response">
          <p className="eyebrow">Tutor</p>
          <p className="fine feedback-disclosure">
            AI guidance · Can be mistaken
          </p>
          {feedback.strengths.length > 0 && (
            <div className="feedback-strengths">
              <h4>What’s working</h4>
              {feedback.strengths.map((item, index) => (
                <SafeText key={`strength-${index}`} text={item} />
              ))}
            </div>
          )}
          {feedback.guidance.length > 0 && (
            <div className="feedback-guidance">
              <h4>Guidance</h4>
              {feedback.guidance.map((item, index) => (
                <SafeText key={`guidance-${index}`} text={item} />
              ))}
            </div>
          )}
          {feedback.next_step && (
            <div className="feedback-next">
              <h4>Try next</h4>
              <SafeText text={feedback.next_step} />
            </div>
          )}
          {feedback.uncertainty_note && (
            <p className="notice">{feedback.uncertainty_note}</p>
          )}
          <details className="response-details">
            <summary>Response details</summary>
            {requestedHelp && <p>{requestedHelp}</p>}
            {feedback.learning_observation &&
              feedback.learning_observation.assessment !== "not_assessed" && (
                <>
                  <p>
                    <strong>Tutor’s observations:</strong>{" "}
                    {feedback.learning_observation.evidence}
                  </p>
                  {feedback.learning_observation.open_points.length > 0 && (
                    <>
                      <p>Points to discuss or revisit:</p>
                      <ul>
                        {feedback.learning_observation.open_points.map(
                          (point, index) => (
                            <li key={index}>
                              <SafeText text={point} />
                            </li>
                          ),
                        )}
                      </ul>
                    </>
                  )}
                </>
              )}
            {feedback.concepts.length > 0 && (
              <p>{feedback.concepts.join(" · ")}</p>
            )}
            <p className="fine">
              {operation.source} · AI feedback can be mistaken; it is not a
              verified grade.
            </p>
            {operation.prompt_version && (
              <p className="fine">
                Response version: {operation.prompt_version}
              </p>
            )}
          </details>
        </section>
      ) : !rejected && !pending && operation.message ? (
        <SafeText text={operation.message} />
      ) : null}
      {pending && (
        <BusyStatus
          message={
            operation.status === "interpreting"
              ? "Reading your photo… Feedback will follow if the work is readable."
              : operation.kind === "generation" ||
                  operation.status === "generating"
                ? "Preparing your activity…"
                : operation.status === "queued"
                  ? "Request saved. Waiting for the tutor…"
                  : "Preparing guidance on your work…"
          }
        />
      )}
      {operation.safe_error && !rejected && (
        <div role="status" className="error">
          <p>{operation.safe_error}</p>
          {(operation.text || operation.work_text || reading) && (
            <p>Your submitted work is still saved in this conversation.</p>
          )}
          {operation.error_code && (
            <p className="fine">Diagnostic code: {operation.error_code}</p>
          )}
        </div>
      )}
      {operation.status === "failed" && operation.retryable && !rejected && (
        <button
          disabled={disabled || offline}
          onClick={() =>
            void act(async () => {
              await api(`/operations/${operation.id}/retry`, "POST");
              await refresh();
            })
          }
        >
          Retry tutor response
        </button>
      )}
      {pending && (
        <button
          disabled={disabled || offline}
          onClick={() =>
            void act(async () => {
              await api(`/operations/${operation.id}/cancel`, "POST");
              await refresh();
            })
          }
        >
          Stop response
        </button>
      )}
      {operation.status === "canceled" && (
        <p className="fine">
          Response stopped.{" "}
          {operation.kind === "generation"
            ? "Open Session & material to create another activity."
            : reading
              ? "Your photo reading remains saved."
              : referencePhoto
                ? "Add another photo in the activity area to continue."
                : "You can send another response or continue when you’re ready."}
        </p>
      )}
    </article>
  );
}
