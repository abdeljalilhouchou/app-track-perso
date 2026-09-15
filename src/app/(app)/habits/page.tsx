import { format, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, countThisWeek } from "@/lib/streak";
import { HabitCreateModal } from "@/components/habit-create-modal";
import { HabitsBoard, type HabitCardData } from "@/components/habits-board";
import { SuggestedHabits } from "@/components/suggested-habits";
import { PausedHabits } from "@/components/paused-habits";
import { MomentsJournal } from "@/components/moments-journal";

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const since = format(subWeeks(new Date(), 18), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: habits }, { data: pausedHabits }, { data: logs }, { data: todayLogs }, { data: moments }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("position", { ascending: true }),
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", user.id)
        .gte("log_date", since),
      supabase.from("habit_logs").select("habit_id, note").eq("user_id", user.id).eq("log_date", today),
      supabase
        .from("moments")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .order("occurred_at", { ascending: false }),
    ]);

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.log_date);
  }

  const todayNoteByHabit = new Map<string, string | null>();
  for (const log of todayLogs ?? []) {
    todayNoteByHabit.set(log.habit_id, log.note);
  }

  const orderedHabits = habits ?? [];

  const groupsMap = new Map<string, HabitCardData[]>();
  orderedHabits.forEach((habit, globalIndex) => {
    const habitLogs = logsByHabit.get(habit.id) ?? new Set<string>();
    const values: Record<string, number> = {};
    habitLogs.forEach((d) => (values[d] = 1));

    const data: HabitCardData = {
      habit,
      values,
      doneToday: habitLogs.has(today),
      streak: computeStreak(habitLogs),
      thisWeekCount: countThisWeek(habitLogs),
      todayNote: todayNoteByHabit.get(habit.id) ?? null,
      isFirst: globalIndex === 0,
      isLast: globalIndex === orderedHabits.length - 1,
    };

    if (!groupsMap.has(habit.category)) groupsMap.set(habit.category, []);
    groupsMap.get(habit.category)!.push(data);
  });

  const groups = Array.from(groupsMap.entries()).map(([category, habits]) => ({ category, habits }));
  const allNames = [...orderedHabits, ...(pausedHabits ?? [])].map((h) => h.name);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habitudes</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Construis ta constance, un jour à la fois.
          </p>
        </div>
        <HabitCreateModal />
      </div>

      <MomentsJournal moments={moments ?? []} />

      <div className="rounded-2xl border border-border bg-surface p-5">
        <SuggestedHabits existingNames={allNames} />
      </div>

      {orderedHabits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <span className="text-4xl">🌱</span>
          <p className="mt-3 text-sm text-foreground-muted">
            Aucune habitude pour le moment. Ajoute la première ci-dessus.
          </p>
        </div>
      ) : (
        <HabitsBoard groups={groups} />
      )}

      <PausedHabits habits={pausedHabits ?? []} />
    </div>
  );
}
