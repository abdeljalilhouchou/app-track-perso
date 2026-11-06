import { format, startOfWeek } from "date-fns";
import { setsVolume } from "@/lib/strength";
import { suggestNextTemplate } from "@/lib/strength-stats";
import type { Workout, WorkoutSet, WorkoutTemplate } from "@/types/database";

export type HubSet = Pick<WorkoutSet, "id" | "workout_id" | "reps" | "weight_kg">;
export type HubTemplate = Pick<WorkoutTemplate, "id" | "name" | "muscle_groups">;

// Keep the Hub's established classification, including legacy untagged rows.
export function classifySportWorkouts(workouts: Workout[], setWorkoutIds: Set<string>) {
  const calisthenics = workouts.filter((workout) => workout.discipline === "calisthenics").length;
  const running = workouts.filter((workout) => workout.discipline === "running").length;
  const strength = workouts.filter((workout) => workout.discipline === "strength" ||
    (workout.discipline !== "calisthenics" && workout.discipline !== "running" && (Boolean(workout.template_id) || setWorkoutIds.has(workout.id)))).length;
  return { strength, calisthenics, running, unclassified: Math.max(0, workouts.length - strength - calisthenics - running) };
}

export function summarizeHubTraining(workouts: Workout[], sets: HubSet[], templates: HubTemplate[], now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  // Match the existing strength workspace's discipline scope and recommendation.
  const strengthWorkouts = workouts.filter((workout) => workout.discipline !== "calisthenics" && workout.discipline !== "running");
  const weekIds = new Set(strengthWorkouts.filter((workout) => workout.workout_date >= weekStart && workout.workout_date <= today).map((workout) => workout.id));
  const weekSets = sets.filter((set) => weekIds.has(set.workout_id));
  const suggestedId = suggestNextTemplate(templates.map((template) => template.id), strengthWorkouts);
  return {
    // Missing series are unknown volume, not a fabricated zero. Recorded
    // bodyweight sets with zero external load legitimately produce zero kg.
    weeklyStrengthVolume: weekSets.length ? setsVolume(weekSets.map((set) => ({ reps: set.reps, weight: Number(set.weight_kg) }))) : null,
    recordedStrengthSets: weekSets.length,
    nextTemplate: templates.find((template) => template.id === suggestedId) ?? null,
    recent: workouts.filter((workout) => workout.workout_date <= today).slice(0, 6),
  };
}

export function sportWorkoutHref(workout: Pick<Workout, "id" | "workout_date" | "discipline">) {
  return workout.discipline === "calisthenics" ? `/sport/calisthenics?session=${encodeURIComponent(workout.id)}`
    : workout.discipline === "running" ? `/sport/running?session=${encodeURIComponent(workout.id)}`
    : `/sport/musculation?date=${encodeURIComponent(workout.workout_date)}`;
}
