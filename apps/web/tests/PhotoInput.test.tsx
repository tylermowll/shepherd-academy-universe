import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PhotoInput } from "../src/PhotoInput";
import { ApiError, imageRequest } from "../src/client";

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

const owner = "911c9abc-4e8e-424d-a914-4338187ba00a";

async function interruptedOwnedPhoto() {
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:synthetic-retained-photo",
    revokeObjectURL: vi.fn(),
  });
  vi.mocked(imageRequest)
    .mockResolvedValueOnce(
      new Response(
        new Blob(["synthetic normalized private photo"], {
          type: "image/jpeg",
        }),
      ),
    )
    .mockRejectedValueOnce(
      new TypeError("Synthetic lost photo acknowledgement"),
    )
    .mockRejectedValueOnce(
      new ApiError(
        "The selected photo reader is disabled.",
        422,
        "route_disabled",
      ),
    );
  const errors: string[] = [];
  const onPendingChange = vi.fn();
  const onSaved = vi.fn(async () => {});
  render(
    <PhotoInput
      expanded
      learner={owner}
      problem="synthetic-problem"
      version={1}
      disabled={false}
      onPendingChange={onPendingChange}
      onSaved={onSaved}
      act={async (action) => {
        try {
          await action();
        } catch (cause) {
          errors.push((cause as Error).message);
        }
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Take or choose a photo"), {
    target: {
      files: [new File(["synthetic original private photo"], "work.png")],
    },
  });
  await screen.findByAltText("Your photograph before submission");
  fireEvent.click(
    screen.getByRole("button", { name: "Submit this photograph" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry saved photograph" }),
  );
  await waitFor(() =>
    expect(errors).toEqual([
      "Synthetic lost photo acknowledgement",
      "The selected photo reader is disabled.",
    ]),
  );
  const submitted = vi.mocked(imageRequest).mock.calls[1]!;
  const key = submitted[2]!;
  expect(vi.mocked(imageRequest).mock.calls[2]![2]).toBe(key);
  expect(
    JSON.parse(sessionStorage.getItem(`shepherd:tutor-request:${owner}`)!),
  ).toEqual({ owner, key, kind: "submission" });
  expect(JSON.stringify({ ...sessionStorage })).not.toContain("private photo");
  expect(
    screen.getByRole("button", { name: "Submit this photograph" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Check saved request" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Resolve interrupted request" }),
  ).toBeEnabled();
  return { key, submittedBlob: submitted[1], onPendingChange, onSaved };
}

it("recovers an accepted photo after a permanent retry rejection without replaying its bytes", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const { key, onPendingChange, onSaved } = await interruptedOwnedPhoto();
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        kind: "submission",
        session_id: "8cd525d1-90d8-4d93-8e16-67b317f98fca",
        activity_id: "d4d4c394-a5d5-4d46-ab59-a6e926cb3b81",
        submission_id: "48179493-f9f6-41d9-8c5b-d8c9758259da",
      }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Check saved request" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(fetcher).toHaveBeenCalledExactlyOnceWith(
    `/api/v1/tutor/request-receipts/${key}?learner_id=${owner}`,
    expect.objectContaining({
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    }),
  );
  expect(imageRequest).toHaveBeenCalledTimes(3);
  expect(sessionStorage.getItem(`shepherd:tutor-request:${owner}`)).toBeNull();
  expect(onPendingChange).toHaveBeenLastCalledWith(false);
  expect(screen.queryByAltText("Your photograph before submission")).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Your photograph was saved. Its reading and guidance appear with the activity; it has not been sent again.",
  );
});

it("keeps an absent photo blocked until explicit resolution, then retains the prepared bytes for a new request", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(
    new Response(JSON.stringify({ detail: "No request receipt yet." }), {
      status: 404,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const { key, submittedBlob, onPendingChange, onSaved } =
    await interruptedOwnedPhoto();
  fireEvent.click(screen.getByRole("button", { name: "Check saved request" }));
  await screen.findByText(
    /The server has not confirmed whether your request was saved/,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(imageRequest).toHaveBeenCalledTimes(3);
  expect(
    screen.getByRole("button", { name: "Submit this photograph" }),
  ).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Remove photo" })).toBeNull();
  expect(sessionStorage.getItem(`shepherd:tutor-request:${owner}`)).toContain(
    key,
  );

  let finishResolution!: (response: Response) => void;
  const resolution = new Promise<Response>((resolve) => {
    finishResolution = resolve;
  });
  fetcher.mockReturnValueOnce(resolution);
  const resolve = screen.getByRole("button", {
    name: "Resolve interrupted request",
  });
  fireEvent.click(resolve);
  expect(resolve).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Retry saved photograph" }),
  ).toBeDisabled();
  fireEvent.click(resolve);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1]).toEqual([
    `/api/v1/tutor/request-receipts/${key}/resolve`,
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ learner_id: owner }),
    }),
  ]);
  finishResolution(
    new Response(JSON.stringify({ status: "not_accepted", receipt: null })),
  );
  await screen.findByText(/The interrupted photograph was not saved/);
  expect(onSaved).not.toHaveBeenCalled();
  expect(onPendingChange).toHaveBeenLastCalledWith(false);
  expect(sessionStorage.getItem(`shepherd:tutor-request:${owner}`)).toBeNull();
  expect(
    screen.getByAltText("Your photograph before submission"),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Remove photo" })).toBeEnabled();

  vi.mocked(imageRequest).mockResolvedValueOnce(
    new Response("{}", { status: 202 }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Submit this photograph" }),
  );
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  const replacement = vi.mocked(imageRequest).mock.calls[3]!;
  expect(replacement[1]).toBe(submittedBlob);
  expect(replacement[2]).toBeTruthy();
  expect(replacement[2]).not.toBe(key);
  expect(imageRequest).toHaveBeenCalledTimes(4);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(sessionStorage.getItem(`shepherd:tutor-request:${owner}`)).toBeNull();
});
