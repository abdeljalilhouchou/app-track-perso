import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { HabitsView } from "@/components/habits/habits-view";
import { getLanguage } from "@/lib/i18n/get-dictionary";
import { fetchAllRows } from "@/lib/paging";

export default async function HabitsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const since180 = format(subDays(now, 180), "yyyy-MM-dd");

  const [language, habits, paused, logs, moods] = await Promise.all([
    getLanguage(),
    fetchAllRows((from, to) => supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", false)
      .order("position").order("id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", true)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
    fetchAllRows((from, to) => supabase.from("habit_logs").select("habit_id, log_date, value, is_joker, note, source").eq("user_id", user.id)
      .order("log_date").order("habit_id").range(from, to)),
    fetchAllRows((from, to) => supabase.from("mood_entries").select("entry_date, mood_score").eq("user_id", user.id).gte("entry_date", since180)
      .order("entry_date").order("id").range(from, to)),
  ]);

  const locale = language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
  const todayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${today}T12:00:00`));

  return (
    <HabitsView
      habits={[...habits].sort((a, b) => a.position - b.position)}
      paused={paused}
      logs={logs.map((log) => ({ ...log, value: log.value === null ? null : Number(log.value), is_joker: !!log.is_joker }))}
      moods={moods}
      today={today}
      todayLabel={todayLabel}
    />
  );
}
