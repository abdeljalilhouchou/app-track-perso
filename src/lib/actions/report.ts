"use server";

import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paging";
import { buildReport, periodRange, type RawReport, type ReportData, type ReportPeriod } from "@/lib/report";

const CHUNK = 60;

function validate(period: ReportPeriod, today: string): string | null {
  const thisYear = Number(today.slice(0, 4));
  if (!Number.isInteger(period.year) || period.year < 2000 || period.year > thisYear) return "Année invalide.";
  if (period.kind === "month") {
    if (!Number.isInteger(period.month) || period.month < 1 || period.month > 12) return "Mois invalide.";
    if (periodRange(period).start > today) return "Ce mois n'a pas encore commencé.";
  }
  return null;
}

export async function getReport(period: ReportPeriod): Promise<{ data: ReportData | null; error: string | null }> {
  const today = format(new Date(), "yyyy-MM-dd");
  const invalid = validate(period, today);
  if (invalid) return { data: null, error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Non connecté." };

  const { start, end } = periodRange(period);
  const uid = user.id;

  try {
    const [profile, habits, habitLogs, workouts, moods, meals, water, weights] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, goal_calories, goal_protein, goal_carbs, goal_fat")
        .eq("id", uid)
        .single(),
      supabase.from("habits").select("id, name, scheduled_days, created_at").eq("user_id", uid),
      fetchAllRows((from, to) =>
        supabase
          .from("habit_logs")
          .select("habit_id, log_date")
          .eq("user_id", uid)
          .gte("log_date", start)
          .lte("log_date", end)
          .order("id")
          .range(from, to)
      ),
      supabase
        .from("workouts")
        .select("id, workout_date, activity, duration_minutes, intensity")
        .eq("user_id", uid)
        .gte("workout_date", start)
        .lte("workout_date", end),
      supabase
        .from("mood_entries")
        .select("entry_date, mood_score, energy_level, notes")
        .eq("user_id", uid)
        .gte("entry_date", start)
        .lte("entry_date", end),
      fetchAllRows((from, to) =>
        supabase
          .from("meal_entries")
          .select("entry_date, calories, protein, carbs, fat, sugar, caffeine, unit, quantity_grams")
          .eq("user_id", uid)
          .gte("entry_date", start)
          .lte("entry_date", end)
          .order("id")
          .range(from, to)
      ),
      supabase.from("water_logs").select("entry_date, ml").eq("user_id", uid).gte("entry_date", start).lte("entry_date", end),
      supabase.from("weight_logs").select("entry_date, weight_kg").eq("user_id", uid).gte("entry_date", start).lte("entry_date", end),
    ]);

    const firstError = [profile, habits, workouts, moods, water, weights].find((r) => r.error)?.error;
    if (firstError) return { data: null, error: firstError.message };

    // Sets are fetched per chunk of workout ids (an `in` filter with hundreds of ids would overflow the URL).
    const workoutRows = workouts.data ?? [];
    const sets: RawReport["sets"] = [];
    try {
      for (let i = 0; i < workoutRows.length; i += CHUNK) {
        const ids = workoutRows.slice(i, i + CHUNK).map((w) => w.id);
        sets.push(
          ...(await fetchAllRows((from, to) =>
            supabase
              .from("workout_sets")
              .select("workout_id, exercise_name, muscle_group, reps, weight_kg")
              .in("workout_id", ids)
              .order("id")
              .range(from, to)
          ))
        );
      }
    } catch {
      // The strength tables may not exist yet (migration 0016): the report simply has no set details.
    }

    const raw: RawReport = {
      userName: profile.data?.display_name || user.email?.split("@")[0] || "Utilisateur",
      goals: {
        calories: profile.data?.goal_calories ?? null,
        protein: profile.data?.goal_protein ?? null,
        carbs: profile.data?.goal_carbs ?? null,
        fat: profile.data?.goal_fat ?? null,
      },
      habits: habits.data ?? [],
      habitLogs,
      workouts: workoutRows,
      sets,
      moods: moods.data ?? [],
      meals,
      water: water.data ?? [],
      weights: weights.data ?? [],
    };

    return { data: buildReport(raw, period, today), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Impossible de préparer le rapport." };
  }
}
