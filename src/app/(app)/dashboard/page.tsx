import { format, subDays, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { weeklyTotals } from "@/lib/weekly";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { fr } from "date-fns/locale";
import Link from "next/link";

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const today = new Date();
  const since30 = format(subDays(today, 30), "yyyy-MM-dd");
  const since10w = format(subWeeks(today, 10), "yyyy-MM-dd");

  const [{ data: habits }, { data: habitLogs }, { data: workouts }, { data: moodEntries }] =
    await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", false),
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", user.id)
        .gte("log_date", since10w),
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("workout_date", since10w)
        .order("workout_date", { ascending: false }),
      supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("entry_date", since30)
        .order("entry_date", { ascending: true }),
    ]);

  // Streaks
  const logsByHabit = new Map<string, Set<string>>();
  for (const log of habitLogs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.log_date);
  }
  const longestStreak = Math.max(
    0,
    ...Array.from(logsByHabit.values()).map((dates) => computeStreak(dates))
  );

  // Sport this week
  const startOfThisWeek = subDays(today, today.getDay() === 0 ? 6 : today.getDay() - 1);
  const workoutsThisWeek = (workouts ?? []).filter(
    (w) => new Date(w.workout_date) >= startOfThisWeek
  );
  const minutesThisWeek = workoutsThisWeek.reduce((sum, w) => sum + w.duration_minutes, 0);

  // Mood average
  const moodAvg =
    moodEntries && moodEntries.length > 0
      ? (moodEntries.reduce((s, e) => s + e.mood_score, 0) / moodEntries.length).toFixed(1)
      : "—";

  // Insight: mood on workout days vs non-workout days (last 30 days)
  const workoutDateSet = new Set((workouts ?? []).map((w) => w.workout_date));
  const moodOnWorkoutDays = (moodEntries ?? []).filter((e) => workoutDateSet.has(e.entry_date));
  const moodOnRestDays = (moodEntries ?? []).filter((e) => !workoutDateSet.has(e.entry_date));

  const avg = (arr: typeof moodOnWorkoutDays) =>
    arr.length ? arr.reduce((s, e) => s + e.mood_score, 0) / arr.length : null;

  const avgWorkoutMood = avg(moodOnWorkoutDays);
  const avgRestMood = avg(moodOnRestDays);

  let insight: string | null = null;
  if (avgWorkoutMood !== null && avgRestMood !== null && moodOnWorkoutDays.length >= 2 && moodOnRestDays.length >= 2) {
    const diff = avgWorkoutMood - avgRestMood;
    if (diff > 0.3) {
      insight = `Ton humeur est en moyenne ${diff.toFixed(1)} point${diff >= 1.5 ? "s" : ""} plus haute les jours où tu fais du sport (${avgWorkoutMood.toFixed(1)}/5 vs ${avgRestMood.toFixed(1)}/5). Continue comme ça ! 💪`;
    } else if (diff < -0.3) {
      insight = `Ton humeur est légèrement plus basse les jours de sport (${avgWorkoutMood.toFixed(1)}/5 vs ${avgRestMood.toFixed(1)}/5) — peut-être des séances trop intenses ?`;
    } else {
      insight = `Pas de lien net entre sport et humeur pour l'instant (${avgWorkoutMood.toFixed(1)}/5 vs ${avgRestMood.toFixed(1)}/5). Continue à logger pour affiner l'analyse.`;
    }
  }

  const sportChart = weeklyTotals(
    (workouts ?? []).map((w) => ({ date: w.workout_date, value: w.duration_minutes })),
    10
  );

  const moodChart = (moodEntries ?? []).map((e) => ({
    label: format(new Date(e.entry_date), "d MMM", { locale: fr }),
    mood: e.mood_score,
    energy: e.energy_level,
  }));

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salut {displayName} 👋</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {format(today, "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Plus longue série active" value={`${longestStreak} j`} accent="var(--habit)" />
        <StatCard label="Sport cette semaine" value={`${minutesThisWeek} min`} accent="var(--sport)" />
        <StatCard label="Humeur moyenne (30j)" value={`${moodAvg} / 5`} accent="var(--mood)" />
      </div>

      {insight && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 text-sm text-foreground">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">Insight</p>
          {insight}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground-muted">Sport · minutes / semaine</h2>
            <Link href="/sport" className="text-xs text-accent hover:underline">
              Voir tout
            </Link>
          </div>
          <WeeklyBarChart data={sportChart} color="var(--sport)" unit="min" />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground-muted">Humeur · 30 derniers jours</h2>
            <Link href="/humeur" className="text-xs text-accent hover:underline">
              Voir tout
            </Link>
          </div>
          {moodChart.length > 0 ? (
            <MoodLineChart data={moodChart} />
          ) : (
            <p className="py-16 text-center text-sm text-foreground-muted">Aucune donnée pour l&apos;instant.</p>
          )}
        </div>
      </div>

      {(!habits || habits.length === 0) && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
          Tu n&apos;as pas encore d&apos;habitude.{" "}
          <Link href="/habits" className="font-medium text-accent hover:underline">
            Crée ta première habitude
          </Link>
          .
        </div>
      )}
    </div>
  );
}
