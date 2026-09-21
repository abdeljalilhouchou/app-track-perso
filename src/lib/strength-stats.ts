import { addDays, differenceInCalendarDays, format, startOfWeek, subDays } from "date-fns";
import { estimate1RM, exerciseKey, setsVolume, type SetInput } from "@/lib/strength";

export type RawSet = {
  workout_id: string;
  exercise_name: string;
  muscle_group: string;
  exercise_position: number;
  set_number: number;
  reps: number;
  weight_kg: number;
};

export type SessionPerf = {
  workoutId: string;
  date: string;
  sets: SetInput[];
  topWeight: number;
  topReps: number;
  est1RM: number;
  volume: number;
};

export type ExerciseSummary = {
  key: string;
  name: string;
  muscle: string;
  sessions: SessionPerf[];
  records: {
    maxWeight: { weight: number; reps: number; date: string } | null;
    best1RM: { value: number; date: string } | null;
    bestVolume: { value: number; date: string } | null;
  };
};

export type WorkoutDetail = {
  exercises: { name: string; muscle: string; sets: SetInput[] }[];
  volume: number;
  totalSets: number;
};

export type MuscleWeek = { muscle: string; thisWeekSets: number; lastWeekSets: number; thisWeekVolume: number };

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export function computeStrengthData(sets: RawSet[], workoutDates: Record<string, string>) {
  // Group: workout -> exercise -> sets
  const byWorkout = new Map<string, Map<string, { name: string; muscle: string; position: number; sets: RawSet[] }>>();
  for (const s of sets) {
    if (!workoutDates[s.workout_id]) continue;
    const exercises = byWorkout.get(s.workout_id) ?? new Map();
    const key = exerciseKey(s.exercise_name);
    const entry = exercises.get(key) ?? { name: s.exercise_name, muscle: s.muscle_group, position: s.exercise_position, sets: [] };
    entry.sets.push(s);
    exercises.set(key, entry);
    byWorkout.set(s.workout_id, exercises);
  }

  const details: Record<string, WorkoutDetail> = {};
  const perExercise = new Map<string, ExerciseSummary>();

  for (const [workoutId, exercises] of byWorkout) {
    const date = workoutDates[workoutId];
    const ordered = Array.from(exercises.values()).sort((a, b) => a.position - b.position);
    let volume = 0;
    let totalSets = 0;

    const detailExercises = ordered.map((ex) => {
      const list = ex.sets
        .sort((a, b) => a.set_number - b.set_number)
        .map((x) => ({ reps: x.reps, weight: Number(x.weight_kg) }));
      volume += setsVolume(list);
      totalSets += list.length;

      const top = list.reduce((b, x) => (x.weight > b.weight || (x.weight === b.weight && x.reps > b.reps) ? x : b), list[0]);
      const perf: SessionPerf = {
        workoutId,
        date,
        sets: list,
        topWeight: top.weight,
        topReps: top.reps,
        est1RM: Math.max(...list.map((x) => estimate1RM(x.weight, x.reps))),
        volume: setsVolume(list),
      };

      const key = exerciseKey(ex.name);
      const summary =
        perExercise.get(key) ??
        ({ key, name: ex.name, muscle: ex.muscle, sessions: [], records: { maxWeight: null, best1RM: null, bestVolume: null } } as ExerciseSummary);
      summary.sessions.push(perf);
      perExercise.set(key, summary);

      return { name: ex.name, muscle: ex.muscle, sets: list };
    });

    details[workoutId] = { exercises: detailExercises, volume: Math.round(volume), totalSets };
  }

  // Chronological order + records
  const exercises = Array.from(perExercise.values()).map((summary) => {
    summary.sessions.sort((a, b) => a.date.localeCompare(b.date));
    for (const p of summary.sessions) {
      const r = summary.records;
      if (p.topWeight > 0 && (!r.maxWeight || p.topWeight > r.maxWeight.weight || (p.topWeight === r.maxWeight.weight && p.topReps > r.maxWeight.reps))) {
        r.maxWeight = { weight: p.topWeight, reps: p.topReps, date: p.date };
      }
      if (p.est1RM > 0 && (!r.best1RM || p.est1RM > r.best1RM.value)) r.best1RM = { value: p.est1RM, date: p.date };
      if (p.volume > 0 && (!r.bestVolume || p.volume > r.bestVolume.value)) r.bestVolume = { value: p.volume, date: p.date };
    }
    // The latest session name wins (in case of a rename/casing change)
    return summary;
  });
  exercises.sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name));

  // Weekly sets per muscle (this week vs same span of last week)
  const today = new Date();
  const thisStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastStart = subDays(thisStart, 7);
  const lastEnd = addDays(lastStart, differenceInCalendarDays(today, thisStart));
  const muscles = new Map<string, MuscleWeek>();
  for (const s of sets) {
    const date = workoutDates[s.workout_id];
    if (!date) continue;
    const inThis = date >= fmt(thisStart) && date <= fmt(today);
    const inLast = date >= fmt(lastStart) && date <= fmt(lastEnd);
    if (!inThis && !inLast) continue;
    const m = muscles.get(s.muscle_group) ?? { muscle: s.muscle_group, thisWeekSets: 0, lastWeekSets: 0, thisWeekVolume: 0 };
    if (inThis) {
      m.thisWeekSets += 1;
      m.thisWeekVolume += s.reps * Number(s.weight_kg);
    } else m.lastWeekSets += 1;
    muscles.set(s.muscle_group, m);
  }
  const weeklyMuscles = Array.from(muscles.values())
    .map((m) => ({ ...m, thisWeekVolume: Math.round(m.thisWeekVolume) }))
    .sort((a, b) => b.thisWeekSets - a.thisWeekSets);

  return { exercises, details, weeklyMuscles };
}

/** Which exercises of the finished session beat a personal record? */
export function detectRecords(
  summaries: ExerciseSummary[],
  session: { name: string; sets: SetInput[] }[]
): { name: string; kind: "poids" | "1RM"; value: string }[] {
  const byKey = new Map(summaries.map((s) => [s.key, s]));
  const found: { name: string; kind: "poids" | "1RM"; value: string }[] = [];

  for (const ex of session) {
    const valid = ex.sets.filter((s) => s.reps > 0 && s.weight > 0);
    if (valid.length === 0) continue;
    const prior = byKey.get(exerciseKey(ex.name));
    if (!prior || prior.sessions.length === 0) continue; // a first time isn't a "record"

    const top = Math.max(...valid.map((s) => s.weight));
    const one = Math.max(...valid.map((s) => estimate1RM(s.weight, s.reps)));

    if (prior.records.maxWeight && top > prior.records.maxWeight.weight) {
      found.push({ name: ex.name, kind: "poids", value: `${top} kg` });
    } else if (prior.records.best1RM && one > prior.records.best1RM.value) {
      found.push({ name: ex.name, kind: "1RM", value: `${one} kg` });
    }
  }
  return found;
}

/** The next session of the program: the one after the last one done, skipping sessions already done this week. */
export function suggestNextTemplate(
  templateIds: string[],
  workouts: { template_id: string | null; workout_date: string }[]
): string | null {
  if (templateIds.length === 0) return null;

  const weekStart = fmt(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const doneThisWeek = new Set(workouts.filter((w) => w.template_id && w.workout_date >= weekStart).map((w) => w.template_id));

  const lastDone = [...workouts]
    .filter((w) => w.template_id && templateIds.includes(w.template_id))
    .sort((a, b) => b.workout_date.localeCompare(a.workout_date))[0];
  const lastIndex = lastDone ? templateIds.indexOf(lastDone.template_id!) : -1;

  for (let step = 1; step <= templateIds.length; step++) {
    const id = templateIds[(lastIndex + step) % templateIds.length];
    if (!doneThisWeek.has(id)) return id;
  }
  return templateIds[(lastIndex + 1) % templateIds.length];
}
