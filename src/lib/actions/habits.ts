"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const HABIT_COLORS = ["#8b5cf6", "#6366f1", "#ec4899", "#f97316", "#0ea5e9", "#14b8a6"];

export async function createHabit(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "✨").trim() || "✨";
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const color = HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];

  await supabase.from("habits").insert({ user_id: user.id, name, icon, color });
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
}

export async function archiveHabit(habitId: string) {
  const supabase = await createClient();
  await supabase.from("habits").update({ archived: true }).eq("id", habitId);
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}
