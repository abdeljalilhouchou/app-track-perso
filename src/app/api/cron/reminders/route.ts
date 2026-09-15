import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeStreak } from "@/lib/streak";

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

function daysAgoStr(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];

function habitRow(icon: string, name: string, tip: string) {
  return `
    <tr>
      <td style="padding:8px 0;font-size:14px;">${icon} <strong>${name}</strong></td>
      <td style="padding:8px 0;font-size:13px;color:#6b6b7b;text-align:right;">${tip}</td>
    </tr>`;
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
    const step: Record<string, unknown> = { profileId: profile.id, todayLocal, nowLocal };

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
    const since = daysAgoStr(90);

    const [
      { data: habits },
      { data: recentLogs },
      { data: workoutsToday },
      { data: moodToday },
      { data: momentsToday },
    ] = await Promise.all([
      supabase
        .from("habits")
        .select("id, name, icon, scheduled_days")
        .eq("user_id", profile.id)
        .eq("archived", false),
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", profile.id)
        .gte("log_date", since),
      supabase.from("workouts").select("activity, duration_minutes").eq("user_id", profile.id).eq("workout_date", todayLocal),
      supabase.from("mood_entries").select("mood_score").eq("user_id", profile.id).eq("entry_date", todayLocal).maybeSingle(),
      supabase.from("moments").select("icon, text").eq("user_id", profile.id).eq("entry_date", todayLocal),
    ]);

    const logsByHabit = new Map<string, Set<string>>();
    for (const log of recentLogs ?? []) {
      if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
      logsByHabit.get(log.habit_id)!.add(log.log_date);
    }
    const doneToday = new Set((recentLogs ?? []).filter((l) => l.log_date === todayLocal).map((l) => l.habit_id));

    const scheduledToday = (habits ?? []).filter((h) => h.scheduled_days.includes(weekday));
    const pending = scheduledToday.filter((h) => !doneToday.has(h.id));
    const doneHabits = scheduledToday.filter((h) => doneToday.has(h.id));

    step.pendingCount = pending.length;

    if (pending.length === 0) {
      step.skipped = "nothing pending";
      trace.push(step);
      continue;
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    step.email = email ?? null;
    if (!email) {
      step.skipped = "no email found";
      trace.push(step);
      continue;
    }

    // "Déjà fait" section
    const doneRows: string[] = [];
    for (const h of doneHabits) {
      doneRows.push(`<li>${h.icon} ${h.name}</li>`);
    }
    for (const w of workoutsToday ?? []) {
      doneRows.push(`<li>🏃 ${w.activity} (${w.duration_minutes} min)</li>`);
    }
    if (moodToday) {
      doneRows.push(`<li>${MOOD_EMOJI[moodToday.mood_score] ?? "🙂"} Humeur notée (${moodToday.mood_score}/5)</li>`);
    }
    for (const m of momentsToday ?? []) {
      doneRows.push(`<li>${m.icon} ${m.text}</li>`);
    }

    // "À faire" section with a per-habit tip based on its streak
    const pendingRows = pending
      .map((h) => {
        const streak = computeStreak(logsByHabit.get(h.id) ?? new Set());
        const tip =
          streak >= 2
            ? `🔥 série de ${streak} j — ne la casse pas !`
            : streak === 1
              ? "🔥 continue sur ta lancée"
              : "à faire aujourd'hui";
        return habitRow(h.icon, h.name, tip);
      })
      .join("");

    const subject =
      pending.length === 1
        ? `Il te reste "${pending[0].name}" à faire aujourd'hui`
        : `${pending.length} habitudes à faire aujourd'hui`;

    const html = `
      <div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#16161d;">
        <h2 style="color:#6366f1;margin-bottom:4px;">Ton résumé du jour 👋</h2>
        <p style="color:#6b6b7b;font-size:13px;margin-top:0;">${todayLocal}</p>

        ${
          doneRows.length > 0
            ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.03em;color:#10b981;margin-bottom:8px;">✅ Déjà fait aujourd'hui</h3>
               <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;">${doneRows.join("")}</ul>`
            : ""
        }

        <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.03em;color:#f59e0b;margin-bottom:8px;">⏳ Il te reste</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${pendingRows}</table>

        <a href="https://app-track-perso.vercel.app/habits" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;">
          Ouvrir track.perso →
        </a>
      </div>
    `;

    try {
      const sendResult = await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: `track.perso — ${subject}`,
        html,
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
