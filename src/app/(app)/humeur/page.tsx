import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { Callout } from "@/components/ui/callout";
import { MoodCalendar } from "@/components/mood/mood-calendar";
import { MoodCheckin, type CheckinEntry } from "@/components/mood/mood-checkin";
import { MoodJournal } from "@/components/mood/mood-journal";
import { MoodFactors, MoodInsights, MoodStats, WeekdayBars } from "@/components/mood/mood-overview";
import { MoodTrend } from "@/components/mood/mood-trend";
import { formatDay } from "@/components/mood/mood-scale";
import { buildMoodInsights, lowMoodStreak, moodSummary, weekdayAverages } from "@/lib/mood-insights";
import { comparePeriods, tagEffects } from "@/lib/mood-tags";
import { getDictionary, getLanguage, getT } from "@/lib/i18n/get-dictionary";
import { fetchAllRows } from "@/lib/paging";

export default async function HumeurPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const yesterday = format(subDays(now, 1), "yyyy-MM-dd");
  const since30 = format(subDays(now, 30), "yyyy-MM-dd");
  const since120 = format(subDays(now, 120), "yyyy-MM-dd");
  const since365 = format(subDays(now, 365), "yyyy-MM-dd");

  const [dict, t, language, params, moodRows, workouts, meals, waterLogs, profileResult] =
    await Promise.all([
      getDictionary(),
      getT(),
      getLanguage(),
      searchParams,
      fetchAllRows((from, to) => supabase.from("mood_entries").select("*").eq("user_id", user.id)
        .order("entry_date").order("id").range(from, to)),
      fetchAllRows((from, to) => supabase.from("workouts").select("workout_date, id").eq("user_id", user.id).gte("workout_date", since120)
        .order("workout_date").order("id").range(from, to)),
      fetchAllRows((from, to) => supabase.from("meal_entries")
        .select("entry_date, protein, sugar, caffeine, unit, quantity_grams, id")
        .eq("user_id", user.id).gte("entry_date", since120).order("entry_date").order("id").range(from, to)),
      fetchAllRows((from, to) => supabase.from("water_logs").select("entry_date, ml").eq("user_id", user.id).gte("entry_date", since120)
        .order("entry_date").range(from, to)),
      supabase
        .from("profiles")
        .select("goal_protein, sugar_limit_g, caffeine_limit_mg, water_goal_ml")
        .eq("id", user.id)
        .single(),
    ]);
  if (profileResult.error) throw new Error("Impossible de charger les objectifs du profil.");
  const profile = profileResult.data;
  // Oldest first, whatever order the rows arrive in.
  const allEntries = [...moodRows].sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  // A past day opened from the journal; anything else falls back to today.
  const editDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today ? params.date : null;
  const byDate = new Map(allEntries.map((entry) => [entry.entry_date, entry]));
  const checkinEntries: Record<string, CheckinEntry> = {};
  for (const date of [today, yesterday, editDate].filter((value): value is string => !!value)) {
    const entry = byDate.get(date);
    checkinEntries[date] = entry ? { mood_score: entry.mood_score, energy_level: entry.energy_level, notes: entry.notes } : null;
  }

  const facts = new Map<string, { protein: number; sugar: number; caffeine: number; drinksMl: number; hasMeals: boolean }>();
  for (const m of meals) {
    const f = facts.get(m.entry_date) ?? { protein: 0, sugar: 0, caffeine: 0, drinksMl: 0, hasMeals: true };
    f.protein += m.protein;
    f.sugar += m.sugar;
    f.caffeine += m.caffeine;
    if (m.unit === "ml") f.drinksMl += m.quantity_grams;
    facts.set(m.entry_date, f);
  }

  const recentMoods = allEntries.filter((e) => e.entry_date >= since120);
  const insights = buildMoodInsights({
    moods: recentMoods,
    workoutDates: new Set(workouts.map((w) => w.workout_date)),
    facts,
    waterByDate: new Map(waterLogs.map((w) => [w.entry_date, w.ml])),
    goals: {
      protein: profile?.goal_protein ?? null,
      sugarLimit: profile?.sugar_limit_g ?? 50,
      caffeineLimit: profile?.caffeine_limit_mg ?? 400,
      water: profile?.water_goal_ml ?? 2000,
    },
    t,
  });
  const { streak } = moodSummary(allEntries, since30);
  const lowStreak = lowMoodStreak(allEntries, now);
  const weekdays = weekdayAverages(recentMoods, t);
  const periods = comparePeriods(allEntries, today, 30);
  const effects = tagEffects(recentMoods);
  const hasEntries = allEntries.length > 0;

  return (
    <div className="page-shell space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide first-letter:uppercase" style={{ color: "var(--mood-text)" }}>{formatDay(today, language)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{dict.pages.mood.title}</h1>
        </div>
        {streak >= 2 && (
          <span className="rounded-full bg-mood-soft px-3 py-1 text-xs font-semibold" style={{ color: "var(--mood-text)" }} data-mood-streak>
            🔥 {t("mood.v2.streak", { count: streak })}
          </span>
        )}
      </header>

      {lowStreak >= 3 && (
        <Callout variant="warning" title={t("mood.page.lowStreakTitle")} dismissKey={`mood-low:${today}`}>
          {t("mood.page.lowStreakMessage", { days: lowStreak })}
        </Callout>
      )}

      <MoodCheckin key={editDate ?? "today"} today={today} yesterday={yesterday} entries={checkinEntries} editDate={editDate} />

      {hasEntries ? (
        <>
          <MoodStats periods={periods} streak={streak} t={t} />

          <div className="grid gap-4 lg:grid-cols-2">
            <MoodTrend today={today} entries={recentMoods.map((e) => ({ date: e.entry_date, mood: e.mood_score, energy: e.energy_level }))} />
            <MoodFactors effects={effects} t={t} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MoodCalendar
              today={today}
              days={allEntries.filter((e) => e.entry_date >= since365).map((e) => ({ date: e.entry_date, mood: e.mood_score, energy: e.energy_level, notes: e.notes }))}
            />
            <WeekdayBars data={weekdays} t={t} />
          </div>

          <MoodInsights insights={insights} t={t} />

          <MoodJournal today={today} yesterday={yesterday} entries={[...allEntries].reverse().filter((e) => e.entry_date >= since365)} />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center" data-mood-empty>
          <p className="text-3xl" aria-hidden>📔</p>
          <p className="mt-2 font-semibold">{t("mood.v2.emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground-muted">{t("mood.v2.emptyText")}</p>
        </div>
      )}
    </div>
  );
}
