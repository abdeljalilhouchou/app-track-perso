import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { successRate } from "@/lib/habit-insights";

export type RecapMetric = { current: number | null; previous: number | null };

export type WeekRecap = {
  habitsRate: RecapMetric;
  sportMinutes: RecapMetric;
  moodAvg: RecapMetric;
  kcalAvg: RecapMetric;
};

const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/** This week (Monday → today) compared with the same span of the previous week. */
export function computeWeekRecap(input: {
  habits: { id: string; scheduled_days: number[] }[];
  logsByHabit: Map<string, Set<string>>;
  workouts: { workout_date: string; duration_minutes: number }[];
  moods: { entry_date: string; mood_score: number }[];
  meals: { entry_date: string; calories: number }[];
}): WeekRecap {
  const today = new Date();
  const thisStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastStart = subDays(thisStart, 7);
  const lastEnd = addDays(lastStart, differenceInCalendarDays(today, thisStart));

  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  const ranges = {
    current: { start: fmt(thisStart), end: fmt(today), startD: thisStart, endD: today },
    previous: { start: fmt(lastStart), end: fmt(lastEnd), startD: lastStart, endD: lastEnd },
  };

  function metric(compute: (r: (typeof ranges)["current"]) => number | null): RecapMetric {
    return { current: compute(ranges.current), previous: compute(ranges.previous) };
  }

  const inRange = (date: string, r: { start: string; end: string }) => date >= r.start && date <= r.end;

  return {
    habitsRate: metric((r) => {
      let completed = 0;
      let expected = 0;
      for (const h of input.habits) {
        const res = successRate(input.logsByHabit.get(h.id) ?? new Set(), h.scheduled_days, r.startD, r.endD);
        completed += res.completed;
        expected += res.expected;
      }
      return expected > 0 ? Math.round((completed / expected) * 100) : null;
    }),
    sportMinutes: metric((r) =>
      input.workouts.filter((w) => inRange(w.workout_date, r)).reduce((s, w) => s + w.duration_minutes, 0)
    ),
    moodAvg: metric((r) => round1(avg(input.moods.filter((m) => inRange(m.entry_date, r)).map((m) => m.mood_score)))),
    kcalAvg: metric((r) => {
      const perDay = new Map<string, number>();
      for (const m of input.meals) {
        if (inRange(m.entry_date, r)) perDay.set(m.entry_date, (perDay.get(m.entry_date) ?? 0) + m.calories);
      }
      const a = avg(Array.from(perDay.values()));
      return a === null ? null : Math.round(a);
    }),
  };
}

export type Insight = { icon: string; title: string; text: string };

function moodDiffText(withLabel: string, without: string, a: number, b: number) {
  const diff = a - b;
  const scores = `${a.toFixed(1)}/5 vs ${b.toFixed(1)}/5`;
  if (diff > 0.3) return `Ton humeur est plus haute ${withLabel} (${scores}). Continue comme ça !`;
  if (diff < -0.3) return `Ton humeur est un peu plus basse ${withLabel} (${scores}) que ${without}.`;
  return `Pas de lien net pour l'instant entre ton humeur et ce critère (${scores}).`;
}

export function buildInsights(input: {
  moods: { entry_date: string; mood_score: number }[];
  workoutDates: Set<string>;
  meals: { entry_date: string; protein: number }[];
  goalProtein: number | null;
  weights: { entry_date: string; weight_kg: number }[];
  workouts: { workout_date: string; duration_minutes: number }[];
}): Insight[] {
  const insights: Insight[] = [];
  const meanMood = (rows: { mood_score: number }[]) => avg(rows.map((r) => r.mood_score));

  // Sport <-> mood
  const onSport = input.moods.filter((m) => input.workoutDates.has(m.entry_date));
  const offSport = input.moods.filter((m) => !input.workoutDates.has(m.entry_date));
  if (onSport.length >= 2 && offSport.length >= 2) {
    insights.push({
      icon: "🏃",
      title: "Sport et humeur",
      text: moodDiffText("les jours de sport", "les autres jours", meanMood(onSport)!, meanMood(offSport)!),
    });
  }

  // Protein goal <-> mood
  if (input.goalProtein) {
    const proteinByDate = new Map<string, number>();
    for (const m of input.meals) {
      proteinByDate.set(m.entry_date, (proteinByDate.get(m.entry_date) ?? 0) + m.protein);
    }
    const goal = input.goalProtein;
    const hit = input.moods.filter((m) => (proteinByDate.get(m.entry_date) ?? 0) >= goal);
    const miss = input.moods.filter(
      (m) => proteinByDate.has(m.entry_date) && (proteinByDate.get(m.entry_date) ?? 0) < goal
    );
    if (hit.length >= 2 && miss.length >= 2) {
      insights.push({
        icon: "🥗",
        title: "Protéines et humeur",
        text: moodDiffText(
          "les jours où tu atteins ton objectif de protéines",
          "les jours où tu ne l'atteins pas",
          meanMood(hit)!,
          meanMood(miss)!
        ),
      });
    }
  }

  // Weight trend <-> sport volume
  const weights = [...input.weights].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const days = Math.max(1, differenceInCalendarDays(parseISO(last.entry_date), parseISO(first.entry_date)));
    const delta = Math.round((last.weight_kg - first.weight_kg) * 10) / 10;
    const minutes = input.workouts
      .filter((w) => w.workout_date >= first.entry_date && w.workout_date <= last.entry_date)
      .reduce((s, w) => s + w.duration_minutes, 0);
    const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
    insights.push({
      icon: "⚖️",
      title: "Évolution du poids",
      text: `${sign}${Math.abs(delta)} kg en ${days} jour${days > 1 ? "s" : ""} (${first.weight_kg} → ${last.weight_kg} kg), avec ${minutes} min de sport sur la période.`,
    });
  }

  return insights;
}
