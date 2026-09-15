import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function nowInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function isoWeekday(dateStr: string) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const trace: Record<string, unknown>[] = [];

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return NextResponse.json({ error: "vapid not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createAdminClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, reminder_time, reminder_timezone, reminded_date")
    .not("reminder_time", "is", null)
    .not("reminder_timezone", "is", null);

  let notified = 0;

  for (const profile of profiles ?? []) {
    if (!profile.reminder_time || !profile.reminder_timezone) continue;

    const { date: todayLocal, time: nowLocal } = nowInTimezone(profile.reminder_timezone);
    const step: Record<string, unknown> = {
      profileId: profile.id,
      reminder_time: profile.reminder_time,
      reminder_timezone: profile.reminder_timezone,
      reminded_date: profile.reminded_date,
      todayLocal,
      nowLocal,
    };

    if (profile.reminded_date === todayLocal) {
      step.skipped = "already reminded today";
      trace.push(step);
      continue;
    }
    if (nowLocal < profile.reminder_time) {
      step.skipped = "not time yet";
      trace.push(step);
      continue;
    }

    const weekday = isoWeekday(todayLocal);

    const [{ data: habits, error: habitsError }, { data: todayLogs, error: logsError }] = await Promise.all([
      supabase
        .from("habits")
        .select("id, name, scheduled_days")
        .eq("user_id", profile.id)
        .eq("archived", false),
      supabase.from("habit_logs").select("habit_id").eq("user_id", profile.id).eq("log_date", todayLocal),
    ]);

    const doneIds = new Set((todayLogs ?? []).map((l) => l.habit_id));
    const pending = (habits ?? []).filter(
      (h) => h.scheduled_days.includes(weekday) && !doneIds.has(h.id)
    );

    step.habitsCount = habits?.length ?? 0;
    step.pendingCount = pending.length;
    step.habitsError = habitsError?.message ?? null;
    step.logsError = logsError?.message ?? null;

    if (pending.length === 0) {
      step.skipped = "nothing pending";
      trace.push(step);
      continue;
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", profile.id);

    step.subscriptionsCount = subscriptions?.length ?? 0;
    step.subscriptionsError = subsError?.message ?? null;

    if (!subscriptions || subscriptions.length === 0) {
      step.skipped = "no subscriptions";
      trace.push(step);
      continue;
    }

    const body =
      pending.length === 1
        ? `Il te reste "${pending[0].name}" à faire aujourd'hui.`
        : `Tu as encore ${pending.length} habitudes à faire aujourd'hui : ${pending
            .slice(0, 3)
            .map((h) => h.name)
            .join(", ")}${pending.length > 3 ? "…" : ""}`;

    const payload = JSON.stringify({ title: "track.perso", body, url: "/habits" });

    const sendResults = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          return { ok: true };
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          const message = (err as { message?: string }).message;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          return { ok: false, statusCode, message };
        }
      })
    );
    step.sendResults = sendResults;

    await supabase.from("profiles").update({ reminded_date: todayLocal }).eq("id", profile.id);
    notified += 1;
    trace.push(step);
  }

  return NextResponse.json({
    ok: true,
    notified,
    ...(debug ? { profilesError: profilesError?.message ?? null, profilesCount: profiles?.length ?? 0, trace } : {}),
  });
}
