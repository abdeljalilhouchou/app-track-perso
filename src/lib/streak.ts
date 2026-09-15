import { format, isWithinInterval, startOfWeek, endOfWeek, subDays } from "date-fns";

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

/** Finds the longest run of consecutive days ever logged, not just the current one. */
export function longestStreakEver(loggedDates: Set<string>): number {
  const sorted = Array.from(loggedDates).sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const dateStr of sorted) {
    const date = new Date(dateStr);
    if (previous && (date.getTime() - previous.getTime()) / 86_400_000 === 1) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
}

/** Counts how many of the logged dates fall within the current week (Monday-Sunday). */
export function countThisWeek(loggedDates: Set<string>): number {
  const now = new Date();
  const interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };

  let count = 0;
  for (const dateStr of loggedDates) {
    if (isWithinInterval(new Date(dateStr), interval)) count += 1;
  }
  return count;
}
