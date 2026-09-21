"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";
import { checkSportHabits, syncNotice, uncheckSportHabits } from "@/lib/sport-habit-sync";

export async function logWorkout(formData: FormData): Promise<ActionResult> {
  const activity = String(formData.get("activity") ?? "").trim();
  const workout_date = String(formData.get("workout_date") ?? "");
  const duration_minutes = Number(formData.get("duration_minutes") ?? 30);
  const intensity = Number(formData.get("intensity") ?? 3);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!activity || !workout_date) return fail("Renseigne l'activité et la date.");

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

  revalidatePath("/sport");
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return { error: null, notice: syncNotice(checked) };
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: workout } = await supabase.from("workouts").select("workout_date").eq("id", id).maybeSingle();

  const { error: error2 } = await supabase.from("workouts").delete().eq("id", id);
  if (error2) return dbFail(error2);

  const removed = workout ? await uncheckSportHabits(supabase, user.id, workout.workout_date) : 0;

  revalidatePath("/sport");
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return {
    error: null,
    notice: removed > 0 ? "L'habitude Sport cochée automatiquement pour ce jour a été décochée." : undefined,
  };
}

export async function saveSportGoal(sessionsPerWeek: number): Promise<ActionResult> {
  const sport_weekly_goal = Math.min(14, Math.max(1, Math.round(sessionsPerWeek)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error3 } = await supabase.from("profiles").update({ sport_weekly_goal }).eq("id", user.id);
  if (error3) return dbFail(error3);

  revalidatePath("/sport");

  return ok;
}
