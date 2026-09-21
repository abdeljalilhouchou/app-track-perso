import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Habits of this category are ticked automatically whenever a sport session is recorded. */
export const SPORT_CATEGORY = "Sport";

/** Checks every active "Sport" habit for `date`. Returns the names that were newly checked. */
export async function checkSportHabits(supabase: Client, userId: string, date: string): Promise<string[]> {
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", userId)
    .eq("archived", false)
    .eq("category", SPORT_CATEGORY);
  if (!habits || habits.length === 0) return [];

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("habit_id")
    .eq("user_id", userId)
    .eq("log_date", date)
    .in(
      "habit_id",
      habits.map((h) => h.id)
    );
  const already = new Set((existing ?? []).map((l) => l.habit_id));
  const missing = habits.filter((h) => !already.has(h.id));
  if (missing.length === 0) return [];

  const rows = missing.map((h) => ({ habit_id: h.id, user_id: userId, log_date: date, source: "sport" }));
  let { error } = await supabase.from("habit_logs").insert(rows);
  if (error) {
    // `source` may not exist yet (migration 0017): still tick the habits, just without undo tracking.
    ({ error } = await supabase
      .from("habit_logs")
      .insert(rows.map(({ habit_id, user_id, log_date }) => ({ habit_id, user_id, log_date }))));
  }
  return error ? [] : missing.map((h) => h.name);
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
