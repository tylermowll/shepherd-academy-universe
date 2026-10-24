import {
  materialChoices,
  type LearningIntent,
  type MaterialSource,
} from "./practice-options";

export function PracticeSource({
  source,
  onChange,
  disabled,
  intent,
}: {
  source: MaterialSource;
  onChange: (source: MaterialSource) => void;
  disabled: boolean;
  intent?: LearningIntent | undefined;
}) {
  const choices = materialChoices(intent);
  if (choices.length === 1) return null;
  return (
    <fieldset className="material-choices" disabled={disabled}>
      <legend>What will we use?</legend>
      <div className="choice-grid">
        {choices.map((choice) => (
          <label className="choice-card" key={choice.value}>
            <input
              type="radio"
              name="material-source"
              value={choice.value}
              checked={source === choice.value}
              onChange={() => onChange(choice.value)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
