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
