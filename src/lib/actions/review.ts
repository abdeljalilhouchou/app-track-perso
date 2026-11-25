"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { addDays, weekStart } from "@/lib/habits-v2";
import { isGoal } from "@/lib/weekly-review";

/**
 * Saves the one goal for the week starting `week` (a Monday): this week or the next one,
 * judged from the phone's date with a day of margin either side for time zones.
 */
export async function saveWeeklyGoal(week: string, key: string, target: number): Promise<ActionResult> {
  if (typeof week !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(week) || weekStart(week) !== week) return fail("validation");
  if (!isGoal({ key, target })) return fail("validation");
  const now = new Date();
  const earliest = weekStart(new Date(now.getTime() - 14 * 3600_000).toISOString().slice(0, 10));
  const latest = addDays(weekStart(new Date(now.getTime() + 14 * 3600_000).toISOString().slice(0, 10)), 7);
  if (week < earliest || week > latest) return fail("validation");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  const { error } = await supabase.from("weekly_goals").upsert(
    { user_id: user.id, week_start: week, goal_key: key, target, updated_at: now.toISOString() },
    { onConflict: "user_id,week_start" },
  );
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205" || error.message.toLowerCase().includes("schema cache")) return fail("schema");
    return fail("generic");
  }
  revalidatePath("/bilan");
  return ok;
}
