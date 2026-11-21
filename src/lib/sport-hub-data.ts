import { format, parseISO, startOfWeek, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfilePreferences } from "@/lib/supabase/read-context";
import { fetchAllRows } from "@/lib/paging";
import { isLanguage, type Language } from "@/lib/language";
import { computeSportStats } from "@/lib/sport-stats";
import { formatLocalizedDate } from "@/lib/format-date";
import type { Workout } from "@/types/database";
import { summarizeHubTraining, type HubTemplate } from "@/lib/sport-hub";
import { buildSportOverview, type OverviewCaliSet, type OverviewRun, type OverviewSet, type OverviewTemplateExercise } from "@/lib/sport-overview";
import { isRunningSchemaReady } from "@/lib/running/config";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";

export async function loadSportHubData({ identifyStrength = false, dashboard = false }: { identifyStrength?: boolean; dashboard?: boolean } = {}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const setRowsPromise = identifyStrength || dashboard
    ? fetchAllRows((from, to) =>
        supabase
          .from("workout_sets")
          .select("id, workout_id, reps, weight_kg, exercise_name, muscle_group")
          .eq("user_id", user.id)
          .order("id", { ascending: true })
          .range(from, to)
      )
    : Promise.resolve([] as (OverviewSet & { id: string })[]);

  const templatesPromise = dashboard
    ? fetchAllRows((from, to) => supabase.from("workout_templates")
        .select("id, name, muscle_groups").eq("user_id", user.id)
        .order("position").order("created_at").order("id").range(from, to))
    : Promise.resolve([] as HubTemplate[]);

  // Hub-only reads: the suggested session's exercises, runs and calisthenics sets (when those modules exist).
  const templateExercisesPromise = dashboard
    ? fetchAllRows((from, to) => supabase.from("workout_template_exercises")
        .select("template_id, exercise_name, target_sets, target_reps, position").eq("user_id", user.id)
        .order("position").order("id").range(from, to))
    : Promise.resolve([] as OverviewTemplateExercise[]);
  const runsPromise = dashboard && isRunningSchemaReady()
    ? fetchAllRows((from, to) => supabase.from("running_sessions")
        .select("workout_id, distance_km, duration_seconds").eq("user_id", user.id).order("workout_id").range(from, to))
    : Promise.resolve([] as OverviewRun[]);
  const caliSetsPromise = dashboard && isCalisthenicsSchemaReady()
    ? fetchAllRows((from, to) => supabase.from("calisthenics_sets")
        .select("workout_id, exercise_id, exercise_name, reps, hold_seconds").eq("user_id", user.id).order("id").range(from, to))
    : Promise.resolve([] as OverviewCaliSet[]);

  const [workouts, setRows, profileResult, templates, templateExercises, runs, caliSets] = await Promise.all([
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
    getProfilePreferences(),
    templatesPromise,
    templateExercisesPromise,
    runsPromise,
    caliSetsPromise,
  ]);

  if (profileResult.error) throw new Error("Impossible de charger l’objectif sportif.");

  const weeklyGoal = profileResult.data?.sport_weekly_goal ?? 3;
  const language: Language = isLanguage(profileResult.data?.language) ? profileResult.data.language : "fr";
  const workoutSetIds = new Set(setRows.map((row) => row.workout_id));

  const training = dashboard ? summarizeHubTraining(workouts as Workout[], setRows, templates) : null;
  return {
    workouts: workouts as Workout[],
    workoutSetIds,
    weeklyGoal,
    language,
    stats: computeSportStats(workouts, weeklyGoal),
    training,
    overview: training ? buildSportOverview({
      workouts: workouts as Workout[],
      sets: setRows as OverviewSet[],
      setWorkoutIds: workoutSetIds,
      nextTemplate: training.nextTemplate,
      templateExercises: templateExercises as OverviewTemplateExercise[],
      runs: runs as OverviewRun[],
      caliSets: caliSets as OverviewCaliSet[],
      weeklyGoal,
    }) : null,
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
