import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addMonths,
  endOfMonth,
  format,
  getDaysInMonth,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, longestStreakEver } from "@/lib/streak";
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
    .select("log_date")
    .eq("habit_id", id)
    .eq("user_id", user.id);

  const loggedDates = new Set((allLogs ?? []).map((l) => l.log_date));

  const month = monthParam ? parse(monthParam, "yyyy-MM", new Date()) : new Date();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const daysInMonth = getDaysInMonth(month);

  let completedThisMonth = 0;
  for (const d of loggedDates) {
    if (d >= format(monthStart, "yyyy-MM-dd") && d <= format(monthEnd, "yyyy-MM-dd")) {
      completedThisMonth += 1;
    }
  }
  const completionRate = Math.round((completedThisMonth / daysInMonth) * 100);

  const prevMonth = format(subMonths(month, 1), "yyyy-MM");
  const nextMonth = format(addMonths(month, 1), "yyyy-MM");
  const isCurrentMonth = format(month, "yyyy-MM") === format(new Date(), "yyyy-MM");

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
              {completedThisMonth} / {daysInMonth} jours ({completionRate}%)
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

        <MonthCalendar habitId={id} month={month} color={habit.color} loggedDates={loggedDates} />
      </div>
    </div>
  );
}
