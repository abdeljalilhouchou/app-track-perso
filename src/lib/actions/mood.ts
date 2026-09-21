"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";

export async function logMood(formData: FormData): Promise<ActionResult> {
  const entry_date = String(formData.get("entry_date") ?? "");
  const mood_score = Number(formData.get("mood_score") ?? 3);
  const energy_level = Number(formData.get("energy_level") ?? 3);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!entry_date) return fail("La date est manquante.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error } = await supabase
    .from("mood_entries")
    .upsert(
      { user_id: user.id, entry_date, mood_score, energy_level, notes },
      { onConflict: "user_id,entry_date" }
    );
  if (error) return dbFail(error);

  revalidatePath("/humeur");
  revalidatePath("/dashboard");

  return ok;
}

// Updates only the mood score when today's entry exists, so energy and notes are kept.
export async function quickLogMood(entry_date: string, mood_score: number): Promise<ActionResult> {
  if (!entry_date || mood_score < 1 || mood_score > 5) return fail("Action impossible.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: existing } = await supabase
    .from("mood_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", entry_date)
    .maybeSingle();

  if (existing) {
    const { error: error2 } = await supabase.from("mood_entries").update({ mood_score }).eq("id", existing.id);
    if (error2) return dbFail(error2);
  } else {
    const { error: error3 } = await supabase.from("mood_entries").insert({ user_id: user.id, entry_date, mood_score, energy_level: 3 });
    if (error3) return dbFail(error3);
  }

  revalidatePath("/humeur");
  revalidatePath("/dashboard");

  return ok;
}

export async function deleteMoodEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error: error4 } = await supabase.from("mood_entries").delete().eq("id", id);
  if (error4) return dbFail(error4);
  revalidatePath("/humeur");
  revalidatePath("/dashboard");

  return ok;
}
