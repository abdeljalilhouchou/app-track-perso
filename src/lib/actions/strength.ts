"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EXERCISES, DEFAULT_PROGRAM, MUSCLE_GROUPS, type ProgramExercise } from "@/lib/strength";

export type Result = { error: string | null };

const clampInt = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n) || min));

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refresh() {
  revalidatePath("/sport");
  revalidatePath("/dashboard");
}

/** Adds names to the user's exercise catalog without touching existing ones. */
async function ensureCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  items: { name: string; muscle: string }[]
) {
  const unique = new Map(items.map((i) => [i.name.trim().toLowerCase(), i]));
  const rows = Array.from(unique.values())
    .filter((i) => i.name.trim())
    .map((i) => ({ user_id: userId, name: i.name.trim(), muscle_group: i.muscle || "Autre" }));
  if (rows.length === 0) return;
  await supabase.from("exercises").upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: true });
}

export async function seedDefaultExercises(): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  await ensureCatalog(supabase, user.id, DEFAULT_EXERCISES);
  refresh();
  return { error: null };
}

type TemplateExerciseInput = { name: string; muscle: string; sets: number; reps: number };

function templateExerciseRows(userId: string, templateId: string, exercises: TemplateExerciseInput[]) {
  return exercises
    .filter((e) => e.name.trim())
    .map((e, position) => ({
      template_id: templateId,
      user_id: userId,
      exercise_name: e.name.trim(),
      muscle_group: e.muscle || "Autre",
      target_sets: clampInt(e.sets, 1, 12),
      target_reps: clampInt(e.reps, 1, 100),
      position,
    }));
}

export async function saveTemplate(input: {
  id?: string;
  name: string;
  muscleGroups: string[];
  exercises: TemplateExerciseInput[];
}): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { error: "Donne un nom à la séance." };
  if (input.exercises.filter((e) => e.name.trim()).length === 0) return { error: "Ajoute au moins un exercice." };

  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const muscle_groups = input.muscleGroups.filter((g) => (MUSCLE_GROUPS as readonly string[]).includes(g));
  let templateId = input.id;

  if (templateId) {
    const { error } = await supabase.from("workout_templates").update({ name, muscle_groups }).eq("id", templateId);
    if (error) return { error: error.message };
  } else {
    const { count } = await supabase
      .from("workout_templates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const { data, error } = await supabase
      .from("workout_templates")
      .insert({ user_id: user.id, name, muscle_groups, position: count ?? 0 })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Création impossible." };
    templateId = data.id;
  }

  // Insert the new exercise list first, then drop the old rows, so a failure never empties the session.
  const { data: oldRows } = await supabase.from("workout_template_exercises").select("id").eq("template_id", templateId);
  const { error: insertError } = await supabase
    .from("workout_template_exercises")
    .insert(templateExerciseRows(user.id, templateId, input.exercises));
  if (insertError) return { error: insertError.message };

  const oldIds = (oldRows ?? []).map((r) => r.id);
  if (oldIds.length > 0) await supabase.from("workout_template_exercises").delete().in("id", oldIds);

  await ensureCatalog(supabase, user.id, input.exercises);
  refresh();
  return { error: null };
}

export async function deleteTemplate(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function moveTemplate(id: string, direction: "up" | "down"): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const { data: all } = await supabase
    .from("workout_templates")
    .select("id")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const ids = (all ?? []).map((t) => t.id);
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return { error: null };

  [ids[from], ids[to]] = [ids[to], ids[from]];
  await Promise.all(ids.map((tid, position) => supabase.from("workout_templates").update({ position }).eq("id", tid)));

  refresh();
  return { error: null };
}

export async function createDefaultProgram(): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const { count } = await supabase
    .from("workout_templates")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const offset = count ?? 0;

  const catalog: ProgramExercise[] = [];
  for (const [index, session] of DEFAULT_PROGRAM.entries()) {
    const { data, error } = await supabase
      .from("workout_templates")
      .insert({ user_id: user.id, name: session.name, muscle_groups: session.muscleGroups, position: offset + index })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Création impossible." };

    const { error: exError } = await supabase
      .from("workout_template_exercises")
      .insert(templateExerciseRows(user.id, data.id, session.exercises));
    if (exError) return { error: exError.message };
    catalog.push(...session.exercises);
  }

  await ensureCatalog(supabase, user.id, catalog);
  await supabase.from("profiles").update({ sport_weekly_goal: DEFAULT_PROGRAM.length }).eq("id", user.id);

  refresh();
  return { error: null };
}

export type SessionPayload = {
  name: string;
  date: string;
  templateId: string | null;
  muscleGroups: string[];
  durationMinutes: number;
  intensity: number;
  notes: string;
  exercises: { name: string; muscle: string; sets: { reps: number; weight: number }[] }[];
};

export async function saveStrengthSession(payload: SessionPayload): Promise<Result & { workoutId?: string }> {
  const name = payload.name.trim() || "Séance de musculation";
  const exercises = payload.exercises
    .map((e) => ({
      ...e,
      name: e.name.trim(),
      sets: e.sets.filter((s) => s.reps > 0 && s.weight >= 0),
    }))
    .filter((e) => e.name && e.sets.length > 0);

  if (exercises.length === 0) return { error: "Aucune série renseignée : ajoute au moins des répétitions." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) return { error: "Date invalide." };

  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const groups = payload.muscleGroups.length
    ? payload.muscleGroups
    : Array.from(new Set(exercises.map((e) => e.muscle).filter(Boolean)));

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      activity: name,
      workout_date: payload.date,
      duration_minutes: clampInt(payload.durationMinutes, 1, 600),
      intensity: clampInt(payload.intensity, 1, 5),
      notes: payload.notes.trim() || null,
      muscle_groups: groups,
      template_id: payload.templateId,
    })
    .select("id")
    .single();
  if (error || !workout) return { error: error?.message ?? "Enregistrement impossible." };

  const rows = exercises.flatMap((e, exercisePosition) =>
    e.sets.map((s, i) => ({
      workout_id: workout.id,
      user_id: user.id,
      exercise_name: e.name,
      muscle_group: e.muscle || "Autre",
      exercise_position: exercisePosition,
      set_number: i + 1,
      reps: clampInt(s.reps, 1, 500),
      weight_kg: Math.min(1000, Math.max(0, Math.round(s.weight * 100) / 100)),
    }))
  );

  const { error: setsError } = await supabase.from("workout_sets").insert(rows);
  if (setsError) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { error: setsError.message };
  }

  await ensureCatalog(
    supabase,
    user.id,
    exercises.map((e) => ({ name: e.name, muscle: e.muscle }))
  );

  refresh();
  return { error: null, workoutId: workout.id };
}

/** One-click "I did this session": records it for the given day without per-set details. */
export async function markTemplateDone(templateId: string, date: string): Promise<Result> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Date invalide." };

  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const { data: template } = await supabase
    .from("workout_templates")
    .select("name, muscle_groups")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single();
  if (!template) return { error: "Séance introuvable." };

  const { error } = await supabase.from("workouts").insert({
    user_id: user.id,
    activity: template.name,
    workout_date: date,
    duration_minutes: 60,
    intensity: 3,
    notes: null,
    muscle_groups: template.muscle_groups,
    template_id: templateId,
  });
  if (error) return { error: error.message };

  refresh();
  return { error: null };
}
