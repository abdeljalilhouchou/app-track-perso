import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityIcon, CalendarIcon, DumbbellIcon, RunIcon, SparkleIcon } from "@/components/ui/nav-icons";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { WeeklyGoal } from "@/components/sport/weekly-goal";
import { loadSportHubData, formatSportDate, sportWeeklyDuration } from "@/lib/sport-hub-data";
import { getT } from "@/lib/i18n/get-dictionary";

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{title}</h2>
      {children}
    </section>
  );
}

function DisciplineCard({
  href,
  title,
  description,
  Icon,
  detail,
}: {
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-sport/50 hover:bg-surface-muted sm:p-5"
    >
      <span aria-hidden className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sport-soft text-sport">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold group-hover:text-sport">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-foreground-muted">{description}</p>
      {detail && <p className="mt-3 text-xs font-medium text-sport">{detail}</p>}
    </Link>
  );
}

export default async function SportPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const { date } = await searchParams;
  if (date !== undefined) {
    const selectedDate = Array.isArray(date) ? date[0] ?? "" : date;
    redirect(`/sport/musculation?${new URLSearchParams({ date: selectedDate })}`);
  }

  const data = await loadSportHubData({ identifyStrength: true });
  if (!data) return null;
  const t = await getT();
  const { workouts, workoutSetIds, weeklyGoal, language, stats } = data;
  const recent = workouts.slice(0, 6);
  const lastSession = workouts[0];
  const identifiedCalisthenics = workouts.filter((workout) => workout.discipline === "calisthenics").length;
  const identifiedRunning = workouts.filter((workout) => workout.discipline === "running").length;
  const identifiedStrength = workouts.filter((workout) => workout.discipline === "strength" ||
    (workout.discipline !== "calisthenics" && workout.discipline !== "running" && (Boolean(workout.template_id) || workoutSetIds.has(workout.id)))).length;
  const unclassified = Math.max(0, workouts.length - identifiedStrength - identifiedCalisthenics - identifiedRunning);
  const chartData = sportWeeklyDuration(workouts, language);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="rounded-3xl border border-sport/30 bg-surface p-5 sm:p-7">
        <div className="flex items-start gap-3 sm:gap-4">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sport-soft text-sport">
            <ActivityIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sport">{t("sport.hub.nav.overview")}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t("sport.hub.title")}</h1>
            <p className="mt-1 text-sm text-foreground-muted">{t("sport.hub.description")}</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="sport-week-title" className="space-y-3">
        <h2 id="sport-week-title" className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {t("sport.hub.weekSummary")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard title={t("sport.hub.sessionsThisWeek")}>
            <p className="mt-2 text-3xl font-semibold text-sport">{stats.thisWeek.sessions}</p>
          </SummaryCard>
          <SummaryCard title={t("sport.hub.minutesThisWeek")}>
            <p className="mt-2 text-3xl font-semibold text-sport">{stats.thisWeek.minutes}</p>
            <p className="mt-1 text-xs text-foreground-muted">{t("sport.common.min")}</p>
          </SummaryCard>
          <SummaryCard title={t("sport.hub.lastSession")}>
            {lastSession ? (
              <>
                <p className="mt-2 truncate text-base font-semibold">{lastSession.activity}</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {t("sport.hub.sessionDate", {
                    date: formatSportDate(lastSession.workout_date, language),
                    minutes: lastSession.duration_minutes,
                  })}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-foreground-muted">{t("sport.hub.lastSessionEmpty")}</p>
            )}
          </SummaryCard>
        </div>
        <WeeklyGoal sessions={stats.thisWeek.sessions} goal={weeklyGoal} goalWeeks={stats.records.goalWeeks} />
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.hub.progressTitle")}</h2>
          <WeeklyBarChart data={chartData} color="var(--sport)" unit={t("sport.common.min")} />
        </div>
        <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.hub.identifiedTitle")}</h2>
          <p className="-mt-2 mb-4 text-xs text-foreground-muted">{t("sport.hub.distributionScope")}</p>
          {workouts.length === 0 ? (
            <p className="text-sm text-foreground-muted">{t("sport.hub.distributionEmpty")}</p>
          ) : (
            <div className="space-y-4">
              {[
                { label: t("sport.hub.identifiedStrength"), count: identifiedStrength },
                { label: t("sport.hub.calisthenics.title"), count: identifiedCalisthenics },
                { label: t("sport.hub.running.title"), count: identifiedRunning },
                { label: t("sport.hub.unclassifiedActivity"), count: unclassified },
              ].map(({ label, count }) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate">{label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-sport" style={{ width: `${Math.round((count / workouts.length) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="sport-disciplines-title" className="space-y-3">
        <h2 id="sport-disciplines-title" className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {t("sport.hub.disciplinesTitle")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DisciplineCard
            href="/sport/musculation"
            title={t("sport.hub.nav.strength")}
            description={t("sport.hub.strengthDescription")}
            detail={identifiedStrength > 0 ? `${identifiedStrength} · ${t("sport.hub.identifiedStrength")}` : undefined}
            Icon={DumbbellIcon}
          />
          <DisciplineCard
            href="/sport/calisthenics"
            title={t("sport.hub.calisthenics.title")}
            description={t("sport.hub.calisthenicsDescription")}
            detail={identifiedCalisthenics > 0 ? `${identifiedCalisthenics} · ${t("sport.hub.calisthenics.sessionsTitle").toLowerCase()}` : undefined}
            Icon={SparkleIcon}
          />
          <DisciplineCard
            href="/sport/running"
            title={t("sport.hub.running.title")}
            description={t("sport.hub.runningDescription")}
            detail={identifiedRunning > 0 ? `${identifiedRunning} · ${t("sport.hub.running.sessionsTitle").toLowerCase()}` : undefined}
            Icon={RunIcon}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.hub.recentTitle")}</h2>
          <Link href="/sport/calendar" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-sport hover:bg-sport-soft">
            <span aria-hidden><CalendarIcon className="h-4 w-4" /></span>
            {t("sport.hub.nav.calendar")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl bg-surface-muted px-4 py-5 text-sm text-foreground-muted">
            <p className="font-medium text-foreground">{t("sport.hub.emptyTitle")}</p>
            <p className="mt-1">{t("sport.hub.emptyBody")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((workout) => (
              <li key={workout.id}>
                <Link
                  href={workout.discipline === "calisthenics" ? `/sport/calisthenics?session=${encodeURIComponent(workout.id)}` : workout.discipline === "running" ? `/sport/running?session=${encodeURIComponent(workout.id)}` : `/sport/musculation?date=${encodeURIComponent(workout.workout_date)}`}
                  className="flex min-h-14 items-center justify-between gap-3 py-3 transition hover:text-sport"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{workout.activity}</span>
                    <span className="mt-0.5 block text-xs text-foreground-muted">
                      {formatSportDate(workout.workout_date, language, { weekday: "short", day: "numeric", month: "short" })}
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
