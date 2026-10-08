import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PhotoInput } from "../src/PhotoInput";
import { imageRequest } from "../src/client";

vi.mock("../src/client", async (original) => ({
  ...(await original<typeof import("../src/client")>()),
  imageRequest: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(imageRequest).mockReset();
});

function show(disabled = false) {
  const errors: string[] = [];
  render(
    <PhotoInput
      problem="synthetic-problem"
      version={1}
      disabled={disabled}
      onPendingChange={vi.fn()}
      onSaved={async () => {}}
      act={async (action) => {
        try {
          await action();
        } catch (error) {
          errors.push((error as Error).message);
        }
      }}
    />,
  );
  fireEvent.click(screen.getByText("Upload a photo"));
  return errors;
}

it("offers HEIC/HEIF in the picker and prepares a dropped HEIC on the server", async () => {
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:synthetic",
    revokeObjectURL: vi.fn(),
  });
  vi.mocked(imageRequest).mockResolvedValue(
    new Response(new Blob(["normalized"], { type: "image/jpeg" })),
  );
  show();
  expect(
    screen.getByLabelText("Take or choose a photo").getAttribute("accept"),
  ).toContain(".heic,.heif");
  const file = new File(["synthetic heic"], "page.heic", { type: "" });
  fireEvent.drop(screen.getByRole("group", { name: "Photo upload" }), {
    dataTransfer: { files: [file] },
  });
  expect(
    await screen.findByAltText("Your photograph before submission"),
  ).toBeVisible();
  expect(imageRequest).toHaveBeenCalledExactlyOnceWith(
    "/images/preview",
    file,
    undefined,
    undefined,
  );
});

it("rejects multiple dropped files and oversized images before upload", async () => {
  const errors = show();
  const file = new File(["synthetic"], "page.jpg", { type: "image/jpeg" });
  const target = screen.getByRole("group", { name: "Photo upload" });
  fireEvent.drop(target, { dataTransfer: { files: [file, file] } });
  await waitFor(() =>
    expect(errors).toContain("Choose one photograph at a time."),
  );
  const large = new File([new Uint8Array(8388609)], "large.heic");
  fireEvent.drop(target, { dataTransfer: { files: [large] } });
  await waitFor(() =>
    expect(errors).toContain("Choose a photograph under 8 MiB."),
  );
  expect(imageRequest).not.toHaveBeenCalled();
});

it("ignores a drop while uploads are disabled", () => {
  show(true);
  fireEvent.drop(
    screen.getByRole("group", { name: "Photo upload", hidden: true }),
    {
      dataTransfer: { files: [new File(["synthetic"], "page.jpg")] },
    },
  );
  expect(imageRequest).not.toHaveBeenCalled();
});

it("keeps only a submission identity after an uncertain photo receipt and clears it after retry", async () => {
  const learner = "911c9abc-4e8e-424d-a914-4338187ba00a";
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:synthetic",
    revokeObjectURL: vi.fn(),
  });
  vi.mocked(imageRequest)
    .mockResolvedValueOnce(
      new Response(
        new Blob(["synthetic normalized photo"], { type: "image/jpeg" }),
      ),
    )
    .mockRejectedValueOnce(new TypeError("Synthetic lost acknowledgement"))
    .mockResolvedValueOnce(new Response("{}", { status: 202 }));
  render(
    <PhotoInput
      expanded
      learner={learner}
      problem="synthetic-problem"
      version={1}
      disabled={false}
      onPendingChange={vi.fn()}
      onSaved={async () => {}}
      act={async (action) => {
        try {
          await action();
        } catch {
          /* App displays safe connection error. */
        }
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Take or choose a photo"), {
    target: {
      files: [
        new File(["synthetic original photo"], "work.png", {
          type: "image/png",
        }),
      ],
    },
  });
  await screen.findByAltText("Your photograph before submission");
  fireEvent.click(
    screen.getByRole("button", { name: "Submit this photograph" }),
  );
  const retry = await screen.findByRole("button", {
    name: "Retry saved photograph",
  });
  const key = vi.mocked(imageRequest).mock.calls[1]![2];
  expect(
    JSON.parse(
      window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`)!,
    ),
  ).toEqual({ key, kind: "submission", owner: learner });
  fireEvent.click(retry);
  await waitFor(() =>
    expect(
      window.sessionStorage.getItem(`shepherd:tutor-request:${learner}`),
    ).toBeNull(),
  );
  expect(vi.mocked(imageRequest).mock.calls[2]![2]).toBe(key);
});
