import type { LibraryExercise } from "./types";

/** Explain the actual loaded catalog, without guessing the user's row counts. */
export function exerciseCatalogComposition(exercises: LibraryExercise[]) {
  return {
    total: exercises.length,
    builtin: exercises.filter((item) => item.discipline === "musculation" && item.origin === "builtin").length,
    personal: exercises.filter((item) => item.discipline === "musculation" && item.origin === "personal").length,
    calisthenics: exercises.filter((item) => item.discipline === "calisthenics").length,
    photos: exercises.filter((item) => item.discipline === "musculation" && !!item.thumbnail).length,
    strength: exercises.filter((item) => item.discipline === "musculation").length,
  };
}
