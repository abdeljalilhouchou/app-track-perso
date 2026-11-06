import type { LibraryExercise } from "./types";
import type { Language } from "@/lib/language";

/** Display search only; never used to join saved performances. */
export function searchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "").toLocaleLowerCase().trim();
}
export type ExerciseFilters = { search: string; discipline: string; muscle: string; equipment: string; level: string; sort: string };
export function filterExercises(exercises: LibraryExercise[], filters: ExerciseFilters, language: Language) {
  const { search, discipline, muscle, equipment, level, sort } = filters;
  const query = searchText(search);
  return exercises.filter((item) => (discipline === "all" || item.discipline === discipline)
    && (!query || searchText([item.name, ...item.searchNames].join(" ")).includes(query))
    && (muscle === "all" || [...item.primary, ...item.secondary].includes(muscle))
    && (equipment === "all" || (equipment === "unknown" ? !item.equipment.length : item.equipment.includes(equipment as LibraryExercise["equipment"][number])))
    && (level === "all" || (level === "unknown" ? !item.level : item.level === level)))
    .sort((a, b) => (sort === "asc" ? 1 : -1) * a.name.localeCompare(b.name, language));
}
