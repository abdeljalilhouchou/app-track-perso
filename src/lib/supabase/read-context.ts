import "server-only";
import { cache } from "react";
import { createClient } from "./server";

// React cache lives for one Server Component request. Never use a persistent
// cache for this context, and keep mutation actions' own auth checks intact.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getProfilePreferences = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: null };
  const supabase = await createClient();
  return supabase.from("profiles")
    .select("display_name, theme, language, avatar_url, sport_weekly_goal")
    .eq("id", user.id)
    .maybeSingle();
});
