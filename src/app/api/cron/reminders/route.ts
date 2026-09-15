import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
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

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "resend not configured" }, { status: 500 });
  }
  const resend = new Resend(resendApiKey);
  const fromAddress = process.env.REMINDER_FROM_EMAIL || "track.perso <onboarding@resend.dev>";

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
        .select("id, name, icon, scheduled_days")
        .eq("user_id", profile.id)
        .eq("archived", false),
      supabase.from("habit_logs").select("habit_id").eq("user_id", profile.id).eq("log_date", todayLocal),
    ]);

    const doneIds = new Set((todayLogs ?? []).map((l) => l.habit_id));
    const pending = (habits ?? []).filter(
      (h) => h.scheduled_days.includes(weekday) && !doneIds.has(h.id)
    );

    if (pending.length === 0) continue;

    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (!email) continue;

    const listHtml = pending.map((h) => `<li>${h.icon} ${h.name}</li>`).join("");
    const subject =
      pending.length === 1 ? `Il te reste "${pending[0].name}" à faire aujourd'hui` : `${pending.length} habitudes à faire aujourd'hui`;

    try {
      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: `track.perso — ${subject}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Il te reste des habitudes aujourd'hui 👋</h2>
            <ul style="line-height: 1.8; font-size: 15px;">${listHtml}</ul>
            <p>
              <a href="https://app-track-perso.vercel.app/habits" style="color: #6366f1;">Ouvrir track.perso →</a>
            </p>
          </div>
        `,
      });
      await supabase.from("profiles").update({ reminded_date: todayLocal }).eq("id", profile.id);
      notified += 1;
    } catch {
      // best-effort: skip this user, try again next run (reminded_date not set)
    }
  }

  return NextResponse.json({ ok: true, notified });
}
