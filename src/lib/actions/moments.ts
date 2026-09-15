"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";

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

export async function addMoment(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  const icon = String(formData.get("icon") ?? "⚡").trim() || "⚡";
  const price = parseOptionalPrice(formData.get("price"));
  if (!text) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { occurred_at, entry_date, duration_minutes } = parseTiming(formData);

  await supabase.from("moments").insert({
    user_id: user.id,
    entry_date,
    occurred_at,
    icon,
    text,
    duration_minutes,
    price,
  });

  revalidatePath("/habits");
  revalidatePath("/journal");
}

export async function updateMoment(momentId: string, formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  const icon = String(formData.get("icon") ?? "⚡").trim() || "⚡";
  const price = parseOptionalPrice(formData.get("price"));
  if (!text) return;

  const supabase = await createClient();
  const { occurred_at, entry_date, duration_minutes } = parseTiming(formData);

  await supabase
    .from("moments")
    .update({ text, icon, entry_date, occurred_at, duration_minutes, price })
    .eq("id", momentId);

  revalidatePath("/habits");
  revalidatePath("/journal");
}

export async function deleteMoment(momentId: string) {
  const supabase = await createClient();
  await supabase.from("moments").delete().eq("id", momentId);
  revalidatePath("/habits");
  revalidatePath("/journal");
}
