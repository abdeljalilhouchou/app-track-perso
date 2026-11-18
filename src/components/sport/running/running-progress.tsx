"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { subDays } from "date-fns";
import { useT } from "@/components/language-provider";
import { ChartPlaceholder } from "@/components/charts/deferred-chart";
import { SportHeatmap } from "@/components/sport/sport-overview";
import { ModuleCard, ModuleChips, ModulePill } from "@/components/sport/ui/module-kit";
import { formatLocalizedDate } from "@/lib/format-date";
import type { Language } from "@/lib/language";
import { calculateRunningMetrics, formatPace, type computeRunningStats, type RunningGoals, type RunningRun } from "@/lib/running/stats";
import { formatClock, formatKm, localeOf } from "./format";

const RunningPaceChart = dynamic(() => import("@/components/charts/running-plots").then((module) => module.RunningPaceChart), { ssr: false, loading: ChartPlaceholder });
const RunningDistanceChart = dynamic(() => import("@/components/charts/running-plots").then((module) => module.RunningDistanceChart), { ssr: false, loading: ChartPlaceholder });

type Period = "4w" | "3m" | "year";
const DAYS: Record<Period, number> = { "4w": 28, "3m": 91, year: 365 };
const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Running "Progrès": pace over a chosen period, records, time goals, volume and regularity. */
export function RunningProgress({ runs, stats, goals, language }: { runs: RunningRun[]; stats: ReturnType<typeof computeRunningStats>; goals: RunningGoals | null; language: Language }) {
  const t = useT();
  const r = (name: string, vars?: Record<string, string | number>) => t(`sport.runningUi.${name}`, vars);
  const [period, setPeriod] = useState<Period>("3m");
  const now = new Date();
  const from = key(subDays(now, DAYS[period])), previousFrom = key(subDays(now, DAYS[period] * 2));
  const within = runs.filter((run) => run.workout_date >= from);
  const before = runs.filter((run) => run.workout_date >= previousFrom && run.workout_date < from);
  const pace = (rows: RunningRun[]) => { const km = rows.reduce((s, run) => s + run.distance_km, 0); return km > 0 ? rows.reduce((s, run) => s + run.duration_seconds, 0) / km : null; };
  const current = pace(within), previous = pace(before);
  const delta = current !== null && previous !== null ? Math.round(current - previous) : null;
  const trend = [...within].sort((a, b) => a.workout_date.localeCompare(b.workout_date))
    .map((run) => ({ label: formatLocalizedDate(run.workout_date, language, { day: "numeric", month: "short" }), pace: calculateRunningMetrics(run.distance_km, run.duration_seconds)?.paceSecondsPerKm ?? 0 }))
    .filter((point) => point.pace > 0);
  const isRecent = (run: RunningRun | null) => !!run && run.workout_date >= key(subDays(now, 7));
  const records = [
    { id: "1k", badge: "1 km", run: stats.comparable1k, value: (run: RunningRun) => formatClock(run.duration_seconds) },
    { id: "5k", badge: "5 km", run: stats.comparable5k, value: (run: RunningRun) => formatClock(run.duration_seconds) },
    { id: "10k", badge: "10 km", run: stats.comparable10k, value: (run: RunningRun) => formatClock(run.duration_seconds) },
    { id: "max", badge: "Max", run: stats.longestDistance, value: (run: RunningRun) => `${formatKm(run.distance_km, language)} km` },
  ];
  const targets = [
    { id: "5k", label: "5 km", target: goals?.target_5k_seconds ?? null, record: stats.comparable5k },
    { id: "10k", label: "10 km", target: goals?.target_10k_seconds ?? null, record: stats.comparable10k },
  ].filter((item) => item.target !== null);

  return <div className="space-y-4">
    <ModuleChips label={r("period")} value={period} options={(["4w", "3m", "year"] as const).map((value) => ({ value, label: r(`periods.${value}`) }))} onChange={setPeriod} />

    <ModuleCard>
      <p className="text-xs text-foreground-muted">{r("paceLabel")} · {r(`periods.${period}`)}</p>
      <p className="text-[26px] font-bold tabular-nums">{formatPace(current)} <span className="text-sm font-medium text-foreground-muted">{r("minPerKm")}</span>
        {delta !== null && delta !== 0 && <span className="ms-2 text-[13px] font-semibold" style={{ color: delta < 0 ? "var(--sport-ink)" : "var(--foreground-muted)" }}>{delta < 0 ? `▼ ${Math.abs(delta)} s` : `▲ ${delta} s`}</span>}
      </p>
      {trend.length >= 2 ? <div className="h-44 w-full"><RunningPaceChart data={trend} unit={r("minPerKm")} label={r("pace")} /></div> : <p className="text-sm text-foreground-muted">{r("noPeriodRuns")}</p>}
      <p className="text-xs text-foreground-muted">{r("paceHint")}</p>
    </ModuleCard>

    <ModuleCard title={r("personalRecords")}>
      <ul className="-mx-1 divide-y divide-border">
        {records.map((record) => <li key={record.id} className="flex items-center gap-3 px-1 py-3" data-run-record={record.id}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold" style={{ background: "var(--accent-soft)", color: "color-mix(in srgb, var(--accent) 75%, var(--foreground))" }}>{record.badge}</span>
          <div className="min-w-0 flex-1">
            {record.run ? <>
              <p className="text-[17px] font-bold tabular-nums">{record.value(record.run)}</p>
              <p className="truncate text-xs text-foreground-muted">{formatLocalizedDate(record.run.workout_date, language, { day: "numeric", month: "short" })} · {record.run.name || r(`runTypes.${record.run.run_type}`)}</p>
            </> : <p className="text-sm text-foreground-muted">{r("noRecord")}</p>}
          </div>
          {isRecent(record.run) && <ModulePill>{r("newBadge")}</ModulePill>}
        </li>)}
      </ul>
      <p className="text-xs text-foreground-muted">{r("toleranceNote")}</p>
    </ModuleCard>

    {targets.map((item) => {
      const reached = item.record !== null && item.record.duration_seconds <= item.target!;
      const ratio = item.record ? Math.min(1, item.target! / item.record.duration_seconds) : 0;
      return <ModuleCard key={item.id} title={`${r("goalWord").replace(/^./, (c) => c.toUpperCase())} ${item.label}`} action={<span className="text-[13px] text-foreground-muted">{r("targetLabel", { time: formatClock(item.target!) })}</span>}>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full" style={{ width: `${Math.round(ratio * 100)}%`, background: "var(--sport)" }} /></div>
        <p className="text-[13px] font-semibold" style={{ color: reached ? "var(--sport-ink)" : "var(--foreground-muted)" }}>
          {item.record === null ? r("noRecord") : reached
            ? r("goalReached", { time: formatClock(item.record.duration_seconds), diff: formatClock(item.target! - item.record.duration_seconds) })
            : r("goalToGo", { time: formatClock(item.record.duration_seconds), diff: formatClock(item.record.duration_seconds - item.target!) })}
        </p>
      </ModuleCard>;
    })}

    <ModuleCard title={r("weeklyDistance")}>
      <div className="h-48 w-full"><RunningDistanceChart data={stats.weeklyDistance.map((week) => ({ label: new Intl.DateTimeFormat(localeOf(language), { day: "numeric", month: "short" }).format(new Date(`${week.weekStart}T12:00:00`)), value: Math.round(week.distanceKm * 100) / 100 }))} unit="km" language={language} /></div>
    </ModuleCard>

    <SportHeatmap heat={stats.heat} />
  </div>;
}
