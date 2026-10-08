import { useEffect, useRef, useState } from "react";
import { type Schema } from "./client";
import { SafeText } from "./SafeText";

export function ReadingPassage({
  passage,
  focus,
  onAsk,
  disabled = false,
}: {
  passage: Schema<"ReadingPassage">;
  focus?: Schema<"ProblemPublic">["material_focus"];
  onAsk?: ((text: string) => void) | undefined;
  disabled?: boolean;
}) {
  const passageNode = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  useEffect(() => {
    if (!onAsk) return;
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (
        selection &&
        !selection.isCollapsed &&
        passageNode.current?.contains(selection.anchorNode) &&
        passageNode.current.contains(selection.focusNode)
      ) {
        const value = selection.toString().trim();
        setSelectedText(value.length <= 1500 ? value : "");
      }
    };
    document.addEventListener("selectionchange", rememberSelection);
    return () =>
      document.removeEventListener("selectionchange", rememberSelection);
  }, [onAsk]);
  const origin = {
    pasted: "Your pasted passage",
    photo: "Read from your photo",
    ai_written: "AI-written passage",
    published: "Published passage",
  }[passage.origin];
  return (
    <details className="reading-passage" open>
      <summary>{passage.title}</summary>
      <p className="fine">
        {origin}
        {passage.author && ` · ${passage.author}`}
        {passage.published_at && ` · ${passage.published_at}`}
        {passage.excerpt && " · Excerpt"}
      </p>
      {focus && (
        <p className="material-position">
          {focus.mode === "guided"
            ? `Section ${focus.section_index + 1} of ${focus.section_count}`
            : "Whole text"}
        </p>
      )}
      <div
        ref={passageNode}
        className="passage-text"
        tabIndex={0}
        aria-label="Reading passage"
      >
        <SafeText text={focus?.text ?? passage.text} maxCharacters={50000} />
      </div>
      {onAsk && (
        <div className="sentence-help">
          <p className="fine">
            For a dense sentence or paragraph, select up to 1,500 characters
            here to prepare a question. You can also type your question below.
          </p>
          <button
            type="button"
            disabled={disabled || !selectedText}
            onClick={() => {
              onAsk(
                `Help me understand this part of the material:\n\n${selectedText}`,
              );
              setSelectedText("");
            }}
          >
            Ask about selected text
          </button>
        </div>
      )}
      {passage.uncertainties && passage.uncertainties.length > 0 && (
        <p className="notice">
          Photo reading notes:{" "}
          {focus?.mode === "guided" &&
          focus.section_index + 1 < focus.section_count
            ? "The photo reader reported uncertainty in this material. Ask about any unclear wording in the current section."
            : passage.uncertainties.join(" ")}
        </p>
      )}
      {passage.source_url && (
        <p>
          <a
            href={passage.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the published source
          </a>
        </p>
      )}
      {passage.permission && <p className="fine">{passage.permission}</p>}
    </details>
  );
}
