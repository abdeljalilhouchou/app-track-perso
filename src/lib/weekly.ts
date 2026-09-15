import { format, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

/** Buckets a list of {date, value} pairs into the last `weeks` weekly totals. */
export function weeklyTotals(
  entries: { date: string; value: number }[],
  weeks = 10
): { label: string; value: number }[] {
  const today = new Date();
  const buckets = new Map<string, number>();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
    buckets.set(format(weekStart, "yyyy-MM-dd"), 0);
  }

  for (const entry of entries) {
    const weekStart = format(startOfWeek(new Date(entry.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (buckets.has(weekStart)) {
      buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + entry.value);
    }
  }

  return Array.from(buckets.entries()).map(([weekStart, value]) => ({
    label: format(new Date(weekStart), "d MMM", { locale: fr }),
    value,
  }));
}
