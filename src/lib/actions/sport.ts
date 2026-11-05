"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";
import { checkSportHabits, syncNotice, uncheckSportHabits } from "@/lib/sport-habit-sync";
import { isFiniteInRange, isUuid, isValidIsoDate } from "@/lib/actions/validation";

function revalidateSportViews() {
  revalidatePath("/sport");
  revalidatePath("/sport/musculation");
  revalidatePath("/sport/calisthenics");
  revalidatePath("/sport/running");
  revalidatePath("/sport/calendar");
  revalidatePath("/sport/stats");
}

export async function logWorkout(formData: FormData): Promise<ActionResult> {
  const activity = String(formData.get("activity") ?? "").trim();
  const workout_date = String(formData.get("workout_date") ?? "");
  const duration_minutes = Number(formData.get("duration_minutes") ?? 30);
  const intensity = Number(formData.get("intensity") ?? 3);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!activity || activity.length > 100 || !isValidIsoDate(workout_date) ||
    !isFiniteInRange(duration_minutes, 1, 600, true) || !isFiniteInRange(intensity, 1, 5, true) ||
    (notes !== null && notes.length > 2000)) return fail("Vérifie l’activité, la date et les valeurs de la séance.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error } = await supabase.from("workouts").insert({
    user_id: user.id,
    activity,
    workout_date,
    duration_minutes,
    intensity,
    notes,
  });
  if (error) return dbFail(error);

  const checked = await checkSportHabits(supabase, user.id, workout_date);

  revalidateSportViews();
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return { error: null, notice: syncNotice(checked) };
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Séance invalide.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: classifiedWorkout, error: classifiedError } = await supabase.from("workouts").select("workout_date, discipline")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  let workoutDate = classifiedWorkout?.workout_date;
  if (classifiedError && (classifiedError.code === "42703" || classifiedError.message.toLowerCase().includes("discipline"))) {
    // Keep this existing action compatible while the additive phase 4 migration is still pending.
    const { data: legacyWorkout, error: legacyError } = await supabase.from("workouts").select("workout_date")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (legacyError) return dbFail(legacyError);
    workoutDate = legacyWorkout?.workout_date;
  } else if (classifiedError) {
    return dbFail(classifiedError);
  } else if (classifiedWorkout?.discipline === "calisthenics") {
    return fail("Supprime cette séance depuis le module Calisthenics.");
  } else if (classifiedWorkout?.discipline === "running") {
    return fail("Supprime cette séance depuis le module Running.");
  }

  const { error: error2 } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  if (error2) return dbFail(error2);

  const removed = workoutDate ? await uncheckSportHabits(supabase, user.id, workoutDate) : 0;

  revalidateSportViews();
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return {
    error: null,
    notice: removed > 0 ? "L'habitude Sport cochée automatiquement pour ce jour a été décochée." : undefined,
  };
}

export async function saveSportGoal(sessionsPerWeek: number): Promise<ActionResult> {
  if (!isFiniteInRange(sessionsPerWeek, 1, 14, true)) return fail("L’objectif doit être entre 1 et 14 séances.");
  const sport_weekly_goal = sessionsPerWeek;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error3 } = await supabase.from("profiles").update({ sport_weekly_goal }).eq("id", user.id);
  if (error3) return dbFail(error3);

  revalidateSportViews();

  return ok;
}
