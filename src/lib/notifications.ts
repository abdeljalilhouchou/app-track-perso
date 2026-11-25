/**
 * Push notifications: what a person wants to receive, when each one is due, and what it
 * says. Pure, so the settings page, the 15-minute sending job and the tests agree.
 * A notification only goes out when it is useful: once a thing is done, nothing is sent.
 */

export const NOTIFY_KINDS = ["habits", "streak", "mood", "sleep", "water", "review"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];
/** Most useful first: when the daily cap is reached, these win. */
const PRIORITY: NotifyKind[] = ["streak", "habits", "sleep", "mood", "review", "water"];

export type KindSetting = { on: boolean; time: string };
export type NotifySettings = {
  enabled: boolean;
  timezone: string;
  kinds: Record<NotifyKind, KindSetting>;
  quietOn: boolean;
  quietFrom: string;
  quietTo: string;
  capOn: boolean;
};

export const DAILY_CAP = 3;
/** A notification still goes out this long after its time, if the job ran late; never later. */
export const CATCH_UP_MINUTES = 120;
/** Streaks this long or longer are worth a "don't break it" notification. */
export const STREAK_MIN = 3;

export const DEFAULT_KINDS: Record<NotifyKind, KindSetting> = {
  habits: { on: true, time: "20:00" },
  streak: { on: true, time: "21:30" },
  mood: { on: true, time: "21:00" },
  sleep: { on: true, time: "08:30" },
  water: { on: false, time: "15:00" },
  review: { on: true, time: "09:00" },
};

export const DEFAULT_SETTINGS: NotifySettings = {
  enabled: true, timezone: "Europe/Paris", kinds: DEFAULT_KINDS, quietOn: true, quietFrom: "22:30", quietTo: "07:30", capOn: true,
};

export const isTime = (value: unknown): value is string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function isTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}

/** A stored row (or anything sent by a form) made safe: unknown keys dropped, bad values defaulted. */
export function parseSettings(row: unknown): NotifySettings {
  const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
  const raw = (r.kinds && typeof r.kinds === "object" ? r.kinds : {}) as Record<string, unknown>;
  const kinds = Object.fromEntries(NOTIFY_KINDS.map((kind) => {
    const k = (raw[kind] && typeof raw[kind] === "object" ? raw[kind] : {}) as Record<string, unknown>;
    return [kind, { on: typeof k.on === "boolean" ? k.on : DEFAULT_KINDS[kind].on, time: isTime(k.time) ? k.time : DEFAULT_KINDS[kind].time }];
  })) as Record<NotifyKind, KindSetting>;
  const pick = <T>(value: unknown, ok: (v: unknown) => v is T, fallback: T) => (ok(value) ? value : fallback);
  const bool = (v: unknown): v is boolean => typeof v === "boolean";
  return {
    enabled: pick(r.enabled, bool, DEFAULT_SETTINGS.enabled),
    timezone: pick(r.timezone, isTimezone, DEFAULT_SETTINGS.timezone),
    kinds,
    quietOn: pick(r.quietOn ?? r.quiet_on, bool, DEFAULT_SETTINGS.quietOn),
    quietFrom: pick(r.quietFrom ?? r.quiet_from, isTime, DEFAULT_SETTINGS.quietFrom),
    quietTo: pick(r.quietTo ?? r.quiet_to, isTime, DEFAULT_SETTINGS.quietTo),
    capOn: pick(r.capOn ?? r.cap_on, bool, DEFAULT_SETTINGS.capOn),
  };
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Within quiet hours, which may run across midnight (22:30 → 07:30). */
export function inQuietHours(time: string, from: string, to: string) {
  const t = minutes(time), f = minutes(from), e = minutes(to);
  if (f === e) return false;
  return f < e ? t >= f && t < e : t >= f || t < e;
}

/** The local date and "HH:MM" in a time zone. */
export function localNow(timezone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

const isMonday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay() === 1;

/**
 * The kinds whose time has come (up to two hours late), not sent yet today, outside quiet
 * hours, the weekly review only on Mondays; most useful first and within the daily cap.
 */
export function dueKinds(settings: NotifySettings, date: string, time: string, sentToday: readonly string[]): NotifyKind[] {
  if (!settings.enabled) return [];
  if (settings.quietOn && inQuietHours(time, settings.quietFrom, settings.quietTo)) return [];
  const now = minutes(time);
  const due = PRIORITY.filter((kind) => {
    const k = settings.kinds[kind];
    if (!k.on || sentToday.includes(kind)) return false;
    if (kind === "review" && !isMonday(date)) return false;
    const late = now - minutes(k.time);
    return late >= 0 && late <= CATCH_UP_MINUTES;
  });
  if (!settings.capOn) return due;
  const left = DAILY_CAP - sentToday.filter((kind) => kind !== "test").length;
  return due.slice(0, Math.max(0, left));
}

/** What the job knows about the person's day; only what the due kinds need is filled. */
export type DayFacts = {
  pendingHabits?: string[];
  streak?: { name: string; days: number } | null;
  moodLogged?: boolean;
  sleepLogged?: boolean;
  water?: { ml: number; goal: number };
};

export type Message = { title: string; body: string; url: string };
type T = (path: string, vars?: Record<string, string | number>) => string;

/** The notification for one kind, or null when there is nothing left to do. */
export function messageFor(kind: NotifyKind, facts: DayFacts, t: T, number: (n: number) => string): Message | null {
  const m = (key: string, vars?: Record<string, string | number>) => t(`notify.messages.${kind}.${key}`, vars);
  switch (kind) {
    case "habits": {
      const left = facts.pendingHabits ?? [];
      if (!left.length) return null;
      const names = left.slice(0, 2).join(", ") + (left.length > 2 ? "…" : "");
      return { title: m("title"), body: left.length === 1 ? m("one", { name: left[0] }) : m("many", { count: left.length, names }), url: "/habits" };
    }
    case "streak":
      if (!facts.streak || facts.streak.days < STREAK_MIN) return null;
      return { title: m("title"), body: m("body", { days: facts.streak.days, name: facts.streak.name }), url: "/habits" };
    case "mood":
      return facts.moodLogged ? null : { title: m("title"), body: m("body"), url: "/humeur#checkin" };
    case "sleep":
      return facts.sleepLogged ? null : { title: m("title"), body: m("body"), url: "/sommeil" };
    case "water": {
      const w = facts.water;
      // Behind when under half the goal by the afternoon.
      if (!w || !w.goal || w.ml >= w.goal / 2) return null;
      return { title: m("title"), body: m("body", { done: number(w.ml / 1000), goal: number(w.goal / 1000) }), url: "/nutrition" };
    }
    case "review":
      return { title: m("title"), body: m("body"), url: "/bilan?story=1" };
  }
}
