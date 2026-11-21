import type { LibraryExercise } from "./types";

/** The library's colour families, from the main muscle of each exercise. */
export const EXERCISE_CATEGORIES = [
  { id: "chest", muscles: ["Pectoraux"], color: "var(--nutrition)" },
  { id: "back", muscles: ["Dos"], color: "var(--water)" },
  { id: "shoulders", muscles: ["Épaules"], color: "var(--habit)" },
  { id: "arms", muscles: ["Biceps", "Triceps", "Avant-bras"], color: "var(--accent)" },
  { id: "legs", muscles: ["Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets"], color: "var(--sport)" },
  { id: "core", muscles: ["Abdominaux"], color: "var(--mood)" },
  { id: "other", muscles: [], color: "var(--foreground-muted)" },
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export type ExerciseCategoryId = ExerciseCategory["id"];

export function categoryOfMuscle(muscle: string | undefined): ExerciseCategory {
  return EXERCISE_CATEGORIES.find((category) => (category.muscles as readonly string[]).includes(muscle ?? "")) ?? EXERCISE_CATEGORIES[EXERCISE_CATEGORIES.length - 1];
}

export function categoryOf(exercise: Pick<LibraryExercise, "primary">) {
  return categoryOfMuscle(exercise.primary[0]);
}

/** Exercises grouped by category in the families' order, empty families left out. */
export function groupByCategory<T extends Pick<LibraryExercise, "primary">>(exercises: T[]) {
  return EXERCISE_CATEGORIES.map((category) => ({ category, items: exercises.filter((exercise) => categoryOf(exercise).id === category.id) })).filter((group) => group.items.length > 0);
}

/** Two letters for an exercise without a photo: the first letters of its first two words. */
export function exerciseInitials(name: string) {
  const words = name.trim().split(/[\s'’-]+/).filter((word) => /\p{L}/u.test(word));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toLocaleUpperCase();
}
