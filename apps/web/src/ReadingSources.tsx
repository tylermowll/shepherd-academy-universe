import { useEffect, useRef, useState } from "react";
import { api, type Schema } from "./client";
import { ReadingPassage } from "./ReadingPassage";
import { readingLevels } from "./learning-levels";
import { characterCount } from "./text-limits";

type Props = {
  learner: string;
  disabled: boolean;
  onChange: (selection: Schema<"ImportedPassage"> | null) => void;
};
type Filters = {
  q: string;
  category: string;
  length: string;
  readingLevel: string;
};
const emptyFilters: Filters = {
  q: "",
  category: "",
  length: "",
  readingLevel: "",
};
function focusSelectedHeading(node: HTMLHeadingElement | null) {
  node?.focus();
}
const pageSize = 12;
const lengths: Record<string, { min?: number; max?: number }> = {
  short: { max: 499 },
  medium: { min: 500, max: 1499 },
  long: { min: 1500, max: 4999 },
  extended: { min: 5000 },
};
function searchPath(filters: Filters, offset: number) {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(pageSize),
  });
  if (filters.q.trim()) query.set("q", filters.q.trim());
  if (filters.category) query.set("category", filters.category);
  if (filters.readingLevel) query.set("reading_level", filters.readingLevel);
  const length = lengths[filters.length];
  if (length?.min !== undefined) query.set("min_words", String(length.min));
  if (length?.max !== undefined) query.set("max_words", String(length.max));
  return `/reading/sources?${query}`;
}

export function ReadingSources(props: Props) {
  return <PublishedLibrary key={props.learner} {...props} />;
}

function PublishedLibrary({ learner, disabled, onChange }: Props) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [catalog, setCatalog] = useState<Schema<"SourceCatalogPublic"> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState("");
  const [requestedOffset, setRequestedOffset] = useState(0);
  const [selectionError, setSelectionError] = useState("");
  const [importing, setImporting] = useState(false);
  const [selection, setSelection] = useState<Schema<"ImportedPassage"> | null>(
    null,
  );
  const [browsing, setBrowsing] = useState(true);
  const browseSummary = useRef<HTMLElement>(null);
  const [news, setNews] = useState<Schema<"ImportedPassage">[]>([]);
  const active = useRef(true);
  const requestSequence = useRef(0);
  const importPending = useRef(false);
  const initialChange = useRef(onChange);
  const locked = disabled || loading || importing;

  async function load(next: Filters, offset = 0) {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setSearchError("");
    setApplied(next);
    setRequestedOffset(offset);
    try {
      const result = await api<Schema<"SourceCatalogPublic">>(
        searchPath(next, offset),
      );
      if (active.current && sequence === requestSequence.current)
        setCatalog(result);
    } catch {
      if (active.current && sequence === requestSequence.current)
        setSearchError(
          selection
            ? "The library could not be loaded. Your selected text is still here. Try the search again."
            : "The library could not be loaded. Try the search again.",
        );
    } finally {
      if (active.current && sequence === requestSequence.current)
        setLoading(false);
    }
  }

  useEffect(() => {
    active.current = true;
    initialChange.current(null);
    const sequence = ++requestSequence.current;
    void api<Schema<"SourceCatalogPublic">>(searchPath(emptyFilters, 0))
      .then((result) => {
        if (active.current && sequence === requestSequence.current)
          setCatalog(result);
      })
      .catch(() => {
        if (active.current && sequence === requestSequence.current)
          setSearchError(
            "The library could not be loaded. Try the search again.",
          );
      })
      .finally(() => {
        if (active.current && sequence === requestSequence.current)
          setLoading(false);
      });
    return () => {
      active.current = false;
      requestSequence.current += 1;
    };
  }, []);

  async function importText(id: string, live = false) {
    if (locked || importPending.current) return;
    importPending.current = true;
    setImporting(true);
    setSelectionError("");
    try {
      const result = await api<Schema<"SourceImportPublic">>(
        "/reading/import",
        "POST",
        { learner_id: learner, source_id: id },
      );
      if (!active.current) return;
      if (live) setNews(result.passages);
      else {
        const preview = result.passages[0];
        if (result.passages.length !== 1 || !preview)
          throw new Error("Missing local preview");
        choosePreview(preview);
      }
    } catch {
      if (active.current)
        setSelectionError(
          live
            ? "NASA news could not be loaded. Your selected text is unchanged. Try again when the website is available."
            : "That text could not be selected. Your previous selection is unchanged. Try again.",
        );
    } finally {
      if (active.current) setImporting(false);
      importPending.current = false;
    }
  }

  function choosePreview(preview: Schema<"ImportedPassage">) {
    setSelection(preview);
    onChange(preview);
    setBrowsing(false);
  }

  const runSearch = () => {
    if (!locked && characterCount(filters.q.trim()) <= 120) void load(filters);
  };
  const unapplied = JSON.stringify(filters) !== JSON.stringify(applied);
  const resultStart = catalog && catalog.total > 0 ? catalog.offset + 1 : 0;
  const resultEnd = catalog ? catalog.offset + catalog.items.length : 0;
  return (
    <section className="published-sources" aria-label="Published text library">
      <h3>Find something to read</h3>
      <p className="fine">
        These texts are saved on this server. Browsing and choosing one does not
        contact a website or an AI model. When you start learning, the selected
        tutor receives the text.
      </p>
      {selection && (
        <section className="selected-library-text" aria-label="Selected text">
          <h4
            key={selection.source_token}
            tabIndex={-1}
            ref={focusSelectedHeading}
          >
            Selected text
          </h4>
          <button
            type="button"
            disabled={disabled || importing}
            onClick={() => {
              setSelection(null);
              onChange(null);
              setBrowsing(true);
              browseSummary.current?.focus();
            }}
          >
            Remove selected text
          </button>
          <ReadingPassage passage={selection.passage} />
        </section>
      )}
      <details
        className="library-browser"
        open={browsing}
        onToggle={(event) => setBrowsing(event.currentTarget.open)}
      >
        <summary ref={browseSummary}>
          {selection ? "Choose a different text" : "Browse texts"}
        </summary>
        <div
          role="search"
          aria-label="Search the local library"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement
            ) {
              event.preventDefault();
              event.stopPropagation();
              runSearch();
            }
          }}
        >
          <label>
            Search texts
            <input
              type="search"
              value={filters.q}
              disabled={locked}
              aria-invalid={characterCount(filters.q.trim()) > 120 || undefined}
              placeholder="Title, author or something in the text"
              onChange={(event) =>
                setFilters({ ...filters, q: event.target.value })
              }
            />
          </label>
          <div className="library-filters">
            <label>
              Category
              <select
                value={filters.category}
                disabled={locked}
                onChange={(event) =>
                  setFilters({ ...filters, category: event.target.value })
                }
              >
                <option value="">Any category</option>
                {catalog?.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Length
              <select
                value={filters.length}
                disabled={locked}
                onChange={(event) =>
                  setFilters({ ...filters, length: event.target.value })
                }
              >
                <option value="">Any length</option>
                <option value="short">Under 500 words</option>
                <option value="medium">500–1,499 words</option>
                <option value="long">1,500–4,999 words</option>
                <option value="extended">5,000+ words</option>
              </select>
            </label>
            <label>
              Approximate reading level
              <select
                value={filters.readingLevel}
                disabled={locked}
                onChange={(event) =>
                  setFilters({ ...filters, readingLevel: event.target.value })
                }
              >
                <option value="">Any reading level</option>
                {readingLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
                <option value="unrated">Unrated</option>
              </select>
            </label>
          </div>
          {characterCount(filters.q.trim()) > 120 && (
            <p role="status" className="notice">
              Keep the search to 120 characters. Your search is still here.
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              disabled={locked || characterCount(filters.q.trim()) > 120}
              onClick={runSearch}
            >
              Search library
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setFilters(emptyFilters);
                void load(emptyFilters);
              }}
            >
              Clear filters
            </button>
          </div>
          {unapplied && (
            <p className="fine">
              Choose Search library to apply these filters.
            </p>
          )}
        </div>
        {loading && <p role="status">Searching the local library…</p>}
        {searchError && (
          <div role="alert" className="error">
            <p>{searchError}</p>
            <button
              type="button"
              disabled={locked}
              onClick={() => void load(applied, requestedOffset)}
            >
              Retry library search
            </button>
          </div>
        )}
        {catalog && (
          <>
            <p className="fine" role="status">
              {catalog.total.toLocaleString()} texts found
              {catalog.total > 0
                ? ` · Showing ${resultStart.toLocaleString()}–${resultEnd.toLocaleString()}`
                : ""}
            </p>
            {catalog.total === 0 && (
              <p>
                No texts match these filters. Try a broader search or clear the
                filters.
              </p>
            )}
            <div className="library-results">
              {catalog.items.map((item) => (
                <article
                  className="card library-text"
                  key={item.id}
                  aria-labelledby={`library-text-${item.id}`}
                >
                  <h4 id={`library-text-${item.id}`}>{item.title}</h4>
                  <p>{item.author}</p>
                  <p className="fine">
                    {item.category} · {item.text_kind} ·{" "}
                    {item.word_count.toLocaleString()} words
                  </p>
                  <p className="fine">
                    Reading level:{" "}
                    {item.reading_level
                      ? `Approximate ${readingLevels.find((level) => level.value === item.reading_level)?.label ?? item.reading_level}`
                      : "Unrated"}
                  </p>
                  {item.level_basis && (
                    <details>
                      <summary>About the reading level</summary>
                      <p className="fine">{item.level_basis}</p>
                    </details>
                  )}
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => void importText(item.id)}
                  >
                    Use this text
                  </button>
                </article>
              ))}
            </div>
            {catalog.total > pageSize && (
              <div className="actions library-pagination">
                <button
                  type="button"
                  disabled={locked || catalog.offset === 0}
                  onClick={() =>
                    void load(applied, Math.max(0, catalog.offset - pageSize))
                  }
                >
                  Previous results
                </button>
                <button
                  type="button"
                  disabled={locked || resultEnd >= catalog.total}
                  onClick={() => void load(applied, catalog.offset + pageSize)}
                >
                  Next results
                </button>
              </div>
            )}
            {catalog.live_sources.length > 0 && (
              <details className="live-reading">
                <summary>Live NASA news</summary>
                <p className="fine">
                  This separate option loads recent passages from NASA’s
                  website. It needs an Internet connection. Your work is not
                  sent to NASA.
                </p>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void importText("nasa_news", true)}
                >
                  Load NASA news
                </button>
              </details>
            )}
          </>
        )}
        {importing && <p role="status">Preparing your text…</p>}
        {selectionError && (
          <p role="alert" className="error">
            {selectionError}
          </p>
        )}
        {news.length > 0 && (
          <section aria-label="NASA news passages">
            <h4>Choose a news passage</h4>
            {news.map((preview) => (
              <article className="card library-text" key={preview.source_token}>
                <h5>{preview.passage.title}</h5>
                <p>{preview.passage.author}</p>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    choosePreview(preview);
                  }}
                >
                  Use this text
                </button>
              </article>
            ))}
          </section>
        )}
      </details>
    </section>
  );
}
