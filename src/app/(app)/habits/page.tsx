import { format, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createHabit } from "@/lib/actions/habits";
import { HabitCard } from "@/components/habit-card";
import { computeStreak, countThisWeek } from "@/lib/streak";
import { CATEGORY_PRESETS, EMOJI_CHOICES } from "@/lib/habit-categories";

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
      .order("position", { ascending: true }),
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
  const orderedHabits = habits ?? [];

  const groups = new Map<string, typeof orderedHabits>();
  for (const habit of orderedHabits) {
    if (!groups.has(habit.category)) groups.set(habit.category, []);
    groups.get(habit.category)!.push(habit);
  }

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
        className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
      >
        <div className="flex gap-2 sm:col-span-2">
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
        </div>
        <select
          name="category"
          defaultValue="Général"
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {CATEGORY_PRESETS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="target_per_week"
          defaultValue={7}
          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n}x / semaine
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 sm:col-span-2"
        >
          Ajouter
        </button>
      </form>

      {orderedHabits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground-muted">
          Aucune habitude pour le moment. Ajoute la première ci-dessus.
        </p>
      ) : (
        Array.from(groups.entries()).map(([category, categoryHabits]) => (
          <div key={category}>
            <h2 className="mb-3 text-sm font-medium text-foreground-muted">{category}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {categoryHabits.map((habit) => {
                const habitLogs = logsByHabit.get(habit.id) ?? new Set<string>();
                const values: Record<string, number> = {};
                habitLogs.forEach((d) => (values[d] = 1));
                const globalIndex = orderedHabits.findIndex((h) => h.id === habit.id);

                return (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    values={values}
                    doneToday={habitLogs.has(today)}
                    streak={computeStreak(habitLogs)}
                    thisWeekCount={countThisWeek(habitLogs)}
                    isFirst={globalIndex === 0}
                    isLast={globalIndex === orderedHabits.length - 1}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
