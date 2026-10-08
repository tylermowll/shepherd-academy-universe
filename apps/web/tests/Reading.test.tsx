import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Schema } from "../src/client";
import { ReadingPassage } from "../src/ReadingPassage";
import { ReadingSources } from "../src/ReadingSources";

const passage: Schema<"ReadingPassage"> = {
  title: "Original synthetic news",
  text: "<script>untrusted text</script> Researchers compared observations.",
  origin: "published",
  author: "Synthetic publisher",
  source_url: "https://www.nasa.gov/news/example/",
  published_at: "2026-10-08",
  permission: "Original synthetic fixture, no publisher content.",
  excerpt: true,
  uncertainties: [],
};
const imported = { passage, source_token: "synthetic-token" };
const response = (value: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(value), { status }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows source, excerpt and permission beside safely rendered passage text", () => {
  render(<ReadingPassage passage={passage} />);
  expect(screen.getByLabelText("Reading passage")).toHaveTextContent(
    "untrusted text",
  );
  expect(document.querySelector("script")).toBeNull();
  expect(screen.getByText(/Published passage/)).toHaveTextContent("Excerpt");
  expect(
    screen.getByRole("link", { name: "Read the published source" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByText(passage.permission!)).toBeVisible();
});

it("keeps later photo uncertainty notes out of an earlier guided section", () => {
  render(
    <ReadingPassage
      passage={{
        ...passage,
        origin: "photo",
        text: "A clear opening.\n\nLater surprising result.",
        uncertainties: ["The later surprising result may say revised."],
      }}
      focus={{
        mode: "guided",
        section_size: "short",
        section_index: 0,
        section_count: 2,
        start: 0,
        end: 16,
        text: "A clear opening.",
      }}
    />,
  );
  expect(screen.getByText(/photo reader reported uncertainty/)).toBeVisible();
  expect(screen.queryByText(/later surprising result/i)).toBeNull();
});

it("renders the complete allowed study text including Unicode and its final sentence", () => {
  const text = "🌱".repeat(49_980) + " The final finding.";
  render(<ReadingPassage passage={{ ...passage, text }} />);
  expect(screen.getByLabelText("Reading passage").textContent).toBe(text);
});

it("preserves literal source notation and stages the exact selected wording", () => {
  const text =
    "The ticket cost $5 and the bus cost $10. **Literal** `source` notation.";
  const ask = vi.fn();
  render(<ReadingPassage passage={{ ...passage, text }} onAsk={ask} />);
  const node = screen.getByLabelText("Reading passage");
  expect(node.textContent).toBe(text);
  expect(node.querySelector("math, strong, code")).toBeNull();
  const range = document.createRange();
  range.selectNodeContents(node);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent(document, new Event("selectionchange"));
  fireEvent.click(
    screen.getByRole("button", { name: "Ask about selected text" }),
  );
  expect(ask).toHaveBeenCalledWith(
    `Help me understand this part of the material:\n\n${text}`,
  );
});

it("counts selected astral characters once and explains an oversized selection", () => {
  const text = "🌱".repeat(1500);
  const ask = vi.fn();
  const view = render(
    <ReadingPassage passage={{ ...passage, text }} onAsk={ask} />,
  );
  const select = () => {
    const range = document.createRange();
    range.selectNodeContents(screen.getByLabelText("Reading passage"));
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent(document, new Event("selectionchange"));
  };
  select();
  expect(
    screen.getByRole("button", { name: "Ask about selected text" }),
  ).toBeEnabled();
  view.rerender(
    <ReadingPassage passage={{ ...passage, text: text + "🌱" }} onAsk={ask} />,
  );
  select();
  expect(
    screen.getByRole("button", { name: "Ask about selected text" }),
  ).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("1,501 characters");
  expect(ask).not.toHaveBeenCalled();
});

it("loads public text only on request and lets the learner choose a news passage", async () => {
  const change = vi.fn();
  const second = {
    passage: { ...passage, title: "Second synthetic news" },
    source_token: "second-token",
  };
  const fetcher = vi.fn((_url: string, options: RequestInit) =>
    response(
      options.method !== "POST"
        ? [{ id: "nasa_news", title: "NASA news" }]
        : { passages: [imported, second] },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(
    <ReadingSources
      learner="synthetic-learner"
      disabled={false}
      onChange={change}
    />,
  );
  await screen.findByRole("option", { name: "NASA news" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Published source"), {
    target: { value: "nasa_news" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Load published text" }));
  await screen.findByLabelText("Reading passage");
  expect(JSON.parse(fetcher.mock.calls[1]![1].body as string)).toEqual({
    learner_id: "synthetic-learner",
    source_id: "nasa_news",
  });
  expect(change).toHaveBeenLastCalledWith(imported);
  fireEvent.change(screen.getByLabelText("Choose a news passage"), {
    target: { value: "1" },
  });
  expect(change).toHaveBeenLastCalledWith(second);
  fireEvent.change(screen.getByLabelText("Published source"), {
    target: { value: "nasa_news" },
  });
  expect(change).toHaveBeenLastCalledWith(null);
});

it("keeps a source error visible and permits a retry", async () => {
  let calls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("/sources"))
        return response([{ id: "aesop_hare", title: "Synthetic story" }]);
      return ++calls === 1
        ? response({ detail: "Source unavailable. Paste a passage." }, 502)
        : response({ passages: [imported] });
    }),
  );
  render(
    <ReadingSources learner="synthetic" disabled={false} onChange={vi.fn()} />,
  );
  await screen.findByRole("option", { name: "Synthetic story" });
  fireEvent.click(screen.getByRole("button", { name: "Load published text" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Source unavailable",
  );
  fireEvent.click(screen.getByRole("button", { name: "Load published text" }));
  await screen.findByText(passage.title);
  expect(screen.queryByRole("status")).toBeNull();
});

it("discards a late import after the learner leaves the source picker", async () => {
  let resolve: (value: Response) => void = () => {};
  const change = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.endsWith("/sources")
        ? response([{ id: "aesop_hare", title: "Synthetic story" }])
        : new Promise<Response>((done) => {
            resolve = done;
          }),
    ),
  );
  const view = render(
    <ReadingSources learner="synthetic" disabled={false} onChange={change} />,
  );
  await screen.findByRole("option", { name: "Synthetic story" });
  fireEvent.click(screen.getByRole("button", { name: "Load published text" }));
  change.mockClear();
  view.unmount();
  resolve(new Response(JSON.stringify({ passages: [imported] })));
  await vi.waitFor(() => expect(change).not.toHaveBeenCalled());
});
