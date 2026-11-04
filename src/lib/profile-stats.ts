import type { createClient } from "@/lib/supabase/server";
import { computeStreak, longestStreakEver } from "@/lib/streak";
import { fetchAllRows } from "@/lib/paging";
import { BADGES, computeLevel, computePoints, type Stats } from "@/lib/gamification";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function computeProfileStats(supabase: Supabase, userId: string): Promise<Stats> {
  const [
    habitCounts,
    workoutCounts,
    moodCounts,
    activeHabitCounts,
    allLogs,
    mealCounts,
    mealRows,
    profileGoals,
  ] = await Promise.all([
    supabase.from("habit_logs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("workouts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("mood_entries").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("habits").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("archived", false),
    fetchAllRows((from, to) =>
      supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", userId).order("id").range(from, to)
    ),
    supabase.from("meal_entries").select("*", { count: "exact", head: true }).eq("user_id", userId),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_entries")
        .select("entry_date, protein")
        .eq("user_id", userId)
        .order("id")
        .range(from, to)
    ),
    supabase.from("profiles").select("goal_protein").eq("id", userId).single(),
  ]);

  const failed = [habitCounts, workoutCounts, moodCounts, activeHabitCounts, mealCounts, profileGoals].find((r) => r.error);
  if (failed?.error) throw new Error("Impossible de charger les statistiques du profil.");

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of allLogs) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.log_date);
  }
  const bestStreak = Math.max(0, ...Array.from(logsByHabit.values()).map((dates) => longestStreakEver(dates)));

  const proteinByDate = new Map<string, number>();
  for (const m of mealRows) {
    proteinByDate.set(m.entry_date, (proteinByDate.get(m.entry_date) ?? 0) + m.protein);
  }
  const nutritionLoggingStreak = computeStreak(new Set(proteinByDate.keys()));
  const goalProtein = profileGoals.data?.goal_protein ?? null;
  const proteinGoalHitDays = goalProtein
    ? Array.from(proteinByDate.values()).filter((p) => p >= goalProtein).length
    : 0;

  return {
    habitLogsCount: habitCounts.count ?? 0,
    workoutsCount: workoutCounts.count ?? 0,
    moodEntriesCount: moodCounts.count ?? 0,
    activeHabitsCount: activeHabitCounts.count ?? 0,
    bestStreak,
    mealEntriesCount: mealCounts.count ?? 0,
    nutritionLoggingStreak,
    proteinGoalHitDays,
  };
}

export function summarizeProgress(stats: Stats) {
  const points = computePoints(stats);
  const level = computeLevel(points);
  const unlocked = BADGES.filter((b) => b.unlocked(stats));
  const locked = BADGES.filter((b) => !b.unlocked(stats));
  return { points, ...level, unlocked, locked };
}
