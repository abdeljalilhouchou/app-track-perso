/**
 * The focus-mode session: which set is being done, what to aim for today, the plates to
 * load and what the finished session worked. Pure functions over the session draft.
 */

export type FocusSet = { reps: string; weight: string; done: boolean };
export type FocusExercise = { name: string; muscle: string; sets: FocusSet[] };
export type PastSet = { reps: number; weight: number };

export const toNumber = (value: string) => {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** The first set not done yet, or -1 when every set is done. */
export function currentSetIndex(sets: FocusSet[]) {
  return sets.findIndex((set) => !set.done);
}

/** The next exercise, after `from`, that still has a set to do (wrapping round), or -1. */
export function nextOpenExercise(exercises: FocusExercise[], from: number) {
  for (let step = 1; step <= exercises.length; step += 1) {
    const index = (from + step) % exercises.length;
    if (currentSetIndex(exercises[index].sets) !== -1 && index !== from) return index;
  }
  return -1;
}

/** Adds `delta` to a typed value, never below zero, keeping quarter-kilo precision. */
export function stepValue(value: string, delta: number) {
  const next = Math.max(0, Math.round((toNumber(value) + delta) * 4) / 4);
  return String(next);
}

/**
 * Today's aim for an exercise from its last session: every set at the target reps or more
 * earns +2.5 kg (+1 kg under 10 kg); otherwise the same load. Bodyweight work keeps its reps.
 */
export function nextTarget(lastSets: PastSet[], targetReps: number | null): { weight: number; reps: number; up: boolean } | null {
  const worked = lastSets.filter((set) => set.reps > 0);
  if (!worked.length) return null;
  const top = Math.max(...worked.map((set) => set.weight));
  const reps = targetReps ?? Math.max(...worked.map((set) => set.reps));
  if (top <= 0) return { weight: 0, reps, up: false };
  const atTop = worked.filter((set) => set.weight === top);
  const earned = targetReps !== null && atTop.every((set) => set.reps >= targetReps);
  const step = top < 10 ? 1 : 2.5;
  return { weight: earned ? top + step : top, reps, up: earned };
}

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Plates per side on a barbell for the load, or null when it cannot be made exactly. */
export function platesPerSide(total: number, bar = 20) {
  if (!(total > bar)) return null;
  let side = Math.round(((total - bar) / 2) * 100) / 100;
  const plates: number[] = [];
  for (const plate of PLATES) {
    while (side >= plate - 1e-9) {
      plates.push(plate);
      side = Math.round((side - plate) * 100) / 100;
    }
  }
  return side === 0 ? plates : null;
}

/** Barbell work, from the exercise's known equipment or its name. */
export function usesBarbell(name: string, equipment: string[]) {
  return equipment.includes("barbell") || /\b(barre|barbell)\b/i.test(name);
}

/** Done sets with reps, per muscle, most worked first. */
export function musclesWorked(exercises: FocusExercise[]) {
  const counts = new Map<string, number>();
  for (const exercise of exercises) {
    const done = exercise.sets.filter((set) => set.done && toNumber(set.reps) > 0).length;
    if (done) counts.set(exercise.muscle, (counts.get(exercise.muscle) ?? 0) + done);
  }
  return [...counts].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets);
}
