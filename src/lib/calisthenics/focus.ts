/**
 * Calisthenics focus session: category colours, today's aim per exercise, the set in
 * progress and what the session adds up to. Pure functions over the session draft.
 */

export type CaliCategory = "push" | "pull" | "legs" | "core" | "skills" | "mobility";
export type FocusSet = { reps: number | null; holdSeconds: number | null; mode: "reps" | "hold"; assistanceKg: number | null; addedWeightKg: number | null; done?: boolean };

export const CATEGORY_COLORS: Record<CaliCategory, string> = {
  push: "var(--nutrition)",
  pull: "var(--water)",
  legs: "var(--sport)",
  core: "var(--mood)",
  skills: "var(--habit)",
  mobility: "var(--accent)",
};

export function categoryColor(category: string | undefined) {
  return CATEGORY_COLORS[(category ?? "") as CaliCategory] ?? "var(--foreground-muted)";
}

/** The first set not done yet, or -1 when every set is done. */
export function currentSetIndex(sets: { done?: boolean }[]) {
  return sets.findIndex((set) => !set.done);
}

/** The next exercise after `from` (wrapping round) with a set left, or -1. */
export function nextOpenItem(items: { sets: { done?: boolean }[] }[], from: number) {
  for (let step = 1; step < items.length; step += 1) {
    const index = (from + step) % items.length;
    if (currentSetIndex(items[index].sets) !== -1) return index;
  }
  return -1;
}

/**
 * Today's aim from the last session's best set and the planned target: one more rep, or
 * five more seconds, once the target was reached; otherwise the target itself.
 */
export function nextAim(last: number | null, target: number | null, mode: "reps" | "hold"): { value: number; up: boolean } | null {
  if (last === null && target === null) return null;
  if (last === null) return { value: target!, up: false };
  if (target !== null && last < target) return { value: target, up: false };
  return { value: last + (mode === "hold" ? 5 : 1), up: true };
}

/** The value a set is shown with: seconds or reps, plus its load or assistance. */
export function setLabel(set: Pick<FocusSet, "reps" | "holdSeconds" | "mode" | "assistanceKg" | "addedWeightKg">, units: { reps: string; seconds: string }) {
  const value = set.mode === "hold" ? `${set.holdSeconds ?? 0} ${units.seconds}` : `${set.reps ?? 0} ${units.reps}`;
  const load = set.addedWeightKg ? ` · +${set.addedWeightKg} kg` : set.assistanceKg ? ` · −${set.assistanceKg} kg` : "";
  return value + load;
}

/** What the done sets of a session add up to. */
export function sessionTotals(items: { sets: FocusSet[] }[]) {
  let sets = 0, reps = 0, holdSeconds = 0;
  for (const item of items) for (const set of item.sets) {
    if (!set.done) continue;
    sets += 1;
    if (set.mode === "hold") holdSeconds += set.holdSeconds ?? 0;
    else reps += set.reps ?? 0;
  }
  return { sets, reps, holdSeconds };
}

/** Sets per category, for the balance of a program or a week. */
export function setsByCategory(rows: { category: string | undefined; sets: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) if (row.category) totals.set(row.category, (totals.get(row.category) ?? 0) + row.sets);
  return totals;
}
