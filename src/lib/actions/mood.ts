"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logMood(formData: FormData) {
  const entry_date = String(formData.get("entry_date") ?? "");
  const mood_score = Number(formData.get("mood_score") ?? 3);
  const energy_level = Number(formData.get("energy_level") ?? 3);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!entry_date) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("mood_entries")
    .upsert(
      { user_id: user.id, entry_date, mood_score, energy_level, notes },
      { onConflict: "user_id,entry_date" }
    );

  revalidatePath("/humeur");
  revalidatePath("/dashboard");
}

// Updates only the mood score when today's entry exists, so energy and notes are kept.
export async function quickLogMood(entry_date: string, mood_score: number) {
  if (!entry_date || mood_score < 1 || mood_score > 5) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("mood_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", entry_date)
    .maybeSingle();

  if (existing) {
    await supabase.from("mood_entries").update({ mood_score }).eq("id", existing.id);
  } else {
    await supabase.from("mood_entries").insert({ user_id: user.id, entry_date, mood_score, energy_level: 3 });
  }

  revalidatePath("/humeur");
  revalidatePath("/dashboard");
}

export async function deleteMoodEntry(id: string) {
  const supabase = await createClient();
  await supabase.from("mood_entries").delete().eq("id", id);
  revalidatePath("/humeur");
  revalidatePath("/dashboard");
}
