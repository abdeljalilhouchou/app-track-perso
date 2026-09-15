"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";

export async function addMoment(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  const icon = String(formData.get("icon") ?? "⚡").trim() || "⚡";
  if (!text) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("moments").insert({
    user_id: user.id,
    entry_date: format(new Date(), "yyyy-MM-dd"),
    icon,
    text,
  });

  revalidatePath("/habits");
}

export async function deleteMoment(momentId: string) {
  const supabase = await createClient();
  await supabase.from("moments").delete().eq("id", momentId);
  revalidatePath("/habits");
}
