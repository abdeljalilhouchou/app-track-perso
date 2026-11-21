import { addDays, differenceInCalendarDays, format, getDaysInMonth, parseISO, startOfWeek, subWeeks } from "date-fns";
import { exerciseKey } from "@/lib/strength";
import type { Workout } from "@/types/database";

/**
 * Everything the Sport hub shows, computed from what the user really logged: the week
 * plan, the week figures against the same span of last week, the suggested session with
 * the muscles' rest, muscle recovery, the latest records, per-discipline trends and the
 * month's challenge. Nothing here is planned or estimated without data.
 */

export type Discipline = "strength" | "calisthenics" | "running" | "other";
export type OverviewSet = { workout_id: string; exercise_name: string; muscle_group: string; reps: number; weight_kg: number };
export type OverviewTemplate = { id: string; name: string; muscle_groups: string[] };
export type OverviewTemplateExercise = { template_id: string; exercise_name: string; target_sets: number; target_reps: number; position: number };
export type OverviewRun = { workout_id: string; distance_km: number; duration_seconds: number };
export type OverviewCaliSet = { workout_id: string; exercise_id: string | null; exercise_name: string; reps: number | null; hold_seconds: number | null };

export type OverviewInput = {
  workouts: Workout[];
  sets: OverviewSet[];
  setWorkoutIds: Set<string>;
  nextTemplate: OverviewTemplate | null;
  templateExercises: OverviewTemplateExercise[];
  runs: OverviewRun[];
  caliSets: OverviewCaliSet[];
  weeklyGoal: number;
};

export type PlanDay = { date: string; state: "done" | "today" | "rest" | "upcoming"; discipline: Discipline | null; note: string | null; distanceKm: number | null };
export type MuscleState = { group: string; days: number; state: "recovering" | "ready" | "idle" };
export type HubRecord =
  | { discipline: "strength"; name: string; weightKg: number; date: string }
  | { discipline: "running"; paceSeconds: number; date: string }
  | { discipline: "calisthenics"; name: string; kind: "reps" | "hold"; value: number; date: string };

const key = (date: Date) => format(date, "yyyy-MM-dd");

export function disciplineOf(workout: Pick<Workout, "id" | "discipline" | "template_id">, setWorkoutIds: Set<string>): Discipline {
  if (workout.discipline === "running") return "running";
  if (workout.discipline === "calisthenics") return "calisthenics";
  if (workout.discipline === "strength" || workout.template_id || setWorkoutIds.has(workout.id)) return "strength";
  return "other";
}

/** Signed change, or null when there is nothing to compare with. */
const change = (current: number, previous: number) => (previous > 0 || current > 0 ? current - previous : null);

export function buildSportOverview(input: OverviewInput, now = new Date()) {
  const today = key(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastStart = subWeeks(weekStart, 1);
  const lastEnd = key(addDays(lastStart, differenceInCalendarDays(now, weekStart)));
  const past = input.workouts.filter((workout) => workout.workout_date <= today);
  const discipline = new Map(past.map((workout) => [workout.id, disciplineOf(workout, input.setWorkoutIds)]));
  const runByWorkout = new Map(input.runs.map((run) => [run.workout_id, run]));
  const dateOf = new Map(past.map((workout) => [workout.id, workout.workout_date]));
  const thisWeek = (date: string) => date >= key(weekStart) && date <= today;
  const lastWeek = (date: string) => date >= key(lastStart) && date <= lastEnd;

  // Week plan: what was done each day; today is highlighted, the rest of the week stays open.
  const plan: PlanDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = key(addDays(weekStart, index));
    const done = past.filter((workout) => workout.workout_date === date);
    const first = done[done.length - 1] ?? null;
    const run = first ? runByWorkout.get(first.id) : undefined;
    const state = first ? "done" : date === today ? "today" : date > today ? "upcoming" : "rest";
    return { date, state, discipline: first ? discipline.get(first.id) ?? "other" : null, note: first ? first.activity : null, distanceKm: run ? run.distance_km : null };
  });

  const minutes = (test: (date: string) => boolean) => past.filter((workout) => test(workout.workout_date)).reduce((sum, workout) => sum + workout.duration_minutes, 0);
  const strengthSets = input.sets.filter((set) => discipline.get(set.workout_id) === "strength");
  const volume = (test: (date: string) => boolean) => {
    const rows = strengthSets.filter((set) => test(dateOf.get(set.workout_id)!));
    return rows.length ? rows.reduce((sum, set) => sum + set.reps * Number(set.weight_kg), 0) : null;
  };
  const distance = (test: (date: string) => boolean) => {
    const rows = input.runs.filter((run) => dateOf.has(run.workout_id) && test(dateOf.get(run.workout_id)!));
    return rows.length ? Math.round(rows.reduce((sum, run) => sum + run.distance_km, 0) * 10) / 10 : null;
  };
  const week = {
    sessions: past.filter((workout) => thisWeek(workout.workout_date)).length,
    minutes: minutes(thisWeek), minutesChange: change(minutes(thisWeek), minutes(lastWeek)),
    volume: volume(thisWeek), volumeChange: null as number | null,
    distanceKm: distance(thisWeek), distanceChange: null as number | null,
  };
  const lastVolume = volume(lastWeek);
  if (week.volume !== null && lastVolume) week.volumeChange = Math.round(((week.volume - lastVolume) / lastVolume) * 100);
  const lastDistance = distance(lastWeek);
  if (week.distanceKm !== null || lastDistance !== null) week.distanceChange = Math.round(((week.distanceKm ?? 0) - (lastDistance ?? 0)) * 10) / 10;

  // Last day each muscle group was worked, from the session tags and the recorded sets.
  const lastWorked = new Map<string, string>();
  const mark = (group: string, date: string) => { if (group && (!lastWorked.has(group) || lastWorked.get(group)! < date)) lastWorked.set(group, date); };
  for (const workout of past) if (discipline.get(workout.id) === "strength") for (const group of workout.muscle_groups ?? []) mark(group, workout.workout_date);
  for (const set of strengthSets) mark(set.muscle_group, dateOf.get(set.workout_id)!);
  const daysSince = (date: string) => differenceInCalendarDays(now, parseISO(date));

  const recovery: MuscleState[] = [...lastWorked]
    .map(([group, date]) => ({ group, days: daysSince(date) }))
    .filter((muscle) => muscle.days <= 30)
    .map((muscle) => ({ ...muscle, state: muscle.days < 2 ? "recovering" as const : muscle.days <= 7 ? "ready" as const : "idle" as const }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  let next = null;
  if (input.nextTemplate) {
    const exercises = input.templateExercises.filter((exercise) => exercise.template_id === input.nextTemplate!.id).sort((a, b) => a.position - b.position);
    // The load of the latest session that included each exercise.
    const lastLoad = new Map<string, { date: string; weight: number }>();
    for (const set of strengthSets) {
      const name = exerciseKey(set.exercise_name);
      const date = dateOf.get(set.workout_id)!;
      const current = lastLoad.get(name);
      if (!current || date > current.date) lastLoad.set(name, { date, weight: Number(set.weight_kg) });
      else if (date === current.date) current.weight = Math.max(current.weight, Number(set.weight_kg));
    }
    const groups = input.nextTemplate.muscle_groups.length ? input.nextTemplate.muscle_groups : [];
    const rested = groups.map((group) => lastWorked.get(group)).filter((date): date is string => Boolean(date));
    next = {
      template: input.nextTemplate,
      exerciseCount: exercises.length,
      exercises: exercises.slice(0, 3).map((exercise) => ({ name: exercise.exercise_name, sets: exercise.target_sets, reps: exercise.target_reps, weightKg: lastLoad.get(exerciseKey(exercise.exercise_name))?.weight || null })),
      // Only when every muscle of the session has been worked before.
      restDays: rested.length && rested.length === groups.length ? Math.min(...rested.map(daysSince)) : null,
    };
  }

  const records: HubRecord[] = [];
  const strengthBest = new Map<string, { name: string; weightKg: number; date: string }>();
  for (const set of [...strengthSets].sort((a, b) => dateOf.get(a.workout_id)!.localeCompare(dateOf.get(b.workout_id)!))) {
    const weight = Number(set.weight_kg);
    if (!(weight > 0) || set.reps <= 0) continue;
    const name = exerciseKey(set.exercise_name);
    const best = strengthBest.get(name);
    if (!best || weight > best.weightKg) strengthBest.set(name, { name: set.exercise_name, weightKg: weight, date: dateOf.get(set.workout_id)! });
  }
  const strengthRecord = [...strengthBest.values()].sort((a, b) => b.date.localeCompare(a.date) || b.weightKg - a.weightKg)[0];
  if (strengthRecord) records.push({ discipline: "strength", ...strengthRecord });
  const bestRun = input.runs
    .filter((run) => dateOf.has(run.workout_id) && run.distance_km >= 1 && run.duration_seconds > 0)
    .map((run) => ({ paceSeconds: Math.round(run.duration_seconds / run.distance_km), date: dateOf.get(run.workout_id)! }))
    .sort((a, b) => a.paceSeconds - b.paceSeconds || a.date.localeCompare(b.date))[0];
  if (bestRun) records.push({ discipline: "running", ...bestRun });
  const caliBest = new Map<string, { name: string; kind: "reps" | "hold"; value: number; date: string }>();
  for (const set of [...input.caliSets].filter((row) => dateOf.has(row.workout_id)).sort((a, b) => dateOf.get(a.workout_id)!.localeCompare(dateOf.get(b.workout_id)!))) {
    for (const [kind, value] of [["reps", set.reps], ["hold", set.hold_seconds]] as const) {
      if (value === null || value <= 0) continue;
      const id = `${set.exercise_id ?? exerciseKey(set.exercise_name)}:${kind}`;
      const best = caliBest.get(id);
      if (!best || value > best.value) caliBest.set(id, { name: set.exercise_name, kind, value, date: dateOf.get(set.workout_id)! });
    }
  }
  const caliRecord = [...caliBest.values()].sort((a, b) => b.date.localeCompare(a.date) || b.value - a.value)[0];
  if (caliRecord) records.push({ discipline: "calisthenics", ...caliRecord });
  records.sort((a, b) => b.date.localeCompare(a.date));

  // Sessions per week over the last eight weeks, oldest first, per discipline.
  const weeks = Array.from({ length: 8 }, (_, index) => key(subWeeks(weekStart, 7 - index)));
  const disciplines = (["strength", "calisthenics", "running"] as const).map((name) => {
    const rows = past.filter((workout) => discipline.get(workout.id) === name);
    return {
      discipline: name,
      total: rows.length,
      thisWeek: rows.filter((workout) => thisWeek(workout.workout_date)).length,
      lastDate: rows.reduce<string | null>((latest, workout) => (!latest || workout.workout_date > latest ? workout.workout_date : latest), null),
      trend: weeks.map((start) => rows.filter((workout) => key(startOfWeek(parseISO(workout.workout_date), { weekStartsOn: 1 })) === start).length),
    };
  });

  // The month's challenge follows the weekly goal, spread over the month's days.
  const daysInMonth = getDaysInMonth(now);
  const monthGoal = Math.max(1, Math.round((input.weeklyGoal * daysInMonth) / 7));
  const monthDone = past.filter((workout) => workout.workout_date.startsWith(format(now, "yyyy-MM"))).length;
  const challenge = {
    month: format(now, "yyyy-MM-01"),
    done: monthDone,
    goal: monthGoal,
    daysLeft: daysInMonth - now.getDate() + 1,
    onTrack: monthDone >= Math.floor((monthGoal * (now.getDate() - 1)) / daysInMonth),
  };

  return { plan, week, next, recovery, records: records.slice(0, 3), disciplines, challenge, recent: past.slice(0, 4), hasWorkouts: past.length > 0 };
}

export type SportOverview = ReturnType<typeof buildSportOverview>;
