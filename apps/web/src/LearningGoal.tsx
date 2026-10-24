import { learningGoals, type LearningIntent } from "./practice-options";

export function LearningGoal({
  value,
  onChange,
  disabled,
}: {
  value: LearningIntent;
  onChange: (intent: LearningIntent) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="learning-goal" disabled={disabled}>
      <legend>What would you like help with?</legend>
      <div className="choice-grid">
        {learningGoals.map((goal) => (
          <label className="choice-card" key={goal.value}>
            <input
              type="radio"
              name="learning-intent"
              value={goal.value}
              aria-label={goal.label}
              aria-describedby={`goal-${goal.value}-description`}
              checked={value === goal.value}
              onChange={() => onChange(goal.value)}
            />
            <span>
              <strong>{goal.label}</strong>
              <span className="fine" id={`goal-${goal.value}-description`}>
                {goal.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
