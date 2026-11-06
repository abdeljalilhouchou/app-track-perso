"use client";

import { useState } from "react";
import { useLanguage, useT } from "@/components/language-provider";
import { PageLoadingSkeleton } from "@/components/ui/page-loading-skeleton";
import { SportBadge, SportButton, SportCard, SportEmptyState, SportErrorState, SportLink, SportPageHeader, SportSectionHeading } from "./sport-primitives";
import { SportStatCard } from "./sport-stat-card";
import { PersonalRecordBadge, SportProgressBar, SportProgressRing } from "./sport-progress";
import { ExerciseCard, SportDisciplineCard, WorkoutCard } from "./sport-content-cards";
import { SportSegmentedControl } from "./sport-segmented-control";
import { SportSectionNavigation } from "./sport-section-navigation";
import { SportMedia } from "./sport-media";
import { sportImage } from "@/lib/sport-media";
import type { computeSportStats } from "@/lib/sport-stats";
import type { Workout } from "@/types/database";
import { formatLocalizedDate } from "@/lib/format-date";

// An opt-in integration preview, not a second Sport Hub. Counters and records
// come from the existing loader; no illustrative training statistics are used.
export function SportDesignPreview({ stats, weeklyGoal, latest }: { stats: ReturnType<typeof computeSportStats>; weeklyGoal: number; latest: Workout | null }) {
  const t = useT();
  const { language } = useLanguage();
  const number = new Intl.NumberFormat(language);
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [showError, setShowError] = useState(true);
  const sessions = period === "week" ? stats.thisWeek.sessions : stats.totalSessions;
  const minutes = period === "week" ? stats.thisWeek.minutes : stats.totalMinutes;
  const progressText = `${number.format(stats.thisWeek.sessions)} / ${number.format(weeklyGoal)}`;
  const disciplineKeys = ["strength", "calisthenics", "running"] as const;

  return <div className="space-y-8" data-sport-design-preview>
    <SportPageHeader title={t("sport.ui.previewTitle")} description={t("sport.ui.previewDescription")} eyebrow={t("sport.ui.components")} icon="activity" actions={<SportLink href="/sport">{t("common.back")}</SportLink>} />

    <section className="space-y-3" aria-labelledby="preview-nav-title"><SportSectionHeading id="preview-nav-title" title={t("sport.ui.navigation")} /><SportSectionNavigation label={t("sport.ui.navigation")} activeId="overview" items={[
      { id: "overview", href: "/sport", label: t("sport.hub.nav.overview"), icon: "activity" },
      { id: "strength", href: "/sport/musculation", label: t("sport.hub.nav.strength"), icon: "strength" },
      { id: "calendar", href: "/sport/calendar", label: t("sport.hub.nav.calendar"), icon: "calendar" },
      { id: "stats", href: "/sport/stats", label: t("sport.hub.nav.stats"), icon: "stats" },
    ]} /></section>

    <section className="space-y-3" aria-labelledby="preview-metrics-title">
      <SportSectionHeading id="preview-metrics-title" title={t("sport.ui.indicators")} action={<SportSegmentedControl label={t("sport.ui.period")} value={period} onChange={setPeriod} options={[{ value: "week", label: t("sport.ui.week") }, { value: "all", label: t("sport.ui.all") }]} />} />
      <div className="grid grid-cols-2 gap-3"><SportStatCard label={t(period === "week" ? "sport.hub.sessionsThisWeek" : "sport.overview.total")} value={number.format(sessions)} icon="calendar" /><SportStatCard label={t("sport.ui.duration")} value={number.format(minutes)} unit={t("sport.common.min")} icon="time" /></div>
      <SportCard className="flex items-center gap-4 p-4"><SportProgressRing label={t("sport.weeklyGoal.title")} value={stats.thisWeek.sessions} max={weeklyGoal} valueText={progressText} /><div className="min-w-0 flex-1"><p className="mb-2 text-sm font-medium">{t("sport.weeklyGoal.title")}</p><SportProgressBar label={t("sport.weeklyGoal.title")} value={stats.thisWeek.sessions} max={weeklyGoal} valueText={progressText} /><p className="sport-description mt-2"><bdi>{progressText}</bdi></p></div></SportCard>
      {stats.records.longest && <PersonalRecordBadge label={t("sport.overview.longestSession")} value={`${number.format(stats.records.longest.duration_minutes)} ${t("sport.common.min")}`} description={stats.records.longest.activity} />}
    </section>

    <section className="space-y-3" aria-labelledby="preview-disciplines-title"><SportSectionHeading id="preview-disciplines-title" title={t("sport.ui.disciplines")} /><div className="grid gap-3 sm:grid-cols-3">{disciplineKeys.map((key) => <SportDisciplineCard key={key} href={`/sport/${key === "strength" ? "musculation" : key}`} title={t(`sport.hub.nav.${key === "strength" ? "strength" : key}`)} icon={key} image={sportImage(key, t)} />)}</div></section>

    <section className="space-y-3" aria-labelledby="preview-session-title"><SportSectionHeading id="preview-session-title" title={t("sport.ui.sessionCard")} />{latest ? <WorkoutCard title={latest.activity} href={latest.discipline === "running" ? `/sport/running?session=${encodeURIComponent(latest.id)}` : latest.discipline === "calisthenics" ? `/sport/calisthenics?session=${encodeURIComponent(latest.id)}` : `/sport/musculation?date=${latest.workout_date}`} description={formatLocalizedDate(latest.workout_date, language, { dateStyle: "medium" })} metrics={[{ label: t("sport.ui.duration"), value: `${number.format(latest.duration_minutes)} ${t("sport.common.min")}`, icon: "time" }]} /> : <SportEmptyState title={t("sport.hub.emptyTitle")} description={t("sport.hub.emptyBody")} />}</section>

    <section className="space-y-3" aria-labelledby="preview-exercise-title"><SportSectionHeading id="preview-exercise-title" title={t("sport.ui.exerciseCard")} description={t("sport.ui.exercisePreview")} /><ExerciseCard title={t("sport.ui.exerciseCard")} /></section>

    <section className="space-y-3" aria-labelledby="preview-controls-title"><SportSectionHeading id="preview-controls-title" title={t("sport.ui.controls")} /><div className="flex flex-wrap gap-2"><SportButton onClick={() => setPeriod("week")} icon="retry">{t("sport.ui.reset")}</SportButton><SportLink href="/sport/calendar" icon="calendar">{t("sport.hub.nav.calendar")}</SportLink><SportButton disabled variant="secondary">{t("sport.ui.disabled")}</SportButton><SportButton busy>{t("sport.ui.saving")}</SportButton><SportBadge>{t("sport.hub.nav.strength")}</SportBadge><SportBadge tone="accent">{t("sport.hub.nav.calisthenics")}</SportBadge></div></section>

    <section className="space-y-3" aria-labelledby="preview-states-title"><SportSectionHeading id="preview-states-title" title={t("sport.ui.states")} /><SportEmptyState title={t("sport.hub.emptyTitle")} description={t("sport.hub.emptyBody")} action={<SportLink href="/sport/musculation">{t("sport.hub.nav.strength")}</SportLink>} />{showError ? <SportErrorState title={t("sport.ui.errorPreview")} description={t("sport.ui.errorDescription")} action={<SportButton variant="secondary" onClick={() => setShowError(false)}>{t("sport.ui.dismissError")}</SportButton>} /> : <SportButton variant="secondary" onClick={() => setShowError(true)}>{t("sport.ui.showError")}</SportButton>}<details><summary className="sport-button sport-button-secondary cursor-pointer">{t("sport.ui.loadingPreview")}</summary><div className="mt-4"><PageLoadingSkeleton routeLoading={false} /></div></details></section>

    <section className="space-y-3" aria-labelledby="preview-media-title"><SportSectionHeading id="preview-media-title" title={t("sport.ui.mediaStates")} /><div className="grid grid-cols-2 gap-3"><SportMedia image={sportImage("strength", t)} /><SportMedia /></div></section>
  </div>;
}
