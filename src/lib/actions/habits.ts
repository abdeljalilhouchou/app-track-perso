"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";
import { isUuid, isValidIsoDate } from "@/lib/actions/validation";
import { CATEGORY_PRESETS } from "@/lib/habit-categories";

const HABIT_COLORS = ["#8b5cf6", "#6366f1", "#ec4899", "#f97316", "#0ea5e9", "#14b8a6"];

function parseScheduledDays(formData: FormData): number[] | null {
  const raw = formData.get("scheduled_days");
  if (typeof raw !== "string" || !raw) return null;
  const tokens = raw.split(",").map((day) => day.trim());
  const days = tokens.map(Number);
  if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return null;
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

function validFields(name: string, icon: string, category: string, days: number[] | null) {
  return name.length > 0 && name.length <= 100 && icon.length <= 24 && CATEGORY_PRESETS.includes(category as (typeof CATEGORY_PRESETS)[number]) && days !== null;
}

export async function createHabit(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "✨").trim() || "✨";
  const category = String(formData.get("category") ?? "Général").trim() || "Général";
  const scheduled_days = parseScheduledDays(formData);
  if (!scheduled_days || !validFields(name, icon, category, scheduled_days)) return fail("Vérifie le nom, la catégorie et les jours choisis.");
  const target_per_week = scheduled_days.length;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { count, error: countError } = await supabase
    .from("habits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) return dbFail(countError);

  const color = HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];

  const { error: error } = await supabase.from("habits").insert({
    user_id: user.id,
    name,
    icon,
    color,
    category,
    target_per_week,
    scheduled_days,
    position: count ?? 0,
  });
  if (error) return dbFail(error);
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return ok;
}

export async function updateHabit(habitId: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "✨").trim() || "✨";
  const category = String(formData.get("category") ?? "Général").trim() || "Général";
  const scheduled_days = parseScheduledDays(formData);
  if (!isUuid(habitId) || !scheduled_days || !validFields(name, icon, category, scheduled_days)) return fail("Données d’habitude invalides.");
  const target_per_week = scheduled_days.length;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);
  const { error: error2 } = await supabase
    .from("habits")
    .update({ name, icon, category, target_per_week, scheduled_days })
    .eq("id", habitId)
    .eq("user_id", user.id);
  if (error2) return dbFail(error2);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath(`/habits/${habitId}`);

  return ok;
}

export async function deleteHabit(habitId: string): Promise<ActionResult> {
  if (!isUuid(habitId)) return fail("Habitude invalide.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);
  const { error: error3 } = await supabase.from("habits").delete().eq("id", habitId).eq("user_id", user.id);
  if (error3) return dbFail(error3);
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return ok;
}

export async function pauseHabit(habitId: string): Promise<ActionResult> {
  if (!isUuid(habitId)) return fail("Habitude invalide.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);
  const { error: error4 } = await supabase.from("habits").update({ archived: true }).eq("id", habitId).eq("user_id", user.id);
  if (error4) return dbFail(error4);
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return ok;
}

export async function resumeHabit(habitId: string): Promise<ActionResult> {
  if (!isUuid(habitId)) return fail("Habitude invalide.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { count, error: countError } = await supabase
    .from("habits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("archived", false);
  if (countError) return dbFail(countError);

  const { error: error5 } = await supabase
    .from("habits")
    .update({ archived: false, position: count ?? 0 })
    .eq("id", habitId)
    .eq("user_id", user.id);
  if (error5) return dbFail(error5);

  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return ok;
}

export async function toggleHabitLog(habitId: string, date: string): Promise<ActionResult> {
  if (!isUuid(habitId) || !isValidIsoDate(date)) return fail("Date ou habitude invalide.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: habit, error: habitError } = await supabase.from("habits").select("id")
    .eq("id", habitId).eq("user_id", user.id).maybeSingle();
  if (habitError) return dbFail(habitError);
  if (!habit) return fail("Habitude introuvable.");

  const { data: existing, error: existingError } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("user_id", user.id)
    .eq("log_date", date)
    .maybeSingle();
  if (existingError) return dbFail(existingError);

  if (existing) {
    const { error: error6 } = await supabase.from("habit_logs").delete().eq("id", existing.id);
    if (error6) return dbFail(error6);
  } else {
    const { error: error7 } = await supabase.from("habit_logs").insert({ habit_id: habitId, user_id: user.id, log_date: date });
    if (error7) return dbFail(error7);
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath(`/habits/${habitId}`);

  return ok;
}

export async function setHabitLogNote(habitId: string, date: string, note: string): Promise<ActionResult> {
  if (!isUuid(habitId) || !isValidIsoDate(date) || typeof note !== "string" || note.length > 2000) {
    return fail("Date, habitude ou note invalide.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: habit, error: habitError } = await supabase.from("habits").select("id")
    .eq("id", habitId).eq("user_id", user.id).maybeSingle();
  if (habitError) return dbFail(habitError);
  if (!habit) return fail("Habitude introuvable.");

  const trimmed = note.trim();

  const { error: error8 } = await supabase
    .from("habit_logs")
    .upsert(
      { habit_id: habitId, user_id: user.id, log_date: date, note: trimmed || null },
      { onConflict: "habit_id,log_date" }
    );
  if (error8) return dbFail(error8);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath(`/habits/${habitId}`);

  return ok;
}

export async function moveHabit(habitId: string, direction: "up" | "down"): Promise<ActionResult> {
  if (!isUuid(habitId) || (direction !== "up" && direction !== "down")) return fail("Déplacement invalide.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("id, position")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (habitsError || !habits) return fail("Impossible de charger tes habitudes.");

  const index = habits.findIndex((h) => h.id === habitId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= habits.length) return ok;

  const current = habits[index];
  const target = habits[targetIndex];

  const updates = await Promise.all([
    supabase.from("habits").update({ position: target.position }).eq("id", current.id).eq("user_id", user.id),
    supabase.from("habits").update({ position: current.position }).eq("id", target.id).eq("user_id", user.id),
  ]);
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) {
    await Promise.all([
      supabase.from("habits").update({ position: current.position }).eq("id", current.id).eq("user_id", user.id),
      supabase.from("habits").update({ position: target.position }).eq("id", target.id).eq("user_id", user.id),
    ]);
    return dbFail(updateError);
  }

  revalidatePath("/habits");

  return ok;
}
