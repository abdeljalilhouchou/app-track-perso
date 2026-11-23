"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { checkAutoHabits, uncheckAutoHabits } from "@/lib/habit-auto-sync";
import { beforeMidnight, eveningOf, validateSleepInput } from "@/lib/sleep";

export type SleepInput = { wakeDate: unknown; bedtime: unknown; wakeTime: unknown; quality: unknown; tags?: unknown };

// The phone's date is sent by the form; a day of margin covers time zones ahead of the server.
const latestAllowed = () => new Date(Date.now() + 14 * 3600_000).toISOString().slice(0, 10);

function sleepFail(error: { message: string; code?: string }): ActionResult {
  if (error.code === "42P01" || error.code === "PGRST205" || error.message.toLowerCase().includes("schema cache")) return fail("schema");
  return fail("generic");
}

function revalidateSleepViews() {
  for (const path of ["/sommeil", "/dashboard", "/habits"]) revalidatePath(path);
}

/** Saves (or replaces) the night that ended on `wakeDate`, and checks the "in bed before midnight" habits. */
export async function saveSleep(input: SleepInput): Promise<ActionResult & { habits?: string[] }> {
  const value = validateSleepInput(input, latestAllowed());
  if (!value) return fail("validation");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");

  const { error } = await supabase.from("sleep_logs").upsert({
    user_id: user.id, wake_date: value.wakeDate, bedtime: value.bedtime, wake_time: value.wakeTime,
    duration_minutes: value.minutes, quality: value.quality, tags: value.tags, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,wake_date" });
  if (error) return sleepFail(error);

  const evening = eveningOf(value.wakeDate);
  let habits: string[] = [];
  if (beforeMidnight(value.bedtime)) habits = await checkAutoHabits(supabase, user.id, evening, "sleep");
  else await uncheckAutoHabits(supabase, user.id, evening, "sleep");
  revalidateSleepViews();
  return { error: null, habits };
}

export async function deleteSleep(wakeDate: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wakeDate)) return fail("validation");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  const { error } = await supabase.from("sleep_logs").delete().eq("user_id", user.id).eq("wake_date", wakeDate);
  if (error) return sleepFail(error);
  await uncheckAutoHabits(supabase, user.id, eveningOf(wakeDate), "sleep");
  revalidateSleepViews();
  return ok;
}
