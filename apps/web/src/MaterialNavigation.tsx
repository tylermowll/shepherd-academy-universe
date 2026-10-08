import { useState } from "react";
import type { Schema } from "./client";

type Activity = Schema<"TutorActivityInput">;
export type MaterialPreferences = Pick<
  Activity,
  "reading_mode" | "section_size"
>;
export type MaterialChange = MaterialPreferences &
  Pick<Activity, "section_index">;

export function MaterialOptions({
  value,
  onChange,
  disabled,
}: {
  value: MaterialPreferences;
  onChange: (value: MaterialPreferences) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="material-options" disabled={disabled}>
      <legend>How to study this material</legend>
      <label>
        Reading mode
        <select
          value={value.reading_mode ?? "guided"}
          onChange={(event) =>
            onChange({
              ...value,
              reading_mode: event.target.value as NonNullable<
                Activity["reading_mode"]
              >,
            })
          }
        >
          <option value="guided">Read in sections</option>
          <option value="whole">Use the whole text</option>
        </select>
      </label>
      {value.reading_mode !== "whole" && (
        <label>
          Section length
          <select
            value={value.section_size ?? "standard"}
            onChange={(event) =>
              onChange({
                ...value,
                section_size: event.target.value as NonNullable<
                  Activity["section_size"]
                >,
              })
            }
          >
            <option value="short">Short</option>
            <option value="standard">Standard</option>
            <option value="long">Long</option>
          </select>
        </label>
      )}
      <p className="fine">
        Section length changes how much you read at once. Activity difficulty is
        separate.
      </p>
    </fieldset>
  );
}

export function MaterialNavigation({
  focus,
  disabled,
  onChange,
}: {
  focus: NonNullable<Schema<"ProblemPublic">["material_focus"]>;
  disabled: boolean;
  onChange: (value: MaterialChange) => void;
}) {
  const [preferences, setPreferences] = useState<MaterialPreferences>({
    reading_mode: focus.mode,
    section_size: focus.section_size,
  });
  const changed =
    preferences.reading_mode !== focus.mode ||
    preferences.section_size !== focus.section_size;
  return (
    <section className="material-navigation" aria-label="Material navigation">
      {focus.mode === "guided" && (
        <>
          <div className="actions">
            <button
              type="button"
              disabled={disabled || focus.section_index === 0}
              onClick={() =>
                onChange({ section_index: focus.section_index - 1 })
              }
            >
              Previous section
            </button>
            <button
              type="button"
              disabled={
                disabled || focus.section_index + 1 >= focus.section_count
              }
              onClick={() =>
                onChange({ section_index: focus.section_index + 1 })
              }
            >
              Next section
            </button>
          </div>
          <p className="fine">
            Continue whenever you are ready. Next activity, Easier and Harder
            ask about the current section.
          </p>
        </>
      )}
      <details>
        <summary>Reading pace</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onChange(preferences);
          }}
        >
          <MaterialOptions
            value={preferences}
            onChange={setPreferences}
            disabled={disabled}
          />
          <button type="submit" disabled={disabled || !changed}>
            Apply reading pace
          </button>
        </form>
      </details>
    </section>
  );
}
