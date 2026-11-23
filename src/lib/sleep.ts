/**
 * Sleep: one night per row, keyed by the morning you woke up. Pure helpers, so the
 * page, the sheet and the server action agree and can be tested.
 */

export const SLEEP_TAGS = ["wakeups", "lateScreen", "lateCoffee", "heavyMeal", "nap"] as const;
export type SleepTag = (typeof SLEEP_TAGS)[number];
export type SleepLog = { wake_date: string; bedtime: string; wake_time: string; duration_minutes: number; quality: number; tags: string[] };
export type MoodDay = { entry_date: string; mood_score: number; energy_level: number };

/** Nights of at least this long count as "enough" when comparing mood and energy. */
export const ENOUGH_MINUTES = 7 * 60;
export const DEFAULT_GOAL_MINUTES = 7 * 60 + 30;
/** Fewer nights than this and no link with mood or habits is shown. */
export const MIN_NIGHTS_FOR_LINKS = 6;

const DAY = 24 * 60;

/** "23:40" or "23:40:00" → minutes after midnight, or null. */
export function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]), minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function fromMinutes(total: number) {
  const value = ((Math.round(total) % DAY) + DAY) % DAY;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

/** Minutes asleep from bedtime to wake time, across midnight. Null when the times are equal or unreadable. */
export function durationMinutes(bedtime: string, wakeTime: string): number | null {
  const bed = toMinutes(bedtime), wake = toMinutes(wakeTime);
  if (bed === null || wake === null) return null;
  const minutes = (wake - bed + DAY) % DAY;
  return minutes > 0 ? minutes : null;
}

/** In bed before midnight: an evening bedtime (from 18:00 to 23:59). */
export function beforeMidnight(bedtime: string) {
  const bed = toMinutes(bedtime);
  return bed !== null && bed >= 18 * 60;
}

/** Bedtime as minutes from midnight: 23:40 → -20, 00:30 → 30. Lets evening and night times average. */
export function bedtimeOffset(bedtime: string) {
  const bed = toMinutes(bedtime) ?? 0;
  return bed >= 12 * 60 ? bed - DAY : bed;
}

/** "7 h 25", "45 min". */
export function formatSleep(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60), rest = total % 60;
  return hours ? `${hours} h ${String(rest).padStart(2, "0")}` : `${rest} min`;
}

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

/** The evening a night started: the day before the morning you woke up. */
export const eveningOf = (wakeDate: string) => shiftDate(wakeDate, -1);

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

/**
 * Figures for the sleep page: the last 7 mornings, averages, bedtime regularity, and,
 * with enough nights, how sleep goes with mood and energy and what a tag costs.
 */
export function sleepStats(logs: SleepLog[], moods: MoodDay[], today: string) {
  const byDate = new Map(logs.map((log) => [log.wake_date, log]));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(today, index - 6);
    return { date, minutes: byDate.get(date)?.duration_minutes ?? null };
  });
  const weekLogs = week.map((day) => byDate.get(day.date)).filter((log): log is SleepLog => !!log);
  const offsets = weekLogs.map((log) => bedtimeOffset(log.bedtime));
  const meanOffset = average(offsets);
  const spread = meanOffset === null || offsets.length < 2 ? null : Math.round(Math.sqrt(average(offsets.map((offset) => (offset - meanOffset) ** 2)) ?? 0));

  const moodByDate = new Map(moods.map((mood) => [mood.entry_date, mood]));
  const paired = logs.map((log) => ({ log, mood: moodByDate.get(log.wake_date) })).filter((pair): pair is { log: SleepLog; mood: MoodDay } => !!pair.mood);
  const enough = paired.filter((pair) => pair.log.duration_minutes >= ENOUGH_MINUTES);
  const short = paired.filter((pair) => pair.log.duration_minutes < ENOUGH_MINUTES);
  const links = logs.length >= MIN_NIGHTS_FOR_LINKS && enough.length >= 2 && short.length >= 2 ? {
    mood: { enough: average(enough.map((pair) => pair.mood.mood_score))!, short: average(short.map((pair) => pair.mood.mood_score))! },
    energy: { enough: average(enough.map((pair) => pair.mood.energy_level))!, short: average(short.map((pair) => pair.mood.energy_level))! },
  } : null;

  let tagCost: { tag: SleepTag; minutes: number } | null = null;
  if (logs.length >= MIN_NIGHTS_FOR_LINKS) {
    for (const tag of SLEEP_TAGS) {
      const withTag = logs.filter((log) => log.tags.includes(tag)), without = logs.filter((log) => !log.tags.includes(tag));
      if (withTag.length < 2 || without.length < 2) continue;
      const cost = Math.round(average(without.map((log) => log.duration_minutes))! - average(withTag.map((log) => log.duration_minutes))!);
      if (cost >= 15 && (!tagCost || cost > tagCost.minutes)) tagCost = { tag, minutes: cost };
    }
  }

  return {
    week,
    average7: average(weekLogs.map((log) => log.duration_minutes)),
    bedtimeMean: meanOffset === null ? null : fromMinutes(meanOffset),
    bedtimeSpread: spread,
    beforeMidnight: { count: weekLogs.filter((log) => beforeMidnight(log.bedtime)).length, of: weekLogs.length },
    links,
    tagCost,
  };
}

/** Checks untrusted input from the sleep form; null when invalid. */
export function validateSleepInput(input: { wakeDate?: unknown; bedtime?: unknown; wakeTime?: unknown; quality?: unknown; tags?: unknown }, today: string) {
  const { wakeDate, bedtime, wakeTime, quality, tags } = input;
  if (typeof wakeDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(wakeDate) || wakeDate > today) return null;
  if (typeof bedtime !== "string" || typeof wakeTime !== "string") return null;
  const minutes = durationMinutes(bedtime, wakeTime);
  if (minutes === null || minutes > 16 * 60) return null;
  if (!Number.isInteger(quality) || (quality as number) < 1 || (quality as number) > 5) return null;
  const list = Array.isArray(tags) ? tags : [];
  if (list.length > SLEEP_TAGS.length || !list.every((tag) => (SLEEP_TAGS as readonly string[]).includes(tag as string))) return null;
  return { wakeDate, bedtime: fromMinutes(toMinutes(bedtime)!), wakeTime: fromMinutes(toMinutes(wakeTime)!), minutes, quality: quality as number, tags: [...new Set(list as string[])] };
}
