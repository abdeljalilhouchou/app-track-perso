"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";
import { isFiniteInRange, isUuid } from "@/lib/actions/validation";

function parseOptionalPrice(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Parses "YYYY-MM-DDTHH:mm" datetime-local values and derives duration from start/end. */
function parseTiming(formData: FormData) {
  const startStr = String(formData.get("occurred_at") ?? "").trim();
  const endStr = String(formData.get("ended_at") ?? "").trim();

  const start = startStr ? new Date(startStr) : new Date();
  if ((startStr && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startStr) || Number.isNaN(start.getTime()))) ||
    (endStr && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endStr) || Number.isNaN(new Date(endStr).getTime())))) return null;
  const occurred_at = start;

  let duration_minutes: number | null = null;
  if (endStr) {
    const end = new Date(endStr);
    if (!Number.isNaN(end.getTime())) {
      const diff = Math.round((end.getTime() - occurred_at.getTime()) / 60000);
      if (diff <= 0 || diff > 10_080) return null;
      duration_minutes = diff;
    }
  }

  return {
    occurred_at: occurred_at.toISOString(),
    entry_date: format(occurred_at, "yyyy-MM-dd"),
    duration_minutes,
  };
}

export async function addMoment(formData: FormData): Promise<ActionResult> {
  const text = String(formData.get("text") ?? "").trim();
  const icon = String(formData.get("icon") ?? "⚡").trim() || "⚡";
  const price = parseOptionalPrice(formData.get("price"));
  const priceRaw = String(formData.get("price") ?? "").trim();
  if (!text || text.length > 1000 || icon.length > 24 ||
    (priceRaw !== "" && !isFiniteInRange(Number(priceRaw), 0, 1_000_000))) return fail("Vérifie le texte et le prix.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const timing = parseTiming(formData);
  if (!timing) return fail("Vérifie l’heure de début et de fin.");
  const { occurred_at, entry_date, duration_minutes } = timing;

  const { error: error } = await supabase.from("moments").insert({
    user_id: user.id,
    entry_date,
    occurred_at,
    icon,
    text,
    duration_minutes,
    price,
  });
  if (error) return dbFail(error);

  revalidatePath("/habits");

  return ok;
}

export async function updateMoment(momentId: string, formData: FormData): Promise<ActionResult> {
  const text = String(formData.get("text") ?? "").trim();
  const icon = String(formData.get("icon") ?? "⚡").trim() || "⚡";
  const price = parseOptionalPrice(formData.get("price"));
  const priceRaw = String(formData.get("price") ?? "").trim();
  if (!isUuid(momentId) || !text || text.length > 1000 || icon.length > 24 ||
    (priceRaw !== "" && !isFiniteInRange(Number(priceRaw), 0, 1_000_000))) return fail("Vérifie le texte et le prix.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);
  const timing = parseTiming(formData);
  if (!timing) return fail("Vérifie l’heure de début et de fin.");
  const { occurred_at, entry_date, duration_minutes } = timing;

  const { error: error2 } = await supabase
    .from("moments")
    .update({ text, icon, entry_date, occurred_at, duration_minutes, price })
    .eq("id", momentId)
    .eq("user_id", user.id);
  if (error2) return dbFail(error2);

  revalidatePath("/habits");

  return ok;
}

export async function deleteMoment(momentId: string): Promise<ActionResult> {
  if (!isUuid(momentId)) return fail("Moment invalide.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);
  const { error: error3 } = await supabase.from("moments").delete().eq("id", momentId).eq("user_id", user.id);
  if (error3) return dbFail(error3);
  revalidatePath("/habits");

  return ok;
}
