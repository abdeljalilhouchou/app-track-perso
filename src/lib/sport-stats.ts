import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { computeStreak, longestStreakEver } from "@/lib/streak";

export type WorkoutLike = {
  workout_date: string;
  activity: string;
  duration_minutes: number;
  intensity: number;
};

export type ActivityStat = {
  name: string;
  count: number;
  minutes: number;
  avgDuration: number;
  avgIntensity: number;
};

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export function computeSportStats(workouts: WorkoutLike[], weeklyGoal: number) {
  const today = new Date();
  const thisStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastStart = subDays(thisStart, 7);
  // Compare against the same span of last week (Monday → same weekday) so mid-week deltas are fair.
  const lastEnd = addDays(lastStart, differenceInCalendarDays(today, thisStart));

  const inRange = (date: string, start: Date, end: Date) => date >= fmt(start) && date <= fmt(end);

  const thisWeek = workouts.filter((w) => inRange(w.workout_date, thisStart, today));
  const lastWeek = workouts.filter((w) => inRange(w.workout_date, lastStart, lastEnd));
  const sum = (rows: WorkoutLike[]) => rows.reduce((s, w) => s + w.duration_minutes, 0);

  // Activities, grouped case-insensitively
  const byActivity = new Map<string, { name: string; count: number; minutes: number; intensity: number }>();
  for (const w of workouts) {
    const key = w.activity.trim().toLowerCase();
    const entry = byActivity.get(key) ?? { name: w.activity.trim(), count: 0, minutes: 0, intensity: 0 };
    entry.count += 1;
    entry.minutes += w.duration_minutes;
    entry.intensity += w.intensity;
    byActivity.set(key, entry);
  }
  const activities: ActivityStat[] = Array.from(byActivity.values())
    .map((a) => ({
      name: a.name,
      count: a.count,
      minutes: a.minutes,
      avgDuration: Math.round(a.minutes / a.count),
      avgIntensity: Math.round(a.intensity / a.count),
    }))
    .sort((a, b) => b.count - a.count || b.minutes - a.minutes);

  // Records
  const longest = workouts.reduce<WorkoutLike | null>((best, w) => (!best || w.duration_minutes > best.duration_minutes ? w : best), null);
  const hardest = workouts.reduce<WorkoutLike | null>(
    (best, w) => (!best || w.duration_minutes * w.intensity > best.duration_minutes * best.intensity ? w : best),
    null
  );

  const minutesByWeek = new Map<string, number>();
  const sessionsByWeek = new Map<string, number>();
  for (const w of workouts) {
    const key = fmt(startOfWeek(parseISO(w.workout_date), { weekStartsOn: 1 }));
    minutesByWeek.set(key, (minutesByWeek.get(key) ?? 0) + w.duration_minutes);
    sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + 1);
  }
  let bestWeek: { weekStart: string; minutes: number } | null = null;
  for (const [weekStart, minutes] of minutesByWeek) {
    if (!bestWeek || minutes > bestWeek.minutes) bestWeek = { weekStart, minutes };
  }

  // Consecutive weeks reaching the goal (the current week counts once it's reached, otherwise we start from last week)
  let goalWeeks = 0;
  let cursor = thisStart;
  if ((sessionsByWeek.get(fmt(cursor)) ?? 0) < weeklyGoal) cursor = subDays(cursor, 7);
  while ((sessionsByWeek.get(fmt(cursor)) ?? 0) >= weeklyGoal && weeklyGoal > 0) {
    goalWeeks += 1;
    cursor = subDays(cursor, 7);
  }

  const dates = new Set(workouts.map((w) => w.workout_date));

  const heat: Record<string, number> = {};
  for (const w of workouts) heat[w.workout_date] = Math.min(1, (heat[w.workout_date] ?? 0) + w.duration_minutes / 60);

  return {
    thisWeek: { sessions: thisWeek.length, minutes: sum(thisWeek) },
    lastWeek: { sessions: lastWeek.length, minutes: sum(lastWeek) },
    totalSessions: workouts.length,
    totalMinutes: sum(workouts),
    activities,
    records: {
      longest,
      hardest,
      bestWeek,
      bestDayStreak: longestStreakEver(dates),
      currentDayStreak: computeStreak(dates),
      goalWeeks,
    },
    heat,
  };
}
