import { getISODay, parseISO } from "date-fns";
import { computeStreak } from "@/lib/streak";
import type { Insight } from "@/lib/dashboard";

type Mood = { entry_date: string; mood_score: number; energy_level: number };

const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

export function moodDiffText(withLabel: string, without: string, a: number, b: number) {
  const diff = a - b;
  const scores = `${a.toFixed(1)}/5 vs ${b.toFixed(1)}/5`;
  if (diff > 0.3) return `Ton humeur est plus haute ${withLabel} (${scores}). Continue comme ça !`;
  if (diff < -0.3) return `Ton humeur est un peu plus basse ${withLabel} (${scores}) que ${without}.`;
  return `Pas de lien net pour l'instant entre ton humeur et ce critère (${scores}).`;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function weekdayAverages(moods: Mood[]) {
  return WEEKDAYS.map((label, i) => {
    const rows = moods.filter((m) => getISODay(parseISO(m.entry_date)) === i + 1);
    const a = avg(rows.map((m) => m.mood_score));
    return { label, avg: a === null ? null : Math.round(a * 10) / 10, count: rows.length };
  });
}

export function moodSummary(moods: Mood[]) {
  const last30 = moods.slice(-30);
  const best = last30.reduce<Mood | null>((b, m) => (!b || m.mood_score > b.mood_score ? m : b), null);
  const meanMood = avg(last30.map((m) => m.mood_score));
  const meanEnergy = avg(last30.map((m) => m.energy_level));
  return {
    mood: meanMood === null ? null : Math.round(meanMood * 10) / 10,
    energy: meanEnergy === null ? null : Math.round(meanEnergy * 10) / 10,
    best,
    streak: computeStreak(new Set(moods.map((m) => m.entry_date))),
    count: moods.length,
  };
}

type DayFacts = { protein: number; sugar: number; caffeine: number; drinksMl: number; hasMeals: boolean };

/**
 * Compares average mood on days where a criterion holds vs. where it doesn't.
 * A predicate returns null when the day has no data for that criterion (the day is ignored).
 */
export function buildMoodInsights(input: {
  moods: Mood[];
  workoutDates: Set<string>;
  facts: Map<string, DayFacts>;
  waterByDate: Map<string, number>;
  goals: { protein: number | null; sugarLimit: number; caffeineLimit: number; water: number };
}): Insight[] {
  const out: Insight[] = [];

  function compare(
    icon: string,
    title: string,
    color: string,
    withLabel: string,
    withoutLabel: string,
    predicate: (date: string) => boolean | null
  ) {
    const yes: number[] = [];
    const no: number[] = [];
    for (const m of input.moods) {
      const p = predicate(m.entry_date);
      if (p === null) continue;
      (p ? yes : no).push(m.mood_score);
    }
    if (yes.length < 2 || no.length < 2) return;
    out.push({
      icon,
      title,
      color,
      text: `${moodDiffText(withLabel, withoutLabel, avg(yes)!, avg(no)!)} (${yes.length} vs ${no.length} jours)`,
    });
  }

  compare("🏃", "Sport", "var(--sport)", "les jours de sport", "les autres jours", (d) => input.workoutDates.has(d));

  if (input.goals.protein) {
    const goal = input.goals.protein;
    compare(
      "💪",
      "Protéines",
      "var(--habit)",
      "quand tu atteins ton objectif de protéines",
      "les autres jours",
      (d) => {
        const f = input.facts.get(d);
        return f?.hasMeals ? f.protein >= goal : null;
      }
    );
  }

  compare("🍬", "Sucres", "var(--weight)", "les jours où tu dépasses ta limite de sucres", "les jours sous la limite", (d) => {
    const f = input.facts.get(d);
    return f?.hasMeals ? f.sugar > input.goals.sugarLimit : null;
  });

  compare("☕", "Caféine", "var(--mood)", "les jours de forte caféine", "les jours plus modérés", (d) => {
    const f = input.facts.get(d);
    return f?.hasMeals ? f.caffeine >= input.goals.caffeineLimit * 0.5 : null;
  });

  compare("💧", "Hydratation", "var(--water)", "quand tu atteins ton objectif d'eau", "les autres jours", (d) => {
    const water = (input.waterByDate.get(d) ?? 0) + (input.facts.get(d)?.drinksMl ?? 0);
    if (!input.waterByDate.has(d) && !(input.facts.get(d)?.drinksMl ?? 0)) return null;
    return water >= input.goals.water;
  });

  return out;
}
