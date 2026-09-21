import { format, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { WorkoutList } from "@/components/workout-list";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { InViewFade } from "@/components/ui/in-view-fade";
import { WorkoutForm } from "@/components/sport/workout-form";
import { WeeklyGoal } from "@/components/sport/weekly-goal";
import { ActivityBreakdown, SportHeatmap, SportRecords, SportTiles } from "@/components/sport/sport-overview";
import { computeSportStats } from "@/lib/sport-stats";
import { weeklyTotals } from "@/lib/weekly";

export default async function SportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: workouts }, { data: profile }] = await Promise.all([
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("sport_weekly_goal").eq("id", user.id).single(),
  ]);

  const all = workouts ?? [];
  const weeklyGoal = profile?.sport_weekly_goal ?? 3;
  const stats = computeSportStats(all, weeklyGoal);

  const since = format(subWeeks(new Date(), 10), "yyyy-MM-dd");
  const chartData = weeklyTotals(
    all.filter((w) => w.workout_date >= since).map((w) => ({ date: w.workout_date, value: w.duration_minutes })),
    10
  );

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-sport text-xl">
          🏃
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sport</h1>
          <p className="mt-0.5 text-sm text-foreground-muted">Chaque séance compte.</p>
        </div>
      </div>

      <SportTiles stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyGoal sessions={stats.thisWeek.sessions} goal={weeklyGoal} goalWeeks={stats.records.goalWeeks} />
        <SportRecords stats={stats} />
      </div>

      <WorkoutForm today={today} favorites={stats.activities.slice(0, 6)} />

      <div className="grid gap-4 lg:grid-cols-2">
        <InViewFade className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Minutes par semaine</h2>
          <WeeklyBarChart data={chartData} color="var(--sport)" unit="min" />
        </InViewFade>
        <ActivityBreakdown stats={stats} />
      </div>

      <SportHeatmap heat={stats.heat} />

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Historique</h2>
        <WorkoutList workouts={all.slice(0, 40)} />
      </div>
    </div>
  );
}
