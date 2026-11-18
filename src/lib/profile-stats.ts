import type { createClient } from "@/lib/supabase/server";
import { computeStreak, longestStreakEver } from "@/lib/streak";
import { fetchAllRows } from "@/lib/paging";
import { BADGES, computeLevel, computePoints, type Stats } from "@/lib/gamification";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";
import { isRunningSchemaReady } from "@/lib/running/config";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const noCount = Promise.resolve({ count: 0, error: null });

export async function computeProfileStats(supabase: Supabase, userId: string): Promise<Stats> {
  const calisthenics = isCalisthenicsSchemaReady();
  const running = isRunningSchemaReady();
  const [
    habitCounts,
    workoutCounts,
    moodCounts,
    activeHabitCounts,
    allLogs,
    mealCounts,
    mealRows,
    profileGoals,
    moodRows,
    weightCounts,
    runRows,
    calisthenicsCounts,
    skillCounts,
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
    fetchAllRows((from, to) =>
      supabase.from("mood_entries").select("entry_date").eq("user_id", userId).order("id").range(from, to)
    ),
    supabase.from("weight_logs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    running
      ? fetchAllRows((from, to) =>
          supabase.from("running_sessions").select("distance_km").eq("user_id", userId).order("workout_id").range(from, to)
        )
      : Promise.resolve([] as { distance_km: number }[]),
    calisthenics
      ? supabase.from("workouts").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("discipline", "calisthenics")
      : noCount,
    calisthenics
      ? supabase.from("calisthenics_skills").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("current_step", 2)
      : noCount,
  ]);

  const failed = [habitCounts, workoutCounts, moodCounts, activeHabitCounts, mealCounts, profileGoals, weightCounts, calisthenicsCounts, skillCounts].find((r) => r.error);
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
  const distances = runRows.map((run) => Number(run.distance_km) || 0);

  return {
    habitLogsCount: habitCounts.count ?? 0,
    workoutsCount: workoutCounts.count ?? 0,
    moodEntriesCount: moodCounts.count ?? 0,
    activeHabitsCount: activeHabitCounts.count ?? 0,
    bestStreak,
    mealEntriesCount: mealCounts.count ?? 0,
    nutritionLoggingStreak,
    proteinGoalHitDays,
    moodBestStreak: longestStreakEver(new Set(moodRows.map((row) => row.entry_date))),
    weightLogsCount: weightCounts.count ?? 0,
    runsCount: distances.length,
    runningKm: Math.round(distances.reduce((sum, km) => sum + km, 0) * 10) / 10,
    longestRunKm: Math.max(0, ...distances),
    calisthenicsCount: calisthenicsCounts.count ?? 0,
    skillsSteppedUp: skillCounts.count ?? 0,
  };
}

export function summarizeProgress(stats: Stats) {
  const points = computePoints(stats);
  const level = computeLevel(points);
  const unlocked = BADGES.filter((b) => b.unlocked(stats));
  const locked = BADGES.filter((b) => !b.unlocked(stats));
  return { points, ...level, unlocked, locked };
}
