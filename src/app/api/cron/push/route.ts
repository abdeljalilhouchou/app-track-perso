import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/paging";
import { addDays, currentStreak, dayState, indexLogs, isFlexible } from "@/lib/habits-v2";
import { translate } from "@/lib/i18n/translate";
import { isLanguage } from "@/lib/language";
import { dueKinds, localNow, messageFor, parseSettings, STREAK_MIN, type DayFacts, type NotifyKind } from "@/lib/notifications";
import { pushReady, sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest, secret: string) {
  const value = request.headers.get("authorization") ?? "";
  if (!value.startsWith("Bearer ")) return false;
  const token = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return token.length === expected.length && timingSafeEqual(token, expected);
}

type Admin = ReturnType<typeof createAdminClient>;

/** Only what the due kinds need is read. */
async function factsFor(supabase: Admin, userId: string, date: string, kinds: NotifyKind[], waterGoal: number): Promise<DayFacts> {
  const facts: DayFacts = {};
  if (kinds.includes("habits") || kinds.includes("streak")) {
    const [habits, logs] = await Promise.all([
      fetchAllRows((f, t) => supabase.from("habits").select("id, name, kind, goal_value, scheduled_days, target_per_week, created_at, joker_enabled")
        .eq("user_id", userId).eq("archived", false).is("paused_at", null).order("id").range(f, t)),
      fetchAllRows((f, t) => supabase.from("habit_logs").select("habit_id, log_date, value, is_joker")
        .eq("user_id", userId).gte("log_date", addDays(date, -400)).order("log_date").order("habit_id").range(f, t)),
    ]);
    const index = indexLogs(logs);
    const pending = habits.filter((h) => (h.kind ?? "check") !== "avoid" && !isFlexible(h) && ["pending", "missed", "partial"].includes(dayState(h, index.get(h.id)?.get(date), date, date)));
    facts.pendingHabits = pending.map((h) => h.name);
    const streaks = pending.map((h) => ({ name: h.name, days: currentStreak(h, index.get(h.id), date) })).filter((s) => s.days >= STREAK_MIN).sort((a, b) => b.days - a.days);
    facts.streak = streaks[0] ?? null;
  }
  if (kinds.includes("mood")) {
    const { data } = await supabase.from("mood_entries").select("id").eq("user_id", userId).eq("entry_date", date).limit(1);
    facts.moodLogged = !!data?.length;
  }
  if (kinds.includes("sleep")) {
    const { data, error } = await supabase.from("sleep_logs").select("id").eq("user_id", userId).eq("wake_date", date).limit(1);
    // No sleep table yet: say nothing rather than nag.
    facts.sleepLogged = !!error || !!data?.length;
  }
  if (kinds.includes("water")) {
    const [{ data: water }, { data: drinks }] = await Promise.all([
      supabase.from("water_logs").select("ml").eq("user_id", userId).eq("entry_date", date).maybeSingle(),
      supabase.from("meal_entries").select("quantity_grams").eq("user_id", userId).eq("entry_date", date).eq("unit", "ml"),
    ]);
    facts.water = { ml: (water?.ml ?? 0) + (drinks ?? []).reduce((sum, d) => sum + d.quantity_grams, 0), goal: waterGoal };
  }
  return facts;
}

/**
 * Called every 15 minutes (Supabase pg_cron). For each person with notifications on, sends
 * what is due in their own time zone, at most once per kind and day.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "cron is not configured" }, { status: 500 });
  if (!authorized(request, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushReady()) return NextResponse.json({ error: "push is not configured" }, { status: 500 });

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const trace: Record<string, unknown>[] = [];
  let sent = 0;
  try {
    const supabase = createAdminClient();
    const rows = await fetchAllRows((f, t) => supabase.from("notification_settings").select("*").eq("enabled", true).order("user_id").range(f, t));
    const now = new Date();
    for (const row of rows) {
      const step: Record<string, unknown> = {};
      trace.push(step);
      const settings = parseSettings(row);
      const { date, time } = localNow(settings.timezone, now);
      const { data: log } = await supabase.from("notification_log").select("kind").eq("user_id", row.user_id).eq("local_date", date);
      const due = dueKinds(settings, date, time, (log ?? []).map((l) => l.kind));
      step.due = due.length;
      if (!due.length) continue;
      const { data: targets } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", row.user_id);
      if (!targets?.length) { step.skipped = "no device"; continue; }

      const { data: profile } = await supabase.from("profiles").select("language, water_goal_ml").eq("id", row.user_id).maybeSingle();
      const language = isLanguage(profile?.language) ? profile.language : "fr";
      const t = (path: string, vars?: Record<string, string | number>) => translate(language, path, vars);
      const locale = language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
      const number = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
      const facts = await factsFor(supabase, row.user_id, date, due, profile?.water_goal_ml ?? 2000);

      for (const kind of due) {
        const message = messageFor(kind, facts, t, number);
        if (!message) continue;
        let delivered = false;
        for (const target of targets) {
          const result = await sendPush(target, { ...message, tag: kind });
          if (result === "ok") delivered = true;
          if (result === "gone") await supabase.from("push_subscriptions").delete().eq("endpoint", target.endpoint);
        }
        if (delivered) {
          await supabase.from("notification_log").upsert({ user_id: row.user_id, kind, local_date: date }, { onConflict: "user_id,kind,local_date", ignoreDuplicates: true });
          sent += 1;
        }
      }
      step.done = true;
    }
    return NextResponse.json({ ok: true, sent, ...(debug ? { people: rows.length, trace } : {}) });
  } catch {
    return NextResponse.json({ error: "push processing failed" }, { status: 500 });
  }
}
