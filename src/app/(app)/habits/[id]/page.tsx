import Link from "next/link";
import { notFound } from "next/navigation";
import { addMonths, endOfMonth, format, parse, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, longestStreakEver } from "@/lib/streak";
import { bestWeekday, successRate } from "@/lib/habit-insights";
import { MonthCalendar } from "@/components/month-calendar";
import { WEEKDAYS } from "@/lib/habit-categories";

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month: monthParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: habit } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!habit) notFound();

  const { data: allLogs } = await supabase
    .from("habit_logs")
    .select("log_date, note")
    .eq("habit_id", id)
    .eq("user_id", user.id);

  const loggedDates = new Set((allLogs ?? []).map((l) => l.log_date));
  const notesByDate: Record<string, string> = {};
  for (const log of allLogs ?? []) {
    if (log.note) notesByDate[log.log_date] = log.note;
  }

  const today = new Date();
  const month = monthParam ? parse(monthParam, "yyyy-MM", today) : today;
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const isCurrentMonth = format(month, "yyyy-MM") === format(today, "yyyy-MM");
  const effectiveMonthEnd = monthEnd < today ? monthEnd : today;

  const thisMonthStats = successRate(loggedDates, habit.scheduled_days, monthStart, effectiveMonthEnd);
  const prevMonthDate = subMonths(month, 1);
  const prevMonthStats = successRate(
    loggedDates,
    habit.scheduled_days,
    startOfMonth(prevMonthDate),
    endOfMonth(prevMonthDate) < today ? endOfMonth(prevMonthDate) : today
  );
  const threeMonthStats = successRate(loggedDates, habit.scheduled_days, subMonths(today, 3), today);
  const weekdayInsight = bestWeekday(loggedDates, habit.scheduled_days);
  const monthDiff = thisMonthStats.rate - prevMonthStats.rate;

  const prevMonth = format(subMonths(month, 1), "yyyy-MM");
  const nextMonth = format(addMonths(month, 1), "yyyy-MM");

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link href="/habits" className="text-sm text-foreground-muted hover:text-foreground">
          ← Retour aux habitudes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {habit.icon} {habit.name}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {habit.category} · prévu le{" "}
          {habit.scheduled_days.length === 7
            ? "tous les jours"
            : habit.scheduled_days
                .map((d) => WEEKDAYS.find((w) => w.value === d)?.label)
                .join(", ")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-foreground-muted">Total de fois faites</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: habit.color }}>
            {loggedDates.size}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-foreground-muted">Série actuelle</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: habit.color }}>
            {computeStreak(loggedDates)} j
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-foreground-muted">Meilleure série</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: habit.color }}>
            {longestStreakEver(loggedDates)} j
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Insights</p>
        <ul className="space-y-1.5 text-sm">
          <li>
            📊 Taux de réussite sur 3 mois : <strong>{threeMonthStats.rate}%</strong> (
            {threeMonthStats.completed}/{threeMonthStats.expected} jours prévus)
          </li>
          {weekdayInsight && weekdayInsight.rate > 0 && (
            <li>
              🏆 Ton meilleur jour : <strong>{weekdayInsight.label}</strong> ({weekdayInsight.rate}% de
              réussite)
            </li>
          )}
          {prevMonthStats.expected > 0 && (
            <li>
              {monthDiff > 0 ? "📈" : monthDiff < 0 ? "📉" : "➡️"} Ce mois-ci :{" "}
              <strong>{thisMonthStats.rate}%</strong> vs {prevMonthStats.rate}% le mois précédent
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/habits/${id}?month=${prevMonth}`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
          >
            ← Précédent
          </Link>
          <div className="text-center">
            <p className="font-medium capitalize">{format(month, "MMMM yyyy", { locale: fr })}</p>
            <p className="text-xs text-foreground-muted">
              {thisMonthStats.completed} / {thisMonthStats.expected} jours prévus ({thisMonthStats.rate}%)
            </p>
          </div>
          {isCurrentMonth ? (
            <span className="w-[86px]" />
          ) : (
            <Link
              href={`/habits/${id}?month=${nextMonth}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
            >
              Suivant →
            </Link>
          )}
        </div>

        <MonthCalendar
          habitId={id}
          month={month}
          color={habit.color}
          loggedDates={loggedDates}
          notesByDate={notesByDate}
        />
      </div>
    </div>
  );
}
