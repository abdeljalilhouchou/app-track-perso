"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const display_name = name.trim();
  if (display_name.length < 1) return { error: "Le nom ne peut pas être vide." };
  if (display_name.length > 40) return { error: "40 caractères maximum." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { error } = await supabase.from("profiles").update({ display_name }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 6) return { error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  if (newPassword === currentPassword) return { error: "Le nouveau mot de passe doit être différent de l'actuel." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non connecté." };

  // Re-authenticate so a stolen session can't silently change the password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) return { error: "Mot de passe actuel incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { error: null };
}

export async function saveAvatarUrl(url: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  if (url !== null) {
    const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
    if (!url.startsWith(allowedPrefix)) return { error: "Adresse de photo invalide." };
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null };
}

/** Everything the user owns, as one JSON document (RGPD-style data export). */
export async function exportMyData(): Promise<{ json: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { json: null, error: "Non connecté." };

  const byUser = (table: "habits" | "habit_logs" | "workouts" | "mood_entries" | "moments" | "foods" | "meal_entries" | "weight_logs" | "water_logs" | "meal_templates" | "meal_template_items") =>
    supabase.from(table).select("*").eq("user_id", user.id);

  const [profile, habits, habitLogs, workouts, moods, moments, foods, meals, weights, water, templates, templateItems] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      byUser("habits"),
      byUser("habit_logs"),
      byUser("workouts"),
      byUser("mood_entries"),
      byUser("moments"),
      byUser("foods"),
      byUser("meal_entries"),
      byUser("weight_logs"),
      byUser("water_logs"),
      byUser("meal_templates"),
      byUser("meal_template_items"),
    ]);

  const failed = [profile, habits, habitLogs, workouts, moods, moments, foods, meals, weights, water, templates, templateItems].find(
    (r) => r.error
  );
  if (failed?.error) return { json: null, error: failed.error.message };

  const json = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email },
      profile: profile.data,
      habits: habits.data,
      habit_logs: habitLogs.data,
      workouts: workouts.data,
      mood_entries: moods.data,
      moments: moments.data,
      foods: foods.data,
      meal_entries: meals.data,
      weight_logs: weights.data,
      water_logs: water.data,
      meal_templates: templates.data,
      meal_template_items: templateItems.data,
    },
    null,
    2
  );

  return { json, error: null };
}
