import { useEffect, useRef, useState } from "react";
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
  const navigation = useRef<HTMLElement>(null);
  const previous = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const pace = useRef<HTMLElement>(null);
  const pendingFocus = useRef<{
    target: "previous" | "next" | "pace";
    origin: Element | null;
  } | null>(null);
  const savedPreferences = `${focus.mode}:${focus.section_size}`;
  const [saved, setSaved] = useState(savedPreferences);
  const [preferences, setPreferences] = useState<MaterialPreferences>({
    reading_mode: focus.mode,
    section_size: focus.section_size,
  });
  if (saved !== savedPreferences) {
    setSaved(savedPreferences);
    setPreferences({
      reading_mode: focus.mode,
      section_size: focus.section_size,
    });
  }
  useEffect(() => {
    const request = pendingFocus.current;
    if (!request || disabled) return;
    pendingFocus.current = null;
    if (
      navigation.current?.closest("[hidden]") ||
      (document.activeElement !== document.body &&
        document.activeElement !== request.origin)
    )
      return;
    const button =
      request.target === "previous"
        ? previous.current
        : request.target === "next"
          ? next.current
          : null;
    const alternative =
      request.target === "previous" ? next.current : previous.current;
    const destination =
      request.target === "pace"
        ? pace.current
        : button && !button.disabled
          ? button
          : alternative && !alternative.disabled
            ? alternative
            : pace.current;
    destination?.focus();
  }, [disabled, focus.mode, focus.section_index, focus.section_size]);
  const changed =
    preferences.reading_mode !== focus.mode ||
    preferences.section_size !== focus.section_size;
  return (
    <section
      ref={navigation}
      className="material-navigation"
      aria-label="Material navigation"
    >
      {focus.mode === "guided" && (
        <>
          <div className="actions">
            <button
              ref={previous}
              type="button"
              disabled={disabled || focus.section_index === 0}
              onClick={(event) => {
                pendingFocus.current = {
                  target: "previous",
                  origin: event.currentTarget,
                };
                onChange({ section_index: focus.section_index - 1 });
              }}
            >
              Previous section
            </button>
            <button
              ref={next}
              type="button"
              disabled={
                disabled || focus.section_index + 1 >= focus.section_count
              }
              onClick={(event) => {
                pendingFocus.current = {
                  target: "next",
                  origin: event.currentTarget,
                };
                onChange({ section_index: focus.section_index + 1 });
              }}
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
        <summary ref={pace}>Reading pace</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            pendingFocus.current = {
              target: "pace",
              origin: document.activeElement,
            };
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
