import { addWeeks, format, startOfWeek } from "date-fns";
import type { CalisthenicsSet, Workout } from "@/types/database";

export type ExercisePerformance = { key: string; name: string; total: number; best: number };

/** Reps and hold times stay in separate measures; `best` is a single-set record. */
export function computeCalisthenicsStats(workouts: Workout[], sets: CalisthenicsSet[], now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const thisWeek = workouts.filter((workout) => workout.workout_date >= weekStart && workout.workout_date <= today);
  const thisWeekIds = new Set(thisWeek.map((workout) => workout.id));
  // Volume stays split: repetitions and seconds are not added together.
  const weekVolume = sets.reduce((totals, set) => {
    if (!thisWeekIds.has(set.workout_id)) return totals;
    return { reps: totals.reps + (set.reps ?? 0), holdSeconds: totals.holdSeconds + (set.hold_seconds ?? 0) };
  }, { reps: 0, holdSeconds: 0 });
  // Consecutive weeks with at least one session, counting back from this week.
  // The current week not having started yet does not break the streak.
  const weeksWithSession = new Set(workouts.map((workout) => format(startOfWeek(new Date(`${workout.workout_date}T12:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd")));
  let weekStreak = 0;
  for (let offset = weeksWithSession.has(weekStart) ? 0 : 1; offset < 520; offset += 1) {
    const key = format(addWeeks(startOfWeek(now, { weekStartsOn: 1 }), -offset), "yyyy-MM-dd");
    if (!weeksWithSession.has(key)) break;
    weekStreak += 1;
  }
  const reps = new Map<string, ExercisePerformance>();
  const holds = new Map<string, ExercisePerformance>();

  for (const set of sets) {
    const key = set.exercise_id ?? set.exercise_name;
    if (set.reps !== null) {
      const record = reps.get(key) ?? { key, name: set.exercise_name, total: 0, best: 0 };
      record.total += set.reps;
      record.best = Math.max(record.best, set.reps);
      reps.set(key, record);
    }
    if (set.hold_seconds !== null) {
      const record = holds.get(key) ?? { key, name: set.exercise_name, total: 0, best: 0 };
      record.total += set.hold_seconds;
      record.best = Math.max(record.best, set.hold_seconds);
      holds.set(key, record);
    }
  }

  return {
    sessionsThisWeek: thisWeek.length,
    minutesThisWeek: thisWeek.reduce((total, workout) => total + workout.duration_minutes, 0),
    weekVolume,
    weekStreak,
    heat: workouts.reduce<Record<string, number>>((heat, workout) => {
      heat[workout.workout_date] = Math.min(1, (heat[workout.workout_date] ?? 0) + workout.duration_minutes / 60);
      return heat;
    }, {}),
    totalSessions: workouts.length,
    totalMinutes: workouts.reduce((total, workout) => total + workout.duration_minutes, 0),
    reps: Array.from(reps.values()).sort((a, b) => b.total - a.total),
    holds: Array.from(holds.values()).sort((a, b) => b.total - a.total),
  };
}
