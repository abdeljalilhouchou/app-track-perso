import { getISODay, parseISO } from "date-fns";
import { computeStreak } from "@/lib/streak";
import type { Insight } from "@/lib/dashboard";
import type { Vars } from "@/lib/i18n/translate";

type Mood = { entry_date: string; mood_score: number; energy_level: number };
type Translator = (path: string, vars?: Vars) => string;

const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

// Used by src/lib/dashboard.ts's own (still-French, out of scope) insights builder — keep this
// signature untouched so that call site keeps compiling. The mood page uses `moodDiffTextT` below.
export function moodDiffText(withLabel: string, without: string, a: number, b: number) {
  const diff = a - b;
  const scores = `${a.toFixed(1)}/5 vs ${b.toFixed(1)}/5`;
  if (diff > 0.3) return `Ton humeur est plus haute ${withLabel} (${scores}). Continue comme ça !`;
  if (diff < -0.3) return `Ton humeur est un peu plus basse ${withLabel} (${scores}) que ${without}.`;
  return `Pas de lien net pour l'instant entre ton humeur et ce critère (${scores}).`;
}

function moodDiffTextT(t: Translator, withLabel: string, withoutLabel: string, a: number, b: number) {
  const diff = a - b;
  const scores = `${a.toFixed(1)}/5 vs ${b.toFixed(1)}/5`;
  if (diff > 0.3) return t("mood.insights.higher", { withLabel, scores });
  if (diff < -0.3) return t("mood.insights.lower", { withLabel, withoutLabel, scores });
  return t("mood.insights.noLink", { scores });
}

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function weekdayAverages(moods: Mood[], t: Translator) {
  return WEEKDAY_KEYS.map((key, i) => {
    const rows = moods.filter((m) => getISODay(parseISO(m.entry_date)) === i + 1);
    const a = avg(rows.map((m) => m.mood_score));
    return {
      label: t(`mood.insights.weekday.${key}`),
      avg: a === null ? null : Math.round(a * 10) / 10,
      count: rows.length,
    };
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
  t: Translator;
}): Insight[] {
  const { t } = input;
  const out: Insight[] = [];

  function compare(
    icon: string,
    titleKey: string,
    color: string,
    withLabelKey: string,
    withoutLabelKey: string,
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
    const withLabel = t(withLabelKey);
    const withoutLabel = t(withoutLabelKey);
    out.push({
      icon,
      title: t(titleKey),
      color,
      text: `${moodDiffTextT(t, withLabel, withoutLabel, avg(yes)!, avg(no)!)} ${t("mood.insights.daysCompared", {
        yes: yes.length,
        no: no.length,
      })}`,
    });
  }

  compare(
    "🏃",
    "mood.insights.sport.title",
    "var(--sport)",
    "mood.insights.sport.with",
    "mood.insights.sport.without",
    (d) => input.workoutDates.has(d)
  );

  if (input.goals.protein) {
    const goal = input.goals.protein;
    compare(
      "💪",
      "mood.insights.protein.title",
      "var(--habit)",
      "mood.insights.protein.with",
      "mood.insights.protein.without",
      (d) => {
        const f = input.facts.get(d);
        return f?.hasMeals ? f.protein >= goal : null;
      }
    );
  }

  compare(
    "🍬",
    "mood.insights.sugar.title",
    "var(--weight)",
    "mood.insights.sugar.with",
    "mood.insights.sugar.without",
    (d) => {
      const f = input.facts.get(d);
      return f?.hasMeals ? f.sugar > input.goals.sugarLimit : null;
    }
  );

  compare(
    "☕",
    "mood.insights.caffeine.title",
    "var(--mood)",
    "mood.insights.caffeine.with",
    "mood.insights.caffeine.without",
    (d) => {
      const f = input.facts.get(d);
      return f?.hasMeals ? f.caffeine >= input.goals.caffeineLimit * 0.5 : null;
    }
  );

  compare(
    "💧",
    "mood.insights.hydration.title",
    "var(--water)",
    "mood.insights.hydration.with",
    "mood.insights.hydration.without",
    (d) => {
      const water = (input.waterByDate.get(d) ?? 0) + (input.facts.get(d)?.drinksMl ?? 0);
      if (!input.waterByDate.has(d) && !(input.facts.get(d)?.drinksMl ?? 0)) return null;
      return water >= input.goals.water;
    }
  );

  return out;
}
