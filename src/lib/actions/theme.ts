"use server";

import { createClient } from "@/lib/supabase/server";
import { isTheme } from "@/lib/theme";

export async function saveTheme(theme: string) {
  if (!isTheme(theme)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ theme }).eq("id", user.id);
}
