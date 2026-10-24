import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneCapture } from "../src/PhoneCapture";
import { PhoneLink } from "../src/PhoneLink";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("phone camera permission", () => {
  it("opens a capture screen without logging in or placing its secret in an API URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          received: false,
          problem_text: "1/2 + 1/3",
          processing: "Read on your computer.",
          expires_at: new Date(Date.now() + 300_000).toISOString(),
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<PhoneCapture token={"a".repeat(64)} />);
    expect(await screen.findByText("1/2 + 1/3")).toBeVisible();
    expect(screen.getByLabelText("Take or choose a photo")).toHaveAttribute(
      "capture",
      "environment",
    );
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/v1/phone-upload", {
      headers: { "X-Photo-Token": "a".repeat(64) },
      credentials: "omit",
      cache: "no-store",
    });
    expect(localStorage.length).toBe(0);
  });

  it("safely renders the photo task's formatting and shows downstream processing before upload", async () => {
    const processing =
      "Your computer will read this photo. The extracted text goes to an external model provider to give tutoring feedback.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            received: false,
            problem_text:
              'Compare **halves** with $\\frac{1}{2}$. <img src="untrusted" onerror="run()">',
            processing,
            expires_at: new Date(Date.now() + 300_000).toISOString(),
          }),
        ),
      ),
    );
    render(<PhoneCapture token={"a".repeat(64)} />);
    const task = await screen.findByRole("region", { name: "Photo task" });
    expect(task.querySelector("strong")).toHaveTextContent("halves");
    expect(task.querySelector(".katex math")).not.toBeNull();
    expect(task.querySelector(".katex-html")).not.toHaveTextContent("\\frac");
    expect(task).toHaveTextContent('<img src="untrusted" onerror="run()">');
    expect(task.querySelector("img")).toBeNull();
    expect(screen.getByText(processing)).toBeVisible();
    expect(screen.getByLabelText("Take or choose a photo")).toBeVisible();
  });

  it("shows only a receipt when the link already received its photo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            received: true,
            problem_text: "",
            processing: "",
            expires_at: new Date().toISOString(),
          }),
        ),
      ),
    );
    render(<PhoneCapture token={"b".repeat(64)} />);
    expect(
      await screen.findByText("Photo sent to your computer."),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Take or choose a photo"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Confirm this interpretation"),
    ).not.toBeInTheDocument();
  });

  it("explains expiry without offering another upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail:
              "This photo link ended. Create a new link on your computer.",
          }),
          { status: 410 },
        ),
      ),
    );
    render(<PhoneCapture token={"c".repeat(64)} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This photo link ended",
    );
    expect(
      screen.queryByLabelText("Take or choose a photo"),
    ).not.toBeInTheDocument();
  });

  it("creates a locally rendered QR and cancels its server permission", async () => {
    const link = {
      id: "synthetic-link",
      url: "https://tutor.invalid/#capture=synthetic",
      expires_at: new Date(Date.now() + 300_000).toISOString(),
    };
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(link))),
      );
    vi.stubGlobal("fetch", fetcher);
    render(
      <PhoneLink
        problem="synthetic-problem"
        version={2}
        disabled={false}
        act={async (action) => action()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Take photo with phone" }),
    );
    expect(
      await screen.findByText("Scan with your phone camera"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open photo page" }),
    ).toHaveAttribute("href", link.url);
    expect(document.querySelector(".phone-link svg")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel phone link" }));
    await vi.waitFor(() =>
      expect(
        screen.queryByText("Scan with your phone camera"),
      ).not.toBeInTheDocument(),
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "/api/v1/phone-uploads/synthetic-link",
    );
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: "DELETE" });
  });

  it("blocks creating a replacement while cancellation is pending, then keeps the new QR", async () => {
    const link = {
      id: "synthetic-first-link",
      url: "https://tutor.invalid/#capture=synthetic-first",
      expires_at: new Date(Date.now() + 300_000).toISOString(),
    };
    const replacement = {
      ...link,
      id: "synthetic-replacement-link",
      url: "https://tutor.invalid/#capture=synthetic-replacement",
    };
    let completeCancellation!: (response: Response) => void;
    const cancellation = new Promise<Response>((resolve) => {
      completeCancellation = resolve;
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(link)))
      .mockReturnValueOnce(cancellation)
      .mockResolvedValueOnce(new Response(JSON.stringify(replacement)));
    vi.stubGlobal("fetch", fetcher);
    render(
      <PhoneLink
        problem="synthetic-problem"
        version={2}
        disabled={false}
        act={async (action) => action()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Take photo with phone" }),
    );
    await screen.findByRole("link", { name: "Open photo page" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel phone link" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Canceling your phone photo link…",
    );
    const create = screen.getByRole("button", { name: "New QR code" });
    expect(create).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Canceling phone link…" }),
    ).toBeDisabled();
    fireEvent.click(create);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("link", { name: "Open photo page" }),
    ).toHaveAttribute("href", link.url);
    await act(async () => {
      completeCancellation(new Response(JSON.stringify({ received: false })));
      await cancellation;
    });
    expect(screen.queryByRole("link", { name: "Open photo page" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Take photo with phone" }),
    );
    expect(
      await screen.findByRole("link", { name: "Open photo page" }),
    ).toHaveAttribute("href", replacement.url);
    expect(screen.queryByRole("status")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("retains the current link after a failed cancellation and allows a retry", async () => {
    const link = {
      id: "synthetic-link",
      url: "https://tutor.invalid/#capture=synthetic",
      expires_at: new Date(Date.now() + 300_000).toISOString(),
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(link)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: "Synthetic cancellation unavailable." }),
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ received: false })));
    const errors: string[] = [];
    vi.stubGlobal("fetch", fetcher);
    render(
      <PhoneLink
        problem="synthetic-problem"
        version={2}
        disabled={false}
        act={async (action) => {
          try {
            await action();
          } catch (cause) {
            errors.push((cause as Error).message);
          }
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Take photo with phone" }),
    );
    await screen.findByRole("link", { name: "Open photo page" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel phone link" }));
    await vi.waitFor(() =>
      expect(errors).toEqual(["Synthetic cancellation unavailable."]),
    );
    expect(
      screen.getByRole("link", { name: "Open photo page" }),
    ).toHaveAttribute("href", link.url);
    expect(screen.getByRole("button", { name: "New QR code" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel phone link" }));
    await vi.waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Open photo page" }),
      ).toBeNull(),
    );
  });
});
