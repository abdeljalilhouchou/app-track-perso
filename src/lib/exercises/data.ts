import "server-only";
import { cache } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfilePreferences } from "@/lib/supabase/read-context";
import { fetchAllRows } from "@/lib/paging";
import { exerciseKey } from "@/lib/strength";
import { computeStrengthData } from "@/lib/strength-stats";
import { isLanguage } from "@/lib/language";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";
import type { CalisthenicsExercise, Workout } from "@/types/database";
import { baseCatalog } from "./catalog";
import { guides } from "./guides";
import { exerciseNamePattern } from "./identity";
import { exerciseMuscles } from "./muscles";
import { visualMediaFor } from "./media-registry";
import { pilotTechnique } from "./pilot-technique";
import { hasExerciseMediaExperience } from "./media-experience";
import { v3Technique } from "./media-v3-content";
import { getExerciseAnatomy } from "@/lib/anatomy/configs";
import { ATLAS_MUSCLES } from "@/lib/anatomy/atlas";
import type { Discipline, ExerciseDetail, Guide, GuidePerformance, LibraryExercise } from "./types";

const calMuscles: Record<string, string> = { chest: "Pectoraux", back: "Dos", shoulders: "Épaules", triceps: "Triceps", forearms: "Avant-bras", quadriceps: "Quadriceps", calves: "Mollets", core: "Abdominaux", hips: "Fessiers" };
function guideForName(name: string) { return guides.find((guide) => guide.aliases.some((alias) => exerciseKey(alias) === exerciseKey(name))); }
function attachGuide(exercise: LibraryExercise, guide: Guide | undefined, language: "fr" | "en" | "ar"): LibraryExercise {
  return guide ? { ...exercise, guideId: guide.id, primary: guide.primary, secondary: guide.secondary,
    equipment: guide.equipment, level: exercise.discipline === "calisthenics" ? exercise.level : guide.level,
    image: guide.image ? { src: guide.image.src, alt: guide.image.alt[language] } : undefined } : exercise;
}

/** Request-only cache. No cross-user cache, writes, schema changes or gate activation. */
export const loadExerciseCatalog = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const calisthenicsReady = isCalisthenicsSchemaReady();
  const [profile, personal, calisthenics] = await Promise.all([
    getProfilePreferences(),
    fetchAllRows((from, to) => supabase.from("exercises").select("id,name,muscle_group").eq("user_id", user.id).order("name").order("id").range(from, to)),
    calisthenicsReady ? fetchAllRows((from, to) => supabase.from("calisthenics_exercises").select("*")
      .or(`user_id.is.null,user_id.eq.${user.id}`).order("exercise_key").order("id").range(from, to)) : Promise.resolve([] as CalisthenicsExercise[]),
  ]);
  if (profile.error) throw new Error("Exercise preferences unavailable");
  const language = isLanguage(profile.data?.language) ? profile.data.language : "fr";
  const exercises = baseCatalog(language).map((item) => attachGuide(item, guideForName(item.storedName), language));
  // This precise bodyweight variant is educational content, never inserted into the user's catalog.
  const squat = guides.find((guide) => guide.id === "bodyweight-squat")!;
  exercises.push(attachGuide({ key: squat.id, name: squat.names[language], storedName: squat.names.fr,
    discipline: "musculation", primary: squat.primary, secondary: [], equipment: [], level: null,
    guideId: null, origin: "builtin", searchNames: Object.values(squat.names) }, squat, language));
  for (const row of personal) {
    const builtin = exercises.find((item) => exerciseKey(item.storedName) === exerciseKey(row.name) && item.primary.includes(row.muscle_group));
    if (builtin) { builtin.databaseId = row.id; builtin.storedName = row.name; continue; }
    exercises.push(attachGuide({ key: `personal-${row.id}`, databaseId: row.id, name: row.name, storedName: row.name,
      discipline: "musculation", primary: [row.muscle_group], secondary: [], equipment: [], level: null,
      guideId: null, origin: "personal", searchNames: [row.name] }, guideForName(row.name), language));
  }
  for (const row of calisthenics) {
    const guide = row.user_id === null ? guides.find((item) => item.calisthenicsKeys?.includes(row.exercise_key)) : undefined;
    exercises.push(attachGuide({ key: `calisthenics-${row.id}`, databaseId: row.id,
      name: row[`name_${language}`], storedName: row.name_fr, discipline: "calisthenics",
      primary: calMuscles[row.primary_muscle] ? [calMuscles[row.primary_muscle]] : [], secondary: [],
      equipment: [], level: row.level, guideId: null, origin: "calisthenics",
      searchNames: [row.name_fr, row.name_en, row.name_ar, row.exercise_key],
      description: row[`description_${language}`], instructions: row[`instructions_${language}`] }, guide, language));
  }
  const illustrated = exercises.map((exercise) => {
    const media = visualMediaFor(exercise);
    return media ? { ...exercise,
      image: { src: media.heroImage.src, alt: media.heroImage.alt[language], fit: "contain" as const },
      thumbnail: { src: media.thumbnail.src, alt: media.thumbnail.alt[language], fit: "contain" as const },
    } : exercise;
  });
  return { exercises: illustrated, language, calisthenicsReady };
});

export type ExerciseRequest = { key?: string; name?: string; discipline?: Discipline; exerciseId?: string };
export function resolveExercise(exercises: LibraryExercise[], request: ExerciseRequest): LibraryExercise | undefined {
  if (request.key) return exercises.find((item) => item.key === request.key);
  if (request.exerciseId) return exercises.find((item) => item.discipline === request.discipline && item.databaseId === request.exerciseId);
  return exercises.find((item) => item.discipline === (request.discipline ?? "musculation") && exerciseKey(item.storedName) === exerciseKey(request.name ?? ""));
}

async function readPerformance(exercise: LibraryExercise): Promise<GuidePerformance> {
  const user = await getCurrentUser();
  if (!user) return { latest: null };
  const supabase = await createClient();
  const isCal = exercise.discipline === "calisthenics";
  if (isCal && (!isCalisthenicsSchemaReady() || !exercise.databaseId)) return { latest: null };
  if (exercise.discipline === "running") return { latest: null };
  const today = format(new Date(), "yyyy-MM-dd");
  // Existing case/whitespace identity / original ID, never translated alias joins.
  const strengthSets = !isCal ? await fetchAllRows((from, to) => supabase.from("workout_sets")
    .select("workout_id,exercise_name,muscle_group,exercise_position,set_number,reps,weight_kg")
    .eq("user_id", user.id).ilike("exercise_name", exerciseNamePattern(exercise.storedName)).order("created_at").order("id").range(from, to)) : [];
  const calSets = isCal ? await fetchAllRows((from, to) => supabase.from("calisthenics_sets").select("*")
    .eq("user_id", user.id).eq("exercise_id", exercise.databaseId!).order("created_at").order("id").range(from, to)) : [];
  const matchedSets = strengthSets.filter((set) => exerciseKey(set.exercise_name) === exerciseKey(exercise.storedName));
  const ids = [...new Set([...matchedSets, ...calSets].map((set) => set.workout_id))];
  const workouts: Workout[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    workouts.push(...await fetchAllRows((from, to) => supabase.from("workouts").select("*")
      .eq("user_id", user.id).in("id", ids.slice(index, index + 100)).lte("workout_date", today)
      .order("workout_date").order("created_at").order("id").range(from, to)));
  }
  const scoped = workouts.filter((workout) => isCal ? workout.discipline === "calisthenics" : workout.discipline !== "calisthenics" && workout.discipline !== "running");
  if (isCal) {
    const latest = scoped.sort((a, b) => b.workout_date.localeCompare(a.workout_date) || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))[0];
    return { latest: latest ? { date: latest.workout_date, workoutId: latest.id,
      sets: calSets.filter((set) => set.workout_id === latest.id).sort((a, b) => a.exercise_position - b.exercise_position || a.set_number - b.set_number)
        .map((set) => ({ reps: set.reps, weight: null, seconds: set.hold_seconds, assistance: set.assistance_kg, addedWeight: set.added_weight_kg, variation: set.variation })) } : null };
  }
  const summary = computeStrengthData(matchedSets, Object.fromEntries(scoped.map((workout) => [workout.id, workout.workout_date]))).exercises[0];
  const latest = summary?.sessions.at(-1);
  return { latest: latest ? { date: latest.date, workoutId: latest.workoutId, sets: latest.sets } : null,
    maxWeight: summary?.records.maxWeight ?? null, bestVolume: summary?.records.bestVolume ?? null };
}

export async function loadExerciseDetail(request: ExerciseRequest): Promise<ExerciseDetail | null> {
  const catalog = await loadExerciseCatalog();
  if (!catalog) return null;
  let exercise = resolveExercise(catalog.exercises, request);
  // A not-yet-saved draft can still ask for help, without inventing documentation or records.
  if (!exercise && !request.key && !request.exerciseId && request.name?.trim() && request.discipline !== "calisthenics") {
    exercise = { key: "unlisted", name: request.name.trim().slice(0, 160), storedName: request.name.trim().slice(0, 160),
      discipline: request.discipline ?? "musculation", primary: [], secondary: [], equipment: [], level: null,
      guideId: null, origin: "personal", searchNames: [] };
  }
  if (!exercise) return null;
  const guide = guides.find((item) => item.id === exercise.guideId);
  const media = visualMediaFor(exercise);
  const illustrated = !!media && hasExerciseMediaExperience(exercise.key);
  const anatomy = illustrated ? getExerciseAnatomy(exercise.key) : undefined;
  const anatomySummary = anatomy ? {
    primary: anatomy.muscles.filter((group) => group.role === "primary").map((group) => ATLAS_MUSCLES[group.id].name[catalog.language]),
    secondary: anatomy.muscles.filter((group) => group.role === "secondary").map((group) => ATLAS_MUSCLES[group.id].name[catalog.language]),
    stabilizer: anatomy.muscles.filter((group) => group.role === "stabilizer").map((group) => ATLAS_MUSCLES[group.id].name[catalog.language]),
    limitations: anatomy.limitations.map((note) => note[catalog.language]),
    details: anatomy.muscles.map((group) => ({ name: ATLAS_MUSCLES[group.id].name[catalog.language], role: group.role, action: anatomy.actions[group.id]?.[catalog.language] ?? null })),
  } : null;
  const sources = [...new Map([...(guide?.sources ?? []), ...(media?.technicalSources ?? [])].map((source) => [source.url, source])).values()];
  return { exercise, language: catalog.language, text: guide?.text[catalog.language] ?? (illustrated ? pilotTechnique(exercise.key, catalog.language) ?? v3Technique(exercise.key, catalog.language) : null), media, anatomySummary,
    muscles: exerciseMuscles(exercise.guideId, catalog.language),
    sources, performance: await readPerformance(exercise) };
}
