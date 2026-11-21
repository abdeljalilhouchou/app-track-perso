import { addDays, format, startOfWeek, subDays, subWeeks } from "date-fns";

/**
 * The Progress tab: key figures over a period against the period before, records beaten,
 * an exercise's curve over the period and the last twelve weeks of regularity.
 */

export type ProgressWorkout = { date: string; minutes: number; volume: number | null };
export type ProgressSession = { date: string; topWeight: number; est1RM: number };
export type ProgressExercise = { key: string; name: string; sessions: ProgressSession[] };

const key = (date: Date) => format(date, "yyyy-MM-dd");

/** Sessions of an exercise that beat every earlier top load (the very first one never counts). */
export function recordDates(sessions: ProgressSession[]) {
  const dates: string[] = [];
  let best = 0;
  sessions.forEach((session, index) => {
    if (index > 0 && session.topWeight > best && best > 0) dates.push(session.date);
    best = Math.max(best, session.topWeight);
  });
  return dates;
}

export function progressFigures(workouts: ProgressWorkout[], exercises: ProgressExercise[], days: number, now = new Date()) {
  const end = key(now);
  const start = key(subDays(now, days - 1));
  const previousStart = key(subDays(now, days * 2 - 1));
  const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
  const current = workouts.filter((workout) => inRange(workout.date, start, end));
  const previous = workouts.filter((workout) => inRange(workout.date, previousStart, key(subDays(now, days))));
  const volume = (rows: ProgressWorkout[]) => rows.reduce((sum, row) => sum + (row.volume ?? 0), 0);
  const average = (rows: ProgressWorkout[]) => (rows.length ? Math.round(rows.reduce((sum, row) => sum + row.minutes, 0) / rows.length) : 0);
  const records = exercises.flatMap((exercise) => recordDates(exercise.sessions)).filter((date) => inRange(date, start, end)).length;
  const currentVolume = volume(current);
  const previousVolume = volume(previous);
  return {
    sessions: current.length,
    sessionsChange: current.length - previous.length,
    volume: currentVolume,
    volumeChange: previousVolume > 0 ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : null,
    averageMinutes: average(current),
    averageChange: previous.length ? average(current) - average(previous) : null,
    records,
  };
}

/** An exercise's sessions within the period, oldest first, with the gain over the period. */
export function exerciseCurve(exercise: ProgressExercise, days: number, now = new Date()) {
  const start = key(subDays(now, days - 1));
  const points = exercise.sessions.filter((session) => session.date >= start && session.topWeight > 0);
  const gain = points.length >= 2 ? Math.round((points[points.length - 1].topWeight - points[0].topWeight) * 100) / 100 : null;
  return { points, gain };
}

/** Twelve weeks × seven days of sessions (oldest week first), and the weeks reaching the goal. */
export function regularity(dates: string[], weeklyGoal: number, now = new Date()) {
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(date, (counts.get(date) ?? 0) + 1);
  const firstWeek = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11);
  const today = key(now);
  const weeks = Array.from({ length: 12 }, (_, week) => {
    const days = Array.from({ length: 7 }, (_, day) => {
      const date = key(addDays(firstWeek, week * 7 + day));
      return { date, count: counts.get(date) ?? 0, future: date > today };
    });
    return { start: days[0].date, days, total: days.reduce((sum, day) => sum + day.count, 0) };
  });
  const total = weeks.reduce((sum, week) => sum + week.total, 0);
  // The current week counts once it has reached the goal.
  const goalWeeks = weeks.filter((week) => week.total >= weeklyGoal).length;
  // Weeks in a row reaching the goal, ending with this week when it is already reached, else last week.
  let streak = 0;
  for (let index = weeks[11].total >= weeklyGoal ? 11 : 10; index >= 0 && weeks[index].total >= weeklyGoal; index -= 1) streak += 1;
  // The average leaves out the current, unfinished week.
  const average = Math.round((weeks.slice(0, 11).reduce((sum, week) => sum + week.total, 0) / 11) * 10) / 10;
  return { weeks, total, goalWeeks, streak, average };
}
