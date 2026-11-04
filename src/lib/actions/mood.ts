"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";
import { isFiniteInRange, isUuid, isValidIsoDate } from "@/lib/actions/validation";

export async function logMood(formData: FormData): Promise<ActionResult> {
  const entry_date = String(formData.get("entry_date") ?? "");
  const mood_score = Number(formData.get("mood_score") ?? 3);
  const energy_level = Number(formData.get("energy_level") ?? 3);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!isValidIsoDate(entry_date) || !isFiniteInRange(mood_score, 1, 5, true) || !isFiniteInRange(energy_level, 1, 5, true) ||
    (notes !== null && notes.length > 2000)) return fail("Vérifie la date, l’humeur, l’énergie et la note.");

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
  if (!isValidIsoDate(entry_date) || !isFiniteInRange(mood_score, 1, 5, true)) return fail("Date ou humeur invalide.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: existing, error: existingError } = await supabase
    .from("mood_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", entry_date)
    .maybeSingle();
  if (existingError) return dbFail(existingError);

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
  if (!isUuid(id)) return fail("Entrée d’humeur invalide.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);
  const { error: error4 } = await supabase.from("mood_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error4) return dbFail(error4);
  revalidatePath("/humeur");
  revalidatePath("/dashboard");

  return ok;
}
