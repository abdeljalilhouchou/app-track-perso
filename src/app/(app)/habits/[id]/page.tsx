import Link from "next/link";
import { notFound } from "next/navigation";
import { addMonths, endOfMonth, format, parse, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { computeStreak, longestStreakEver } from "@/lib/streak";
import { bestWeekday, successRate } from "@/lib/habit-insights";
import { MonthCalendar } from "@/components/month-calendar";
import { CATEGORY_META, WEEKDAYS, categorySlug, weekdaySlug } from "@/lib/habit-categories";
import { getT } from "@/lib/i18n/get-dictionary";

export default async function HabitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const { month: monthParam } = await searchParams;
  const t = await getT();

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
  const weekdayInsightLabel = weekdayInsight ? t(`habits.weekdaysLong.${weekdaySlug(weekdayInsight.day)}`) : null;
  const monthDiff = thisMonthStats.rate - prevMonthStats.rate;

  const prevMonth = format(subMonths(month, 1), "yyyy-MM");
  const nextMonth = format(addMonths(month, 1), "yyyy-MM");
  const categoryMeta = CATEGORY_META[habit.category] ?? CATEGORY_META["Général"];
  const streak = computeStreak(loggedDates);
  const best = longestStreakEver(loggedDates);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link href="/habits" className="text-sm text-foreground-muted hover:text-foreground">
          {t("habits.detail.backLink")}
        </Link>

        <div className="mt-3 flex items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm"
            style={{ background: `color-mix(in srgb, ${habit.color} 16%, var(--surface))` }}
          >
            {habit.icon}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{habit.name}</h1>
            <span
              className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: `color-mix(in srgb, ${categoryMeta.color} 16%, transparent)`, color: categoryMeta.color }}
            >
              {categoryMeta.icon} {t(`habits.categories.${categorySlug(habit.category)}`)}
            </span>

            <div className="mt-3 flex gap-1.5">
              {WEEKDAYS.map((d) => {
                const scheduled = habit.scheduled_days.includes(d.value);
                return (
                  <span
                    key={d.value}
                    title={t(`habits.weekdaysLong.${weekdaySlug(d.value)}`)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: scheduled ? habit.color : "var(--surface-muted)",
                      color: scheduled ? "white" : "var(--foreground-muted)",
                    }}
                  >
                    {t(`habits.weekdaysShort.${weekdaySlug(d.value)}`)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${habit.color} 16%, transparent)` }}>
              📊
            </span>
            {t("habits.detail.totalTimes")}
          </div>
          <p className="mt-2 text-2xl font-semibold" style={{ color: habit.color }}>
            {loggedDates.size}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${habit.color} 16%, transparent)` }}>
              🔥
            </span>
            {t("habits.detail.currentStreak")}
          </div>
          <p className="mt-2 text-2xl font-semibold" style={{ color: habit.color }}>
            {t("habits.detail.daysUnit", { count: streak })}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${habit.color} 16%, transparent)` }}>
              🏆
            </span>
            {t("habits.detail.bestStreak")}
          </div>
          <p className="mt-2 text-2xl font-semibold" style={{ color: habit.color }}>
            {t("habits.detail.daysUnit", { count: best })}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("habits.detail.insightsTitle")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-foreground-muted">
              <span>{t("habits.detail.last3Months")}</span>
              <span className="font-semibold text-foreground">{threeMonthStats.rate}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${threeMonthStats.rate}%`, background: habit.color }}
              />
            </div>
            <p className="mt-1.5 text-xs text-foreground-muted">
              {t("habits.detail.daysExpectedFraction", { completed: threeMonthStats.completed, expected: threeMonthStats.expected })}
            </p>
          </div>

          <div>
            <p className="text-xs text-foreground-muted">{t("habits.detail.bestDay")}</p>
            <p className="mt-1.5 text-lg font-semibold">
              {weekdayInsight && weekdayInsight.rate > 0 ? weekdayInsightLabel : "—"}
            </p>
            <p className="text-xs text-foreground-muted">
              {weekdayInsight && weekdayInsight.rate > 0
                ? t("habits.detail.successRatePercent", { rate: weekdayInsight.rate })
                : t("habits.detail.notEnoughData")}
            </p>
          </div>

          <div>
            <p className="text-xs text-foreground-muted">{t("habits.detail.monthlyTrend")}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-lg font-semibold">
              {monthDiff > 0 ? "📈" : monthDiff < 0 ? "📉" : "➡️"} {thisMonthStats.rate}%
            </p>
            <p className="text-xs text-foreground-muted">
              {prevMonthStats.expected > 0
                ? t("habits.detail.vsPrevMonth", { rate: prevMonthStats.rate })
                : t("habits.detail.firstMonthTracked")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/habits/${id}?month=${prevMonth}`}
            className="flex items-center gap-1 rounded-lg border-[1.5px] border-accent px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-on-accent"
          >
            {t("habits.detail.prevMonth")}
          </Link>
          <div className="text-center">
            <p className="font-medium capitalize">{format(month, "MMMM yyyy", { locale: fr })}</p>
            <p className="text-xs text-foreground-muted">
              {t("habits.detail.monthProgress", { completed: thisMonthStats.completed, expected: thisMonthStats.expected, rate: thisMonthStats.rate })}
            </p>
          </div>
          {isCurrentMonth ? (
            <span className="w-23" />
          ) : (
            <Link
              href={`/habits/${id}?month=${nextMonth}`}
              className="flex items-center gap-1 rounded-lg border-[1.5px] border-accent px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-on-accent"
            >
              {t("habits.detail.nextMonth")}
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

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: habit.color }} /> {t("habits.detail.legendDone")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-surface-muted" /> {t("habits.detail.legendMissed")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: habit.color }} /> {t("habits.detail.legendNoted")}
          </span>
        </div>
      </div>
    </div>
  );
}
