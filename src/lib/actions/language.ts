"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLanguage } from "@/lib/language";

export async function saveLanguage(language: string) {
  if (!isLanguage(language)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ language }).eq("id", user.id);
  revalidatePath("/", "layout");
}
