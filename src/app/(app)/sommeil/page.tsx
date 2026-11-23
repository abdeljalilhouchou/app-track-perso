import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { getT } from "@/lib/i18n/get-dictionary";
import { SleepView } from "@/components/sleep/sleep-view";
import type { MoodDay, SleepLog } from "@/lib/sleep";

export default async function SommeilPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const since = format(subDays(now, 60), "yyyy-MM-dd");
  const [t, sleepResult, moodResult] = await Promise.all([
    getT(),
    supabase.from("sleep_logs").select("wake_date, bedtime, wake_time, duration_minutes, quality, tags")
      .eq("user_id", user.id).gte("wake_date", since).order("wake_date", { ascending: false }),
    supabase.from("mood_entries").select("entry_date, mood_score, energy_level")
      .eq("user_id", user.id).gte("entry_date", since),
  ]);

  // Before migration 0023 the table does not exist: say so instead of failing.
  if (sleepResult.error) {
    return <div className="page-shell space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t("sleep.title")}</h1>
      <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-foreground-muted" data-sleep-schema>{t("sleep.page.schema")}</p>
    </div>;
  }

  return <SleepView logs={(sleepResult.data ?? []) as SleepLog[]} moods={(moodResult.data ?? []) as MoodDay[]} today={today} />;
}
