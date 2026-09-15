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

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return NextResponse.json({ error: "vapid not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, reminder_time, reminder_timezone, reminded_date")
    .not("reminder_time", "is", null)
    .not("reminder_timezone", "is", null);

  let notified = 0;

  for (const profile of profiles ?? []) {
    if (!profile.reminder_time || !profile.reminder_timezone) continue;

    const { date: todayLocal, time: nowLocal } = nowInTimezone(profile.reminder_timezone);
    if (profile.reminded_date === todayLocal) continue;
    if (nowLocal < profile.reminder_time) continue;

    const weekday = isoWeekday(todayLocal);

    const [{ data: habits }, { data: todayLogs }] = await Promise.all([
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

    if (pending.length === 0) continue;

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", profile.id);

    if (!subscriptions || subscriptions.length === 0) continue;

    const body =
      pending.length === 1
        ? `Il te reste "${pending[0].name}" à faire aujourd'hui.`
        : `Tu as encore ${pending.length} habitudes à faire aujourd'hui : ${pending
            .slice(0, 3)
            .map((h) => h.name)
            .join(", ")}${pending.length > 3 ? "…" : ""}`;

    const payload = JSON.stringify({ title: "track.perso", body, url: "/habits" });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      })
    );

    await supabase.from("profiles").update({ reminded_date: todayLocal }).eq("id", profile.id);
    notified += 1;
  }

  return NextResponse.json({ ok: true, notified });
}
