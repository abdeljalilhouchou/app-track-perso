import { format, parseISO, startOfWeek, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paging";
import { isLanguage, type Language } from "@/lib/language";
import { computeSportStats } from "@/lib/sport-stats";
import { formatLocalizedDate } from "@/lib/format-date";
import type { Workout } from "@/types/database";

export async function loadSportHubData({ identifyStrength = false }: { identifyStrength?: boolean } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const setRowsPromise = identifyStrength
    ? fetchAllRows((from, to) =>
        supabase
          .from("workout_sets")
          .select("id, workout_id")
          .eq("user_id", user.id)
          .order("id", { ascending: true })
          .range(from, to)
      )
    : Promise.resolve([] as { id: string; workout_id: string }[]);

  const [workouts, setRows, profileResult] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .order("workout_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ),
    setRowsPromise,
    supabase.from("profiles").select("sport_weekly_goal, language").eq("id", user.id).maybeSingle(),
  ]);

  if (profileResult.error) throw new Error("Impossible de charger l’objectif sportif.");

  const weeklyGoal = profileResult.data?.sport_weekly_goal ?? 3;
  const language: Language = isLanguage(profileResult.data?.language) ? profileResult.data.language : "fr";
  const workoutSetIds = new Set(setRows.map((row) => row.workout_id));

  return {
    workouts: workouts as Workout[],
    workoutSetIds,
    weeklyGoal,
    language,
    stats: computeSportStats(workouts, weeklyGoal),
  };
}

export function formatSportDate(date: string, language: Language, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return formatLocalizedDate(date, language, options);
}

export function sportWeeklyDuration(workouts: Workout[], language: Language, weeks = 8) {
  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const totals = new Map<string, number>();

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const weekStart = subWeeks(currentWeek, offset);
    totals.set(format(weekStart, "yyyy-MM-dd"), 0);
  }

  for (const workout of workouts) {
    const weekStart = format(startOfWeek(parseISO(workout.workout_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (totals.has(weekStart)) totals.set(weekStart, (totals.get(weekStart) ?? 0) + workout.duration_minutes);
  }

  return Array.from(totals, ([weekStart, value]) => ({
    label: formatSportDate(weekStart, language, { day: "numeric", month: "short" }),
    value,
  }));
}
