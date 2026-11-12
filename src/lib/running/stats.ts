import { format, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";

export const RUN_TYPES = ["easy", "endurance", "long", "tempo", "interval", "recovery", "free", "race"] as const;
export type RunType = (typeof RUN_TYPES)[number];

export type RunningRun = {
  workout_id: string;
  user_id: string;
  workout_date: string;
  activity: string;
  duration_minutes: number;
  intensity: number;
  workout_notes: string | null;
  name: string;
  run_type: RunType;
  distance_km: number;
  duration_seconds: number;
  elevation_gain_m: number | null;
  average_heart_rate: number | null;
  cadence_spm: number | null;
  created_at: string;
};

export type RunningGoals = {
  weekly_distance_km: number | null;
  weekly_runs: number | null;
  monthly_distance_km: number | null;
  target_5k_seconds: number | null;
  target_10k_seconds: number | null;
};

export type RunningMetrics = { paceSecondsPerKm: number; speedKmh: number };

export function calculateRunningMetrics(distanceKm: number, durationSeconds: number): RunningMetrics | null {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  const paceSecondsPerKm = Math.round(durationSeconds / distanceKm);
  const speedKmh = distanceKm / (durationSeconds / 3600);
  if (!Number.isFinite(paceSecondsPerKm) || !Number.isFinite(speedKmh) || paceSecondsPerKm <= 0) return null;
  return { paceSecondsPerKm, speedKmh };
}

export function formatPace(secondsPerKm: number | null | undefined) {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "—";
  const rounded = Math.round(secondsPerKm);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");
const weekKey = (date: Date) => dateKey(startOfWeek(date, { weekStartsOn: 1 }));

export function computeRunningStats(runs: RunningRun[], goals: RunningGoals | null, now = new Date()) {
  const validRuns = runs.filter((run) =>
    Number.isFinite(run.distance_km) && run.distance_km > 0 &&
    Number.isInteger(run.duration_seconds) && run.duration_seconds > 0 &&
    calculateRunningMetrics(run.distance_km, run.duration_seconds) !== null
  );
  const today = dateKey(now);
  const currentWeek = weekKey(now);
  const currentMonth = format(now, "yyyy-MM");
  const thisWeek = validRuns.filter((run) => weekKey(parseISO(run.workout_date)) === currentWeek);
  const previousWeekKey = dateKey(subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1));
  const lastWeekRuns = validRuns.filter((run) => weekKey(parseISO(run.workout_date)) === previousWeekKey);
  const thisMonth = validRuns.filter((run) => run.workout_date.startsWith(currentMonth));
  const sumDistance = (rows: RunningRun[]) =>
    rows.reduce((totalMeters, run) => totalMeters + Math.round(run.distance_km * 1000), 0) / 1000;
  const sumDuration = (rows: RunningRun[]) => rows.reduce((total, run) => total + run.duration_seconds, 0);
  const totalDistanceKm = sumDistance(validRuns);
  const totalDurationSeconds = sumDuration(validRuns);
  const weightedAveragePace = totalDistanceKm > 0 ? totalDurationSeconds / totalDistanceKm : null;
  const paceRows = validRuns
    .map((run) => ({ run, pace: calculateRunningMetrics(run.distance_km, run.duration_seconds)!.paceSecondsPerKm }))
    .sort((a, b) => a.pace - b.pace);
  const orderedRuns = [...validRuns].sort((a, b) => b.workout_date.localeCompare(a.workout_date) || b.created_at.localeCompare(a.created_at));

  const weeklyDistance = Array.from({ length: 8 }, (_, index) => {
    const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 7 - index);
    const key = dateKey(start);
    const rows = validRuns.filter((run) => weekKey(parseISO(run.workout_date)) === key);
    return { weekStart: key, distanceKm: sumDistance(rows), runCount: rows.length };
  });
  const monthlyDistance = Array.from({ length: 6 }, (_, index) => {
    const month = startOfMonth(subMonths(now, 5 - index));
    const key = format(month, "yyyy-MM");
    return { month: key, distanceKm: sumDistance(validRuns.filter((run) => run.workout_date.startsWith(key))) };
  });
  const comparableRecord = (targetKm: number) => {
    const toleranceKm = targetKm * 0.01;
    return validRuns
      .filter((run) => Math.abs(run.distance_km - targetKm) <= toleranceKm)
      .sort((a, b) => a.duration_seconds - b.duration_seconds)[0] ?? null;
  };

  return {
    runCount: validRuns.length,
    totalDistanceKm,
    totalDurationSeconds,
    thisWeek: { runs: thisWeek.length, distanceKm: sumDistance(thisWeek), durationSeconds: sumDuration(thisWeek) },
    lastWeek: { runs: lastWeekRuns.length, distanceKm: sumDistance(lastWeekRuns), durationSeconds: sumDuration(lastWeekRuns) },
    thisMonth: { distanceKm: sumDistance(thisMonth), runs: thisMonth.length },
    weightedAveragePace,
    bestPace: paceRows[0]?.pace ?? null,
    longestDistance: validRuns.reduce<RunningRun | null>((best, run) => !best || run.distance_km > best.distance_km ? run : best, null),
    longestDuration: validRuns.reduce<RunningRun | null>((best, run) => !best || run.duration_seconds > best.duration_seconds ? run : best, null),
    paceTrend: orderedRuns.slice(0, 8).reverse().map((run) => ({ date: run.workout_date, pace: calculateRunningMetrics(run.distance_km, run.duration_seconds)!.paceSecondsPerKm })),
    weeklyConsistency: weeklyDistance.filter((week) => week.runCount > 0).length,
    weeklyDistance,
    monthlyDistance,
    comparable1k: comparableRecord(1),
    comparable5k: comparableRecord(5),
    comparable10k: comparableRecord(10),
    goals: goals ?? null,
    goalProgress: {
      weeklyDistance: goals?.weekly_distance_km ? Math.min(1, sumDistance(thisWeek) / goals.weekly_distance_km) : null,
      weeklyRuns: goals?.weekly_runs ? Math.min(1, thisWeek.length / goals.weekly_runs) : null,
      monthlyDistance: goals?.monthly_distance_km ? Math.min(1, sumDistance(thisMonth) / goals.monthly_distance_km) : null,
    },
    today,
  };
}
