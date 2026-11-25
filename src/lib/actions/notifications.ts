"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { getLanguage } from "@/lib/i18n/get-dictionary";
import { translate } from "@/lib/i18n/translate";
import { isTimezone, parseSettings, type NotifySettings } from "@/lib/notifications";
import { pushReady, sendPush } from "@/lib/push";

type DbError = { message: string; code?: string };
const isSchema = (error: DbError) => error.code === "42P01" || error.code === "PGRST205" || error.message.toLowerCase().includes("schema cache");
const dbFail = (error: DbError): ActionResult => fail(isSchema(error) ? "schema" : "generic");

const isKey = (value: unknown, max: number) => typeof value === "string" && value.length > 0 && value.length <= max && /^[A-Za-z0-9_=-]+$/.test(value);

/** Remembers this device for notifications, and makes sure the person has settings. */
export async function savePushSubscription(input: { endpoint: unknown; keys?: { p256dh?: unknown; auth?: unknown } }, timezone: unknown): Promise<ActionResult> {
  const endpoint = input?.endpoint, p256dh = input?.keys?.p256dh, auth = input?.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 1000 || !/^https:\/\/[^\s]+$/.test(endpoint)) return fail("validation");
  if (!isKey(p256dh, 200) || !isKey(auth, 100)) return fail("validation");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");

  // The same phone may have been registered before: replace it.
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({ user_id: user.id, endpoint, p256dh: p256dh as string, auth: auth as string });
  if (error) return dbFail(error);

  const zone = isTimezone(timezone) ? timezone : "Europe/Paris";
  const { data: existing, error: readError } = await supabase.from("notification_settings").select("user_id").eq("user_id", user.id).maybeSingle();
  if (readError) return dbFail(readError);
  const { error: settingsError } = existing
    ? await supabase.from("notification_settings").update({ enabled: true, timezone: zone, updated_at: new Date().toISOString() }).eq("user_id", user.id)
    : await supabase.from("notification_settings").insert({ user_id: user.id, timezone: zone });
  if (settingsError) return dbFail(settingsError);
  revalidatePath("/profil/notifications");
  return ok;
}

export async function removePushSubscription(endpoint: unknown): Promise<ActionResult> {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return fail("validation");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) return dbFail(error);
  revalidatePath("/profil/notifications");
  return ok;
}

export async function saveNotificationSettings(input: Partial<NotifySettings>): Promise<ActionResult> {
  const s = parseSettings(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  const { error } = await supabase.from("notification_settings").upsert({
    user_id: user.id, enabled: s.enabled, timezone: s.timezone, kinds: s.kinds,
    quiet_on: s.quietOn, quiet_from: s.quietFrom, quiet_to: s.quietTo, cap_on: s.capOn, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return dbFail(error);
  return ok;
}

/** Sends a test notification to every device of the person. */
export async function sendTestNotification(): Promise<ActionResult & { sent?: number }> {
  if (!pushReady()) return fail("notReady");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("auth");
  const { data: targets, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", user.id);
  if (error) return dbFail(error);
  if (!targets?.length) return fail("none");
  const language = await getLanguage();
  const payload = { title: translate(language, "notify.testMessage.title"), body: translate(language, "notify.testMessage.body"), url: "/dashboard", tag: "test" };
  let sent = 0;
  for (const target of targets) {
    const result = await sendPush(target, payload);
    if (result === "ok") sent += 1;
    if (result === "gone") await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", target.endpoint);
  }
  return sent ? { error: null, sent } : fail("generic");
}
