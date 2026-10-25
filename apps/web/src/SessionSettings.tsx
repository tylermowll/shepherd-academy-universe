import { useState } from "react";
import type { Schema } from "./client";
import { LearningLevelPicker } from "./LearningLevelPicker";
import {
  invalidLearningLevel,
  normalizeLearningLevel,
  type LearningLevelValue,
} from "./learning-levels";
import { challengeOptions, guidanceOptions } from "./practice-options";

export function SessionSettings({
  session,
  disabled,
  onSave,
}: {
  session: Schema<"TutoringSessionPublic">;
  disabled: boolean;
  onSave: (settings: Schema<"TutorSettingsInput">) => void;
}) {
  const [level, setLevel] = useState<LearningLevelValue | null>(
    session.learning_level ?? null,
  );
  const currentLevel = JSON.stringify(session.learning_level ?? null);
  const [seenLevel, setSeenLevel] = useState(currentLevel);
  if (seenLevel !== currentLevel) {
    setSeenLevel(currentLevel);
    setLevel(session.learning_level ?? null);
  }
  return (
    <details className="session-settings">
      <summary>Session settings</summary>
      <form
        key={`${session.initiative}-${session.difficulty}-${currentLevel}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || invalidLearningLevel(level)) return;
          const data = new FormData(event.currentTarget);
          onSave({
            initiative: data.get(
              "initiative",
            ) as Schema<"TutorSettingsInput">["initiative"],
            difficulty: data.get("difficulty") as NonNullable<
              Schema<"TutorSettingsInput">["difficulty"]
            >,
            learning_level: normalizeLearningLevel(level),
          });
        }}
      >
        <label>
          How much guidance would you like?
          <select
            name="initiative"
            defaultValue={session.initiative}
            disabled={disabled}
          >
            {guidanceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          How challenging should it be?
          <select
            name="difficulty"
            defaultValue={session.difficulty}
            disabled={disabled}
          >
            {challengeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <LearningLevelPicker
          value={level}
          onChange={setLevel}
          disabled={disabled}
          defaultSubject={session.learning_intent === "read" ? "reading" : ""}
        />
        <button disabled={disabled || invalidLearningLevel(level)}>
          Save session settings
        </button>
        <p className="fine">
          These choices apply to future activities and guidance. Earlier replies
          stay as they were. Homework is used for different practice on the same
          ideas.
        </p>
      </form>
    </details>
  );
}
