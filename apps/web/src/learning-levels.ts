import type { Schema } from "./client";
import { characterCount } from "./text-limits";

export type LearningLevelValue = NonNullable<
  Schema<"TutoringSessionInput">["learning_level"]
>;
export type LevelSubject = LearningLevelValue["subject"] | "";
export const readingLevels: Array<{
  value: Extract<LearningLevelValue, { subject: "reading" }>["level"];
  label: string;
}> = [
  { value: "grades_k_2", label: "Grades K–2" },
  { value: "grades_3_5", label: "Grades 3–5" },
  { value: "grades_6_8", label: "Grades 6–8" },
  { value: "grades_9_12", label: "Grades 9–12" },
  { value: "adult", label: "Adult reading" },
];
export const mathLevels: Array<{
  value: Extract<LearningLevelValue, { subject: "math" }>["level"];
  label: string;
}> = [
  { value: "grade_k", label: "Kindergarten" },
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((grade) => ({
    value: `grade_${grade}` as const,
    label: `Grade ${grade}`,
  })),
  { value: "pre_algebra", label: "Pre-algebra" },
  { value: "algebra_1", label: "Algebra 1" },
  { value: "geometry", label: "Geometry" },
  { value: "algebra_2", label: "Algebra 2" },
  { value: "precalculus", label: "Precalculus" },
  { value: "calculus", label: "Calculus" },
  { value: "college", label: "College math" },
];
export function normalizeLearningLevel(
  value: LearningLevelValue | null,
): LearningLevelValue | null {
  return value?.subject === "other"
    ? value.level.trim()
      ? { ...value, level: value.level.trim() }
      : null
    : value;
}
export function invalidLearningLevel(value: LearningLevelValue | null) {
  return value?.subject === "other" && characterCount(value.level.trim()) > 80;
}
