"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";

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
  const occurred_at = Number.isNaN(start.getTime()) ? new Date() : start;

  let duration_minutes: number | null = null;
  if (endStr) {
    const end = new Date(endStr);
    if (!Number.isNaN(end.getTime())) {
      const diff = Math.round((end.getTime() - occurred_at.getTime()) / 60000);
      duration_minutes = diff > 0 ? diff : null;
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
  if (!text) return fail("Le texte est requis.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { occurred_at, entry_date, duration_minutes } = parseTiming(formData);

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
  if (!text) return fail("Le texte est requis.");

  const supabase = await createClient();
  const { occurred_at, entry_date, duration_minutes } = parseTiming(formData);

  const { error: error2 } = await supabase
    .from("moments")
    .update({ text, icon, entry_date, occurred_at, duration_minutes, price })
    .eq("id", momentId);
  if (error2) return dbFail(error2);

  revalidatePath("/habits");

  return ok;
}

export async function deleteMoment(momentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error: error3 } = await supabase.from("moments").delete().eq("id", momentId);
  if (error3) return dbFail(error3);
  revalidatePath("/habits");

  return ok;
}
