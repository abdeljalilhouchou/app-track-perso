import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { successRate } from "@/lib/habit-insights";
import { estimate1RM, exerciseKey, setsVolume } from "@/lib/strength";

export type ReportPeriod = { kind: "month"; year: number; month: number } | { kind: "year"; year: number };

export type Table = { head: string[]; rows: string[][] };

export type ReportData = {
  mode: "month" | "year";
  userName: string;
  periodLabel: string;
  generatedAt: string;
  kpis: { label: string; value: string; color: string }[];
  habits: { total: string; table: Table | null; monthly: Table | null };
  sport: {
    summary: string[][];
    sessions: Table | null;
    exercises: Table | null;
    muscles: Table | null;
  };
  mood: { summary: string[][]; table: Table | null };
  nutrition: { summary: string[][]; table: Table | null };
  weight: { summary: string[][]; table: Table | null };
};

export type RawReport = {
  userName: string;
  goals: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null };
  habits: { id: string; name: string; scheduled_days: number[]; created_at: string }[];
  habitLogs: { habit_id: string; log_date: string }[];
  workouts: { id: string; workout_date: string; activity: string; duration_minutes: number; intensity: number }[];
  sets: { workout_id: string; exercise_name: string; muscle_group: string; reps: number; weight_kg: number }[];
  moods: { entry_date: string; mood_score: number; energy_level: number; notes: string | null }[];
  meals: {
    entry_date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    caffeine: number;
    unit: "g" | "ml";
    quantity_grams: number;
  }[];
  water: { entry_date: string; ml: number }[];
  weights: { entry_date: string; weight_kg: number }[];
};

const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);
const round = (n: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};
const show = (n: number | null, digits = 0, unit = "") => (n === null ? "-" : `${round(n, digits)}${unit}`);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthLabel = (month: number, year: number, style: "MMMM" | "MMM" = "MMMM") =>
  capitalize(format(new Date(year, month - 1, 1), style, { locale: fr }));
const dayLabel = (iso: string) => format(parseISO(iso), "EEE d MMM", { locale: fr });

export function periodRange(period: ReportPeriod) {
  if (period.kind === "month") {
    const start = new Date(period.year, period.month - 1, 1);
    const end = new Date(period.year, period.month, 0);
    return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
  }
  return { start: `${period.year}-01-01`, end: `${period.year}-12-31` };
}

function monthsOf(period: ReportPeriod, today: string) {
  const months: number[] = [];
  const currentYear = Number(today.slice(0, 4));
  const last = period.year === currentYear ? Number(today.slice(5, 7)) : 12;
  for (let m = 1; m <= last; m++) months.push(m);
  return months;
}

const keyOf = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

export function buildReport(raw: RawReport, period: ReportPeriod, today: string): ReportData {
  const { start, end } = periodRange(period);
  const effectiveEnd = end < today ? end : today;
  const isYear = period.kind === "year";
  const months = isYear ? monthsOf(period, today) : [];
  const year = period.year;

  // ---------- Habits ----------
  const logsByHabit = new Map<string, Set<string>>();
  for (const l of raw.habitLogs) {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, new Set());
    logsByHabit.get(l.habit_id)!.add(l.log_date);
  }
  function habitStats(rangeStart: string, rangeEnd: string) {
    const rows = raw.habits.map((h) => {
      const from = h.created_at.slice(0, 10) > rangeStart ? h.created_at.slice(0, 10) : rangeStart;
      const to = rangeEnd < today ? rangeEnd : today;
      if (from > to) return { h, done: 0, expected: 0, rate: 0 };
      const r = successRate(logsByHabit.get(h.id) ?? new Set(), h.scheduled_days, parseISO(from), parseISO(to));
      return { h, done: r.completed, expected: r.expected, rate: r.rate };
    });
    const done = rows.reduce((s, r) => s + r.done, 0);
    const expected = rows.reduce((s, r) => s + r.expected, 0);
    return { rows, done, expected, rate: expected ? Math.round((done / expected) * 100) : null };
  }
  const habitsAll = habitStats(start, effectiveEnd);
  const habitRows = habitsAll.rows.filter((r) => r.expected > 0).sort((a, b) => b.rate - a.rate);
  const habitsTable: Table | null = habitRows.length
    ? {
        head: ["Habitude", "Jours prévus", "Réussis", "Taux"],
        rows: habitRows.map((r) => [r.h.name, String(r.expected), String(r.done), `${r.rate}%`]),
      }
    : null;
  const habitsMonthly: Table | null =
    isYear && habitsAll.expected > 0
      ? {
          head: ["Mois", "Jours prévus", "Réussis", "Taux"],
          rows: months.map((m) => {
            const mStart = `${keyOf(year, m)}-01`;
            const mEnd = format(new Date(year, m, 0), "yyyy-MM-dd");
            const s = habitStats(mStart, mEnd);
            return [monthLabel(m, year), String(s.expected), String(s.done), s.rate === null ? "-" : `${s.rate}%`];
          }),
        }
      : null;

  // ---------- Sport ----------
  const workoutById = new Map(raw.workouts.map((w) => [w.id, w]));
  const setsByWorkout = new Map<string, RawReport["sets"]>();
  for (const s of raw.sets) {
    if (!workoutById.has(s.workout_id)) continue;
    if (!setsByWorkout.has(s.workout_id)) setsByWorkout.set(s.workout_id, []);
    setsByWorkout.get(s.workout_id)!.push(s);
  }
  const volumeOf = (workoutId: string) =>
    setsVolume((setsByWorkout.get(workoutId) ?? []).map((s) => ({ reps: s.reps, weight: Number(s.weight_kg) })));
  const totalMinutes = raw.workouts.reduce((s, w) => s + w.duration_minutes, 0);
  const totalVolume = raw.workouts.reduce((s, w) => s + volumeOf(w.id), 0);
  const strengthSessions = raw.workouts.filter((w) => setsByWorkout.has(w.id)).length;
  const totalSets = raw.sets.filter((s) => workoutById.has(s.workout_id)).length;

  const sportSessions: Table | null = raw.workouts.length
    ? isYear
      ? {
          head: ["Mois", "Séances", "Minutes", "Volume (kg)"],
          rows: months.map((m) => {
            const list = raw.workouts.filter((w) => w.workout_date.startsWith(keyOf(year, m)));
            return [
              monthLabel(m, year),
              String(list.length),
              String(list.reduce((s, w) => s + w.duration_minutes, 0)),
              String(round(list.reduce((s, w) => s + volumeOf(w.id), 0))),
            ];
          }),
        }
      : {
          head: ["Date", "Séance", "Durée", "Intensité", "Séries", "Volume (kg)"],
          rows: [...raw.workouts]
            .sort((a, b) => a.workout_date.localeCompare(b.workout_date))
            .map((w) => [
              dayLabel(w.workout_date),
              w.activity,
              `${w.duration_minutes} min`,
              `${w.intensity}/5`,
              String((setsByWorkout.get(w.id) ?? []).length || "-"),
              volumeOf(w.id) ? String(volumeOf(w.id)) : "-",
            ]),
        }
    : null;

  const perExercise = new Map<string, { name: string; muscle: string; workouts: Set<string>; maxWeight: number; maxReps: number; best1RM: number; volume: number }>();
  const perMuscle = new Map<string, number>();
  for (const s of raw.sets) {
    if (!workoutById.has(s.workout_id)) continue;
    const key = exerciseKey(s.exercise_name);
    const e = perExercise.get(key) ?? { name: s.exercise_name, muscle: s.muscle_group, workouts: new Set(), maxWeight: 0, maxReps: 0, best1RM: 0, volume: 0 };
    e.workouts.add(s.workout_id);
    const w = Number(s.weight_kg);
    if (w > e.maxWeight || (w === e.maxWeight && s.reps > e.maxReps)) {
      e.maxWeight = w;
      e.maxReps = s.reps;
    }
    e.best1RM = Math.max(e.best1RM, estimate1RM(w, s.reps));
    e.volume += w * s.reps;
    perExercise.set(key, e);
    perMuscle.set(s.muscle_group, (perMuscle.get(s.muscle_group) ?? 0) + 1);
  }
  const exercisesTable: Table | null = perExercise.size
    ? {
        head: ["Exercice", "Muscle", "Séances", "Charge max", "1RM estimé", "Volume (kg)"],
        rows: Array.from(perExercise.values())
          .sort((a, b) => b.workouts.size - a.workouts.size || b.volume - a.volume)
          .slice(0, 25)
          .map((e) => [
            e.name,
            e.muscle,
            String(e.workouts.size),
            e.maxWeight > 0 ? `${round(e.maxWeight, 1)} kg x ${e.maxReps}` : `${e.maxReps} reps`,
            e.best1RM > 0 ? `${round(e.best1RM, 1)} kg` : "-",
            String(round(e.volume)),
          ]),
      }
    : null;
  const musclesTable: Table | null = perMuscle.size
    ? {
        head: ["Muscle", "Séries", "Part"],
        rows: Array.from(perMuscle.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([muscle, count]) => [muscle, String(count), `${Math.round((count / totalSets) * 100)}%`]),
      }
    : null;

  const sportSummary: string[][] = [
    ["Séances", String(raw.workouts.length)],
    ["Séances de musculation", String(strengthSessions)],
    ["Temps total", `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`],
    ["Séries de musculation", String(totalSets)],
    ["Volume total soulevé", `${round(totalVolume).toLocaleString("fr-FR")} kg`],
    ["Intensité moyenne", show(avg(raw.workouts.map((w) => w.intensity)), 1, "/5")],
  ];

  // ---------- Mood ----------
  const moodAvg = avg(raw.moods.map((m) => m.mood_score));
  const energyAvg = avg(raw.moods.map((m) => m.energy_level));
  const moodTable: Table | null = raw.moods.length
    ? isYear
      ? {
          head: ["Mois", "Jours notés", "Humeur moyenne", "Énergie moyenne"],
          rows: months.map((m) => {
            const list = raw.moods.filter((e) => e.entry_date.startsWith(keyOf(year, m)));
            return [
              monthLabel(m, year),
              String(list.length),
              show(avg(list.map((e) => e.mood_score)), 1, "/5"),
              show(avg(list.map((e) => e.energy_level)), 1, "/5"),
            ];
          }),
        }
      : {
          head: ["Date", "Humeur", "Énergie", "Note"],
          rows: [...raw.moods]
            .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
            .map((e) => [dayLabel(e.entry_date), `${e.mood_score}/5`, `${e.energy_level}/5`, (e.notes ?? "").slice(0, 70)]),
        }
    : null;
  const moodSummary: string[][] = [
    ["Jours notés", String(raw.moods.length)],
    ["Humeur moyenne", show(moodAvg, 1, "/5")],
    ["Énergie moyenne", show(energyAvg, 1, "/5")],
  ];

  // ---------- Nutrition ----------
  type Day = { kcal: number; p: number; c: number; f: number; sugar: number; caffeine: number; drinks: number };
  const days = new Map<string, Day>();
  for (const m of raw.meals) {
    const d = days.get(m.entry_date) ?? { kcal: 0, p: 0, c: 0, f: 0, sugar: 0, caffeine: 0, drinks: 0 };
    d.kcal += m.calories;
    d.p += m.protein;
    d.c += m.carbs;
    d.f += m.fat;
    d.sugar += m.sugar;
    d.caffeine += m.caffeine;
    if (m.unit === "ml") d.drinks += m.quantity_grams;
    days.set(m.entry_date, d);
  }
  const waterByDate = new Map(raw.water.map((w) => [w.entry_date, w.ml]));
  const waterOf = (date: string) => (waterByDate.get(date) ?? 0) + (days.get(date)?.drinks ?? 0);
  const dayKeys = Array.from(days.keys()).sort();
  const dayList = dayKeys.map((k) => days.get(k)!);
  const waterDays = new Set([...waterByDate.keys(), ...dayKeys.filter((k) => (days.get(k)?.drinks ?? 0) > 0)]);

  const nutritionTable: Table | null = dayKeys.length
    ? isYear
      ? {
          head: ["Mois", "Jours", "Kcal / jour", "Prot.", "Gluc.", "Lip.", "Sucres", "Eau (ml)"],
          rows: months.map((m) => {
            const keys = dayKeys.filter((k) => k.startsWith(keyOf(year, m)));
            const list = keys.map((k) => days.get(k)!);
            const waters = Array.from(waterDays).filter((k) => k.startsWith(keyOf(year, m))).map(waterOf);
            return [
              monthLabel(m, year),
              String(keys.length),
              show(avg(list.map((d) => d.kcal))),
              show(avg(list.map((d) => d.p)), 0, "g"),
              show(avg(list.map((d) => d.c)), 0, "g"),
              show(avg(list.map((d) => d.f)), 0, "g"),
              show(avg(list.map((d) => d.sugar)), 0, "g"),
              show(avg(waters)),
            ];
          }),
        }
      : {
          head: ["Date", "Kcal", "Prot.", "Gluc.", "Lip.", "Sucres", "Caféine", "Eau (ml)"],
          rows: dayKeys.map((k) => {
            const d = days.get(k)!;
            return [
              dayLabel(k),
              String(round(d.kcal)),
              `${round(d.p)}g`,
              `${round(d.c)}g`,
              `${round(d.f)}g`,
              `${round(d.sugar)}g`,
              d.caffeine ? `${round(d.caffeine)}mg` : "-",
              waterOf(k) ? String(round(waterOf(k))) : "-",
            ];
          }),
        }
    : null;
  const goalNote = (avgValue: number | null, goal: number | null, unit: string) =>
    avgValue === null ? "-" : `${round(avgValue)}${unit}${goal ? ` (objectif ${goal}${unit})` : ""}`;
  const nutritionSummary: string[][] = [
    ["Jours enregistrés", String(dayKeys.length)],
    ["Calories moyennes / jour", goalNote(avg(dayList.map((d) => d.kcal)), raw.goals.calories, " kcal")],
    ["Protéines moyennes", goalNote(avg(dayList.map((d) => d.p)), raw.goals.protein, " g")],
    ["Glucides moyens", goalNote(avg(dayList.map((d) => d.c)), raw.goals.carbs, " g")],
    ["Lipides moyens", goalNote(avg(dayList.map((d) => d.f)), raw.goals.fat, " g")],
    ["Sucres moyens / jour", show(avg(dayList.map((d) => d.sugar)), 0, " g")],
    ["Caféine moyenne / jour", show(avg(dayList.map((d) => d.caffeine)), 0, " mg")],
    ["Eau moyenne / jour", show(avg(Array.from(waterDays).map(waterOf)), 0, " ml")],
  ];

  // ---------- Weight ----------
  const weights = [...raw.weights].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const firstW = weights[0];
  const lastW = weights[weights.length - 1];
  const delta = firstW && lastW ? round(Number(lastW.weight_kg) - Number(firstW.weight_kg), 1) : null;
  const weightTable: Table | null = weights.length
    ? isYear
      ? {
          head: ["Mois", "Dernière pesée", "Moyenne"],
          rows: months
            .map((m) => weights.filter((w) => w.entry_date.startsWith(keyOf(year, m))))
            .map((list, i) =>
              list.length
                ? [monthLabel(months[i], year), `${Number(list[list.length - 1].weight_kg)} kg`, `${show(avg(list.map((w) => Number(w.weight_kg))), 1)} kg`]
                : null
            )
            .filter((r): r is string[] => r !== null),
        }
      : { head: ["Date", "Poids"], rows: weights.map((w) => [dayLabel(w.entry_date), `${Number(w.weight_kg)} kg`]) }
    : null;
  const weightSummary: string[][] = firstW
    ? [
        ["Première pesée", `${Number(firstW.weight_kg)} kg (${dayLabel(firstW.entry_date)})`],
        ["Dernière pesée", `${Number(lastW.weight_kg)} kg (${dayLabel(lastW.entry_date)})`],
        ["Variation", delta === null ? "-" : `${delta > 0 ? "+" : ""}${delta} kg`],
      ]
    : [];

  const periodLabel = isYear ? String(year) : `${monthLabel(period.month, year)} ${year}`;

  return {
    mode: isYear ? "year" : "month",
    userName: raw.userName,
    periodLabel,
    generatedAt: format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr }),
    kpis: [
      { label: "Habitudes réussies", value: habitsAll.rate === null ? "-" : `${habitsAll.rate}%`, color: "#8b5cf6" },
      { label: "Séances de sport", value: String(raw.workouts.length), color: "#10b981" },
      { label: "Humeur moyenne", value: show(moodAvg, 1, "/5"), color: "#f59e0b" },
      { label: "Calories / jour", value: show(avg(dayList.map((d) => d.kcal))), color: "#f97316" },
    ],
    habits: {
      total: habitsAll.expected
        ? `${habitsAll.done} jours réussis sur ${habitsAll.expected} prévus (${habitsAll.rate}%)`
        : "",
      table: habitsTable,
      monthly: habitsMonthly,
    },
    sport: { summary: sportSummary, sessions: sportSessions, exercises: exercisesTable, muscles: musclesTable },
    mood: { summary: moodSummary, table: moodTable },
    nutrition: { summary: nutritionSummary, table: nutritionTable },
    weight: { summary: weightSummary, table: weightTable },
  };
}
