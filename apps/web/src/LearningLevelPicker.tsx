import { useState } from "react";
import {
  readingLevels,
  mathLevels,
  invalidLearningLevel,
  type LearningLevelValue,
  type LevelSubject,
} from "./learning-levels";

type Props = {
  value: LearningLevelValue | null;
  onChange: (value: LearningLevelValue | null) => void;
  disabled: boolean;
  defaultSubject?: LevelSubject;
};
export function LearningLevelPicker({
  value,
  onChange,
  disabled,
  defaultSubject = "",
}: Props) {
  const [subject, setSubject] = useState<LevelSubject>(
    value?.subject ?? defaultSubject,
  );
  const [context, setContext] = useState(defaultSubject);
  const [drafts, setDrafts] = useState({
    reading: value?.subject === "reading" ? value.level : "",
    math: value?.subject === "math" ? value.level : "",
    other: value?.subject === "other" ? value.level : "",
  });
  const [seen, setSeen] = useState(JSON.stringify(value));
  if (seen !== JSON.stringify(value)) {
    setSeen(JSON.stringify(value));
    if (value) {
      setSubject(value.subject);
      setDrafts((current) => ({ ...current, [value.subject]: value.level }));
    }
  }
  if (context !== defaultSubject) {
    setContext(defaultSubject);
    if (!subject && !value) setSubject(defaultSubject);
  }
  function update(nextSubject: LevelSubject, level: string) {
    if (!nextSubject || !level.trim()) onChange(null);
    else if (nextSubject === "reading")
      onChange({
        subject: nextSubject,
        level: level as Extract<
          LearningLevelValue,
          { subject: "reading" }
        >["level"],
      });
    else if (nextSubject === "math")
      onChange({
        subject: nextSubject,
        level: level as Extract<
          LearningLevelValue,
          { subject: "math" }
        >["level"],
      });
    else onChange({ subject: nextSubject, level });
  }
  return (
    <fieldset className="learning-level" disabled={disabled}>
      <legend>Learning level (optional)</legend>
      <p className="fine">
        Leave this unset, or give the tutor a starting point. It does not
        measure your ability.
      </p>
      <label>
        Subject for this level
        <select
          value={subject}
          onChange={(event) => {
            const next = event.target.value as LevelSubject;
            setSubject(next);
            update(next, next ? drafts[next] : "");
          }}
        >
          <option value="">No level</option>
          <option value="reading">Reading</option>
          <option value="math">Math</option>
          <option value="other">Another subject</option>
        </select>
      </label>
      {(subject === "reading" || subject === "math") && (
        <label>
          {subject === "reading" ? "Reading level" : "Math grade or course"}
          <select
            value={drafts[subject]}
            onChange={(event) => {
              setDrafts({ ...drafts, [subject]: event.target.value });
              update(subject, event.target.value);
            }}
          >
            <option value="">No level set</option>
            {(subject === "reading" ? readingLevels : mathLevels).map(
              (level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ),
            )}
          </select>
        </label>
      )}
      {subject === "other" && (
        <label>
          Course or level
          <input
            value={drafts.other}
            aria-invalid={invalidLearningLevel(value) || undefined}
            onChange={(event) => {
              setDrafts({ ...drafts, other: event.target.value });
              update("other", event.target.value);
            }}
            placeholder="e.g. introductory biology"
          />
        </label>
      )}
      {invalidLearningLevel(value) && (
        <p role="status" className="notice">
          Keep the course or level to 80 characters. Your text is still here.
        </p>
      )}
    </fieldset>
  );
}
