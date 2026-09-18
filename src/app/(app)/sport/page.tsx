import { format, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { logWorkout } from "@/lib/actions/sport";
import { WorkoutList } from "@/components/workout-list";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { InViewFade } from "@/components/ui/in-view-fade";
import { weeklyTotals } from "@/lib/weekly";

export default async function SportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const since = format(subWeeks(new Date(), 10), "yyyy-MM-dd");

  const { data: workouts } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user.id)
    .gte("workout_date", since)
    .order("workout_date", { ascending: false });

  const chartData = weeklyTotals(
    (workouts ?? []).map((w) => ({ date: w.workout_date, value: w.duration_minutes })),
    10
  );

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sport</h1>
        <p className="mt-1 text-sm text-foreground-muted">Chaque séance compte.</p>
      </div>

      <InViewFade className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium text-foreground-muted">Minutes par semaine</h2>
        <WeeklyBarChart data={chartData} color="var(--sport)" unit="min" />
      </InViewFade>

      <form
        action={logWorkout}
        className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
      >
        <input
          name="activity"
          required
          placeholder="Activité (ex: Course à pied)"
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent sm:col-span-2"
        />
        <input
          name="workout_date"
          type="date"
          required
          defaultValue={today}
          max={today}
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          name="duration_minutes"
          type="number"
          min={1}
          defaultValue={30}
          required
          placeholder="Durée (min)"
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          Intensité
          <select
            name="intensity"
            defaultValue={3}
            className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
        <input
          name="notes"
          placeholder="Notes (optionnel)"
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-sport px-4 py-2 text-sm font-medium text-on-accent transition hover:opacity-90 sm:col-span-2"
        >
          Enregistrer la séance
        </button>
      </form>

      <WorkoutList workouts={workouts ?? []} />
    </div>
  );
}
