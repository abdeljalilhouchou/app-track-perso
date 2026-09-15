import { format, subDays } from "date-fns";

/** Counts consecutive days logged up to today (or yesterday, so today isn't required yet). */
export function computeStreak(loggedDates: Set<string>): number {
  const today = new Date();
  let streak = 0;
  let cursor = today;

  // If today isn't logged yet, the streak still counts from yesterday backwards.
  if (!loggedDates.has(format(today, "yyyy-MM-dd"))) {
    cursor = subDays(today, 1);
  }

  while (loggedDates.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}
