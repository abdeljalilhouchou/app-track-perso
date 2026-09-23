import { eachDayOfInterval, format, getISODay } from "date-fns";

/** Success rate (0-100) over a date range, counting only days the habit was actually scheduled. */
export function successRate(
  loggedDates: Set<string>,
  scheduledDays: number[],
  start: Date,
  end: Date
): { rate: number; completed: number; expected: number } {
  const days = eachDayOfInterval({ start, end });
  let expected = 0;
  let completed = 0;

  for (const day of days) {
    if (!scheduledDays.includes(getISODay(day))) continue;
    expected += 1;
    if (loggedDates.has(format(day, "yyyy-MM-dd"))) completed += 1;
  }

  return { rate: expected > 0 ? Math.round((completed / expected) * 100) : 0, completed, expected };
}

/**
 * Finds which scheduled weekday has the best completion rate historically.
 * Returns the ISO weekday number (1 = Monday ... 7 = Sunday) rather than a display label, so the
 * caller can render it translated (e.g. via `weekdaySlug` + `t("habits.weekdaysLong.*")`).
 */
export function bestWeekday(
  loggedDates: Set<string>,
  scheduledDays: number[]
): { day: number; rate: number } | null {
  if (scheduledDays.length === 0) return null;

  const allDates = Array.from(loggedDates).sort();
  if (allDates.length === 0) return null;

  const firstDate = new Date(allDates[0]);
  const days = eachDayOfInterval({ start: firstDate, end: new Date() });

  const totals = new Map<number, { completed: number; expected: number }>();
  for (const dayNum of scheduledDays) totals.set(dayNum, { completed: 0, expected: 0 });

  for (const day of days) {
    const isoDay = getISODay(day);
    if (!totals.has(isoDay)) continue;
    const entry = totals.get(isoDay)!;
    entry.expected += 1;
    if (loggedDates.has(format(day, "yyyy-MM-dd"))) entry.completed += 1;
  }

  let best: { day: number; rate: number } | null = null;
  for (const [day, { completed, expected }] of totals) {
    if (expected === 0) continue;
    const rate = Math.round((completed / expected) * 100);
    if (!best || rate > best.rate) best = { day, rate };
  }

  if (!best) return null;
  return { day: best.day, rate: best.rate };
}
