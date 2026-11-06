import Link from "next/link";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { WeeklyGoal } from "./weekly-goal";
import { SportCard, SportEmptyState, SportLink, SportPageHeader, SportSectionHeading } from "./ui/sport-primitives";
import { SportDisciplineCard, WorkoutCard } from "./ui/sport-content-cards";
import { SportStatCard } from "./ui/sport-stat-card";
import { SportProgressBar } from "./ui/sport-progress";
import { SportMedia } from "./ui/sport-media";
import { SportIcon } from "./ui/sport-icons";
import { classifySportWorkouts, sportWorkoutHref } from "@/lib/sport-hub";
import { formatSportDate, sportWeeklyDuration, type loadSportHubData } from "@/lib/sport-hub-data";
import { sportImage } from "@/lib/sport-media";
import { muscleGroupI18nPath } from "@/lib/strength";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";
import { isRunningSchemaReady } from "@/lib/running/config";
import type { Vars } from "@/lib/i18n/translate";

type HubData = NonNullable<Awaited<ReturnType<typeof loadSportHubData>>>;
type Translator = (key: string, vars?: Vars) => string;

export function SportDashboard({ data, t }: { data: HubData; t: Translator }) {
  const { stats, workouts, workoutSetIds, language, weeklyGoal, training } = data;
  if (!training) return null;
  const n = new Intl.NumberFormat(language);
  const classified = classifySportWorkouts(workouts, workoutSetIds);
  const fraction = `${n.format(stats.thisWeek.sessions)} / ${n.format(weeklyGoal)}`;
  const duration = stats.totalMinutes >= 60
    ? t("sport.hubDashboard.hoursMinutes", { hours: n.format(Math.floor(stats.totalMinutes / 60)), minutes: n.format(stats.totalMinutes % 60) })
    : t("sport.hub.sessionMinutes", { minutes: n.format(stats.totalMinutes) });
  const disciplines = [
    { key: "strength", href: "/sport/musculation", ready: true, count: classified.strength },
    { key: "calisthenics", href: "/sport/calisthenics", ready: isCalisthenicsSchemaReady(), count: classified.calisthenics },
    { key: "running", href: "/sport/running", ready: isRunningSchemaReady(), count: classified.running },
  ] as const;

  return <div className="sport-dashboard" data-sport-dashboard>
    <SportPageHeader title={t("nav.sport")} description={t("sport.hub.description")} icon="activity" actions={<SportLink href="/sport/exercises" icon="exercise">{t("sport.library.library")}</SportLink>} />

    <section className="sport-card sport-hub-hero" aria-labelledby="sport-hero-title">
      <SportMedia image={sportImage("strength", t)} ratio="wide" decorative loading="eager" sizes="(max-width: 768px) 100vw, 80vw" className="sport-hub-hero-media" />
      <div className="sport-hub-hero-content"><p className="sport-hub-hero-eyebrow">{t("sport.hubDashboard.heroEyebrow")}</p><h2 id="sport-hero-title">{t("sport.hubDashboard.heroTitle")}</h2><p>{t("sport.hubDashboard.heroBody")}</p><SportLink href="#sport-next-session" variant="primary" icon="play">{t("sport.hubDashboard.prepareSession")}</SportLink></div>
    </section>

    <section className="space-y-3" aria-labelledby="sport-week-title">
      <SportSectionHeading id="sport-week-title" title={t("sport.hub.weekSummary")} />
      <div className="sport-hub-week-stats">
        <SportStatCard label={t("sport.hub.sessionsThisWeek")} value={n.format(stats.thisWeek.sessions)} icon="calendar" />
        <SportStatCard label={t("sport.hub.minutesThisWeek")} value={n.format(stats.thisWeek.minutes)} unit={t("sport.common.min")} icon="time" />
        <SportCard className="sport-stat-card"><p className="sport-stat-label">{t("sport.hubDashboard.goal")}</p><p className="sport-stat-value"><bdi dir="ltr">{fraction}</bdi></p><SportProgressBar className="mt-3" label={t("sport.hubDashboard.goal")} value={stats.thisWeek.sessions} max={weeklyGoal} valueText={fraction} /></SportCard>
      </div>
      <details className="sport-hub-goal-settings"><summary>{t("sport.hubDashboard.editGoal")}</summary><WeeklyGoal sessions={stats.thisWeek.sessions} goal={weeklyGoal} goalWeeks={stats.records.goalWeeks} /></details>
    </section>

    <section className="space-y-3" aria-labelledby="sport-disciplines-title">
      <SportSectionHeading id="sport-disciplines-title" title={t("sport.hub.disciplinesTitle")} />
      <div className="sport-hub-disciplines">{disciplines.map((discipline) => <SportDisciplineCard compact key={discipline.key} href={discipline.href} title={t(`sport.hub.nav.${discipline.key}`)} icon={discipline.key} image={sportImage(discipline.key, t)} detail={discipline.ready ? t(discipline.count === 1 ? "sport.hubDashboard.session" : "sport.hubDashboard.sessions", { count: n.format(discipline.count) }) : t("sport.hubDashboard.preparing")} />)}</div>
    </section>

    <nav aria-label={t("sport.hubDashboard.shortcuts")} className="sport-hub-shortcuts">
      <SportLink href="/sport/calendar" icon="calendar">{t("sport.hub.nav.calendar")}</SportLink>
      <SportLink href="/sport/calendar#sport-calendar-activities" icon="history">{t("sport.hubDashboard.history")}</SportLink>
      <SportLink href="/sport/musculation?tab=program" icon="program">{t("sport.hubDashboard.programs")}</SportLink>
      <SportLink href="/sport/stats" icon="stats">{t("sport.hub.nav.stats")}</SportLink>
    </nav>

    <div className="sport-hub-training-grid">
      <section id="sport-next-session" className="space-y-3 scroll-mt-6" aria-labelledby="sport-next-title">
        <SportSectionHeading id="sport-next-title" title={t("sport.hubDashboard.nextSession")} />
        {training.nextTemplate ? <WorkoutCard title={training.nextTemplate.name} image={sportImage("strength", t)} href="/sport/musculation" badge={t("sport.hubDashboard.suggested")} description={t("sport.hubDashboard.suggestionBody")} metrics={training.nextTemplate.muscle_groups.length ? [{ label: t("sport.hubDashboard.muscles"), value: training.nextTemplate.muscle_groups.map((group) => { const key = muscleGroupI18nPath(group); return key ? t(key) : group; }).join(", ") }] : []} /> : <SportEmptyState icon="program" title={t("sport.hubDashboard.chooseNext")} description={t("sport.hubDashboard.chooseNextBody")} action={<SportLink href="/sport/musculation" variant="primary" icon="plus">{t("sport.hubDashboard.openStrength")}</SportLink>} />}
      </section>

      <section className="space-y-3" aria-labelledby="sport-quick-stats-title">
        <SportSectionHeading id="sport-quick-stats-title" title={t("sport.hubDashboard.quickStats")} />
        <div className="sport-hub-quick-stats">
          <SportStatCard label={t("sport.hubDashboard.volume")} value={training.weeklyStrengthVolume === null ? "—" : n.format(training.weeklyStrengthVolume)} unit={training.weeklyStrengthVolume === null ? undefined : "kg"} icon="volume" detail={t(training.weeklyStrengthVolume === null ? "sport.hubDashboard.volumeEmpty" : "sport.hubDashboard.volumeScope")} />
          <SportStatCard label={t("sport.hubDashboard.frequency")} value={n.format(stats.thisWeek.sessions)} icon="calendar" detail={t("sport.hubDashboard.frequencyScope")} />
          <SportStatCard label={t("sport.hubDashboard.duration")} value={duration} icon="time" detail={t("sport.hubDashboard.durationScope")} />
        </div>
      </section>
    </div>

    <section className="space-y-3" aria-labelledby="sport-recent-title">
      <SportSectionHeading id="sport-recent-title" title={t("sport.hub.recentTitle")} action={<SportLink href="/sport/calendar#sport-calendar-activities" variant="ghost">{t("sport.hubDashboard.allActivities")}</SportLink>} />
      {training.recent.length ? <SportCard><ul className="sport-hub-recent-list">{training.recent.map((workout) => <li key={workout.id}><Link href={sportWorkoutHref(workout)} prefetch={false} className="sport-hub-recent-item"><span className="sport-icon-tile"><SportIcon name={workout.discipline === "running" ? "running" : workout.discipline === "calisthenics" ? "calisthenics" : classifySportWorkouts([workout], workoutSetIds).strength ? "strength" : "activity"} /></span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{workout.activity}</span><span className="sport-description mt-0.5 block">{formatSportDate(workout.workout_date, language, { weekday: "short", day: "numeric", month: "short" })}</span></span><span className="shrink-0 text-xs tabular-nums text-foreground-muted"><bdi>{t("sport.hub.sessionMinutes", { minutes: n.format(workout.duration_minutes) })}</bdi></span><SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0" /></Link></li>)}</ul></SportCard> : <SportEmptyState title={t("sport.hub.emptyTitle")} description={t("sport.hub.emptyBody")} action={<SportLink href="/sport/musculation" variant="primary">{t("sport.hubDashboard.openStrength")}</SportLink>} />}
    </section>

    <section className="space-y-3" aria-labelledby="sport-trends-title">
      <SportSectionHeading id="sport-trends-title" title={t("sport.hubDashboard.trends")} />
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <SportCard className="p-4 sm:p-5"><h3 className="sport-section-title mb-3">{t("sport.hub.progressTitle")}</h3><WeeklyBarChart data={sportWeeklyDuration(workouts, language)} color="var(--sport-ink)" unit={t("sport.common.min")} /></SportCard>
        <SportCard className="p-4 sm:p-5"><h3 className="sport-section-title">{t("sport.hub.identifiedTitle")}</h3><p className="sport-description mb-4 mt-1">{t("sport.hub.distributionScope")}</p>{workouts.length ? <div className="space-y-4">{[
          { label: t("sport.hub.identifiedStrength"), count: classified.strength },
          { label: t("sport.hub.nav.calisthenics"), count: classified.calisthenics },
          { label: t("sport.hub.nav.running"), count: classified.running },
          { label: t("sport.hub.unclassifiedActivity"), count: classified.unclassified },
        ].map((entry) => <div key={entry.label}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span>{entry.label}</span><bdi className="shrink-0 font-semibold">{n.format(entry.count)}</bdi></div><SportProgressBar label={entry.label} value={entry.count} max={workouts.length} valueText={`${n.format(entry.count)} / ${n.format(workouts.length)}`} /></div>)}</div> : <p className="sport-description">{t("sport.hub.distributionEmpty")}</p>}</SportCard>
      </div>
    </section>
  </div>;
}
