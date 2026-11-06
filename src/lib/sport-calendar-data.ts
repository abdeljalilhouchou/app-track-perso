import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getProfilePreferences } from "@/lib/supabase/read-context";
import { fetchAllRows } from "@/lib/paging";
import { isLanguage } from "@/lib/language";
import type { sportCalendarRange } from "@/lib/sport-calendar";

export async function loadSportCalendarData(range: ReturnType<typeof sportCalendarRange>) {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const [workouts, profile] = await Promise.all([
    fetchAllRows((from, to) => supabase.from("workouts")
      // Keep optional discipline metadata when present, without explicitly
      // requiring the column added by the unverified 0019 migration.
      .select("*")
      .eq("user_id", user.id)
      .gte("workout_date", range.from).lte("workout_date", range.to)
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(from, to)),
    getProfilePreferences(),
  ]);
  if (profile.error) throw new Error("Impossible de charger les préférences du calendrier.");
  return { workouts, language: isLanguage(profile.data?.language) ? profile.data.language : "fr" as const };
}
