"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logWorkout(formData: FormData) {
  const activity = String(formData.get("activity") ?? "").trim();
  const workout_date = String(formData.get("workout_date") ?? "");
  const duration_minutes = Number(formData.get("duration_minutes") ?? 30);
  const intensity = Number(formData.get("intensity") ?? 3);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!activity || !workout_date) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("workouts").insert({
    user_id: user.id,
    activity,
    workout_date,
    duration_minutes,
    intensity,
    notes,
  });

  revalidatePath("/sport");
  revalidatePath("/dashboard");
}

export async function deleteWorkout(id: string) {
  const supabase = await createClient();
  await supabase.from("workouts").delete().eq("id", id);
  revalidatePath("/sport");
  revalidatePath("/dashboard");
}

export async function saveSportGoal(sessionsPerWeek: number) {
  const sport_weekly_goal = Math.min(14, Math.max(1, Math.round(sessionsPerWeek)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ sport_weekly_goal }).eq("id", user.id);

  revalidatePath("/sport");
}
