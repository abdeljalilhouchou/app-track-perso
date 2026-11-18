import { format, startOfWeek, subDays, subWeeks } from "date-fns";
import type { CalisthenicsSet, Workout } from "@/types/database";

/**
 * Week comparisons, per-exercise records and the push/pull/legs/core balance for the
 * Calisthenics overview and progress tabs. Repetitions and hold seconds are always
 * kept apart: adding them together would mean nothing.
 */

const key = (date: Date) => format(date, "yyyy-MM-dd");

export type WeekFigures = { sessions: number; minutes: number; reps: number; holdSeconds: number };

function figures(workouts: Workout[], sets: CalisthenicsSet[]): WeekFigures {
  const ids = new Set(workouts.map((workout) => workout.id));
  return sets.reduce((total, set) => ids.has(set.workout_id)
    ? { ...total, reps: total.reps + (set.reps ?? 0), holdSeconds: total.holdSeconds + (set.hold_seconds ?? 0) }
    : total, { sessions: workouts.length, minutes: workouts.reduce((sum, workout) => sum + workout.duration_minutes, 0), reps: 0, holdSeconds: 0 });
}

/** This week (Monday to today) against the whole previous week. */
export function compareWeeks(workouts: Workout[], sets: CalisthenicsSet[], now = new Date()): { current: WeekFigures; previous: WeekFigures } {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const thisStart = key(start), lastStart = key(subWeeks(start, 1)), today = key(now);
  return {
    current: figures(workouts.filter((workout) => workout.workout_date >= thisStart && workout.workout_date <= today), sets),
    previous: figures(workouts.filter((workout) => workout.workout_date >= lastStart && workout.workout_date < thisStart), sets),
  };
}

export type ExerciseRecord = { key: string; name: string; kind: "reps" | "hold"; value: number; date: string; isNew: boolean };

/**
 * Best single set per exercise and measure, dated by the session it was first reached in.
 * `isNew` marks a record set within the last seven days.
 */
export function exerciseRecords(workouts: Workout[], sets: CalisthenicsSet[], now = new Date()): ExerciseRecord[] {
  const dateOf = new Map(workouts.map((workout) => [workout.id, workout.workout_date]));
  const best = new Map<string, ExerciseRecord>();
  const recent = key(subDays(now, 7));
  // Oldest first, so an equal later result does not move the record date.
  const ordered = [...sets].filter((set) => dateOf.has(set.workout_id)).sort((a, b) => dateOf.get(a.workout_id)!.localeCompare(dateOf.get(b.workout_id)!));
  for (const set of ordered) {
    const exerciseKey = set.exercise_id ?? set.exercise_name;
    for (const [kind, value] of [["reps", set.reps], ["hold", set.hold_seconds]] as const) {
      if (value === null || value <= 0) continue;
      const id = `${exerciseKey}:${kind}`;
      const current = best.get(id);
      if (!current || value > current.value) {
        const date = dateOf.get(set.workout_id)!;
        best.set(id, { key: exerciseKey, name: set.exercise_name, kind, value, date, isNew: date >= recent });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date) || b.value - a.value);
}

export type BalanceCategory = "push" | "pull" | "legs" | "core";
export const BALANCE_CATEGORIES: BalanceCategory[] = ["push", "pull", "legs", "core"];

/** Sets per category this week; `lagging` names a trained-nothing category when others were trained. */
export function weekBalance(workouts: Workout[], sets: CalisthenicsSet[], categoryOf: (set: CalisthenicsSet) => string | undefined, now = new Date()) {
  const start = key(startOfWeek(now, { weekStartsOn: 1 })), today = key(now);
  const ids = new Set(workouts.filter((workout) => workout.workout_date >= start && workout.workout_date <= today).map((workout) => workout.id));
  const counts: Record<BalanceCategory, number> = { push: 0, pull: 0, legs: 0, core: 0 };
  for (const set of sets) {
    if (!ids.has(set.workout_id)) continue;
    const category = categoryOf(set);
    if (category && category in counts) counts[category as BalanceCategory] += 1;
  }
  const total = BALANCE_CATEGORIES.reduce((sum, category) => sum + counts[category], 0);
  const lagging = total > 0 ? BALANCE_CATEGORIES.filter((category) => counts[category] === 0) : [];
  return { counts, max: Math.max(...BALANCE_CATEGORIES.map((category) => counts[category]), 0), lagging };
}
