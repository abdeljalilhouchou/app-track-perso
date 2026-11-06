import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfilePreferences } from "@/lib/supabase/read-context";
import { fetchAllRows } from "@/lib/paging";
import type { Language } from "@/lib/language";
import type { RunningGoal, RunningSession, Workout } from "@/types/database";
import type { RunningRun } from "./stats";

export async function loadRunningData(): Promise<{ runs: RunningRun[]; goals: RunningGoal | null; language: Language } | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const [sessions, workouts, goalResult, profileResult] = await Promise.all([
    fetchAllRows((from, to) => supabase.from("running_sessions").select("*").eq("user_id", user.id).order("workout_id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("workouts")
      .select("id, user_id, workout_date, activity, duration_minutes, intensity, notes, discipline, created_at")
      .eq("user_id", user.id).eq("discipline", "running")
      .order("workout_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(from, to)),
    supabase.from("running_goals").select("*").eq("user_id", user.id).maybeSingle(),
    getProfilePreferences(),
  ]);
  if (goalResult.error || profileResult.error) throw new Error("Impossible de charger les données Running.");

  const sessionByWorkout = new Map((sessions as RunningSession[]).map((session) => [session.workout_id, session]));
  const runs = (workouts as Pick<Workout, "id" | "user_id" | "workout_date" | "activity" | "duration_minutes" | "intensity" | "notes" | "discipline" | "created_at">[])
    .flatMap((workout): RunningRun[] => {
      const session = sessionByWorkout.get(workout.id);
      if (!session || workout.discipline !== "running") return [];
      return [{
        workout_id: workout.id,
        user_id: workout.user_id,
        workout_date: workout.workout_date,
        activity: workout.activity,
        duration_minutes: workout.duration_minutes,
        intensity: workout.intensity,
        workout_notes: workout.notes,
        name: session.name,
        run_type: session.run_type,
        distance_km: session.distance_km,
        duration_seconds: session.duration_seconds,
        elevation_gain_m: session.elevation_gain_m,
        average_heart_rate: session.average_heart_rate,
        cadence_spm: session.cadence_spm,
        created_at: workout.created_at,
      }];
    });
  const supportedLanguage: Language = profileResult.data?.language === "en" || profileResult.data?.language === "ar" ? profileResult.data.language : "fr";
  return { runs, goals: goalResult.data, language: supportedLanguage };
}
