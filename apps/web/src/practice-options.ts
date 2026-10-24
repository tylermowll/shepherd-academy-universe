import type { Schema } from "./client";

export type LearningIntent = NonNullable<
  Schema<"TutoringSessionInput">["learning_intent"]
>;
export type MaterialSource = NonNullable<
  Schema<"TutorActivityInput">["source"]
>;

export const learningGoals: Array<{
  value: LearningIntent;
  label: string;
  description: string;
}> = [
  {
    value: "understand",
    label: "Understand a topic",
    description: "Explore an idea with explanations and examples.",
  },
  {
    value: "practice",
    label: "Practice a skill",
    description: "Try a question, share your thinking and get guidance.",
  },
  {
    value: "read",
    label: "Read and discuss a text",
    description: "Bring a text or choose one to read together.",
  },
  {
    value: "write",
    label: "Work on my writing",
    description: "Practice expressing and developing your ideas.",
  },
  {
    value: "review",
    label: "Review for a test",
    description: "Revisit a topic and find what needs more attention.",
  },
  {
    value: "homework",
    label: "Learn from my homework",
    description: "Explore the ideas through different practice.",
  },
  {
    value: "other",
    label: "Something else",
    description: "Tell the tutor what you would like to work on.",
  },
];

const sources: Array<{ value: MaterialSource; label: string }> = [
  { value: "topic", label: "Start with the topic" },
  { value: "reading_text", label: "Paste a text" },
  { value: "reading_photo", label: "Use a photo of a text" },
  { value: "reading_generated", label: "Ask the tutor to write a text" },
  { value: "published", label: "Choose a published text" },
  { value: "reference_text", label: "Paste my homework" },
  { value: "reference_photo", label: "Use a photo of my homework" },
];

export function materialChoices(intent?: LearningIntent) {
  return sources
    .filter(({ value }) => {
      if (!intent) return true;
      if (intent === "read")
        return value.startsWith("reading_") || value === "published";
      if (intent === "homework") return value.startsWith("reference_");
      if (intent === "practice" || intent === "write") return value === "topic";
      return ["topic", "reading_text", "reading_photo"].includes(value);
    })
    .map((choice) => ({
      ...choice,
      label:
        intent === "understand" || intent === "review"
          ? choice.value === "reading_text"
            ? "Paste my notes"
            : choice.value === "reading_photo"
              ? "Use a photo of my notes"
              : choice.label
          : choice.label,
    }));
}
