"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Heatmap } from "@/components/heatmap";
import { TiltCard } from "@/components/ui/tilt-card";
import { useT } from "@/components/language-provider";
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

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <TiltCard
      className="rounded-2xl border-[1.5px] bg-surface p-5"
      style={{ borderColor: "color-mix(in srgb, var(--sport) 50%, var(--border))" }}
    >
      <p className="text-sm text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--sport)" }}>
        {value}
      </p>
      {children && <p className="mt-1 text-xs">{children}</p>}
    </TiltCard>
  );
}

export function SportTiles({ stats }: { stats: Stats }) {
  const t = useT();
  const hours = Math.floor(stats.totalMinutes / 60);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label={t("sport.overview.minutesThisWeek")} value={`${stats.thisWeek.minutes} min`}>
        {delta(stats.thisWeek.minutes, stats.lastWeek.minutes, " min", t)}
      </Tile>
      <Tile label={t("sport.overview.sessionsThisWeek")} value={String(stats.thisWeek.sessions)}>
        {delta(stats.thisWeek.sessions, stats.lastWeek.sessions, "", t)}
      </Tile>
      <Tile label={t("sport.overview.activeStreak")} value={t("sport.overview.streakValue", { value: stats.records.currentDayStreak })}>
        <span className="text-foreground-muted">{t("sport.overview.streakRecord", { value: stats.records.bestDayStreak })}</span>
      </Tile>
      <Tile label={t("sport.overview.total")} value={t("sport.overview.totalSessionsValue", { value: stats.totalSessions })}>
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
    <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
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
  const { longest, hardest, bestWeek } = stats.records;
  const day = (d: string) => format(parseISO(d), "d MMM yyyy", { locale: fr });
  const rows = [
    longest && { icon: "⏱️", label: t("sport.overview.longestSession"), value: `${longest.duration_minutes} min`, hint: `${longest.activity} · ${day(longest.workout_date)}` },
    hardest && {
      icon: "💥",
      label: t("sport.overview.hardestSession"),
      value: `${hardest.duration_minutes} min × ${hardest.intensity}/5`,
      hint: `${hardest.activity} · ${day(hardest.workout_date)}`,
    },
    bestWeek && { icon: "📆", label: t("sport.overview.bestWeek"), value: `${bestWeek.minutes} min`, hint: t("sport.overview.weekOf", { date: day(bestWeek.weekStart) }) },
    {
      icon: "🔥",
      label: t("sport.overview.longestStreak"),
      value: t("sport.overview.streakValue", { value: stats.records.bestDayStreak }),
      hint: t("sport.overview.consecutiveDaysHint"),
    },
  ].filter(Boolean) as { icon: string; label: string; value: string; hint: string }[];

  return (
    <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.overview.recordsTitle")}</h2>
      {stats.totalSessions === 0 ? (
        <p className="text-sm text-foreground-muted">{t("sport.overview.recordsEmpty")}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface text-sm">{r.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground-muted">{r.label}</p>
                <p className="truncate text-xs text-foreground-muted/80">{r.hint}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--sport)" }}>
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
    <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        {t("sport.overview.heatmapTitle", { weeks: 18 })}
      </h2>
      <Heatmap values={heat} color="var(--sport)" weeks={18} />
      <p className="mt-2 text-[11px] text-foreground-muted">{t("sport.overview.heatmapCaption")}</p>
    </div>
  );
}
