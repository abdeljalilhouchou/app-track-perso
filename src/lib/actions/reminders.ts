"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function enableReminders(
  subscriptionJson: string,
  timezone: string,
  time: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const sub = JSON.parse(subscriptionJson) as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );

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

export async function disableReminders(endpoint: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (endpoint) {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  } else {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  }

  await supabase
    .from("profiles")
    .update({ reminder_time: null, reminder_timezone: null })
    .eq("id", user.id);

  revalidatePath("/profil");
}
