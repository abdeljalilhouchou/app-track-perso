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

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const trace: Record<string, unknown>[] = [];

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "resend not configured" }, { status: 500 });
  }
  const resend = new Resend(resendApiKey);
  const fromAddress = process.env.REMINDER_FROM_EMAIL || "track.perso <onboarding@resend.dev>";

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
        .select("id, name, icon, scheduled_days")
        .eq("user_id", profile.id)
        .eq("archived", false),
      supabase.from("habit_logs").select("habit_id").eq("user_id", profile.id).eq("log_date", todayLocal),
    ]);

    const doneIds = new Set((todayLogs ?? []).map((l) => l.habit_id));
    const pending = (habits ?? []).filter(
      (h) => h.scheduled_days.includes(weekday) && !doneIds.has(h.id)
    );

    step.weekday = weekday;
    step.habitsCount = habits?.length ?? 0;
    step.pendingCount = pending.length;
    step.pendingNames = pending.map((h) => h.name);
    step.habitsError = habitsError?.message ?? null;
    step.logsError = logsError?.message ?? null;

    if (pending.length === 0) {
      step.skipped = "nothing pending";
      trace.push(step);
      continue;
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    step.email = email ?? null;
    step.authError = authError?.message ?? null;

    if (!email) {
      step.skipped = "no email found";
      trace.push(step);
      continue;
    }

    const listHtml = pending.map((h) => `<li>${h.icon} ${h.name}</li>`).join("");
    const subject =
      pending.length === 1
        ? `Il te reste "${pending[0].name}" à faire aujourd'hui`
        : `${pending.length} habitudes à faire aujourd'hui`;

    try {
      const sendResult = await resend.emails.send({
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
      step.sendResult = sendResult;
      await supabase.from("profiles").update({ reminded_date: todayLocal }).eq("id", profile.id);
      notified += 1;
    } catch (err) {
      step.sendError = err instanceof Error ? err.message : String(err);
    }

    trace.push(step);
  }

  return NextResponse.json({
    ok: true,
    notified,
    ...(debug ? { profilesError: profilesError?.message ?? null, profilesCount: profiles?.length ?? 0, trace } : {}),
  });
}
