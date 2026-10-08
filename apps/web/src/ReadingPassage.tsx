import { type Schema } from "./client";
import { SafeText } from "./SafeText";

export function ReadingPassage({
  passage,
}: {
  passage: Schema<"ReadingPassage">;
}) {
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
      <div className="passage-text" tabIndex={0} aria-label="Reading passage">
        <SafeText text={passage.text} />
      </div>
      {passage.uncertainties && passage.uncertainties.length > 0 && (
        <p className="notice">
          Photo reading notes: {passage.uncertainties.join(" ")}
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
