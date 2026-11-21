"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";
import { isUuid, isValidIsoDate } from "@/lib/actions/validation";
import { CATEGORY_PRESETS } from "@/lib/habit-categories";
import { addDays, canUseJoker, indexLogs, weekStart } from "@/lib/habits-v2";

const HABIT_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fb923c", "#fbbf24", "#f472b6"];
const KINDS = ["check", "count", "avoid"] as const;
const MOMENTS = ["morning", "afternoon", "evening", "any"] as const;
const AUTO_SOURCES = ["sport", "water", "mood"] as const;

function parseScheduledDays(formData: FormData): number[] | null {
  const raw = formData.get("scheduled_days");
  if (typeof raw !== "string" || !raw) return null;
  const tokens = raw.split(",").map((day) => day.trim());
  const days = tokens.map(Number);
  if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return null;
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

/** Every field of the habit sheet, validated; null when something is off. */
function parseHabit(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "✨").trim() || "✨";
  const category = String(formData.get("category") ?? "Général").trim() || "Général";
  const kind = String(formData.get("kind") ?? "check") as (typeof KINDS)[number];
  const moment = String(formData.get("moment") ?? "any") as (typeof MOMENTS)[number];
  const autoRaw = String(formData.get("auto_source") ?? "").trim();
  const auto_source = autoRaw ? (autoRaw as (typeof AUTO_SOURCES)[number]) : null;
  const colorRaw = String(formData.get("color") ?? "").trim();
  const reminderRaw = String(formData.get("reminder_time") ?? "").trim();
  const goalRaw = String(formData.get("goal_value") ?? "").trim().replace(",", ".");
  const goal_unit = String(formData.get("goal_unit") ?? "").trim() || null;
  const joker_enabled = formData.get("joker_enabled") === "1" || formData.get("joker_enabled") === "on";
  const frequency = String(formData.get("frequency") ?? "days");
  let scheduled_days = frequency === "daily" || frequency === "weekly" ? [1, 2, 3, 4, 5, 6, 7] : parseScheduledDays(formData);
  if (kind === "avoid") scheduled_days = [1, 2, 3, 4, 5, 6, 7];
  const weeklyRaw = Number(formData.get("target_per_week") ?? 0);
  const target_per_week = frequency === "weekly" && kind !== "avoid" ? weeklyRaw : scheduled_days?.length ?? 0;
  const goal_value = kind === "count" ? Number(goalRaw) : null;

  const valid = name.length > 0 && name.length <= 100 && icon.length <= 24 &&
    CATEGORY_PRESETS.includes(category as (typeof CATEGORY_PRESETS)[number]) && scheduled_days !== null &&
    KINDS.includes(kind) && MOMENTS.includes(moment) && (auto_source === null || AUTO_SOURCES.includes(auto_source)) &&
    (kind !== "avoid" || auto_source === null) &&
    (!colorRaw || /^#[0-9a-f]{6}$/i.test(colorRaw)) &&
    (!reminderRaw || /^([01]\d|2[0-3]):[0-5]\d$/.test(reminderRaw)) &&
    (kind !== "count" || (Number.isFinite(goal_value) && goal_value! > 0 && goal_value! <= 100_000)) &&
    (goal_unit === null || goal_unit.length <= 20) &&
    Number.isInteger(target_per_week) && target_per_week >= 1 && target_per_week <= 7;
  if (!valid) return null;
  return {
    name, icon, category, kind, moment, auto_source, joker_enabled,
    color: colorRaw || null,
    reminder_time: reminderRaw || null,
    goal_value, goal_unit: kind === "count" ? goal_unit : null,
    scheduled_days: scheduled_days!, target_per_week,
  };
}

export async function createHabit(formData: FormData): Promise<ActionResult> {
  const fields = parseHabit(formData);
  if (!fields) return fail("Vérifie le nom, le type, la fréquence et l’objectif.");

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

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    ...fields,
    color: fields.color ?? HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)],
    position: count ?? 0,
  });
  if (error) return dbFail(error);
  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return ok;
}

export async function updateHabit(habitId: string, formData: FormData): Promise<ActionResult> {
  const fields = parseHabit(formData);
  if (!isUuid(habitId) || !fields) return fail("Données d’habitude invalides.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);
  const { color, ...rest } = fields;
  const { error: error2 } = await supabase
    .from("habits")
    .update(color ? { ...rest, color } : rest)
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
  const { error: error4 } = await supabase.from("habits").update({ archived: true, paused_at: new Date().toISOString() }).eq("id", habitId).eq("user_id", user.id);
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
    .update({ archived: false, paused_at: null, position: count ?? 0 })
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

  const { data: habit, error: habitError } = await supabase.from("habits").select("id, kind, goal_value")
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
    const { error: error7 } = await supabase.from("habit_logs").insert({ habit_id: habitId, user_id: user.id, log_date: date, value: habit.kind === "count" ? habit.goal_value : null });
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

/** Sets the counter of a counted habit for a day; 0 without a note removes the day. */
export async function setHabitCount(habitId: string, date: string, value: number): Promise<ActionResult> {
  if (!isUuid(habitId) || !isValidIsoDate(date) || !Number.isFinite(value) || value < 0 || value > 100_000) return fail("Valeur invalide.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: habit, error: habitError } = await supabase.from("habits").select("id, kind")
    .eq("id", habitId).eq("user_id", user.id).maybeSingle();
  if (habitError) return dbFail(habitError);
  if (!habit || habit.kind !== "count") return fail("Habitude introuvable.");

  const { data: existing, error: existingError } = await supabase.from("habit_logs").select("id, note")
    .eq("habit_id", habitId).eq("user_id", user.id).eq("log_date", date).maybeSingle();
  if (existingError) return dbFail(existingError);

  if (value === 0 && !existing?.note) {
    if (existing) {
      const { error } = await supabase.from("habit_logs").delete().eq("id", existing.id);
      if (error) return dbFail(error);
    }
  } else {
    const { error } = await supabase.from("habit_logs").upsert(
      { habit_id: habitId, user_id: user.id, log_date: date, value, is_joker: false, source: null },
      { onConflict: "habit_id,log_date" }
    );
    if (error) return dbFail(error);
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath(`/habits/${habitId}`);
  return ok;
}

/** Covers a missed day with the week's joker: one per ISO week, within the last 7 days. */
export async function applyHabitJoker(habitId: string, date: string, today: string): Promise<ActionResult> {
  if (!isUuid(habitId) || !isValidIsoDate(date) || !isValidIsoDate(today)) return fail("Date ou habitude invalide.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: habit, error: habitError } = await supabase.from("habits").select("*")
    .eq("id", habitId).eq("user_id", user.id).maybeSingle();
  if (habitError) return dbFail(habitError);
  if (!habit) return fail("Habitude introuvable.");

  const from = weekStart(date);
  const { data: weekLogs, error: logsError } = await supabase.from("habit_logs").select("habit_id, log_date, value, is_joker")
    .eq("habit_id", habitId).eq("user_id", user.id).gte("log_date", from).lte("log_date", addDays(from, 6));
  if (logsError) return dbFail(logsError);
  if (!canUseJoker(habit, indexLogs(weekLogs ?? []).get(habitId), date, today)) return fail("Le joker de cette semaine est déjà utilisé, ou ce jour ne peut pas être couvert.");

  const { error } = await supabase.from("habit_logs").insert({ habit_id: habitId, user_id: user.id, log_date: date, is_joker: true });
  if (error) return dbFail(error);

  revalidatePath("/habits");
  revalidatePath(`/habits/${habitId}`);
  return ok;
}

/** Saves the order of habits after a drag: positions follow the given ids. */
export async function reorderHabits(ids: string[]): Promise<ActionResult> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || ids.some((id) => !isUuid(id))) return fail("Ordre invalide.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const results = await Promise.all(ids.map((id, position) => supabase.from("habits").update({ position }).eq("id", id).eq("user_id", user.id)));
  const failed = results.find((result) => result.error)?.error;
  if (failed) return dbFail(failed);

  revalidatePath("/habits");
  return ok;
}
