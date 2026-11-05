import Link from "next/link";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { CalendarIcon } from "@/components/ui/nav-icons";
import { getT } from "@/lib/i18n/get-dictionary";
import { formatSportDate, loadSportHubData } from "@/lib/sport-hub-data";

function monthHref(month: Date) {
  return `/sport/calendar?month=${format(month, "yyyy-MM")}`;
}

export default async function SportCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const [{ month: rawMonth }, data] = await Promise.all([searchParams, loadSportHubData()]);
  if (!data) return null;

  const t = await getT();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const currentMonthKey = format(now, "yyyy-MM");
  const requestedMonth = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;
  const selectedMonthKey = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) && requestedMonth <= currentMonthKey
    ? requestedMonth
    : currentMonthKey;
  const monthDate = parseISO(`${selectedMonthKey}-01`);
  const monthStart = startOfMonth(monthDate);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }),
  });
  const monthWorkouts = data.workouts.filter(
    (workout) => workout.workout_date.startsWith(selectedMonthKey) && workout.workout_date <= today
  );
  const workoutCountByDate = new Map<string, number>();
  for (const workout of monthWorkouts) {
    workoutCountByDate.set(workout.workout_date, (workoutCountByDate.get(workout.workout_date) ?? 0) + 1);
  }
  const locale = data.language === "ar" ? "ar" : data.language === "en" ? "en" : "fr";

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("sport.hub.calendar.title")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{t("sport.hub.calendar.description")}</p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href={monthHref(subMonths(monthDate, 1))}
            aria-label={t("sport.hub.calendar.previousMonth")}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-border px-2 text-xs font-medium hover:bg-surface-muted sm:px-3"
          >
            <span aria-hidden>{data.language === "ar" ? "›" : "‹"}</span>
            <span className="hidden sm:inline">{t("sport.hub.calendar.previousMonth")}</span>
          </Link>
          <h2 className="min-w-0 truncate text-center text-sm font-semibold capitalize sm:text-base">
            {formatSportDate(`${selectedMonthKey}-01`, data.language, { month: "long", year: "numeric" })}
          </h2>
          {selectedMonthKey < currentMonthKey ? (
            <Link
              href={monthHref(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
              aria-label={t("sport.hub.calendar.nextMonth")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-border px-2 text-xs font-medium hover:bg-surface-muted sm:px-3"
            >
              <span className="hidden sm:inline">{t("sport.hub.calendar.nextMonth")}</span>
              <span aria-hidden>{data.language === "ar" ? "‹" : "›"}</span>
            </Link>
          ) : (
            <span aria-hidden className="min-h-11 min-w-11" />
          )}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.slice(0, 7).map((day) => (
            <div key={format(day, "yyyy-MM-dd")} className="pb-1 text-center text-[10px] font-medium text-foreground-muted sm:text-xs">
              {formatSportDate(format(day, "yyyy-MM-dd"), data.language, { weekday: "short" })}
            </div>
          ))}
          {days.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const count = workoutCountByDate.get(date) ?? 0;
            const inMonth = isSameMonth(day, monthDate);
            const isToday = date === today;
            return (
              <div
                key={date}
                role="group"
                aria-label={`${formatSportDate(date, data.language, { dateStyle: "full" })} · ${count} ${t("sport.hub.calendar.sessionsUnit")}`}
                className={`flex min-h-10 flex-col items-center justify-center rounded-lg text-xs sm:min-h-12 ${
                  !inMonth ? "text-foreground-muted/40" : "text-foreground"
                } ${isToday ? "ring-1 ring-sport" : ""} ${count > 0 ? "bg-sport-soft font-semibold text-sport" : ""}`}
              >
                <span>{new Intl.NumberFormat(locale).format(Number(format(day, "d")))}</span>
                {count > 0 && <span aria-hidden className="mt-0.5 h-1 w-1 rounded-full bg-sport" />}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-sport" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.hub.calendar.activitiesTitle")}</h2>
          {monthWorkouts.length > 0 && <span className="ms-auto text-xs text-foreground-muted">{monthWorkouts.length}</span>}
        </div>
        {monthWorkouts.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-4 py-5 text-sm text-foreground-muted">{t("sport.hub.calendar.noActivities")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {monthWorkouts.map((workout) => (
              <li key={workout.id}>
                <Link
                  href={workout.discipline === "calisthenics" ? `/sport/calisthenics?session=${encodeURIComponent(workout.id)}` : workout.discipline === "running" ? `/sport/running?session=${encodeURIComponent(workout.id)}` : `/sport/musculation?date=${encodeURIComponent(workout.workout_date)}`}
                  className="flex min-h-14 items-center justify-between gap-3 py-3 hover:text-sport"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{workout.activity}</span>
                    <span className="mt-0.5 block text-xs text-foreground-muted">
                      {formatSportDate(workout.workout_date, data.language, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-foreground-muted">
                    {t("sport.hub.sessionMinutes", { minutes: workout.duration_minutes })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
