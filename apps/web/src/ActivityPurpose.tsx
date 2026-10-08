import type { Schema } from "./client";
import { SafeText } from "./SafeText";

export function ActivityPurpose({
  problem,
}: {
  problem: Schema<"ProblemPublic">;
}) {
  const criteria = problem.success_criteria ?? [];
  if (!problem.learning_goal && !criteria.length) return null;
  return (
    <section className="activity-purpose" aria-label="Activity goal">
      {problem.learning_goal && (
        <p>
          <strong>Goal:</strong> {problem.learning_goal}
        </p>
      )}
      {criteria.length > 0 && (
        <>
          <p>
            <strong>A sufficient response:</strong>
          </p>
          <ul>
            {criteria.map((criterion, index) => (
              <li key={index}>
                <SafeText text={criterion} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
