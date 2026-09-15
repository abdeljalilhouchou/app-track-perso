import { eachDayOfInterval, format, getISODay } from "date-fns";
import { WEEKDAYS } from "@/lib/habit-categories";

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

/** Finds which scheduled weekday has the best completion rate historically. */
export function bestWeekday(
  loggedDates: Set<string>,
  scheduledDays: number[]
): { label: string; rate: number } | null {
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
  const label = WEEKDAYS.find((w) => w.value === best!.day)?.label ?? "";
  return { label, rate: best.rate };
}
