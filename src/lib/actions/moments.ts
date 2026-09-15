"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseOptionalPrice(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export async function addMoment(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  const icon = String(formData.get("icon") ?? "⚡").trim() || "⚡";
  const entry_date = String(formData.get("entry_date") ?? "").trim() || format(new Date(), "yyyy-MM-dd");
  const duration_minutes = parseOptionalInt(formData.get("duration_minutes"));
  const price = parseOptionalPrice(formData.get("price"));
  if (!text) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("moments").insert({
    user_id: user.id,
    entry_date,
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
  const entry_date = String(formData.get("entry_date") ?? "").trim();
  const duration_minutes = parseOptionalInt(formData.get("duration_minutes"));
  const price = parseOptionalPrice(formData.get("price"));
  if (!text || !entry_date) return;

  const supabase = await createClient();
  await supabase
    .from("moments")
    .update({ text, icon, entry_date, duration_minutes, price })
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
