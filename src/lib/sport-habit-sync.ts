import type { createClient } from "@/lib/supabase/server";
import { checkAutoHabits } from "@/lib/habit-auto-sync";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Habits of this category are ticked automatically whenever a sport session is recorded. */
export const SPORT_CATEGORY = "Sport";

/** Checks every habit set to be checked by sport sessions (all former "Sport" habits, see migration 0021). */
export async function checkSportHabits(supabase: Client, userId: string, date: string): Promise<string[]> {
  return checkAutoHabits(supabase, userId, date, "sport");
}

/** After a session is deleted: if nothing else was logged that day, undo the automatic check-ins. */
export async function uncheckSportHabits(supabase: Client, userId: string, date: string): Promise<number> {
  const { count } = await supabase
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("workout_date", date);
  if ((count ?? 0) > 0) return 0;

  const { data, error } = await supabase
    .from("habit_logs")
    .delete()
    .eq("user_id", userId)
    .eq("log_date", date)
    .eq("source", "sport")
    .select("id");
  return error ? 0 : (data ?? []).length;
}

export function syncNotice(names: string[]): string | undefined {
  if (names.length === 0) return undefined;
  return names.length === 1
    ? `Habitude « ${names[0]} » cochée automatiquement grâce à ta séance.`
    : `${names.length} habitudes Sport cochées automatiquement grâce à ta séance.`;
}
