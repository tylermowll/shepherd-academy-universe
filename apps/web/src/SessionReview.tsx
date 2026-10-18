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
  return (
    <section className="card" aria-label="Session recap">
      <h3>Session recap</h3>
      <p>{session.topic}</p>
      <p>
        {activities.length} saved{" "}
        {activities.length === 1 ? "activity" : "activities"} ·{" "}
        {messages.length} saved {messages.length === 1 ? "message" : "messages"}
      </p>
      {latestGuidance ? (
        <>
          <h4>Last saved guidance</h4>
          <SafeText text={latestGuidance} />
          <p className="fine">
            AI guidance can be mistaken; this recap is not a verified grade or
            mastery assessment.
          </p>
        </>
      ) : (
        <p>
          No tutor guidance was saved. Review any unfinished requests or
          uncertain readings in the conversation below.
        </p>
      )}
      <p>Your saved work, readings and responses are available below.</p>
    </section>
  );
}
