import { useEffect, useRef, useState } from "react";
import { api, type Schema } from "./client";
import { ReadingPassage } from "./ReadingPassage";

export function ReadingSources({
  learner,
  disabled,
  onChange,
}: {
  learner: string;
  disabled: boolean;
  onChange: (selection: Schema<"ImportedPassage"> | null) => void;
}) {
  const [sources, setSources] = useState<Schema<"SourceChoice">[]>([]);
  const [sourceId, setSourceId] =
    useState<Schema<"SourceChoice">["id"]>("aesop_hare");
  const [choices, setChoices] = useState<Schema<"ImportedPassage">[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  useEffect(() => {
    const current = ++revision.current;
    void api<Schema<"SourceChoice">[]>("/reading/sources")
      .then((value) => {
        if (revision.current === current) setSources(value);
      })
      .catch(() => {
        if (revision.current === current)
          setError(
            "Published sources could not be listed. Reopen this source option to try again.",
          );
      });
    return () => {
      revision.current += 1;
    };
  }, [learner]);
  return (
    <div className="published-sources">
      <label>
        Published source
        <select
          value={sourceId}
          disabled={disabled || busy}
          onChange={(event) => {
            setSourceId(event.target.value as Schema<"SourceChoice">["id"]);
            setChoices([]);
            onChange(null);
            setError("");
          }}
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title}
            </option>
          ))}
        </select>
      </label>
      <p className="fine">
        Load public text from the selected source. This sends no learner work to
        that website. Starting practice then uses your configured tutor.
      </p>
      <button
        type="button"
        disabled={disabled || busy || !sources.length}
        onClick={() => {
          const current = revision.current;
          setBusy(true);
          setError("");
          setChoices([]);
          onChange(null);
          void api<Schema<"SourceImportPublic">>("/reading/import", "POST", {
            learner_id: learner,
            source_id: sourceId,
          })
            .then((value) => {
              if (revision.current !== current) return;
              setChoices(value.passages);
              setSelected(0);
              onChange(value.passages[0] ?? null);
            })
            .catch((cause: unknown) => {
              if (revision.current === current)
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "This source could not be loaded.",
                );
            })
            .finally(() => {
              if (revision.current === current) setBusy(false);
            });
        }}
      >
        {busy ? "Loading published text…" : "Load published text"}
      </button>
      {error && (
        <p className="error" role="status">
          {error}
        </p>
      )}
      {choices.length > 1 && (
        <label>
          Choose a news passage
          <select
            value={selected}
            disabled={disabled}
            onChange={(event) => {
              const index = Number(event.target.value);
              setSelected(index);
              onChange(choices[index] ?? null);
            }}
          >
            {choices.map((choice, index) => (
              <option key={choice.source_token} value={index}>
                {choice.passage.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {choices[selected] && (
        <ReadingPassage passage={choices[selected].passage} />
      )}
    </div>
  );
}
