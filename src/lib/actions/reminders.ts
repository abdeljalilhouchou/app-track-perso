"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function enableEmailReminders(timezone: string, time: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ reminder_time: time, reminder_timezone: timezone })
    .eq("id", user.id);

  revalidatePath("/profil");
}

export async function updateReminderTime(time: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ reminder_time: time }).eq("id", user.id);
  revalidatePath("/profil");
}

export async function disableReminders() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ reminder_time: null, reminder_timezone: null, reminded_date: null })
    .eq("id", user.id);

  revalidatePath("/profil");
}
