"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paging";
import { isRunningSchemaReady } from "@/lib/running/config";

export type ActionResult = { error: string | null };

export async function updateDisplayName(name: string): Promise<ActionResult> {
  if (typeof name !== "string") return { error: "Nom invalide." };
  const display_name = name.trim();
  if (display_name.length < 1) return { error: "Le nom ne peut pas être vide." };
  if (display_name.length > 40) return { error: "40 caractères maximum." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { error } = await supabase.from("profiles").update({ display_name }).eq("id", user.id);
  if (error) return { error: "Impossible d’enregistrer le nom du profil." };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") return { error: "Mot de passe invalide." };
  if (newPassword.length < 6 || newPassword.length > 1024) return { error: "Le nouveau mot de passe doit contenir entre 6 et 1024 caractères." };
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
  if (error) return { error: "Impossible de modifier le mot de passe. Réessaie plus tard." };

  return { error: null };
}

export async function saveAvatarUrl(url: string | null): Promise<ActionResult> {
  if (url !== null && (typeof url !== "string" || url.length > 2048)) return { error: "Adresse de photo invalide." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  if (url !== null) {
    try {
      const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
      const candidate = new URL(url);
      const allowedPath = `/storage/v1/object/public/avatars/${user.id}/`;
      if (candidate.origin !== base.origin || !candidate.pathname.startsWith(allowedPath) || !/^https?:$/.test(candidate.protocol)) {
        return { error: "Adresse de photo invalide." };
      }
    } catch {
      return { error: "Adresse de photo invalide." };
    }
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: "Impossible d’enregistrer la photo de profil." };

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

  const byUser = (table: "habits" | "habit_logs" | "workouts" | "mood_entries" | "moments" | "foods" | "meal_entries" | "weight_logs" | "water_logs" | "meal_templates" | "meal_template_items" | "exercises" | "workout_templates" | "workout_template_exercises" | "workout_sets" | "calisthenics_exercises" | "calisthenics_programs" | "calisthenics_program_sessions" | "calisthenics_program_exercises" | "calisthenics_sets" | "calisthenics_skills" | "calisthenics_skill_logs") =>
    fetchAllRows((from, to) => supabase.from(table).select("*").eq("user_id", user.id).order("id").range(from, to));

  try {
    const [profile, habits, habitLogs, workouts, moods, moments, foods, meals, weights, water, templates, templateItems, exercises, workoutTemplates, workoutTemplateExercises, workoutSets, calisthenicsExercises, calisthenicsPrograms, calisthenicsSessions, calisthenicsProgramExercises, calisthenicsSets, calisthenicsSkills, calisthenicsSkillLogs, runningSessions, runningGoals] =
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
      byUser("exercises"),
      byUser("workout_templates"),
      byUser("workout_template_exercises"),
      byUser("workout_sets"),
      byUser("calisthenics_exercises"),
      byUser("calisthenics_programs"),
      byUser("calisthenics_program_sessions"),
      byUser("calisthenics_program_exercises"),
      byUser("calisthenics_sets"),
      byUser("calisthenics_skills"),
      byUser("calisthenics_skill_logs"),
      isRunningSchemaReady()
        ? fetchAllRows((from, to) => supabase.from("running_sessions").select("*").eq("user_id", user.id).order("workout_id").range(from, to))
        : Promise.resolve([]),
      isRunningSchemaReady()
        ? supabase.from("running_goals").select("*").eq("user_id", user.id).maybeSingle().then(({ data, error }) => {
            if (error) throw error;
            return data ? [data] : [];
          })
        : Promise.resolve([]),
    ]);
    if (profile.error) return { json: null, error: "Impossible de préparer l’export des données." };

    const json = JSON.stringify({
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email },
      profile: profile.data,
      habits, habit_logs: habitLogs, workouts, mood_entries: moods, moments, foods,
      meal_entries: meals, weight_logs: weights, water_logs: water, meal_templates: templates,
      meal_template_items: templateItems, exercises, workout_templates: workoutTemplates,
      workout_template_exercises: workoutTemplateExercises, workout_sets: workoutSets,
      calisthenics_exercises: calisthenicsExercises, calisthenics_programs: calisthenicsPrograms,
      calisthenics_program_sessions: calisthenicsSessions, calisthenics_program_exercises: calisthenicsProgramExercises,
      calisthenics_sets: calisthenicsSets, calisthenics_skills: calisthenicsSkills, calisthenics_skill_logs: calisthenicsSkillLogs,
      running_sessions: runningSessions, running_goals: runningGoals,
    }, null, 2);

    return { json, error: null };
  } catch {
    return { json: null, error: "Impossible de préparer l’export des données." };
  }
}
