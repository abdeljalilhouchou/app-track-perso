import { endOfWeek, getISOWeek, startOfWeek } from "date-fns";

/** "Semaine 47 · 16–22 nov." style label for the current week, in the given locale. */
export function weekHeading(now: Date, locale: string): { week: number; range: string } {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  const day = new Intl.DateTimeFormat(locale, { day: "numeric" });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const range = start.getMonth() === end.getMonth()
    ? `${day.format(start)}–${dayMonth.format(end)}`
    : `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
  return { week: getISOWeek(now), range };
}

/** ISO week number of a "yyyy-MM-dd" key, read at noon to stay clear of time zones. */
export function isoWeekOf(dateKey: string): number {
  return getISOWeek(new Date(`${dateKey}T12:00:00`));
}
