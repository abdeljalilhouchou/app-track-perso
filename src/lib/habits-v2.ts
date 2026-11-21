/**
 * What a habit's days mean, for every kind of habit:
 * - check: a log is a check-in;
 * - count: a log carries a value, done once it reaches the goal (a log without value counts as done);
 * - avoid: a log is a slip; every scheduled day without one is a success.
 * A joker log keeps a streak alive without counting as done. Dates are yyyy-MM-dd strings.
 */

export type HabitKind = "check" | "count" | "avoid";
export type HabitLite = { id: string; name: string; kind?: HabitKind | null; goal_value?: number | null; scheduled_days: number[]; target_per_week?: number | null; created_at: string; joker_enabled?: boolean | null };
export type LogLite = { habit_id: string; log_date: string; value?: number | null; is_joker?: boolean | null };
export type DayState = "done" | "joker" | "partial" | "missed" | "pending" | "off" | "slip";

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekStart(date: string) {
  return addDays(date, 1 - isoWeekday(date));
}

const kindOf = (habit: HabitLite): HabitKind => habit.kind ?? "check";

/** "3 times a week": any days count, only the weekly total matters. */
export function isFlexible(habit: HabitLite) {
  return kindOf(habit) !== "avoid" && (habit.target_per_week ?? habit.scheduled_days.length) < habit.scheduled_days.length;
}

export function indexLogs(logs: LogLite[]) {
  const byHabit = new Map<string, Map<string, LogLite>>();
  for (const log of logs) {
    if (!byHabit.has(log.habit_id)) byHabit.set(log.habit_id, new Map());
    byHabit.get(log.habit_id)!.set(log.log_date, log);
  }
  return byHabit;
}

export function isScheduled(habit: HabitLite, date: string) {
  return habit.scheduled_days.includes(isoWeekday(date)) && date >= habit.created_at.slice(0, 10);
}

/** Whether a log, on its own, means the habit was done that day (used by summaries elsewhere). */
export function logCountsAsDone(habit: HabitLite, log: LogLite) {
  const kind = kindOf(habit);
  if (kind === "avoid" || log.is_joker) return false;
  if (kind === "count" && log.value !== null && log.value !== undefined && habit.goal_value) return log.value >= habit.goal_value;
  return true;
}

export function dayState(habit: HabitLite, log: LogLite | undefined, date: string, today: string): DayState {
  if (!isScheduled(habit, date)) return "off";
  const kind = kindOf(habit);
  if (kind === "avoid") {
    if (log && !log.is_joker) return "slip";
    return date > today ? "pending" : "done";
  }
  if (log?.is_joker) return "joker";
  if (log) {
    if (kind === "count" && log.value !== null && log.value !== undefined && habit.goal_value && log.value < habit.goal_value) {
      if (log.value > 0) return date < today ? "partial" : "pending";
    } else {
      return "done";
    }
  }
  if (date >= today) return "pending";
  // A flexible habit is judged per week, not per day.
  return isFlexible(habit) ? "off" : "missed";
}

function keptCount(habit: HabitLite, logs: Map<string, LogLite> | undefined, from: string, today: string) {
  let count = 0;
  for (let day = from, i = 0; i < 7; day = addDays(day, 1), i++) if (kept(dayState(habit, logs?.get(day), day, today))) count += 1;
  return count;
}

/** Weeks in a row that reached the weekly target; the current week counts once reached. */
function weeklyStreak(habit: HabitLite, logs: Map<string, LogLite> | undefined, today: string) {
  const target = habit.target_per_week ?? 1;
  let start = weekStart(today);
  let streak = 0;
  if (keptCount(habit, logs, start, today) >= target) streak += 1;
  for (let guard = 0; guard < 520; guard++) {
    start = addDays(start, -7);
    if (addDays(start, 6) < habit.created_at.slice(0, 10)) break;
    if (keptCount(habit, logs, start, today) < target) break;
    streak += 1;
  }
  return streak;
}

const kept = (state: DayState) => state === "done" || state === "joker";

/** Consecutive kept scheduled days ending today, or yesterday while today is still open. */
export function currentStreak(habit: HabitLite, logs: Map<string, LogLite> | undefined, today: string) {
  if (isFlexible(habit)) return weeklyStreak(habit, logs, today);
  let date = today;
  let streak = 0;
  const start = habit.created_at.slice(0, 10);
  if (!kept(dayState(habit, logs?.get(today), today, today))) date = addDays(today, -1);
  for (let guard = 0; guard < 3000 && date >= start; guard++, date = addDays(date, -1)) {
    const state = dayState(habit, logs?.get(date), date, today);
    if (state === "off") continue;
    if (!kept(state)) break;
    streak += 1;
  }
  return streak;
}

export function longestStreak(habit: HabitLite, logs: Map<string, LogLite> | undefined, today: string) {
  let best = 0;
  let run = 0;
  for (let date = habit.created_at.slice(0, 10), guard = 0; date <= today && guard < 3000; date = addDays(date, 1), guard++) {
    const state = dayState(habit, logs?.get(date), date, today);
    if (state === "off" || state === "pending") continue;
    run = kept(state) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Done and expected scheduled days between two dates (inclusive, not after today); joker days are left out. */
export function tally(habit: HabitLite, logs: Map<string, LogLite> | undefined, from: string, to: string, today: string) {
  let done = 0;
  let expected = 0;
  if (isFlexible(habit)) {
    const target = habit.target_per_week ?? 1;
    for (let start = weekStart(from); start <= to && start <= today; start = addDays(start, 7)) {
      const end = addDays(start, 6);
      let kept = 0;
      for (let day = start, i = 0; i < 7; day = addDays(day, 1), i++) if (day >= from && day <= to && day <= today && dayState(habit, logs?.get(day), day, today) === "done") kept += 1;
      const finished = end < today && start >= from && end <= to;
      done += kept;
      expected += finished ? Math.max(target, kept) : kept;
    }
    return { done, expected };
  }
  for (let date = from, guard = 0; date <= to && date <= today && guard < 1000; date = addDays(date, 1), guard++) {
    const state = dayState(habit, logs?.get(date), date, today);
    // Not due, covered by a joker, or still open today: neither done nor missed.
    if (state === "off" || state === "joker" || state === "pending") continue;
    expected += 1;
    if (state === "done") done += 1;
  }
  return { done, expected };
}

/** A joker may cover one missed day per ISO week, within the last 7 days. */
export function canUseJoker(habit: HabitLite, logs: Map<string, LogLite> | undefined, date: string, today: string) {
  if (kindOf(habit) === "avoid" || habit.joker_enabled === false) return false;
  if (date >= today || date < addDays(today, -7)) return false;
  if (dayState(habit, logs?.get(date), date, today) !== "missed") return false;
  const start = weekStart(date);
  for (let day = start, i = 0; i < 7; day = addDays(day, 1), i++) if (logs?.get(day)?.is_joker) return false;
  return true;
}

export function jokerLeftThisWeek(habit: HabitLite, logs: Map<string, LogLite> | undefined, today: string) {
  if (kindOf(habit) === "avoid" || habit.joker_enabled === false) return false;
  const start = weekStart(today);
  for (let day = start, i = 0; i < 7; day = addDays(day, 1), i++) if (logs?.get(day)?.is_joker) return false;
  return true;
}

type Index = Map<string, Map<string, LogLite>>;
const rate = (done: number, expected: number) => (expected ? Math.round((done / expected) * 100) : null);

/** Last full ISO week against the one before: overall rate, best and weakest habit. */
export function weeklyReview(habits: HabitLite[], index: Index, today: string) {
  const start = addDays(weekStart(today), -7);
  const end = addDays(start, 6);
  const before = addDays(start, -7);
  let done = 0, expected = 0, doneBefore = 0, expectedBefore = 0;
  const perHabit = habits.map((habit) => {
    const week = tally(habit, index.get(habit.id), start, end, today);
    const previous = tally(habit, index.get(habit.id), before, addDays(start, -1), today);
    done += week.done; expected += week.expected; doneBefore += previous.done; expectedBefore += previous.expected;
    return { habit, ...week };
  }).filter((row) => row.expected > 0);
  if (!expected) return null;
  const sorted = [...perHabit].sort((a, b) => b.done / b.expected - a.done / a.expected);
  const weakest = sorted.at(-1)!;
  return {
    start, end,
    rate: rate(done, expected)!,
    delta: expectedBefore ? rate(done, expected)! - rate(doneBefore, expectedBefore)! : null,
    best: sorted[0] ? { name: sorted[0].habit.name, done: sorted[0].done, expected: sorted[0].expected } : null,
    weakest: weakest && weakest.done < weakest.expected && weakest !== sorted[0] ? { name: weakest.habit.name, done: weakest.done, expected: weakest.expected } : null,
  };
}

/** Figures for the last `days` days against the period before. */
export function periodStats(habits: HabitLite[], index: Index, today: string, days: number) {
  const from = addDays(today, 1 - days);
  const previousFrom = addDays(from, -days);
  let done = 0, expected = 0, doneBefore = 0, expectedBefore = 0;
  for (const habit of habits) {
    const now = tally(habit, index.get(habit.id), from, today, today);
    const before = tally(habit, index.get(habit.id), previousFrom, addDays(from, -1), today);
    done += now.done; expected += now.expected; doneBefore += before.done; expectedBefore += before.expected;
  }
  let perfectDays = 0;
  for (let date = from; date <= today; date = addDays(date, 1)) {
    const states = habits.map((habit) => dayState(habit, index.get(habit.id)?.get(date), date, today)).filter((state) => state !== "off" && !(state === "pending"));
    if (states.length && states.every((state) => state === "done")) perfectDays += 1;
  }
  const streaks = habits.map((habit) => ({ name: habit.name, value: currentStreak(habit, index.get(habit.id), today) })).sort((a, b) => b.value - a.value);
  const perHabit = habits.map((habit) => {
    const row = tally(habit, index.get(habit.id), from, today, today);
    return { id: habit.id, name: habit.name, ...row, rate: rate(row.done, row.expected), streak: currentStreak(habit, index.get(habit.id), today) };
  });
  return {
    rate: rate(done, expected),
    delta: expectedBefore && expected ? rate(done, expected)! - rate(doneBefore, expectedBefore)! : null,
    perfectDays, done, expected,
    bestStreak: streaks[0] && streaks[0].value > 0 ? streaks[0] : null,
    perHabit,
  };
}

/** Share of scheduled habits done on each day of the month of `today` (null: nothing due, or future). */
export function monthShares(habits: HabitLite[], index: Index, today: string) {
  const first = `${today.slice(0, 8)}01`;
  const days: { date: string; share: number | null }[] = [];
  for (let date = first; date.slice(0, 7) === today.slice(0, 7); date = addDays(date, 1)) {
    if (date > today) { days.push({ date, share: null }); continue; }
    const states = habits.map((habit) => dayState(habit, index.get(habit.id)?.get(date), date, today)).filter((state) => state !== "off" && state !== "joker" && !(state === "pending" && date === today));
    days.push({ date, share: states.length ? states.filter((state) => state === "done").length / states.length : null });
  }
  return { first, offset: isoWeekday(first) - 1, days };
}

/** Rate per ISO weekday over the last `days` days. */
export function weekdayRates(habits: HabitLite[], index: Index, today: string, days = 90) {
  const totals = Array.from({ length: 7 }, () => ({ done: 0, expected: 0 }));
  for (let date = addDays(today, 1 - days); date < today; date = addDays(date, 1)) {
    for (const habit of habits) {
      const state = dayState(habit, index.get(habit.id)?.get(date), date, today);
      if (state === "off" || state === "joker" || state === "pending") continue;
      totals[isoWeekday(date) - 1].expected += 1;
      if (state === "done") totals[isoWeekday(date) - 1].done += 1;
    }
  }
  return totals.map((row, i) => ({ day: i + 1, rate: rate(row.done, row.expected) }));
}

export type HabitBadge = { id: string; earned: boolean; progress: number; detail: string | null };

export function habitBadges(habits: HabitLite[], index: Index, today: string): HabitBadge[] {
  const longest = habits.map((habit) => ({ name: habit.name, value: longestStreak(habit, index.get(habit.id), today) })).sort((a, b) => b.value - a.value)[0];
  const best = longest?.value ?? 0;
  let checks = 0;
  for (const habit of habits) for (const log of index.get(habit.id)?.values() ?? []) if (logCountsAsDone(habit, log)) checks += 1;
  const perfect = (from: string, to: string) => {
    let any = false;
    for (let date = from; date <= to; date = addDays(date, 1)) {
      for (const habit of habits) {
        const state = dayState(habit, index.get(habit.id)?.get(date), date, today);
        if (state === "off" || state === "joker") continue;
        if (state !== "done") return false;
        any = true;
      }
    }
    return any;
  };
  let perfectWeek = false;
  for (let start = addDays(weekStart(today), -7), i = 0; i < 52 && !perfectWeek; start = addDays(start, -7), i++) perfectWeek = perfect(start, addDays(start, 6));
  let perfectMonth = false;
  let bestMonthShare = 0;
  for (let i = 1; i <= 12 && !perfectMonth; i++) {
    const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - i);
    const from = d.toISOString().slice(0, 10);
    const end = new Date(d); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
    const to = end.toISOString().slice(0, 10);
    perfectMonth = perfect(from, to);
  }
  const current = monthShares(habits, index, today).days.filter((day) => day.share !== null);
  if (current.length) bestMonthShare = current.filter((day) => day.share === 1).length / current.length;
  const streakBadge = (id: string, goal: number): HabitBadge => ({ id, earned: best >= goal, progress: Math.min(1, best / goal), detail: best >= goal ? longest!.name : null });
  return [
    streakBadge("streak7", 7),
    streakBadge("streak30", 30),
    streakBadge("streak100", 100),
    { id: "perfectWeek", earned: perfectWeek, progress: perfectWeek ? 1 : 0, detail: null },
    { id: "perfectMonth", earned: perfectMonth, progress: perfectMonth ? 1 : bestMonthShare, detail: null },
    { id: "checks100", earned: checks >= 100, progress: Math.min(1, checks / 100), detail: null },
  ];
}

/** Average mood on days a habit was kept against its other due days; at least 3 of each. */
export function moodEffects(habits: HabitLite[], index: Index, moods: { entry_date: string; mood_score: number }[], today: string) {
  const moodByDate = new Map(moods.map((mood) => [mood.entry_date, mood.mood_score]));
  return habits.map((habit) => {
    const yes: number[] = [];
    const no: number[] = [];
    for (const [date, score] of moodByDate) {
      const state = dayState(habit, index.get(habit.id)?.get(date), date, today);
      if (state === "done") yes.push(score);
      else if (state === "missed" || state === "slip" || state === "partial") no.push(score);
    }
    if (yes.length < 3 || no.length < 3) return null;
    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const withHabit = Math.round(avg(yes) * 10) / 10;
    const without = Math.round(avg(no) * 10) / 10;
    return { id: habit.id, name: habit.name, withHabit, without, diff: Math.round((withHabit - without) * 10) / 10 };
  }).filter((row): row is NonNullable<typeof row> => !!row).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/**
 * Days a habit was really kept between two dates, whatever its kind: check-ins, counters at
 * their goal, or days without a slip. Lets older summaries keep working on a set of dates.
 */
export function keptDates(habit: HabitLite, logs: LogLite[], from: string, to: string, today: string) {
  const byDate = new Map(logs.filter((log) => log.habit_id === habit.id).map((log) => [log.log_date, log]));
  const dates = new Set<string>();
  const start = from > habit.created_at.slice(0, 10) ? from : habit.created_at.slice(0, 10);
  for (let date = start, guard = 0; date <= to && date <= today && guard < 4000; date = addDays(date, 1), guard++) {
    if (dayState(habit, byDate.get(date), date, today) === "done") dates.add(date);
  }
  return dates;
}
