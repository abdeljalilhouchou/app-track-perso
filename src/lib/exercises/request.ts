import type { ExerciseRequest } from "./data";

export function parseExerciseRequest(params: URLSearchParams): ExerciseRequest | null {
  const key = params.get("key") || undefined, name = params.get("name") || undefined;
  const discipline = params.get("discipline") ?? "musculation", exerciseId = params.get("exerciseId") || undefined;
  if (!["musculation", "calisthenics", "running"].includes(discipline)) return null;
  if ((!key && !name && !exerciseId) || (key?.length ?? 0) > 160 || (name?.length ?? 0) > 160) return null;
  if (exerciseId && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(exerciseId)) return null;
  return { key, name, discipline: discipline as ExerciseRequest["discipline"], exerciseId };
}
