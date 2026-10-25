import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadingSources } from "../src/ReadingSources";
import type { Schema } from "../src/client";

const item: Schema<"SourceChoice"> = {
  id: "synthetic-story",
  title: "An original synthetic story",
  author: "Synthetic author",
  category: "Stories",
  word_count: 620,
  text_kind: "story",
  reading_level: "grades_3_5",
  level_basis: "Reviewed synthetic metadata, not a measured learner level.",
};
const secondItem = {
  ...item,
  id: "synthetic-poem",
  title: "An original synthetic poem",
  category: "Poetry",
  text_kind: "poem" as const,
  reading_level: null,
  level_basis: null,
};
const catalog: Schema<"SourceCatalogPublic"> = {
  items: [item, secondItem],
  total: 2,
  offset: 0,
  limit: 12,
  categories: ["Stories", "Poetry"],
  live_sources: [{ id: "nasa_news", title: "NASA news" }],
};
const preview: Schema<"ImportedPassage"> = {
  passage: {
    title: item.title,
    text: "An original synthetic passage. <script>This is literal text.</script>",
    origin: "published",
    author: item.author,
    source_url: "https://www.gutenberg.org/ebooks/21",
    permission: "Original synthetic fixture only.",
    excerpt: false,
    uncertainties: [],
  },
  source_token: "owned-synthetic-token",
};
const response = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));
const card = (title = item.title) =>
  within(screen.getByRole("heading", { name: title }).closest("article")!);
function show(
  fetcher = vi.fn((url: string) =>
    response(
      url.includes("/reading/sources?") ? catalog : { passages: [preview] },
    ),
  ),
) {
  vi.stubGlobal("fetch", fetcher);
  const onChange = vi.fn();
  const view = render(
    <ReadingSources
      learner="synthetic-learner"
      disabled={false}
      onChange={onChange}
    />,
  );
  return { ...view, onChange, fetcher };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("local published library", () => {
  it("browses locally without importing or selecting until Use this text", async () => {
    const view = show();
    await screen.findByRole("heading", { name: item.title });
    expect(view.fetcher).toHaveBeenCalledOnce();
    expect(view.fetcher.mock.calls[0]![0]).toBe(
      "/api/v1/reading/sources?offset=0&limit=12",
    );
    expect(card().getByText(/620 words/)).toBeVisible();
    expect(card().getByText(/Approximate Grades 3–5/)).toBeVisible();
    expect(
      card(secondItem.title).getByText("Reading level: Unrated"),
    ).toBeVisible();
    expect(screen.queryByRole("region", { name: "Selected text" })).toBeNull();
    expect(view.onChange).toHaveBeenLastCalledWith(null);
    fireEvent.click(card().getByRole("button", { name: "Use this text" }));
    const selected = await screen.findByRole("region", {
      name: "Selected text",
    });
    expect(
      within(selected).getByLabelText("Reading passage"),
    ).toHaveTextContent("This is literal text.");
    expect(selected.querySelector("script")).toBeNull();
    expect(view.onChange).toHaveBeenLastCalledWith(preview);
    const browse = screen
      .getByText("Choose a different text")
      .closest("details")!;
    expect(browse).not.toHaveAttribute("open");
    expect(
      within(selected).getByRole("heading", { name: "Selected text" }),
    ).toHaveFocus();
    expect(
      selected.compareDocumentPosition(browse) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Search library" }),
    ).not.toBeVisible();
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string),
    ).toEqual({ learner_id: "synthetic-learner", source_id: item.id });
    fireEvent.click(
      screen.getByRole("button", { name: "Remove selected text" }),
    );
    expect(view.onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("region", { name: "Selected text" })).toBeNull();
    expect(screen.getByText("Browse texts").closest("details")).toHaveAttribute(
      "open",
    );
    expect(screen.getByText("Browse texts")).toHaveFocus();
  });

  it("applies search/category/word-count/level filters only on Search and clears them together", async () => {
    const view = show();
    await screen.findByRole("heading", { name: item.title });
    fireEvent.change(screen.getByLabelText("Search texts"), {
      target: { value: "  lantern & garden  " },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Stories" },
    });
    fireEvent.change(screen.getByLabelText("Length"), {
      target: { value: "medium" },
    });
    fireEvent.change(screen.getByLabelText("Approximate reading level"), {
      target: { value: "grades_3_5" },
    });
    expect(view.fetcher).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Search library" }));
    await vi.waitFor(() => expect(view.fetcher).toHaveBeenCalledTimes(2));
    const query = new URL(
      view.fetcher.mock.calls[1]![0],
      "https://synthetic.invalid",
    ).searchParams;
    expect(Object.fromEntries(query)).toEqual({
      offset: "0",
      limit: "12",
      q: "lantern & garden",
      category: "Stories",
      reading_level: "grades_3_5",
      min_words: "500",
      max_words: "1499",
    });
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Clear filters" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await vi.waitFor(() => expect(view.fetcher).toHaveBeenCalledTimes(3));
    expect(view.fetcher.mock.calls[2]![0]).toBe(
      "/api/v1/reading/sources?offset=0&limit=12",
    );
    expect(screen.getByLabelText("Search texts")).toHaveValue("");
    expect(screen.getByLabelText("Category")).toHaveValue("");
    expect(screen.getByLabelText("Length")).toHaveValue("");
    expect(screen.getByLabelText("Approximate reading level")).toHaveValue("");
  });

  it("handles Enter inside the library without submitting its enclosing learning form", async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response(catalog)),
    );
    render(
      <form onSubmit={submit}>
        <ReadingSources
          learner="synthetic"
          disabled={false}
          onChange={vi.fn()}
        />
        <button>Start learning</button>
      </form>,
    );
    await screen.findByRole("heading", { name: item.title });
    fireEvent.change(screen.getByLabelText("Search texts"), {
      target: { value: "garden" },
    });
    fireEvent.keyDown(screen.getByLabelText("Search texts"), { key: "Enter" });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(submit).not.toHaveBeenCalled();
    expect(document.querySelectorAll("form")).toHaveLength(1);
  });

  it("preserves a selected preview through search failure and retries reads only", async () => {
    let fail = false;
    const fetcher = vi.fn((url: string) =>
      url.includes("/reading/sources?")
        ? fail
          ? response({ detail: "Synthetic unavailable" }, 503)
          : response(catalog)
        : response({ passages: [preview] }),
    );
    const view = show(fetcher);
    await screen.findByRole("heading", { name: item.title });
    fireEvent.click(card().getByRole("button", { name: "Use this text" }));
    const selected = await screen.findByRole("region", {
      name: "Selected text",
    });
    fireEvent.click(screen.getByText("Choose a different text"));
    const query = screen.getByLabelText("Search texts");
    query.focus();
    fail = true;
    fireEvent.change(screen.getByLabelText("Search texts"), {
      target: { value: "another story" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search library" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your selected text is still here",
    );
    expect(screen.getByRole("region", { name: "Selected text" })).toBe(
      selected,
    );
    expect(view.onChange).toHaveBeenLastCalledWith(preview);
    expect(query).toHaveFocus();
    expect(
      screen.getByText("Choose a different text").closest("details"),
    ).toHaveAttribute("open");
    fail = false;
    fireEvent.click(
      screen.getByRole("button", { name: "Retry library search" }),
    );
    await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Selected text" })).toBe(
      selected,
    );
  });

  it("shows an empty result state and recovers by clearing filters", async () => {
    let empty = false;
    show(
      vi.fn(() =>
        response(empty ? { ...catalog, items: [], total: 0 } : catalog),
      ),
    );
    await screen.findByRole("heading", { name: item.title });
    empty = true;
    fireEvent.change(screen.getByLabelText("Search texts"), {
      target: { value: "no matches" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search library" }));
    await screen.findByText(/No texts match these filters/);
    expect(screen.getByText("0 texts found")).toBeVisible();
    empty = false;
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await screen.findByRole("heading", { name: item.title });
  });

  it("paginates within the applied search and retries the requested page after failure", async () => {
    let fail = true;
    const fetcher = vi.fn((url: string) => {
      const offset = Number(
        new URL(url, "https://synthetic.invalid").searchParams.get("offset"),
      );
      if (offset === 12 && fail) return response({}, 503);
      return response({
        ...catalog,
        items: Array.from({ length: offset === 24 ? 1 : 12 }, (_, index) => ({
          ...item,
          id: `piece-${offset + index}`,
          title: `Synthetic piece ${offset + index}`,
        })),
        total: 25,
        offset,
      });
    });
    show(fetcher);
    await screen.findByRole("heading", { name: "Synthetic piece 0" });
    expect(
      screen.getByRole("button", { name: "Previous results" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next results" }));
    await screen.findByRole("alert");
    fail = false;
    fireEvent.click(
      screen.getByRole("button", { name: "Retry library search" }),
    );
    await screen.findByRole("heading", { name: "Synthetic piece 12" });
    expect(
      fetcher.mock.calls
        .slice(-2)
        .map(([url]) =>
          new URL(url, "https://synthetic.invalid").searchParams.get("offset"),
        ),
    ).toEqual(["12", "12"]);
    fireEvent.click(screen.getByRole("button", { name: "Next results" }));
    await screen.findByRole("heading", { name: "Synthetic piece 24" });
    expect(screen.getByRole("button", { name: "Next results" })).toBeDisabled();
  });

  it("keeps the previous text when importing a replacement fails", async () => {
    let fail = false;
    const view = show(
      vi.fn((url: string) =>
        response(
          url.includes("/sources?")
            ? catalog
            : fail
              ? {}
              : { passages: [preview] },
          !url.includes("/sources?") && fail ? 503 : 200,
        ),
      ),
    );
    await screen.findByRole("heading", { name: item.title });
    fireEvent.click(card().getByRole("button", { name: "Use this text" }));
    await screen.findByRole("region", { name: "Selected text" });
    fireEvent.click(screen.getByText("Choose a different text"));
    fail = true;
    fireEvent.click(
      card(secondItem.title).getByRole("button", { name: "Use this text" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "previous selection is unchanged",
    );
    expect(view.onChange).toHaveBeenLastCalledWith(preview);
    expect(
      screen.getByText("Choose a different text").closest("details"),
    ).toHaveAttribute("open");
    expect(
      screen.getByRole("region", { name: "Selected text" }),
    ).toHaveTextContent(item.title);
  });

  it("loads NASA only on an explicit request and requires choosing a returned passage", async () => {
    const second = {
      ...preview,
      source_token: "owned-second-news",
      passage: { ...preview.passage, title: "Second synthetic news" },
    };
    const view = show(
      vi.fn((url: string) =>
        response(
          url.includes("/sources?") ? catalog : { passages: [preview, second] },
        ),
      ),
    );
    await screen.findByRole("heading", { name: item.title });
    expect(view.fetcher).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Live NASA news"));
    fireEvent.click(screen.getByRole("button", { name: "Load NASA news" }));
    const news = await screen.findByRole("region", {
      name: "NASA news passages",
    });
    expect(view.onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("region", { name: "Selected text" })).toBeNull();
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string),
    ).toEqual({ learner_id: "synthetic-learner", source_id: "nasa_news" });
    fireEvent.click(
      within(
        within(news)
          .getByRole("heading", { name: second.passage.title })
          .closest("article")!,
      ).getByRole("button", { name: "Use this text" }),
    );
    expect(view.onChange).toHaveBeenLastCalledWith(second);
    expect(
      screen.getByText("Choose a different text").closest("details"),
    ).not.toHaveAttribute("open");
    expect(
      screen.getByRole("heading", { name: "Selected text" }),
    ).toHaveFocus();
  });

  it.each(["unmount", "learner change"])(
    "ignores a late imported preview after %s",
    async (action) => {
      let finish: (value: Response) => void = () => {
        throw new Error("not started");
      };
      const change = vi.fn();
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) =>
          url.includes("/sources?")
            ? response(catalog)
            : new Promise<Response>((resolve) => {
                finish = resolve;
              }),
        ),
      );
      const view = render(
        <ReadingSources
          learner="first-owner"
          disabled={false}
          onChange={change}
        />,
      );
      await screen.findByRole("heading", { name: item.title });
      fireEvent.click(card().getByRole("button", { name: "Use this text" }));
      if (action === "unmount") view.unmount();
      else
        view.rerender(
          <ReadingSources
            learner="second-owner"
            disabled={false}
            onChange={change}
          />,
        );
      change.mockClear();
      await act(async () => {
        finish(new Response(JSON.stringify({ passages: [preview] })));
        await Promise.resolve();
      });
      expect(change).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("region", { name: "Selected text" }),
      ).toBeNull();
    },
  );

  it("retains oversized Unicode searches and blocks them until corrected", async () => {
    const view = show();
    await screen.findByRole("heading", { name: item.title });
    fireEvent.change(screen.getByLabelText("Search texts"), {
      target: { value: "🌱".repeat(121) },
    });
    expect(screen.getByLabelText("Search texts")).toHaveValue("🌱".repeat(121));
    expect(
      screen.getByRole("button", { name: "Search library" }),
    ).toBeDisabled();
    fireEvent.keyDown(screen.getByLabelText("Search texts"), { key: "Enter" });
    expect(view.fetcher).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText("Search texts"), {
      target: { value: "🌱".repeat(120) },
    });
    expect(
      screen.getByRole("button", { name: "Search library" }),
    ).toBeEnabled();
  });
});
