import { isFiniteInRange } from "../actions/validation";

export type CalisthenicsMeasurement = "reps" | "hold" | "mixed";

/** A set stores exactly one measure; reps and hold time can never be combined. */
export function isValidCalisthenicsMeasure(
  type: CalisthenicsMeasurement,
  reps: number | null,
  holdSeconds: number | null
) {
  const repsValid = reps === null || isFiniteInRange(reps, 1, 500, true);
  const holdValid = holdSeconds === null || isFiniteInRange(holdSeconds, 1, 7200, true);
  const exactlyOne = Number(reps !== null) + Number(holdSeconds !== null) === 1;
  const typeMatches = type === "mixed" ||
    (type === "reps" && reps !== null && holdSeconds === null) ||
    (type === "hold" && holdSeconds !== null && reps === null);
  return repsValid && holdValid && exactlyOne && typeMatches;
}
