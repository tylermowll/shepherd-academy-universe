import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Schema } from "../src/client";
import { ReadingPassage } from "../src/ReadingPassage";
import { MaterialNavigation } from "../src/MaterialNavigation";

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
  expect(
    screen.getByText(/Some words in the photo may have been misread/),
  ).toBeVisible();
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

const materialFocus: NonNullable<Schema<"ProblemPublic">["material_focus"]> = {
  mode: "guided",
  section_size: "short",
  section_index: 0,
  section_count: 3,
  start: 0,
  end: 17,
  text: "A clear opening.",
};

function moveFocusToBody() {
  // jsdom can retain focus when a focused control is disabled. Use an enabled
  // target to reproduce Chromium's focus loss before checking restoration.
  const target = document.createElement("button");
  document.body.append(target);
  target.focus();
  target.blur();
  target.remove();
  expect(document.body).toHaveFocus();
}

it("returns section-navigation focus after pending work and chooses an enabled control at the boundary", () => {
  const change = vi.fn();
  const view = render(
    <MaterialNavigation
      focus={materialFocus}
      disabled={false}
      onChange={change}
    />,
  );
  const next = screen.getByRole("button", { name: "Next section" });
  next.focus();
  fireEvent.click(next);
  expect(change).toHaveBeenLastCalledWith({ section_index: 1 });
  view.rerender(
    <MaterialNavigation focus={materialFocus} disabled onChange={change} />,
  );
  moveFocusToBody();
  view.rerender(
    <MaterialNavigation
      focus={{ ...materialFocus, section_index: 1 }}
      disabled={false}
      onChange={change}
    />,
  );
  expect(next).toHaveFocus();
  fireEvent.click(next);
  view.rerender(
    <MaterialNavigation
      focus={{ ...materialFocus, section_index: 1 }}
      disabled
      onChange={change}
    />,
  );
  moveFocusToBody();
  view.rerender(
    <MaterialNavigation
      focus={{ ...materialFocus, section_index: 2 }}
      disabled={false}
      onChange={change}
    />,
  );
  expect(next).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Previous section" }),
  ).toHaveFocus();
});

it("keeps reading pace open, updates its saved values and focuses its summary after applying a new mode", () => {
  const change = vi.fn();
  const view = render(
    <MaterialNavigation
      focus={materialFocus}
      disabled={false}
      onChange={change}
    />,
  );
  const summary = screen.getByText("Reading pace");
  fireEvent.click(summary);
  fireEvent.change(screen.getByRole("combobox", { name: "Reading mode" }), {
    target: { value: "whole" },
  });
  const apply = screen.getByRole("button", { name: "Apply reading pace" });
  apply.focus();
  fireEvent.click(apply);
  expect(change).toHaveBeenLastCalledWith({
    reading_mode: "whole",
    section_size: "short",
  });
  view.rerender(
    <MaterialNavigation focus={materialFocus} disabled onChange={change} />,
  );
  moveFocusToBody();
  view.rerender(
    <MaterialNavigation
      focus={{ ...materialFocus, mode: "whole", section_count: 1 }}
      disabled={false}
      onChange={change}
    />,
  );
  expect(summary).toHaveFocus();
  expect(summary.closest("details")).toHaveAttribute("open");
  expect(screen.getByRole("combobox", { name: "Reading mode" })).toHaveValue(
    "whole",
  );
  expect(apply).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Next section" })).toBeNull();
});

it("preserves unsaved pacing during polling and does not take focus from another control", () => {
  const change = vi.fn();
  const content = (focus: typeof materialFocus, disabled: boolean) => (
    <>
      <button>Another control</button>
      <MaterialNavigation focus={focus} disabled={disabled} onChange={change} />
    </>
  );
  const view = render(content(materialFocus, false));
  fireEvent.click(screen.getByText("Reading pace"));
  fireEvent.change(screen.getByRole("combobox", { name: "Section length" }), {
    target: { value: "long" },
  });
  const next = screen.getByRole("button", { name: "Next section" });
  next.focus();
  fireEvent.click(next);
  view.rerender(content(materialFocus, true));
  const other = screen.getByRole("button", { name: "Another control" });
  other.focus();
  view.rerender(content({ ...materialFocus, section_index: 1 }, false));
  expect(other).toHaveFocus();
  expect(screen.getByRole("combobox", { name: "Section length" })).toHaveValue(
    "long",
  );
  view.rerender(content({ ...materialFocus, section_index: 2 }, false));
  expect(other).toHaveFocus();
});

it("restores a failed action's focus but clears pending focus when the page is hidden", () => {
  const change = vi.fn();
  const content = (disabled: boolean, hidden = false) => (
    <>
      <button>Leave practice</button>
      <div hidden={hidden}>
        <MaterialNavigation
          focus={materialFocus}
          disabled={disabled}
          onChange={change}
        />
      </div>
    </>
  );
  const view = render(content(false));
  const next = screen.getByRole("button", { name: "Next section" });
  next.focus();
  fireEvent.click(next);
  view.rerender(content(true));
  moveFocusToBody();
  view.rerender(content(false));
  expect(next).toHaveFocus();
  fireEvent.click(next);
  view.rerender(content(true));
  const outside = screen.getByRole("button", { name: "Leave practice" });
  outside.focus();
  outside.blur();
  view.rerender(content(false, true));
  expect(document.body).toHaveFocus();
  view.rerender(content(false));
  expect(document.body).toHaveFocus();
});
