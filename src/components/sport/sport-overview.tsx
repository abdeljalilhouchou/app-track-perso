"use client";

import { parseISO } from "date-fns";
import { Heatmap } from "@/components/heatmap";
import { SportStatCard } from "@/components/sport/ui/sport-stat-card";
import { SportIcon, type SportIconName } from "@/components/sport/ui/sport-icons";
import { useLanguage, useT } from "@/components/language-provider";
import type { computeSportStats } from "@/lib/sport-stats";

type Stats = ReturnType<typeof computeSportStats>;

function delta(current: number, previous: number, unit: string, t: ReturnType<typeof useT>) {
  const diff = current - previous;
  if (diff === 0) return <span className="text-foreground-muted">{t("sport.overview.sameAsLastWeek")}</span>;
  return (
    <span style={{ color: diff > 0 ? "var(--success)" : "var(--danger)" }}>
      {diff > 0 ? "▲ +" : "▼ "}
      {diff}
      {unit} <span className="text-foreground-muted">{t("sport.overview.vsLastWeek")}</span>
    </span>
  );
}

function Tile({ label, value, icon, children }: { label: string; value: string; icon?: SportIconName; children?: React.ReactNode }) {
  return (
    <SportStatCard label={label} value={value} icon={icon}>{children}</SportStatCard>
  );
}

export function SportTiles({ stats }: { stats: Stats }) {
  const t = useT();
  const hours = Math.floor(stats.totalMinutes / 60);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label={t("sport.overview.minutesThisWeek")} value={`${stats.thisWeek.minutes} min`} icon="time">
        {delta(stats.thisWeek.minutes, stats.lastWeek.minutes, " min", t)}
      </Tile>
      <Tile label={t("sport.overview.sessionsThisWeek")} value={String(stats.thisWeek.sessions)} icon="calendar">
        {delta(stats.thisWeek.sessions, stats.lastWeek.sessions, "", t)}
      </Tile>
      <Tile label={t("sport.overview.activeStreak")} value={t("sport.overview.streakValue", { value: stats.records.currentDayStreak })} icon="target">
        <span className="text-foreground-muted">{t("sport.overview.streakRecord", { value: stats.records.bestDayStreak })}</span>
      </Tile>
      <Tile label={t("sport.overview.total")} value={t("sport.overview.totalSessionsValue", { value: stats.totalSessions })} icon="activity">
        <span className="text-foreground-muted">
          {hours > 0
            ? t("sport.overview.totalHours", { hours, minutes: stats.totalMinutes % 60 })
            : t("sport.overview.totalMinutesOnly", { minutes: stats.totalMinutes })}
        </span>
      </Tile>
    </div>
  );
}

export function ActivityBreakdown({ stats }: { stats: Stats }) {
  const t = useT();
  const max = Math.max(1, ...stats.activities.map((a) => a.minutes));
  return (
    <div className="sport-card p-4 sm:p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.overview.breakdownTitle")}</h2>
      {stats.activities.length === 0 ? (
        <p className="text-sm text-foreground-muted">{t("sport.overview.breakdownEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {stats.activities.slice(0, 6).map((a) => (
            <li key={a.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{a.name}</span>
                <span className="text-foreground-muted">
                  {t("sport.overview.activityStats", { count: a.count, minutes: a.minutes, avg: a.avgDuration })}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round((a.minutes / max) * 100)}%`, background: "var(--sport)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SportRecords({ stats }: { stats: Stats }) {
  const t = useT();
  const { language } = useLanguage();
  const { longest, hardest, bestWeek } = stats.records;
  const locale = language === "ar" ? "ar" : language === "en" ? "en" : "fr";
  const day = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(parseISO(d));
  const rows = [
    longest && { icon: "time", label: t("sport.overview.longestSession"), value: `${longest.duration_minutes} min`, hint: `${longest.activity} · ${day(longest.workout_date)}` },
    hardest && {
      icon: "activity",
      label: t("sport.overview.hardestSession"),
      value: `${hardest.duration_minutes} min × ${hardest.intensity}/5`,
      hint: `${hardest.activity} · ${day(hardest.workout_date)}`,
    },
    bestWeek && { icon: "calendar", label: t("sport.overview.bestWeek"), value: `${bestWeek.minutes} min`, hint: t("sport.overview.weekOf", { date: day(bestWeek.weekStart) }) },
    {
      icon: "trophy",
      label: t("sport.overview.longestStreak"),
      value: t("sport.overview.streakValue", { value: stats.records.bestDayStreak }),
      hint: t("sport.overview.consecutiveDaysHint"),
    },
  ].filter(Boolean) as { icon: SportIconName; label: string; value: string; hint: string }[];

  return (
    <div className="sport-card p-4 sm:p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.overview.recordsTitle")}</h2>
      {stats.totalSessions === 0 ? (
        <p className="text-sm text-foreground-muted">{t("sport.overview.recordsEmpty")}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
              <span className="sport-icon-tile"><SportIcon name={r.icon} className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground-muted">{r.label}</p>
                <p className="truncate text-xs text-foreground-muted/80">{r.hint}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--sport-ink)" }}>
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SportHeatmap({ heat }: { heat: Record<string, number> }) {
  const t = useT();
  return (
    <div className="sport-card p-4 sm:p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        {t("sport.overview.heatmapTitle", { weeks: 18 })}
      </h2>
      <Heatmap values={heat} color="var(--sport)" weeks={18} />
      <p className="mt-2 text-[11px] text-foreground-muted">{t("sport.overview.heatmapCaption")}</p>
    </div>
  );
}
