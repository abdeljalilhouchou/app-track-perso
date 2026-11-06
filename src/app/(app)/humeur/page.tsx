import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { MoodForm } from "@/components/mood/mood-form";
import { Callout } from "@/components/ui/callout";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { MoodEntryList } from "@/components/mood-entry-list";
import { MoodCalendar } from "@/components/mood/mood-calendar";
import { MoodInsights, MoodTiles, WeekdayBars } from "@/components/mood/mood-overview";
import { buildMoodInsights, lowMoodStreak, moodSummary, weekdayAverages } from "@/lib/mood-insights";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";
import { fetchAllRows } from "@/lib/paging";

export default async function HumeurPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const since30 = format(subDays(now, 30), "yyyy-MM-dd");
  const since120 = format(subDays(now, 120), "yyyy-MM-dd");
  const since365 = format(subDays(now, 365), "yyyy-MM-dd");

  const [dict, t, allEntries, workouts, meals, waterLogs, profileResult] =
    await Promise.all([
      getDictionary(),
      getT(),
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

  const entries = allEntries.filter((e) => e.entry_date >= since30);
  const todayEntry = entries.find((e) => e.entry_date === today);

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
  const summary = moodSummary(allEntries, since30);
  const lowStreak = lowMoodStreak(allEntries, now);
  const weekdays = weekdayAverages(recentMoods, t);

  const chartData = (entries ?? []).map((e) => ({
    label: format(new Date(e.entry_date), "d MMM", { locale: fr }),
    mood: e.mood_score,
    energy: e.energy_level,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dict.pages.mood.title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{dict.pages.mood.subtitle}</p>
      </div>

      {lowStreak >= 3 && (
        <Callout variant="warning" title={t("mood.page.lowStreakTitle")} dismissKey={`mood-low:${today}`}>
          {t("mood.page.lowStreakMessage", { days: lowStreak })}
        </Callout>
      )}
      {!todayEntry && (
        <Callout variant="tip" dismissKey={`mood-today:${today}`} compact>
          {t("mood.page.todayTip")}
        </Callout>
      )}

      <MoodTiles summary={summary} t={t} />

      <MoodForm today={today} existing={todayEntry ?? null} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MoodCalendar
          today={today}
          days={allEntries.filter((e) => e.entry_date >= since365).map((e) => ({ date: e.entry_date, mood: e.mood_score, energy: e.energy_level, notes: e.notes }))}
        />
        <WeekdayBars data={weekdays} t={t} />
      </div>

      <MoodInsights insights={insights} t={t} />

      <div className="rounded-2xl border-[1.5px] border-mood/50 bg-surface p-5">
        <h2 className="text-sm font-medium text-foreground-muted">{t("mood.page.last30Days")}</h2>
        {chartData.length > 0 ? (
          <MoodLineChart data={chartData} />
        ) : (
          <p className="py-10 text-center text-sm text-foreground-muted">{t("mood.page.noChartData")}</p>
        )}
      </div>

      {entries && entries.length > 0 && (
        <MoodEntryList entries={[...entries].reverse().slice(0, 10)} />
      )}
    </div>
  );
}
