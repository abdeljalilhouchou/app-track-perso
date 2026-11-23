import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
export type AutoSource = "sport" | "water" | "mood" | "sleep";

/**
 * Checks, for `date`, every active habit set to be checked by `source` (a sport session, the
 * water goal, the day's mood). A counted habit gets its goal as value. The log is marked with
 * its source so it can be undone without touching what the user checked by hand.
 * Returns the names of the habits newly checked.
 */
export async function checkAutoHabits(supabase: Client, userId: string, date: string, source: AutoSource): Promise<string[]> {
  const { data: habits, error } = await supabase
    .from("habits")
    .select("id, name, kind, goal_value")
    .eq("user_id", userId)
    .eq("archived", false)
    .eq("auto_source", source)
    .neq("kind", "avoid");
  if (error || !habits?.length) return [];

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("habit_id")
    .eq("user_id", userId)
    .eq("log_date", date)
    .in("habit_id", habits.map((habit) => habit.id));
  const already = new Set((existing ?? []).map((log) => log.habit_id));
  const missing = habits.filter((habit) => !already.has(habit.id));
  if (!missing.length) return [];

  const { error: insertError } = await supabase.from("habit_logs").insert(
    missing.map((habit) => ({ habit_id: habit.id, user_id: userId, log_date: date, source, value: habit.kind === "count" ? habit.goal_value : null }))
  );
  return insertError ? [] : missing.map((habit) => habit.name);
}

/** Removes the check-ins `source` made on `date`. */
export async function uncheckAutoHabits(supabase: Client, userId: string, date: string, source: AutoSource): Promise<number> {
  const { data, error } = await supabase
    .from("habit_logs")
    .delete()
    .eq("user_id", userId)
    .eq("log_date", date)
    .eq("source", source)
    .select("id");
  return error ? 0 : (data ?? []).length;
}

/** Water habits follow the day's water goal: plain water plus drinks logged in meals. */
export async function syncWaterHabits(supabase: Client, userId: string, date: string) {
  const [{ data: water }, { data: drinks }, { data: profile }] = await Promise.all([
    supabase.from("water_logs").select("ml").eq("user_id", userId).eq("entry_date", date).maybeSingle(),
    supabase.from("meal_entries").select("quantity_grams").eq("user_id", userId).eq("entry_date", date).eq("unit", "ml"),
    supabase.from("profiles").select("water_goal_ml").eq("id", userId).maybeSingle(),
  ]);
  const total = (water?.ml ?? 0) + (drinks ?? []).reduce((sum, drink) => sum + drink.quantity_grams, 0);
  const goal = profile?.water_goal_ml ?? 2000;
  if (total >= goal) await checkAutoHabits(supabase, userId, date, "water");
  else await uncheckAutoHabits(supabase, userId, date, "water");
}
