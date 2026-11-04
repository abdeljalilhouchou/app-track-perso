"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkSportHabits, syncNotice } from "@/lib/sport-habit-sync";
import { DEFAULT_EXERCISES, DEFAULT_PROGRAM, MUSCLE_GROUPS, type ProgramExercise } from "@/lib/strength";
import { fetchAllRows } from "@/lib/paging";
import { isFiniteInRange, isUuid, isValidIsoDate } from "@/lib/actions/validation";

export type Result = { error: string | null; notice?: string };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refresh() {
  revalidatePath("/sport");
  revalidatePath("/sport/musculation");
  revalidatePath("/sport/calisthenics");
  revalidatePath("/sport/calendar");
  revalidatePath("/sport/stats");
  revalidatePath("/habits");
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
  if (rows.length === 0) return null;
  const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "user_id,name", ignoreDuplicates: true });
  return error;
}

export async function seedDefaultExercises(): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const error = await ensureCatalog(supabase, user.id, DEFAULT_EXERCISES);
  if (error) return { error: "Impossible d’enregistrer le catalogue d’exercices." };
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
      target_sets: e.sets,
      target_reps: e.reps,
      position,
    }));
}

export async function saveTemplate(input: {
  id?: string;
  name: string;
  muscleGroups: string[];
  exercises: TemplateExerciseInput[];
}): Promise<Result> {
  if (!input || typeof input !== "object" || typeof input.name !== "string" || input.name.trim().length < 1 || input.name.length > 100 ||
    !Array.isArray(input.muscleGroups) || input.muscleGroups.length > 20 ||
    input.muscleGroups.some((group) => typeof group !== "string" || !(MUSCLE_GROUPS as readonly string[]).includes(group)) ||
    !Array.isArray(input.exercises) || input.exercises.length < 1 || input.exercises.length > 100 ||
    (input.id !== undefined && !isUuid(input.id)) || input.exercises.some((exercise) => !exercise || typeof exercise.name !== "string" ||
      exercise.name.trim().length < 1 || exercise.name.length > 100 || typeof exercise.muscle !== "string" || exercise.muscle.length > 60 ||
      !isFiniteInRange(exercise.sets, 1, 12, true) || !isFiniteInRange(exercise.reps, 1, 100, true))) {
    return { error: "Vérifie le nom et les exercices de la séance." };
  }
  const name = input.name.trim();

  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const muscle_groups = input.muscleGroups.filter((g) => (MUSCLE_GROUPS as readonly string[]).includes(g));
  let templateId = input.id;

  if (templateId) {
    const { data: ownedTemplate, error: ownershipError } = await supabase.from("workout_templates").select("id")
      .eq("id", templateId).eq("user_id", user.id).maybeSingle();
    if (ownershipError || !ownedTemplate) return { error: "Séance introuvable." };
    const { error } = await supabase.from("workout_templates").update({ name, muscle_groups }).eq("id", templateId).eq("user_id", user.id);
    if (error) return { error: "Impossible de modifier la séance." };
  } else {
    const { count, error: countError } = await supabase
      .from("workout_templates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (countError) return { error: "Impossible de compter les programmes existants." };
    const { data, error } = await supabase
      .from("workout_templates")
      .insert({ user_id: user.id, name, muscle_groups, position: count ?? 0 })
      .select("id")
      .single();
    if (error || !data) return { error: "Impossible de créer la séance." };
    templateId = data.id;
  }

  // Insert the new exercise list first, then drop the old rows, so a failure never empties the session.
  const { data: oldRows, error: oldRowsError } = await supabase.from("workout_template_exercises").select("id")
    .eq("template_id", templateId).eq("user_id", user.id);
  if (oldRowsError) return { error: "Impossible de charger les exercices de la séance." };
  const { error: insertError } = await supabase
    .from("workout_template_exercises")
    .insert(templateExerciseRows(user.id, templateId, input.exercises));
  if (insertError) return { error: "Impossible d’enregistrer les exercices de la séance." };

  const oldIds = (oldRows ?? []).map((r) => r.id);
  if (oldIds.length > 0) {
    const { error: deleteError } = await supabase.from("workout_template_exercises").delete().in("id", oldIds).eq("user_id", user.id);
    if (deleteError) return { error: "La séance a été enregistrée, mais son ancienne liste n’a pas pu être nettoyée." };
  }

  const catalogError = await ensureCatalog(supabase, user.id, input.exercises);
  if (catalogError) return { error: "La séance est enregistrée, mais le catalogue n’a pas pu être mis à jour." };
  refresh();
  return { error: null };
}

export async function deleteTemplate(id: string): Promise<Result> {
  if (!isUuid(id)) return { error: "Séance invalide." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };
  const { error } = await supabase.from("workout_templates").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Impossible de supprimer la séance." };
  refresh();
  return { error: null };
}

export async function moveTemplate(id: string, direction: "up" | "down"): Promise<Result> {
  if (!isUuid(id) || (direction !== "up" && direction !== "down")) return { error: "Déplacement invalide." };
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  let all;
  try {
    all = await fetchAllRows((from, to) => supabase.from("workout_templates").select("id")
      .eq("user_id", user.id).order("position", { ascending: true }).order("created_at").order("id").range(from, to));
  } catch {
    return { error: "Impossible de charger l’ordre des séances." };
  }
  const ids = all.map((t) => t.id);
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return { error: null };

  [ids[from], ids[to]] = [ids[to], ids[from]];
  const updates = await Promise.all(ids.map((tid, position) => supabase.from("workout_templates").update({ position })
    .eq("id", tid).eq("user_id", user.id)));
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) return { error: "Impossible de modifier l’ordre des séances." };

  refresh();
  return { error: null };
}

export async function createDefaultProgram(): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const { count, error: countError } = await supabase
    .from("workout_templates")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return { error: "Impossible de charger les programmes existants." };
  if ((count ?? 0) > 0) return { error: "Un programme existe déjà." };
  const offset = count ?? 0;

  const catalog: ProgramExercise[] = [];
  for (const [index, session] of DEFAULT_PROGRAM.entries()) {
    const { data, error } = await supabase
      .from("workout_templates")
      .insert({ user_id: user.id, name: session.name, muscle_groups: session.muscleGroups, position: offset + index })
      .select("id")
      .single();
    if (error || !data) return { error: "Impossible de créer le programme." };

    const { error: exError } = await supabase
      .from("workout_template_exercises")
      .insert(templateExerciseRows(user.id, data.id, session.exercises));
    if (exError) return { error: "Le programme est créé, mais ses exercices n’ont pas pu être enregistrés." };
    catalog.push(...session.exercises);
  }

  const catalogError = await ensureCatalog(supabase, user.id, catalog);
  if (catalogError) return { error: "Le programme est créé, mais le catalogue d’exercices n’a pas pu être mis à jour." };
  const { error: profileError } = await supabase.from("profiles").update({ sport_weekly_goal: DEFAULT_PROGRAM.length }).eq("id", user.id);
  if (profileError) return { error: "Le programme est créé, mais l’objectif hebdomadaire n’a pas pu être mis à jour." };

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
  if (!payload || typeof payload !== "object" || typeof payload.name !== "string" || payload.name.length > 100 ||
    !isValidIsoDate(payload.date) || (payload.templateId !== null && !isUuid(payload.templateId)) ||
    !Array.isArray(payload.muscleGroups) || payload.muscleGroups.length > 20 ||
    payload.muscleGroups.some((group) => typeof group !== "string" || !(MUSCLE_GROUPS as readonly string[]).includes(group)) ||
    !isFiniteInRange(payload.durationMinutes, 1, 600, true) || !isFiniteInRange(payload.intensity, 1, 5, true) ||
    typeof payload.notes !== "string" || payload.notes.length > 2000 ||
    !Array.isArray(payload.exercises) || payload.exercises.length > 100 ||
    payload.exercises.some((exercise) => !exercise || typeof exercise.name !== "string" || exercise.name.trim().length < 1 ||
      exercise.name.length > 100 || typeof exercise.muscle !== "string" || exercise.muscle.length > 60 ||
      !Array.isArray(exercise.sets) || exercise.sets.length > 12 ||
      exercise.sets.some((set) => !set || !isFiniteInRange(set.reps, 0, 500, true) || !isFiniteInRange(set.weight, 0, 1000)))) {
    return { error: "Vérifie les informations et les séries de la séance." };
  }
  const name = payload.name.trim() || "Séance de musculation";
  const exercises = payload.exercises
    .map((e) => ({
      ...e,
      name: e.name.trim(),
      sets: e.sets.filter((s) => s.reps > 0 && s.weight >= 0),
    }))
    .filter((e) => e.name && e.sets.length > 0);

  if (exercises.length === 0) return { error: "Aucune série renseignée : ajoute au moins des répétitions." };

  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };
  if (payload.templateId) {
    const { data: template, error: templateError } = await supabase.from("workout_templates").select("id")
      .eq("id", payload.templateId).eq("user_id", user.id).maybeSingle();
    if (templateError || !template) return { error: "Programme introuvable." };
  }

  const groups = payload.muscleGroups.length
    ? payload.muscleGroups
    : Array.from(new Set(exercises.map((e) => e.muscle).filter(Boolean)));

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      activity: name,
      workout_date: payload.date,
      duration_minutes: payload.durationMinutes,
      intensity: payload.intensity,
      notes: payload.notes.trim() || null,
      muscle_groups: groups,
      template_id: payload.templateId,
    })
    .select("id")
    .single();
  if (error || !workout) return { error: "Impossible d’enregistrer la séance." };

  const rows = exercises.flatMap((e, exercisePosition) =>
    e.sets.map((s, i) => ({
      workout_id: workout.id,
      user_id: user.id,
      exercise_name: e.name,
      muscle_group: e.muscle || "Autre",
      exercise_position: exercisePosition,
      set_number: i + 1,
      reps: s.reps,
      weight_kg: Math.min(1000, Math.max(0, Math.round(s.weight * 100) / 100)),
    }))
  );

  const { error: setsError } = await supabase.from("workout_sets").insert(rows);
  if (setsError) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { error: "Impossible d’enregistrer les séries de la séance." };
  }

  const catalogError = await ensureCatalog(
    supabase,
    user.id,
    exercises.map((e) => ({ name: e.name, muscle: e.muscle }))
  );
  if (catalogError) return { error: "La séance est enregistrée, mais le catalogue n’a pas pu être mis à jour.", workoutId: workout.id };

  const checked = await checkSportHabits(supabase, user.id, payload.date);

  refresh();
  return { error: null, workoutId: workout.id, notice: syncNotice(checked) };
}

/** One-click "I did this session": records it for the given day without per-set details. */
export async function markTemplateDone(
  templateId: string,
  date: string,
  durationMinutes: number,
  intensity: number
): Promise<Result> {
  if (!isUuid(templateId) || !isValidIsoDate(date)) return { error: "Programme ou date invalide." };
  if (!isFiniteInRange(durationMinutes, 1, 600, true)) {
    return { error: "La durée doit être comprise entre 1 et 600 minutes." };
  }
  if (!isFiniteInRange(intensity, 1, 5, true)) return { error: "L’intensité doit être comprise entre 1 et 5." };

  const { supabase, user } = await currentUser();
  if (!user) return { error: "Non connecté." };

  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .select("name, muscle_groups")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single();
  if (templateError || !template) return { error: "Séance introuvable." };

  const { error } = await supabase.from("workouts").insert({
    user_id: user.id,
    activity: template.name,
    workout_date: date,
    duration_minutes: durationMinutes,
    intensity,
    notes: null,
    muscle_groups: template.muscle_groups,
    template_id: templateId,
  });
  if (error) return { error: "Impossible d’enregistrer la séance." };

  const checked = await checkSportHabits(supabase, user.id, date);

  refresh();
  return { error: null, notice: syncNotice(checked) };
}
