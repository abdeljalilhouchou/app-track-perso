"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const HABIT_COLORS = ["#8b5cf6", "#6366f1", "#ec4899", "#f97316", "#0ea5e9", "#14b8a6"];

export async function createHabit(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "✨").trim() || "✨";
  const category = String(formData.get("category") ?? "Général").trim() || "Général";
  const target_per_week = Math.min(7, Math.max(1, Number(formData.get("target_per_week") ?? 7)));
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { count } = await supabase
    .from("habits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const color = HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];

  await supabase.from("habits").insert({
    user_id: user.id,
    name,
    icon,
    color,
    category,
    target_per_week,
    position: count ?? 0,
  });
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function updateHabit(habitId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "✨").trim() || "✨";
  const category = String(formData.get("category") ?? "Général").trim() || "Général";
  const target_per_week = Math.min(7, Math.max(1, Number(formData.get("target_per_week") ?? 7)));
  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("habits")
    .update({ name, icon, category, target_per_week })
    .eq("id", habitId);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath(`/habits/${habitId}`);
}

export async function deleteHabit(habitId: string) {
  const supabase = await createClient();
  await supabase.from("habits").delete().eq("id", habitId);
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function toggleHabitLog(habitId: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("log_date", date)
    .maybeSingle();

  if (existing) {
    await supabase.from("habit_logs").delete().eq("id", existing.id);
  } else {
    await supabase.from("habit_logs").insert({ habit_id: habitId, user_id: user.id, log_date: date });
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath(`/habits/${habitId}`);
}

export async function moveHabit(habitId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: habits } = await supabase
    .from("habits")
    .select("id, position")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("position", { ascending: true });

  if (!habits) return;

  const index = habits.findIndex((h) => h.id === habitId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= habits.length) return;

  const current = habits[index];
  const target = habits[targetIndex];

  await Promise.all([
    supabase.from("habits").update({ position: target.position }).eq("id", current.id),
    supabase.from("habits").update({ position: current.position }).eq("id", target.id),
  ]);

  revalidatePath("/habits");
}
