/** The home page's two summaries: how much of the day is done, and what to do next. */

export type DayInput = {
  habitsDone: number;
  habitsTotal: number;
  moodLogged: boolean;
  waterMl: number;
  waterGoal: number;
  kcal: number;
  kcalGoal: number | null;
  protein: number;
  proteinGoal: number | null;
};

/** Every habit due today counts, plus mood, water, and the calorie and protein goals when set. */
export function dayProgress(input: DayInput) {
  const goals = [
    ...Array.from({ length: input.habitsTotal }, (_, i) => i < input.habitsDone),
    input.moodLogged,
    input.waterMl >= input.waterGoal,
    ...(input.kcalGoal ? [input.kcal >= input.kcalGoal * 0.9] : []),
    ...(input.proteinGoal ? [input.protein >= input.proteinGoal] : []),
  ];
  const done = goals.filter(Boolean).length;
  return { done, total: goals.length, pct: goals.length ? Math.round((done / goals.length) * 100) : 0 };
}

export type Moment = "morning" | "afternoon" | "evening" | "any";

export function momentOf(hour: number): Exclude<Moment, "any"> {
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

export type PendingHabit = { id: string; name: string; icon: string; color: string; kind: "check" | "count" | "avoid"; moment: Moment; streak: number };
export type NextAction =
  | { type: "habit"; habit: PendingHabit }
  | { type: "mood" }
  | { type: "water"; missingMl: number }
  | { type: "meals" }
  | { type: "sport"; missing: number };

/**
 * Up to `limit` next actions, most useful first: habits of the current moment (then anytime,
 * then the others), the mood, water past mid-morning, meals past lunch, and sport when the
 * week's goal is getting out of reach.
 */
export function nextActions(input: {
  hour: number;
  isoWeekday: number;
  habits: PendingHabit[];
  moodLogged: boolean;
  waterMl: number;
  waterGoal: number;
  mealsLogged: number;
  sportDone: number;
  sportGoal: number;
}, limit = 4): NextAction[] {
  const now = momentOf(input.hour);
  const order: Moment[] = [now, "any", ...(["morning", "afternoon", "evening"] as const).filter((moment) => moment !== now)];
  const habits = input.habits
    .filter((habit) => habit.kind !== "avoid")
    .sort((a, b) => order.indexOf(a.moment) - order.indexOf(b.moment) || b.streak - a.streak);
  const actions: NextAction[] = habits.slice(0, 2).map((habit) => ({ type: "habit", habit }));
  if (!input.moodLogged) actions.push({ type: "mood" });
  if (input.hour >= 10 && input.waterMl < input.waterGoal) actions.push({ type: "water", missingMl: input.waterGoal - input.waterMl });
  if (input.hour >= 13 && input.mealsLogged === 0) actions.push({ type: "meals" });
  const missing = input.sportGoal - input.sportDone;
  const daysLeft = 8 - input.isoWeekday;
  if (missing > 0 && missing >= daysLeft - 1) actions.push({ type: "sport", missing });
  for (const habit of habits.slice(2)) actions.push({ type: "habit", habit });
  return actions.slice(0, limit);
}
