import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LearningLevelPicker } from "../src/LearningLevelPicker";
import {
  normalizeLearningLevel,
  type LearningLevelValue,
  type LevelSubject,
} from "../src/learning-levels";
import { SessionSettings } from "../src/SessionSettings";
import type { Schema } from "../src/client";

function Harness({
  initial = null,
  context = "",
}: {
  initial?: LearningLevelValue | null;
  context?: LevelSubject;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <LearningLevelPicker
        value={value}
        onChange={setValue}
        disabled={false}
        defaultSubject={context}
      />
      <output aria-label="Selected learning level">
        {JSON.stringify(normalizeLearningLevel(value))}
      </output>
    </>
  );
}
afterEach(cleanup);

it("defaults to no level and uses reading context without assuming a grade", () => {
  render(<Harness context="reading" />);
  expect(screen.getByLabelText("Subject for this level")).toHaveValue(
    "reading",
  );
  expect(screen.getByLabelText("Reading level")).toHaveValue("");
  expect(screen.getByLabelText("Selected learning level")).toHaveTextContent(
    "null",
  );
});

it("keeps each subject's draft while changing or clearing the selected level", () => {
  render(<Harness />);
  const subject = screen.getByLabelText("Subject for this level");
  fireEvent.change(subject, { target: { value: "reading" } });
  fireEvent.change(screen.getByLabelText("Reading level"), {
    target: { value: "grades_3_5" },
  });
  fireEvent.change(subject, { target: { value: "math" } });
  fireEvent.change(screen.getByLabelText("Math grade or course"), {
    target: { value: "algebra_1" },
  });
  fireEvent.change(subject, { target: { value: "other" } });
  fireEvent.change(screen.getByLabelText("Course or level"), {
    target: { value: "  introductory biology  " },
  });
  expect(screen.getByLabelText("Selected learning level")).toHaveTextContent(
    JSON.stringify({ subject: "other", level: "introductory biology" }),
  );
  fireEvent.change(subject, { target: { value: "reading" } });
  expect(screen.getByLabelText("Reading level")).toHaveValue("grades_3_5");
  fireEvent.change(subject, { target: { value: "math" } });
  expect(screen.getByLabelText("Math grade or course")).toHaveValue(
    "algebra_1",
  );
  fireEvent.change(subject, { target: { value: "" } });
  expect(screen.getByLabelText("Selected learning level")).toHaveTextContent(
    "null",
  );
  fireEvent.change(subject, { target: { value: "other" } });
  expect(screen.getByLabelText("Course or level")).toHaveValue(
    "  introductory biology  ",
  );
});

it("retains an oversized Unicode course and disables saved settings until corrected", () => {
  const save = vi.fn();
  const session: Schema<"TutoringSessionPublic"> = {
    id: "synthetic-session",
    learner_id: "synthetic-learner",
    status: "open",
    topic: "Original biology topic",
    learning_intent: "understand",
    learning_level: null,
    initiative: "balanced",
    difficulty: "standard",
    created_at: "2026-10-24T12:00:00Z",
    problems: [],
  };
  render(<SessionSettings session={session} disabled={false} onSave={save} />);
  fireEvent.click(screen.getByText("Session settings"));
  fireEvent.change(screen.getByLabelText("Subject for this level"), {
    target: { value: "other" },
  });
  fireEvent.change(screen.getByLabelText("Course or level"), {
    target: { value: "🌱".repeat(81) },
  });
  expect(screen.getByLabelText("Course or level")).toHaveValue("🌱".repeat(81));
  expect(screen.getByRole("status")).toHaveTextContent("80 characters");
  expect(
    screen.getByRole("button", { name: "Save session settings" }),
  ).toBeDisabled();
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Save session settings" })
      .closest("form")!,
  );
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Course or level"), {
    target: { value: "  " + "🌱".repeat(80) + "  " },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save session settings" }),
  );
  expect(save).toHaveBeenLastCalledWith({
    initiative: "balanced",
    difficulty: "standard",
    learning_level: { subject: "other", level: "🌱".repeat(80) },
  });
});

it("loads a saved math course and explicitly clears it through the settings contract", () => {
  const save = vi.fn();
  const session: Schema<"TutoringSessionPublic"> = {
    id: "synthetic-session",
    learner_id: "synthetic-learner",
    status: "open",
    topic: "Geometry",
    learning_intent: "practice",
    learning_level: { subject: "math", level: "geometry" },
    initiative: "balanced",
    difficulty: "standard",
    created_at: "2026-10-24T12:00:00Z",
    problems: [],
  };
  render(<SessionSettings session={session} disabled={false} onSave={save} />);
  fireEvent.click(screen.getByText("Session settings"));
  expect(screen.getByLabelText("Math grade or course")).toHaveValue("geometry");
  fireEvent.change(screen.getByLabelText("Subject for this level"), {
    target: { value: "" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save session settings" }),
  );
  expect(save).toHaveBeenLastCalledWith({
    initiative: "balanced",
    difficulty: "standard",
    learning_level: null,
  });
});

it("keeps level controls unavailable while a request is pending", () => {
  render(
    <LearningLevelPicker
      value={{ subject: "math", level: "grade_5" }}
      disabled={true}
      onChange={vi.fn()}
    />,
  );
  expect(screen.getByLabelText("Subject for this level")).toBeDisabled();
  expect(screen.getByLabelText("Math grade or course")).toBeDisabled();
});

it("keeps session settings open and preserves drafts across identical refreshes before applying saved values", () => {
  const save = vi.fn();
  const session: Schema<"TutoringSessionPublic"> = {
    id: "synthetic-session",
    learner_id: "synthetic-learner",
    status: "open",
    topic: "Original math topic",
    learning_intent: "practice",
    learning_level: { subject: "math", level: "grade_5" },
    initiative: "balanced",
    difficulty: "standard",
    created_at: "2026-10-24T12:00:00Z",
    problems: [],
  };
  const view = render(
    <SessionSettings session={session} disabled={false} onSave={save} />,
  );
  fireEvent.click(screen.getByText("Session settings"));
  fireEvent.change(screen.getByLabelText("Subject for this level"), {
    target: { value: "other" },
  });
  fireEvent.change(screen.getByLabelText("Course or level"), {
    target: { value: "  Keep my biology draft  " },
  });
  view.rerender(
    <SessionSettings
      session={{
        ...session,
        learning_level: { subject: "math", level: "grade_5" },
      }}
      disabled={false}
      onSave={save}
    />,
  );
  expect(
    screen.getByText("Session settings").closest("details"),
  ).toHaveAttribute("open");
  expect(screen.getByLabelText("Course or level")).toHaveValue(
    "  Keep my biology draft  ",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save session settings" }),
  );
  expect(save).toHaveBeenLastCalledWith({
    initiative: "balanced",
    difficulty: "standard",
    learning_level: { subject: "other", level: "Keep my biology draft" },
  });
  view.rerender(
    <SessionSettings
      session={{
        ...session,
        difficulty: "challenge",
        learning_level: { subject: "other", level: "Keep my biology draft" },
      }}
      disabled={false}
      onSave={save}
    />,
  );
  expect(
    screen.getByText("Session settings").closest("details"),
  ).toHaveAttribute("open");
  expect(screen.getByLabelText("Course or level")).toHaveValue(
    "Keep my biology draft",
  );
  expect(screen.getByLabelText("How challenging should it be?")).toHaveValue(
    "challenge",
  );
});
