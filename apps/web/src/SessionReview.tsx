import type { Schema } from "./client";
import { SafeText } from "./SafeText";

export function SessionReview({
  session,
}: {
  session: Schema<"TutoringSessionPublic">;
}) {
  const operations = session.problems.flatMap((problem) => problem.operations);
  const messages = operations.filter(
    (operation) => operation.kind !== "generation",
  );
  const activities = session.problems.filter(
    (problem) => problem.activity_state === "ready",
  );
  const latestFeedback = [...operations]
    .reverse()
    .find(
      (operation) =>
        operation.status === "completed" &&
        operation.feedback &&
        (operation.feedback.next_step ||
          operation.feedback.guidance.length > 0) &&
        (!operation.reading || operation.reading.can_continue),
    )?.feedback;
  const latestGuidance =
    latestFeedback?.next_step || latestFeedback?.guidance.at(-1);
  const helpRequests = messages.filter(
    (operation) => operation.kind === "hint",
  );
  const latestObservation = [...operations]
    .reverse()
    .find(
      (operation) =>
        operation.status === "completed" &&
        (!operation.reading || operation.reading.can_continue) &&
        operation.feedback?.learning_observation &&
        operation.feedback.learning_observation.assessment !== "not_assessed",
    )?.feedback?.learning_observation;
  return (
    <section className="card session-recap" aria-label="Session recap">
      <p className="eyebrow">Session finished</p>
      <h3>Session recap</h3>
      <p className="recap-topic">{session.topic}</p>
      <p className="recap-counts">
        {activities.length} saved{" "}
        {activities.length === 1 ? "activity" : "activities"} ·{" "}
        {messages.length} saved {messages.length === 1 ? "message" : "messages"}
      </p>
      {latestGuidance ? (
        <>
          <h4>Last saved guidance</h4>
          <SafeText text={latestGuidance} />
        </>
      ) : (
        <p>
          No tutor guidance was saved. Review any unfinished requests or
          uncertain readings in the conversation below.
        </p>
      )}
      <p className="fine">
        AI guidance can be mistaken; this recap is not a verified grade or
        mastery assessment.
      </p>
      <p>
        Your session is saved in History. Review your work, readings and
        responses below, or choose New session to explore something else.
      </p>
      <details>
        <summary>Help and points to revisit</summary>
        <p>
          {helpRequests.length} saved{" "}
          {helpRequests.length === 1 ? "help request" : "help requests"}. Hints,
          concept explanations and different examples are recorded in the
          conversation.
        </p>
        {latestObservation ? (
          <>
            <p>
              <strong>Tutor’s last saved observations about your work:</strong>{" "}
              {latestObservation.evidence}
            </p>
            {latestObservation.open_points.length > 0 ? (
              <ul>
                {latestObservation.open_points.map((point, index) => (
                  <li key={index}>
                    <SafeText text={point} />
                  </li>
                ))}
              </ul>
            ) : (
              <p>The tutor recorded no open points in that response.</p>
            )}
            <p className="fine">
              These AI observations can be mistaken. They are discussion points,
              not grades or a mastery assessment.
            </p>
          </>
        ) : (
          <p>No observations about demonstrated work were saved.</p>
        )}
      </details>
    </section>
  );
}
