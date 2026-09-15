import { format, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createHabit } from "@/lib/actions/habits";
import { HabitCard } from "@/components/habit-card";
import { computeStreak } from "@/lib/streak";

const EMOJI_CHOICES = ["✨", "📚", "💧", "🧘", "🥗", "🛏️", "🚭", "✍️"];

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const since = format(subWeeks(new Date(), 18), "yyyy-MM-dd");

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("habit_id, log_date")
      .eq("user_id", user.id)
      .gte("log_date", since),
  ]);

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.log_date);
  }

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Habitudes</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Construis ta constance, un jour à la fois.
        </p>
      </div>

      <form
        action={createHabit}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
      >
        <select
          name="icon"
          defaultValue="✨"
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-lg"
        >
          {EMOJI_CHOICES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <input
          name="name"
          required
          placeholder="Nouvelle habitude (ex: Lire 10 minutes)"
          className="flex-1 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Ajouter
        </button>
      </form>

      {!habits || habits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground-muted">
          Aucune habitude pour le moment. Ajoute la première ci-dessus.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {habits.map((habit) => {
            const habitLogs = logsByHabit.get(habit.id) ?? new Set<string>();
            const values: Record<string, number> = {};
            habitLogs.forEach((d) => (values[d] = 1));

            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                values={values}
                doneToday={habitLogs.has(today)}
                streak={computeStreak(habitLogs)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
