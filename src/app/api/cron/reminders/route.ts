import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeStreak } from "@/lib/streak";
import { fetchAllRows } from "@/lib/paging";
import { isValidTime, isValidTimezone } from "@/lib/actions/validation";

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
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function isoWeekday(dateStr: string) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function safeSubject(value: string) {
  return value.replace(/[\r\n\u0000-\u001f\u007f]/g, " ").slice(0, 120);
}

const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];

function habitRow(icon: string, name: string, tip: string) {
  return `
    <tr>
      <td style="padding:8px 0;font-size:14px;">${escapeHtml(icon)} <strong>${escapeHtml(name)}</strong></td>
      <td style="padding:8px 0;font-size:13px;color:#6b6b7b;text-align:right;">${escapeHtml(tip)}</td>
    </tr>`;
}

function authorized(request: NextRequest, secret: string) {
  const value = request.headers.get("authorization") ?? "";
  if (!value.startsWith("Bearer ")) return false;
  const token = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return token.length === expected.length && timingSafeEqual(token, expected);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) {
    return NextResponse.json({ error: "cron is not configured" }, { status: 500 });
  }
  if (!authorized(request, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const trace: Record<string, unknown>[] = [];
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return NextResponse.json({ error: "email service is not configured" }, { status: 500 });

  try {
    const resend = new Resend(resendApiKey);
    const fromAddress = process.env.REMINDER_FROM_EMAIL || "track.perso <onboarding@resend.dev>";
    const supabase = createAdminClient();
    const profiles = await fetchAllRows((from, to) =>
      supabase.from("profiles").select("id, reminder_time, reminder_timezone, reminded_date")
        .not("reminder_time", "is", null).not("reminder_timezone", "is", null)
        .order("id").range(from, to)
    );
    let notified = 0;

    for (const profile of profiles) {
      const step: Record<string, unknown> = {};
      if (!profile.reminder_time || !profile.reminder_timezone || !isValidTime(profile.reminder_time) || !isValidTimezone(profile.reminder_timezone)) {
        step.skipped = "invalid reminder settings";
        trace.push(step);
        continue;
      }

      const { date: todayLocal, time: nowLocal } = nowInTimezone(profile.reminder_timezone);
      step.todayLocal = todayLocal;
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
      const [habits, recentLogs, workoutsToday, moodResult, momentsToday] = await Promise.all([
        fetchAllRows((from, to) => supabase.from("habits").select("id, name, icon, scheduled_days")
          .eq("user_id", profile.id).eq("archived", false).order("id").range(from, to)),
        fetchAllRows((from, to) => supabase.from("habit_logs").select("habit_id, log_date")
          .eq("user_id", profile.id).order("log_date").order("habit_id").range(from, to)),
        fetchAllRows((from, to) => supabase.from("workouts").select("activity, duration_minutes, id")
          .eq("user_id", profile.id).eq("workout_date", todayLocal).order("id").range(from, to)),
        supabase.from("mood_entries").select("mood_score").eq("user_id", profile.id).eq("entry_date", todayLocal).maybeSingle(),
        fetchAllRows((from, to) => supabase.from("moments").select("icon, text, id")
          .eq("user_id", profile.id).eq("entry_date", todayLocal).order("id").range(from, to)),
      ]);
      if (moodResult.error) throw new Error("Reminder data query failed");

      const logsByHabit = new Map<string, Set<string>>();
      for (const log of recentLogs) {
        if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
        logsByHabit.get(log.habit_id)!.add(log.log_date);
      }
      const doneToday = new Set(recentLogs.filter((log) => log.log_date === todayLocal).map((log) => log.habit_id));
      const scheduledToday = habits.filter((habit) => habit.scheduled_days.includes(weekday));
      const pending = scheduledToday.filter((habit) => !doneToday.has(habit.id));
      const doneHabits = scheduledToday.filter((habit) => doneToday.has(habit.id));
      step.pendingCount = pending.length;

      if (pending.length === 0) {
        step.skipped = "nothing pending";
        trace.push(step);
        continue;
      }

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);
      if (authError) throw new Error("Reminder recipient lookup failed");
      const email = authUser.user?.email;
      if (!email) {
        step.skipped = "no email found";
        trace.push(step);
        continue;
      }

      const doneRows: string[] = [];
      for (const habit of doneHabits) doneRows.push(`<li>${escapeHtml(habit.icon)} ${escapeHtml(habit.name)}</li>`);
      for (const workout of workoutsToday) {
        doneRows.push(`<li>🏃 ${escapeHtml(workout.activity)} (${workout.duration_minutes} min)</li>`);
      }
      const mood = moodResult.data;
      if (mood) {
        doneRows.push(`<li>${MOOD_EMOJI[mood.mood_score] ?? "🙂"} Humeur notée (${mood.mood_score}/5)</li>`);
      }
      for (const moment of momentsToday) doneRows.push(`<li>${escapeHtml(moment.icon)} ${escapeHtml(moment.text)}</li>`);

      const pendingRows = pending.map((habit) => {
        const streak = computeStreak(logsByHabit.get(habit.id) ?? new Set());
        const tip = streak >= 2 ? `🔥 série de ${streak} j — ne la casse pas !` : streak === 1 ? "🔥 continue sur ta lancée" : "à faire aujourd'hui";
        return habitRow(habit.icon, habit.name, tip);
      }).join("");
      const subject = pending.length === 1
        ? `Il te reste "${safeSubject(pending[0].name)}" à faire aujourd'hui`
        : `${pending.length} habitudes à faire aujourd'hui`;
      const html = `
        <div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#16161d;">
          <h2 style="color:#6366f1;margin-bottom:4px;">Ton résumé du jour 👋</h2>
          <p style="color:#6b6b7b;font-size:13px;margin-top:0;">${escapeHtml(todayLocal)}</p>
          ${doneRows.length > 0 ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.03em;color:#10b981;margin-bottom:8px;">✅ Déjà fait aujourd'hui</h3>
            <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;">${doneRows.join("")}</ul>` : ""}
          <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.03em;color:#f59e0b;margin-bottom:8px;">⏳ Il te reste</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${pendingRows}</table>
          <a href="https://app-track-perso.vercel.app/habits" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600;">
            Ouvrir track.perso →
          </a>
        </div>`;

      const sendResult = await resend.emails.send({ from: fromAddress, to: email, subject: `track.perso — ${subject}`, html });
      if (sendResult.error) {
        step.skipped = "email delivery failed";
        trace.push(step);
        continue;
      }
      const { error: updateError } = await supabase.from("profiles").update({ reminded_date: todayLocal }).eq("id", profile.id);
      if (updateError) throw new Error("Reminder state update failed");
      notified += 1;
      step.sent = true;
      trace.push(step);
    }

    return NextResponse.json({ ok: true, notified, ...(debug ? { profilesCount: profiles.length, trace } : {}) });
  } catch {
    return NextResponse.json({ error: "cron processing failed" }, { status: 500 });
  }
}
