import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { logMood } from "@/lib/actions/mood";
import { MoodPicker } from "@/components/mood-picker";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { MoodEntryList } from "@/components/mood-entry-list";
import { MoodCalendar } from "@/components/mood/mood-calendar";
import { MoodInsights, MoodTiles, WeekdayBars } from "@/components/mood/mood-overview";
import { buildMoodInsights, moodSummary, weekdayAverages } from "@/lib/mood-insights";

export default async function HumeurPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
  const weekdays = weekdayAverages(recentMoods);

  const chartData = (entries ?? []).map((e) => ({
    label: format(new Date(e.entry_date), "d MMM", { locale: fr }),
    mood: e.mood_score,
    energy: e.energy_level,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Humeur</h1>
        <p className="mt-1 text-sm text-foreground-muted">Comment te sens-tu aujourd&apos;hui ?</p>
      </div>

      <MoodTiles summary={summary} />

      <form action={logMood} className="space-y-4 rounded-2xl border-[1.5px] border-mood/50 bg-surface p-5">
        <input type="hidden" name="entry_date" value={today} />

        <div>
          <p className="mb-2 text-sm font-medium">Humeur</p>
          <MoodPicker defaultValue={todayEntry?.mood_score ?? 3} />
        </div>

        <div>
          <label htmlFor="energy_level" className="mb-2 block text-sm font-medium">
            Niveau d&apos;énergie
          </label>
          <input
            id="energy_level"
            name="energy_level"
            type="range"
            min={1}
            max={5}
            defaultValue={todayEntry?.energy_level ?? 3}
            className="w-full accent-mood"
          />
        </div>

        <input
          name="notes"
          defaultValue={todayEntry?.notes ?? ""}
          placeholder="Notes (optionnel)"
          className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium text-on-accent transition hover:opacity-90"
          style={{ background: "var(--mood)" }}
        >
          {todayEntry ? "Mettre à jour" : "Enregistrer"}
        </button>
      </form>

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
