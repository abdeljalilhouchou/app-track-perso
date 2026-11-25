/**
 * The weekly review: one ISO week (Monday to Sunday) of habits, sport, meals, sleep and mood,
 * against the week before, with a score, a few facts drawn from the last four weeks and the
 * goal suggestions for the week after. Pure, so the page, the story and the tests agree.
 */
import { addDays, dayState, indexLogs, isFlexible, tally, weekStart, type HabitLite, type LogLite } from "@/lib/habits-v2";
import { beforeMidnight, bedtimeOffset } from "@/lib/sleep";

export type ReviewInput = {
  /** Monday of the reviewed week. */
  start: string;
  today: string;
  habits: (HabitLite & { paused_at?: string | null })[];
  habitLogs: LogLite[];
  workouts: { id: string; workout_date: string; duration_minutes: number; discipline: string | null }[];
  runs: { workout_id: string; distance_km: number | string }[];
  moods: { entry_date: string; mood_score: number }[];
  meals: { entry_date: string; calories: number; protein: number }[];
  sleep: { wake_date: string; bedtime: string; duration_minutes: number }[];
  goals: { calories: number | null; protein: number | null; sportWeekly: number };
};

export type ReviewDay = {
  date: string;
  habitsDone: number;
  habitsDue: number;
  mood: number | null;
  sportMinutes: number;
  km: number;
  sleepMinutes: number | null;
  kcal: number | null;
};

export type WeekFigures = {
  start: string;
  end: string;
  days: ReviewDay[];
  habits: { done: number; expected: number; rate: number | null; perfectDays: number };
  sport: { sessions: number; minutes: number; km: number; byDiscipline: Record<string, number> };
  nutrition: { days: number; kcalAvg: number | null; proteinAvg: number | null; proteinDays: number };
  sleep: { nights: number; avgMinutes: number | null; bedOffset: number | null; shortest: { date: string; minutes: number } | null; beforeMidnight: number };
  mood: { days: number; avg: number | null };
  score: number | null;
};

export type Insight =
  | { key: "sportMood"; withSport: number; without: number }
  | { key: "sleepMood"; enough: number; short: number }
  | { key: "bedtime"; minutes: number }
  | { key: "proteinWeekend"; weekend: number; weekdays: number }
  | { key: "habitWeekday"; weekday: number; rate: number; others: number };

export const GOAL_KEYS = ["bedtime", "sleep7", "protein", "sport", "habits", "moodDaily"] as const;
export type GoalKey = (typeof GOAL_KEYS)[number];
export type Goal = { key: GoalKey; target: number };
export type GoalResult = Goal & { value: number; done: boolean };

export type WeeklyReview = {
  week: WeekFigures;
  previous: WeekFigures;
  delta: number | null;
  insights: Insight[];
  best: ReviewDay | null;
  hardest: ReviewDay | null;
  suggestions: Goal[];
  finished: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (values: number[]) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

/** The Monday of the last finished week: what the review opens on by default. */
export function lastWeekStart(today: string) {
  return addDays(weekStart(today), -7);
}

/** A Monday given in the address, or null when it is not one, or later than this week. */
export function parseWeekStart(value: string | undefined | null, today: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`))) return null;
  if (weekStart(value) !== value || value > weekStart(today) || value < addDays(weekStart(today), -7 * 52)) return null;
  return value;
}

function figures(input: ReviewInput, start: string): WeekFigures {
  const end = addDays(start, 6);
  const { today } = input;
  const index = indexLogs(input.habitLogs);
  const habits = input.habits.filter((habit) => !habit.paused_at || habit.paused_at.slice(0, 10) > start);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  let done = 0, expected = 0;
  for (const habit of habits) {
    const t = tally(habit, index.get(habit.id), start, end, today);
    done += t.done; expected += t.expected;
  }

  const workouts = input.workouts.filter((w) => inRange(w.workout_date, start, end));
  const kmById = new Map(input.runs.map((run) => [run.workout_id, Number(run.distance_km) || 0]));
  const byDiscipline: Record<string, number> = {};
  for (const w of workouts) byDiscipline[w.discipline ?? "general"] = (byDiscipline[w.discipline ?? "general"] ?? 0) + 1;

  const mealDays = new Map<string, { kcal: number; protein: number }>();
  for (const meal of input.meals) {
    if (!inRange(meal.entry_date, start, end)) continue;
    const day = mealDays.get(meal.entry_date) ?? { kcal: 0, protein: 0 };
    day.kcal += meal.calories; day.protein += meal.protein;
    mealDays.set(meal.entry_date, day);
  }
  const moodBy = new Map(input.moods.map((m) => [m.entry_date, m.mood_score]));
  const sleepBy = new Map(input.sleep.map((s) => [s.wake_date, s]));

  const days: ReviewDay[] = dates.map((date) => {
    let dayDone = 0, due = 0;
    for (const habit of habits) {
      const state = dayState(habit, index.get(habit.id)?.get(date), date, today);
      if (state === "done") { dayDone += 1; due += 1; continue; }
      if (isFlexible(habit) || state === "off" || state === "joker" || state === "pending") continue;
      due += 1;
    }
    const dayWorkouts = workouts.filter((w) => w.workout_date === date);
    return {
      date,
      habitsDone: dayDone,
      habitsDue: due,
      mood: moodBy.get(date) ?? null,
      sportMinutes: dayWorkouts.reduce((sum, w) => sum + w.duration_minutes, 0),
      km: round1(dayWorkouts.reduce((sum, w) => sum + (kmById.get(w.id) ?? 0), 0)),
      sleepMinutes: sleepBy.get(date)?.duration_minutes ?? null,
      kcal: mealDays.has(date) ? Math.round(mealDays.get(date)!.kcal) : null,
    };
  });

  const nights = input.sleep.filter((s) => inRange(s.wake_date, start, end));
  const shortest = nights.reduce<{ date: string; minutes: number } | null>((low, s) => (!low || s.duration_minutes < low.minutes ? { date: s.wake_date, minutes: s.duration_minutes } : low), null);
  const moods = input.moods.filter((m) => inRange(m.entry_date, start, end));
  const meals = [...mealDays.values()];
  const proteinGoal = input.goals.protein;

  const week: Omit<WeekFigures, "score"> = {
    start, end, days,
    habits: { done, expected, rate: expected ? Math.round((done / expected) * 100) : null, perfectDays: days.filter((d) => d.habitsDue > 0 && d.habitsDone >= d.habitsDue).length },
    sport: { sessions: workouts.length, minutes: workouts.reduce((sum, w) => sum + w.duration_minutes, 0), km: round1(days.reduce((sum, d) => sum + d.km, 0)), byDiscipline },
    nutrition: {
      days: meals.length,
      kcalAvg: meals.length ? Math.round(avg(meals.map((m) => m.kcal))!) : null,
      proteinAvg: meals.length ? Math.round(avg(meals.map((m) => m.protein))!) : null,
      proteinDays: proteinGoal ? meals.filter((m) => m.protein >= proteinGoal).length : 0,
    },
    sleep: {
      nights: nights.length,
      avgMinutes: nights.length ? Math.round(avg(nights.map((s) => s.duration_minutes))!) : null,
      bedOffset: nights.length ? Math.round(avg(nights.map((s) => bedtimeOffset(s.bedtime)))!) : null,
      shortest,
      beforeMidnight: nights.filter((s) => beforeMidnight(s.bedtime)).length,
    },
    mood: { days: moods.length, avg: moods.length ? round1(avg(moods.map((m) => m.mood_score))!) : null },
  };
  return { ...week, score: score(week, input.goals) };
}

/**
 * 0 to 100: the mean of what was tracked this week. Habits kept, sport against the weekly goal,
 * sleep against 7 h 30, mood from 1-5 to 0-100, and meals: protein days if there is a goal,
 * else the days logged.
 */
function score(week: Omit<WeekFigures, "score">, goals: ReviewInput["goals"]) {
  const parts: number[] = [];
  if (week.habits.rate !== null) parts.push(week.habits.rate);
  if (week.sport.sessions || goals.sportWeekly) parts.push(clamp((week.sport.sessions / Math.max(1, goals.sportWeekly)) * 100));
  if (week.sleep.avgMinutes !== null) parts.push(clamp((week.sleep.avgMinutes / 450) * 100));
  if (week.mood.avg !== null) parts.push(clamp(((week.mood.avg - 1) / 4) * 100));
  if (week.nutrition.days) parts.push(clamp(((goals.protein ? week.nutrition.proteinDays : week.nutrition.days) / 7) * 100));
  // Only the default sport goal and nothing else logged: no score.
  if (parts.length <= 1 && !week.sport.sessions && week.habits.rate === null) return null;
  return parts.length ? Math.round(avg(parts)!) : null;
}

/** Facts from the last four weeks, strongest first. Each needs enough days on both sides. */
function insights(input: ReviewInput, start: string): Insight[] {
  const from = addDays(start, -21), to = addDays(start, 6);
  const found: { insight: Insight; strength: number }[] = [];
  const moods = input.moods.filter((m) => inRange(m.entry_date, from, to));

  const sportDays = new Set(input.workouts.filter((w) => inRange(w.workout_date, from, to)).map((w) => w.workout_date));
  const withSport = moods.filter((m) => sportDays.has(m.entry_date)).map((m) => m.mood_score);
  const without = moods.filter((m) => !sportDays.has(m.entry_date)).map((m) => m.mood_score);
  if (withSport.length >= 2 && without.length >= 2) {
    const a = avg(withSport)!, b = avg(without)!;
    if (Math.abs(a - b) >= 0.4) found.push({ insight: { key: "sportMood", withSport: round1(a), without: round1(b) }, strength: Math.abs(a - b) / 4 });
  }

  const nights = input.sleep.filter((s) => inRange(s.wake_date, from, to));
  const moodBy = new Map(moods.map((m) => [m.entry_date, m.mood_score]));
  const enough = nights.filter((s) => s.duration_minutes >= 420 && moodBy.has(s.wake_date)).map((s) => moodBy.get(s.wake_date)!);
  const short = nights.filter((s) => s.duration_minutes < 420 && moodBy.has(s.wake_date)).map((s) => moodBy.get(s.wake_date)!);
  if (enough.length >= 2 && short.length >= 2) {
    const a = avg(enough)!, b = avg(short)!;
    if (a - b >= 0.4) found.push({ insight: { key: "sleepMood", enough: round1(a), short: round1(b) }, strength: (a - b) / 4 });
  }
  const early = nights.filter((s) => beforeMidnight(s.bedtime)).map((s) => s.duration_minutes);
  const late = nights.filter((s) => !beforeMidnight(s.bedtime)).map((s) => s.duration_minutes);
  if (early.length >= 2 && late.length >= 2) {
    const gap = Math.round(avg(early)! - avg(late)!);
    if (gap >= 20) found.push({ insight: { key: "bedtime", minutes: gap }, strength: gap / 120 });
  }

  if (input.goals.protein) {
    const perDay = new Map<string, number>();
    for (const meal of input.meals) if (inRange(meal.entry_date, from, to)) perDay.set(meal.entry_date, (perDay.get(meal.entry_date) ?? 0) + meal.protein);
    const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
    const weekend = [...perDay].filter(([date]) => isWeekend(date)).map(([, p]) => p);
    const weekdays = [...perDay].filter(([date]) => !isWeekend(date)).map(([, p]) => p);
    if (weekend.length >= 2 && weekdays.length >= 3) {
      const a = avg(weekend)!, b = avg(weekdays)!;
      if (b - a >= 15) found.push({ insight: { key: "proteinWeekend", weekend: Math.round(a), weekdays: Math.round(b) }, strength: (b - a) / input.goals.protein });
    }
  }

  // The weekday where habits slip the most, over four weeks.
  const four = Array.from({ length: 4 }, (_, i) => figures(input, addDays(start, -7 * i)));
  const perWeekday = Array.from({ length: 7 }, (_, w) => four.map((week) => week.days[w]).filter((d) => d.habitsDue > 0 && d.date <= input.today));
  const rates = perWeekday.map((list) => (list.length >= 2 ? list.reduce((s, d) => s + d.habitsDone, 0) / list.reduce((s, d) => s + d.habitsDue, 0) : null));
  const known = rates.filter((r): r is number => r !== null);
  if (known.length >= 5) {
    const low = Math.min(...known), weekday = rates.indexOf(low);
    const others = avg(known.filter((_, i) => i !== known.indexOf(low)))!;
    if (others - low >= 0.25) found.push({ insight: { key: "habitWeekday", weekday: weekday + 1, rate: Math.round(low * 100), others: Math.round(others * 100) }, strength: others - low });
  }

  return found.sort((a, b) => b.strength - a.strength).slice(0, 3).map((f) => f.insight);
}

/** A day's weight for best / hardest: habits kept, mood, a bit for sport. Null without data. */
function dayValue(day: ReviewDay) {
  const parts: number[] = [];
  if (day.habitsDue) parts.push(day.habitsDone / day.habitsDue);
  if (day.mood !== null) parts.push((day.mood - 1) / 4);
  if (day.sleepMinutes !== null) parts.push(Math.min(1, day.sleepMinutes / 450));
  if (!parts.length) return null;
  return avg(parts)! + (day.sportMinutes ? 0.1 : 0);
}

/** What one goal measured during a week. */
export function goalValue(key: GoalKey, week: WeekFigures) {
  switch (key) {
    case "bedtime": return week.sleep.beforeMidnight;
    case "sleep7": return week.sleep.avgMinutes ?? 0;
    case "protein": return week.nutrition.proteinDays;
    case "sport": return week.sport.sessions;
    case "habits": return week.habits.rate ?? 0;
    case "moodDaily": return week.mood.days;
  }
}

export function evaluateGoal(goal: Goal, week: WeekFigures): GoalResult {
  const value = goalValue(goal.key, week);
  return { ...goal, value, done: value >= goal.target };
}

export function isGoal(value: { key: unknown; target: unknown }): value is Goal {
  return (GOAL_KEYS as readonly unknown[]).includes(value.key) && Number.isInteger(value.target) && (value.target as number) > 0 && (value.target as number) <= 1440;
}

/** Three goals for the week after, the weakest areas first. */
function suggest(week: WeekFigures, goals: ReviewInput["goals"]): Goal[] {
  const options: { goal: Goal; gap: number }[] = [];
  options.push({ goal: { key: "bedtime", target: 5 }, gap: week.sleep.nights ? (5 - week.sleep.beforeMidnight) / 5 : 0.3 });
  if (week.sleep.avgMinutes !== null) options.push({ goal: { key: "sleep7", target: 420 }, gap: (420 - week.sleep.avgMinutes) / 120 });
  if (goals.protein) options.push({ goal: { key: "protein", target: 5 }, gap: (5 - week.nutrition.proteinDays) / 5 });
  const sportTarget = Math.max(goals.sportWeekly, Math.min(7, week.sport.sessions));
  options.push({ goal: { key: "sport", target: sportTarget }, gap: (sportTarget - week.sport.sessions) / sportTarget + (week.sport.sessions >= sportTarget ? 0.15 : 0) });
  if (week.habits.rate !== null) {
    const target = Math.min(100, Math.ceil((week.habits.rate + 10) / 5) * 5);
    options.push({ goal: { key: "habits", target }, gap: (100 - week.habits.rate) / 100 });
  }
  options.push({ goal: { key: "moodDaily", target: 7 }, gap: (7 - week.mood.days) / 7 - 0.1 });
  return options.sort((a, b) => b.gap - a.gap).slice(0, 3).map((o) => o.goal);
}

export function buildWeeklyReview(input: ReviewInput): WeeklyReview {
  const week = figures(input, input.start);
  const previous = figures(input, addDays(input.start, -7));
  const valued = week.days.filter((d) => d.date <= input.today).map((day) => ({ day, value: dayValue(day) })).filter((d): d is { day: ReviewDay; value: number } => d.value !== null);
  const sorted = [...valued].sort((a, b) => b.value - a.value);
  const best = sorted.length >= 2 ? sorted[0].day : null;
  const hardest = sorted.length >= 2 && sorted.at(-1)!.value < sorted[0].value - 0.15 ? sorted.at(-1)!.day : null;
  return {
    week, previous,
    delta: week.score !== null && previous.score !== null ? week.score - previous.score : null,
    insights: insights(input, input.start),
    best, hardest,
    suggestions: suggest(week, input.goals),
    finished: week.end < input.today,
  };
}
