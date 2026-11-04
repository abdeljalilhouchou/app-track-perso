"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";
import { isValidCalisthenicsMeasure } from "@/lib/calisthenics/validation";
import { checkSportHabits, uncheckSportHabits } from "@/lib/sport-habit-sync";
import { isFiniteInRange, isUuid, isValidIsoDate } from "@/lib/actions/validation";
import type { CalisthenicsExercise, Json } from "@/types/database";

export type CalisthenicsActionResult = { error: string | null; notice?: string };
export type Category = CalisthenicsExercise["category"];
export type Measurement = CalisthenicsExercise["measurement_type"];
export type Level = CalisthenicsExercise["level"];

type ExerciseInput = {
  id?: string;
  exerciseKey: string;
  category: Category;
  primaryMuscle: string;
  level: Level;
  measurementType: Measurement;
  names: { fr: string; en: string; ar: string };
  descriptions?: { fr: string; en: string; ar: string };
  instructions?: { fr: string; en: string; ar: string };
};

const ERROR = {
  schema: "schema_not_ready",
  auth: "not_signed_in",
  invalid: "invalid_input",
  notFound: "not_found",
  failed: "save_failed",
  linked: "exercise_in_use",
} as const;

const CATEGORIES: Category[] = ["push", "pull", "legs", "core", "skills", "mobility"];
const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
const MEASUREMENTS: Measurement[] = ["reps", "hold", "mixed"];

function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if ((required && !result) || result.length > max) return null;
  return result;
}

function optionalNumber(value: unknown, max = 1000): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return isFiniteInRange(number, 0, max) ? Math.round(number * 100) / 100 : undefined;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function refresh() {
  for (const path of ["/sport", "/sport/calisthenics", "/sport/calendar", "/sport/stats", "/habits", "/dashboard"]) {
    revalidatePath(path);
  }
}

function localizedName(exercise: CalisthenicsExercise, language: string) {
  if (language === "ar") return exercise.name_ar;
  if (language === "en") return exercise.name_en;
  return exercise.name_fr;
}

function validateExerciseInput(input: unknown): Omit<ExerciseInput, "id"> | null {
  if (!plainObject(input) || !plainObject(input.names)) return null;
  const category = input.category;
  const level = input.level;
  const measurementType = input.measurementType;
  if (!CATEGORIES.includes(category as Category) || !LEVELS.includes(level as Level) || !MEASUREMENTS.includes(measurementType as Measurement)) return null;
  const nameFr = text(input.names.fr, 80, true);
  const nameEn = text(input.names.en, 80, true);
  const nameAr = text(input.names.ar, 80, true);
  if (!nameFr || !nameEn || !nameAr) return null;
  const readTranslations = (value: unknown) => {
    const source = plainObject(value) ? value : {};
    return {
      fr: text(source.fr ?? "", 500) ?? "",
      en: text(source.en ?? "", 500) ?? "",
      ar: text(source.ar ?? "", 500) ?? "",
    };
  };
  const exerciseKey = text(input.exerciseKey, 80, true);
  const primaryMuscle = text(input.primaryMuscle, 50, true);
  if (!exerciseKey || !primaryMuscle || !/^[a-z0-9-]+$/.test(exerciseKey)) return null;
  return {
    exerciseKey,
    category: category as Category,
    primaryMuscle,
    level: level as Level,
    measurementType: measurementType as Measurement,
    names: { fr: nameFr, en: nameEn, ar: nameAr },
    descriptions: readTranslations(input.descriptions),
    instructions: readTranslations(input.instructions),
  };
}

export async function saveCalisthenicsExercise(input: unknown): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!plainObject(input)) return { error: ERROR.invalid };
  const exercise = validateExerciseInput(input);
  const id = input.id === undefined ? undefined : input.id;
  if (!exercise || (id !== undefined && !isUuid(id))) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };

  const row = {
    user_id: user.id,
    exercise_key: exercise.exerciseKey,
    category: exercise.category,
    primary_muscle: exercise.primaryMuscle,
    level: exercise.level,
    measurement_type: exercise.measurementType,
    name_fr: exercise.names.fr,
    name_en: exercise.names.en,
    name_ar: exercise.names.ar,
    description_fr: exercise.descriptions?.fr ?? "",
    description_en: exercise.descriptions?.en ?? "",
    description_ar: exercise.descriptions?.ar ?? "",
    instructions_fr: exercise.instructions?.fr ?? "",
    instructions_en: exercise.instructions?.en ?? "",
    instructions_ar: exercise.instructions?.ar ?? "",
  };
  if (id) {
    const { data: existing, error: lookupError } = await supabase.from("calisthenics_exercises").select("id")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (lookupError) return { error: ERROR.failed };
    if (!existing) return { error: ERROR.notFound };
    const { error } = await supabase.from("calisthenics_exercises").update(row).eq("id", id).eq("user_id", user.id);
    if (error) return { error: ERROR.failed };
  } else {
    const { error } = await supabase.from("calisthenics_exercises").insert(row);
    if (error) return { error: ERROR.failed };
  }
  refresh();
  return { error: null };
}

export async function deleteCalisthenicsExercise(id: string): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!isUuid(id)) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };
  const { data: existing, error: lookupError } = await supabase.from("calisthenics_exercises").select("id")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (lookupError) return { error: ERROR.failed };
  if (!existing) return { error: ERROR.notFound };
  const { error } = await supabase.from("calisthenics_exercises").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: ERROR.failed };
  refresh();
  return { error: null };
}

function normalizeSetInput(input: unknown, catalog: Map<string, CalisthenicsExercise>) {
  if (!plainObject(input) || !isUuid(input.exerciseId) || !Array.isArray(input.sets) || input.sets.length < 1 || input.sets.length > 100) return null;
  const exercise = catalog.get(input.exerciseId);
  if (!exercise) return null;
  const sets: { reps: number | null; hold_seconds: number | null; assistance_kg: number | null; added_weight_kg: number | null; variation: string; notes: string }[] = [];
  for (const rawSet of input.sets) {
    if (!plainObject(rawSet)) return null;
    const repsRaw = rawSet.reps === null || rawSet.reps === undefined || rawSet.reps === "" ? null : Number(rawSet.reps);
    const holdRaw = rawSet.holdSeconds === null || rawSet.holdSeconds === undefined || rawSet.holdSeconds === "" ? null : Number(rawSet.holdSeconds);
    const validMeasure = isValidCalisthenicsMeasure(exercise.measurement_type, repsRaw, holdRaw);
    const assistance = optionalNumber(rawSet.assistanceKg);
    const addedWeight = optionalNumber(rawSet.addedWeightKg);
    const variation = text(rawSet.variation ?? "", 100);
    const notes = text(rawSet.notes ?? "", 500);
    if (!validMeasure || assistance === undefined || addedWeight === undefined || variation === null || notes === null) return null;
    sets.push({ reps: repsRaw, hold_seconds: holdRaw, assistance_kg: assistance, added_weight_kg: addedWeight, variation, notes });
  }
  return { exercise, sets };
}

export async function saveCalisthenicsWorkout(input: unknown): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!plainObject(input) || !Array.isArray(input.items)) return { error: ERROR.invalid };
  const date = input.date;
  const duration = input.durationMinutes;
  const intensity = input.intensity;
  const notes = text(input.notes ?? "", 2000);
  const programSessionId = input.programSessionId === null || input.programSessionId === undefined ? null : input.programSessionId;
  if (!isValidIsoDate(date) || !isFiniteInRange(duration, 1, 600, true) || !isFiniteInRange(intensity, 1, 5, true) ||
    notes === null || (programSessionId !== null && !isUuid(programSessionId)) || input.items.length < 1 || input.items.length > 50) {
    return { error: ERROR.invalid };
  }

  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };
  const exerciseIds = Array.from(new Set(input.items.filter(plainObject).map((item) => item.exerciseId).filter(isUuid)));
  if (exerciseIds.length === 0) return { error: ERROR.invalid };
  const { data: exerciseRows, error: exerciseError } = await supabase.from("calisthenics_exercises").select("*").in("id", exerciseIds);
  if (exerciseError || !exerciseRows || exerciseRows.length !== exerciseIds.length) return { error: ERROR.invalid };
  const catalog = new Map(exerciseRows.map((exercise) => [exercise.id, exercise]));
  const items = input.items.map((item) => normalizeSetInput(item, catalog));
  const totalSets = items.reduce((total, item) => total + (item?.sets.length ?? 0), 0);
  if (items.some((item) => item === null) || totalSets > 500) return { error: ERROR.invalid };

  let sessionName: string | null = null;
  if (programSessionId) {
    const { data: programSession, error } = await supabase.from("calisthenics_program_sessions").select("id, name")
      .eq("id", programSessionId).eq("user_id", user.id).maybeSingle();
    if (error) return { error: ERROR.failed };
    if (!programSession) return { error: ERROR.notFound };
    sessionName = programSession.name;
  }
  const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).maybeSingle();
  const activity = sessionName ?? (profile?.language === "ar" ? "كاليستنكس" : profile?.language === "en" ? "Calisthenics" : "Séance Calisthenics");
  const { data: workout, error: workoutError } = await supabase.from("workouts").insert({
    user_id: user.id,
    workout_date: date,
    activity,
    duration_minutes: duration,
    intensity,
    notes: notes || null,
    muscle_groups: [],
    template_id: null,
    discipline: "calisthenics",
    calisthenics_program_session_id: programSessionId,
  }).select("id").single();
  if (workoutError || !workout) return { error: ERROR.failed };

  const rows = (items as NonNullable<(typeof items)[number]>[]).flatMap(({ exercise, sets }, exercisePosition) => sets.map((set, setIndex) => ({
    user_id: user.id,
    workout_id: workout.id,
    exercise_id: exercise.id,
    exercise_name: localizedName(exercise, profile?.language ?? "fr"),
    category: exercise.category,
    measurement_type: exercise.measurement_type,
    exercise_position: exercisePosition,
    set_number: setIndex + 1,
    ...set,
  })));
  const { error: setsError } = await supabase.from("calisthenics_sets").insert(rows);
  if (setsError) {
    await supabase.from("workouts").delete().eq("id", workout.id).eq("user_id", user.id);
    return { error: ERROR.failed };
  }

  const checked = await checkSportHabits(supabase, user.id, date);
  refresh();
  return { error: null, notice: checked.length > 0 ? "sport_habit_checked" : undefined };
}

export async function deleteCalisthenicsWorkout(id: string): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!isUuid(id)) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };
  const { data: workout, error: lookupError } = await supabase.from("workouts").select("workout_date")
    .eq("id", id).eq("user_id", user.id).eq("discipline", "calisthenics").maybeSingle();
  if (lookupError) return { error: ERROR.failed };
  if (!workout) return { error: ERROR.notFound };
  const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: ERROR.failed };
  const removed = await uncheckSportHabits(supabase, user.id, workout.workout_date);
  refresh();
  return { error: null, notice: removed > 0 ? "sport_habit_undone" : undefined };
}

function normalizeProgram(input: unknown) {
  if (!plainObject(input) || !Array.isArray(input.sessions) || input.sessions.length < 1 || input.sessions.length > 20) return null;
  const name = text(input.name, 80, true);
  const notes = text(input.notes ?? "", 2000);
  if (!name || notes === null) return null;
  const sessions: { id?: string; name: string; exercises: { id?: string; exerciseId: string; targetSets: number; targetReps: number | null; targetHoldSeconds: number | null; assistanceKg: number | null | undefined; addedWeightKg: number | null | undefined; notes: string }[] }[] = [];
  let totalExercises = 0;
  for (const rawSession of input.sessions) {
    if (!plainObject(rawSession) || !Array.isArray(rawSession.exercises) || rawSession.exercises.length < 1 || rawSession.exercises.length > 50) return null;
    const sessionName = text(rawSession.name, 80, true);
    if (!sessionName || (rawSession.id !== undefined && !isUuid(rawSession.id))) return null;
    const exercises = [];
    for (const rawExercise of rawSession.exercises) {
      if (!plainObject(rawExercise) || !isUuid(rawExercise.exerciseId) || (rawExercise.id !== undefined && !isUuid(rawExercise.id))) return null;
      const targetSets = rawExercise.targetSets;
      const targetReps = rawExercise.targetReps === null || rawExercise.targetReps === undefined || rawExercise.targetReps === "" ? null : Number(rawExercise.targetReps);
      const targetHoldSeconds = rawExercise.targetHoldSeconds === null || rawExercise.targetHoldSeconds === undefined || rawExercise.targetHoldSeconds === "" ? null : Number(rawExercise.targetHoldSeconds);
      const assistanceKg = optionalNumber(rawExercise.assistanceKg);
      const addedWeightKg = optionalNumber(rawExercise.addedWeightKg);
      const exerciseNotes = text(rawExercise.notes ?? "", 500);
      if (!isFiniteInRange(targetSets, 1, 20, true) ||
        (targetReps !== null && !isFiniteInRange(targetReps, 1, 500, true)) ||
        (targetHoldSeconds !== null && !isFiniteInRange(targetHoldSeconds, 1, 7200, true)) ||
        Number(targetReps !== null) + Number(targetHoldSeconds !== null) !== 1 ||
        assistanceKg === undefined || addedWeightKg === undefined || exerciseNotes === null) return null;
      exercises.push({
        ...(rawExercise.id ? { id: rawExercise.id as string } : {}),
        exerciseId: rawExercise.exerciseId,
        targetSets,
        targetReps,
        targetHoldSeconds,
        assistanceKg,
        addedWeightKg,
        notes: exerciseNotes,
      });
    }
    const submittedExerciseIds = exercises.flatMap((exercise) => exercise.id ? [exercise.id.toLowerCase()] : []);
    if (new Set(submittedExerciseIds).size !== submittedExerciseIds.length) return null;
    totalExercises += exercises.length;
    const sessionId = rawSession.id as string | undefined;
    if (sessionId && sessions.some((session) => session.id?.toLowerCase() === sessionId.toLowerCase())) return null;
    sessions.push({ ...(rawSession.id ? { id: rawSession.id as string } : {}), name: sessionName, exercises });
  }
  if (totalExercises > 200) return null;
  return { id: input.id === undefined ? undefined : input.id, name, notes, sessions };
}

export async function saveCalisthenicsProgram(input: unknown): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  const program = normalizeProgram(input);
  if (!program || (program.id !== undefined && !isUuid(program.id))) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };

  const ids = Array.from(new Set(program.sessions.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId))));
  const { data: catalogRows, error: catalogError } = ids.length
    ? await supabase.from("calisthenics_exercises").select("*").in("id", ids)
    : { data: [], error: null };
  if (catalogError || !catalogRows || catalogRows.length !== ids.length) return { error: ERROR.invalid };
  const catalog = new Map(catalogRows.map((exercise) => [exercise.id, exercise]));
  for (const session of program.sessions) {
    for (const exercise of session.exercises) {
      const catalogExercise = catalog.get(exercise.exerciseId);
      if (!catalogExercise || !isValidCalisthenicsMeasure(catalogExercise.measurement_type, exercise.targetReps, exercise.targetHoldSeconds)) return { error: ERROR.invalid };
    }
  }

  if (!program.id) {
    if (program.sessions.some((session) => session.id || session.exercises.some((exercise) => exercise.id))) return { error: ERROR.invalid };
  } else {
    const { data: existingProgram, error: existingProgramError } = await supabase.from("calisthenics_programs").select("id")
      .eq("id", program.id).eq("user_id", user.id).maybeSingle();
    if (existingProgramError) return { error: ERROR.failed };
    if (!existingProgram) return { error: ERROR.notFound };
  }

  const { error } = await supabase.rpc("save_calisthenics_program", {
    p_program_id: program.id ?? null,
    p_name: program.name,
    p_notes: program.notes,
    p_sessions: program.sessions.map((session) => ({
      id: session.id ?? null,
      name: session.name,
      exercises: session.exercises.map((exercise) => ({
        id: exercise.id ?? null,
        exerciseId: exercise.exerciseId,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetHoldSeconds: exercise.targetHoldSeconds,
        assistanceKg: exercise.assistanceKg ?? null,
        addedWeightKg: exercise.addedWeightKg ?? null,
        notes: exercise.notes,
      })),
    })) as Json,
  });
  if (error) return { error: ERROR.failed };
  refresh();
  return { error: null };
}

export async function deleteCalisthenicsProgram(id: string): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!isUuid(id)) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };
  const { data, error } = await supabase.from("calisthenics_programs").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return { error: ERROR.failed };
  if (!data) return { error: ERROR.notFound };
  refresh();
  return { error: null };
}

export async function saveCalisthenicsSkill(input: unknown): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!plainObject(input) || !Array.isArray(input.progressionSteps) || input.progressionSteps.length < 1 || input.progressionSteps.length > 30) return { error: ERROR.invalid };
  const name = text(input.name, 80, true);
  const skillKey = text(input.skillKey, 60, true);
  const notes = text(input.notes ?? "", 2000);
  const steps = input.progressionSteps.map((step) => text(step, 80, true));
  const id = input.id === undefined ? undefined : input.id;
  const currentStep = input.currentStep;
  const targetStep = input.targetStep;
  const measurementType = input.measurementType as "reps" | "hold";
  const startedOn = input.startedOn === undefined || input.startedOn === null || input.startedOn === "" ? null : input.startedOn;
  if (!name || !skillKey || notes === null || steps.some((step) => !step) || (id !== undefined && !isUuid(id)) ||
    !isFiniteInRange(currentStep, 0, steps.length, true) || !isFiniteInRange(targetStep, 1, steps.length, true) ||
    (measurementType !== "reps" && measurementType !== "hold") || (startedOn !== null && !isValidIsoDate(startedOn))) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };
  const row = { name, skill_key: skillKey, current_step: currentStep, target_step: targetStep, progression_steps: steps as string[], measurement_type: measurementType, started_on: startedOn, notes };
  if (id) {
    const { data: owned, error } = await supabase.from("calisthenics_skills").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) return { error: ERROR.failed };
    if (!owned) return { error: ERROR.notFound };
    const { error: updateError } = await supabase.from("calisthenics_skills").update({ ...row, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    if (updateError) return { error: ERROR.failed };
  } else {
    const { error } = await supabase.from("calisthenics_skills").insert({ ...row, user_id: user.id });
    if (error) return { error: ERROR.failed };
  }
  refresh();
  return { error: null };
}

export async function deleteCalisthenicsSkill(id: string): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!isUuid(id)) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };
  const { data, error } = await supabase.from("calisthenics_skills").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return { error: ERROR.failed };
  if (!data) return { error: ERROR.notFound };
  refresh();
  return { error: null };
}

export async function logCalisthenicsSkill(input: unknown): Promise<CalisthenicsActionResult> {
  if (!isCalisthenicsSchemaReady()) return { error: ERROR.schema };
  if (!plainObject(input) || !isUuid(input.skillId) || !isValidIsoDate(input.date) || !isFiniteInRange(input.stepIndex, 0, 29, true)) return { error: ERROR.invalid };
  const reps = input.reps === undefined || input.reps === null || input.reps === "" ? null : Number(input.reps);
  const holdSeconds = input.holdSeconds === undefined || input.holdSeconds === null || input.holdSeconds === "" ? null : Number(input.holdSeconds);
  const notes = text(input.notes ?? "", 1000);
  if (Number(reps !== null) + Number(holdSeconds !== null) !== 1 || (reps !== null && !isFiniteInRange(reps, 1, 500, true)) ||
    (holdSeconds !== null && !isFiniteInRange(holdSeconds, 1, 7200, true)) || notes === null) return { error: ERROR.invalid };
  const { supabase, user } = await currentUser();
  if (!user) return { error: ERROR.auth };
  const { data: skill, error } = await supabase.from("calisthenics_skills").select("*").eq("id", input.skillId).eq("user_id", user.id).maybeSingle();
  if (error) return { error: ERROR.failed };
  if (!skill || input.stepIndex >= skill.progression_steps.length || (skill.measurement_type === "reps" ? reps === null : holdSeconds === null)) return { error: ERROR.invalid };
  const { data: log, error: insertError } = await supabase.from("calisthenics_skill_logs").insert({
    user_id: user.id,
    skill_id: skill.id,
    workout_id: null,
    logged_on: input.date,
    step_index: input.stepIndex,
    step_name: skill.progression_steps[input.stepIndex],
    reps,
    hold_seconds: holdSeconds,
    notes,
  }).select("id").single();
  if (insertError || !log) return { error: ERROR.failed };
  const { error: updateError } = await supabase.from("calisthenics_skills").update({
    current_step: Math.max(skill.current_step, input.stepIndex + 1),
    updated_at: new Date().toISOString(),
  }).eq("id", skill.id).eq("user_id", user.id);
  if (updateError) {
    await supabase.from("calisthenics_skill_logs").delete().eq("id", log.id).eq("user_id", user.id);
    return { error: ERROR.failed };
  }
  refresh();
  return { error: null };
}
