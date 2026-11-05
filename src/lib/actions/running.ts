"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isFiniteInRange, isUuid } from "@/lib/actions/validation";
import { checkSportHabits, uncheckSportHabits } from "@/lib/sport-habit-sync";
import { isRunningSchemaReady } from "@/lib/running/config";
import { validateRunningSessionInput, type RunningSessionInput } from "@/lib/running/validation";

export type SaveRunningInput = RunningSessionInput;

export type RunningGoalsInput = {
  weeklyDistanceKm: unknown;
  weeklyRuns: unknown;
  monthlyDistanceKm: unknown;
  target5kSeconds: unknown;
  target10kSeconds: unknown;
};

function revalidateRunningViews() {
  for (const path of ["/sport", "/sport/running", "/sport/musculation", "/sport/calisthenics", "/sport/calendar", "/sport/stats", "/habits", "/dashboard"]) revalidatePath(path);
}

function runningDbFail(error: { message: string; code?: string }): ActionResult {
  if (error.code === "42P01" || error.code === "42703" || error.code === "PGRST202" || error.message.toLowerCase().includes("schema cache")) return fail("schema");
  if (error.code === "22023") return fail("validation");
  if (error.code === "42501" || error.message.toLowerCase().includes("row-level security")) return fail("ownership");
  if (error.code === "P0002") return fail("ownership");
  return fail("generic");
}

export async function saveRunningSession(input: SaveRunningInput): Promise<ActionResult & { workoutId?: string }> {
  if (!isRunningSchemaReady()) return fail("schema");
  const value = validateRunningSessionInput(input);
  if (!value) return fail("validation");
  const { workoutId, date, name, runType, distanceKm: distance, durationSeconds: duration, intensity, notes, elevationGainM, averageHeartRate, cadenceSpm } = value;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");

  let previousDate: string | null = null;
  if (workoutId) {
    const { data, error } = await supabase.from("workouts").select("workout_date, discipline")
      .eq("id", workoutId).eq("user_id", user.id).maybeSingle();
    if (error) return runningDbFail(error);
    if (!data || data.discipline !== "running") return fail("ownership");
    previousDate = data.workout_date;
  }

  const { data: savedId, error } = await supabase.rpc("save_running_session", {
    p_workout_id: workoutId,
    p_workout_date: date,
    p_name: name,
    p_run_type: runType,
    p_distance_km: distance,
    p_duration_seconds: duration,
    p_intensity: intensity,
    p_notes: notes,
    p_elevation_gain_m: elevationGainM,
    p_average_heart_rate: averageHeartRate,
    p_cadence_spm: cadenceSpm,
  });
  if (error) return runningDbFail(error);

  if (previousDate && previousDate !== date) await uncheckSportHabits(supabase, user.id, previousDate);
  await checkSportHabits(supabase, user.id, date);
  revalidateRunningViews();
  return { error: null, workoutId: savedId };
}

export async function deleteRunningSession(workoutId: string): Promise<ActionResult> {
  if (!isRunningSchemaReady()) return fail("schema");
  if (!isUuid(workoutId)) return fail("validation");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  const { data: removedDate, error } = await supabase.rpc("delete_running_session", { p_workout_id: workoutId });
  if (error) return runningDbFail(error);
  if (removedDate) await uncheckSportHabits(supabase, user.id, removedDate);
  revalidateRunningViews();
  return ok;
}

export async function saveRunningGoals(input: RunningGoalsInput): Promise<ActionResult> {
  if (!isRunningSchemaReady()) return fail("schema");
  const fields = [input.weeklyDistanceKm, input.weeklyRuns, input.monthlyDistanceKm, input.target5kSeconds, input.target10kSeconds];
  const [weeklyDistance, weeklyRuns, monthlyDistance, target5k, target10k] = fields.map((value) => value === "" || value === null || value === undefined ? null : value);
  const validDistanceGoal = (value: unknown, max: number) => value === null || (isFiniteInRange(value, 0.01, max) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7);
  if (!validDistanceGoal(weeklyDistance, 1000) ||
    !(weeklyRuns === null || isFiniteInRange(weeklyRuns, 1, 14, true)) ||
    !validDistanceGoal(monthlyDistance, 5000) ||
    !(target5k === null || isFiniteInRange(target5k, 1, 86400, true)) ||
    !(target10k === null || isFiniteInRange(target10k, 1, 86400, true))) {
    return fail("goals");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  const goals = {
    user_id: user.id,
    weekly_distance_km: weeklyDistance as number | null,
    weekly_runs: weeklyRuns,
    monthly_distance_km: monthlyDistance as number | null,
    target_5k_seconds: target5k,
    target_10k_seconds: target10k,
    updated_at: new Date().toISOString(),
  };
  const hasGoal = [weeklyDistance, weeklyRuns, monthlyDistance, target5k, target10k].some((value) => value !== null);
  const { error } = hasGoal
    ? await supabase.from("running_goals").upsert(goals, { onConflict: "user_id" })
    : await supabase.from("running_goals").delete().eq("user_id", user.id);
  if (error) return runningDbFail(error);
  revalidateRunningViews();
  return ok;
}
