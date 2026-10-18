import type { Schema } from "./client";

type Source = NonNullable<Schema<"TutorActivityInput">["source"]>;

export function PracticeSource({
  source,
  onChange,
  disabled,
}: {
  source: Source;
  onChange: (source: Source) => void;
  disabled: boolean;
}) {
  const purpose = source.startsWith("reference_")
    ? "assignment"
    : source.startsWith("reading_") || source === "published"
      ? "study"
      : "topic";
  return (
    <>
      <label>
        Practice purpose
        <select
          value={purpose}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.value === "assignment"
                ? "reference_text"
                : event.target.value === "study"
                  ? "reading_text"
                  : "topic",
            )
          }
        >
          <option value="topic">Practice a topic</option>
          <option value="study">Study a passage</option>
          <option value="assignment">Practice assignment concepts</option>
        </select>
      </label>
      {purpose !== "topic" && (
        <label>
          Material input
          <select
            value={source}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value as Source)}
          >
            {purpose === "study" ? (
              <>
                <option value="reading_text">
                  Paste reading or study material
                </option>
                <option value="reading_photo">
                  Photograph a reading passage
                </option>
                <option value="reading_generated">
                  Let the tutor write a passage
                </option>
                <option value="published">Published story or news</option>
              </>
            ) : (
              <>
                <option value="reference_text">
                  Paste an assignment or reference
                </option>
                <option value="reference_photo">
                  Photograph an assignment or reference
                </option>
              </>
            )}
          </select>
        </label>
      )}
    </>
  );
}
