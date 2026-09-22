import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { MoodForm } from "@/components/mood/mood-form";
import { Callout } from "@/components/ui/callout";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { MoodEntryList } from "@/components/mood-entry-list";
import { MoodCalendar } from "@/components/mood/mood-calendar";
import { MoodInsights, MoodTiles, WeekdayBars } from "@/components/mood/mood-overview";
import { buildMoodInsights, moodSummary, weekdayAverages } from "@/lib/mood-insights";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function HumeurPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const dict = await getDictionary();

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const since30 = format(subDays(now, 30), "yyyy-MM-dd");
  const since120 = format(subDays(now, 120), "yyyy-MM-dd");
  const since365 = format(subDays(now, 365), "yyyy-MM-dd");

  const [{ data: allEntries }, { data: workouts }, { data: meals }, { data: waterLogs }, { data: profile }] =
    await Promise.all([
      supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", since365)
        .order("entry_date", { ascending: true }),
      supabase.from("workouts").select("workout_date").eq("user_id", user.id).gte("workout_date", since120),
      supabase
        .from("meal_entries")
        .select("entry_date, protein, sugar, caffeine, unit, quantity_grams")
        .eq("user_id", user.id)
        .gte("entry_date", since120),
      supabase.from("water_logs").select("entry_date, ml").eq("user_id", user.id).gte("entry_date", since120),
      supabase
        .from("profiles")
        .select("goal_protein, sugar_limit_g, caffeine_limit_mg, water_goal_ml")
        .eq("id", user.id)
        .single(),
    ]);

  const entries = (allEntries ?? []).filter((e) => e.entry_date >= since30);
  const todayEntry = entries.find((e) => e.entry_date === today);

  const facts = new Map<string, { protein: number; sugar: number; caffeine: number; drinksMl: number; hasMeals: boolean }>();
  for (const m of meals ?? []) {
    const f = facts.get(m.entry_date) ?? { protein: 0, sugar: 0, caffeine: 0, drinksMl: 0, hasMeals: true };
    f.protein += m.protein;
    f.sugar += m.sugar;
    f.caffeine += m.caffeine;
    if (m.unit === "ml") f.drinksMl += m.quantity_grams;
    facts.set(m.entry_date, f);
  }

  const recentMoods = (allEntries ?? []).filter((e) => e.entry_date >= since120);
  const insights = buildMoodInsights({
    moods: recentMoods,
    workoutDates: new Set((workouts ?? []).map((w) => w.workout_date)),
    facts,
    waterByDate: new Map((waterLogs ?? []).map((w) => [w.entry_date, w.ml])),
    goals: {
      protein: profile?.goal_protein ?? null,
      sugarLimit: profile?.sugar_limit_g ?? 50,
      caffeineLimit: profile?.caffeine_limit_mg ?? 400,
      water: profile?.water_goal_ml ?? 2000,
    },
  });
  const summary = moodSummary(allEntries ?? []);
  const lastThree = (allEntries ?? []).slice(-3);
  const lowStreak = lastThree.length === 3 && lastThree.every((e) => e.mood_score <= 2) ? lastThree : null;
  const weekdays = weekdayAverages(recentMoods);

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

      {lowStreak && (
        <Callout variant="warning" title="Prends soin de toi" dismissKey={`mood-low:${today}`}>
          Ton humeur est basse depuis {lowStreak.length} jours de suite. Ce n&apos;est pas un échec : dors bien, bouge un peu,
          parle à quelqu&apos;un. Si ça dure, n&apos;hésite pas à demander de l&apos;aide.
        </Callout>
      )}
      {!todayEntry && (
        <Callout variant="tip" dismissKey={`mood-today:${today}`} compact>
          Note ton humeur du jour : c&apos;est ce qui permet à l&apos;app de trouver ce qui l&apos;influence.
        </Callout>
      )}

      <MoodTiles summary={summary} />

      <MoodForm today={today} existing={todayEntry ?? null} />

      <div className="grid gap-4 lg:grid-cols-2">
        <MoodCalendar
          today={today}
          days={(allEntries ?? []).map((e) => ({ date: e.entry_date, mood: e.mood_score, energy: e.energy_level, notes: e.notes }))}
        />
        <WeekdayBars data={weekdays} />
      </div>

      <MoodInsights insights={insights} />

      <div className="rounded-2xl border-[1.5px] border-mood/50 bg-surface p-5">
        <h2 className="text-sm font-medium text-foreground-muted">30 derniers jours</h2>
        {chartData.length > 0 ? (
          <MoodLineChart data={chartData} />
        ) : (
          <p className="py-10 text-center text-sm text-foreground-muted">
            Pas encore assez de données pour afficher un graphique.
          </p>
        )}
      </div>

      {entries && entries.length > 0 && (
        <MoodEntryList entries={[...entries].reverse().slice(0, 10)} />
      )}
    </div>
  );
}
