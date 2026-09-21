"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";

export async function enableEmailReminders(timezone: string, time: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error } = await supabase
    .from("profiles")
    .update({ reminder_time: time, reminder_timezone: timezone })
    .eq("id", user.id);
  if (error) return dbFail(error);

  revalidatePath("/profil");

  return ok;
}

export async function updateReminderTime(time: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error2 } = await supabase.from("profiles").update({ reminder_time: time }).eq("id", user.id);
  if (error2) return dbFail(error2);
  revalidatePath("/profil");

  return ok;
}

export async function disableReminders(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error3 } = await supabase
    .from("profiles")
    .update({ reminder_time: null, reminder_timezone: null, reminded_date: null })
    .eq("id", user.id);
  if (error3) return dbFail(error3);

  revalidatePath("/profil");

  return ok;
}
