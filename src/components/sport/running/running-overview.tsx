"use client";

import { useT } from "@/components/language-provider";
import { ModuleBars, ModuleCard, ModulePill, ModuleRing, ModuleStat, type Tone } from "@/components/sport/ui/module-kit";
import { isoWeekOf } from "@/lib/sport-week";
import type { Language } from "@/lib/language";
import { calculateRunningMetrics, formatPace, type computeRunningStats, type RunningGoals, type RunningRun } from "@/lib/running/stats";
import { formatClock, formatKm, formatWhen } from "./format";

type Stats = ReturnType<typeof computeRunningStats>;

/** Running "Aperçu": the week against its goal, the week's figures, trend, last run, records. */
export function RunningOverview({ stats, goals, runs, language, onLogRun, onOpenRun, onGoTo }: {
  stats: Stats;
  goals: RunningGoals | null;
  runs: RunningRun[];
  language: Language;
  onLogRun: () => void;
  onOpenRun: (run: RunningRun) => void;
  onGoTo: (section: "progress" | "goals") => void;
}) {
  const t = useT();
  const r = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.${key}`, vars);
  const week = stats.thisWeek, last = stats.lastWeek;
  const pace = (distance: number, duration: number) => distance > 0 ? duration / distance : null;
  const weekPace = pace(week.distanceKm, week.durationSeconds), lastPace = pace(last.distanceKm, last.durationSeconds);
  const tone = (delta: number, higherIsBetter = true): Tone => delta === 0 ? "neutral" : (delta > 0) === higherIsBetter ? "good" : "bad";
  const arrow = (delta: number) => delta > 0 ? "▲" : "▼";
  const distanceDelta = Math.round((week.distanceKm - last.distanceKm) * 10) / 10;
  const durationDelta = week.durationSeconds - last.durationSeconds;
  const runsDelta = week.runs - last.runs;
  const paceDelta = weekPace !== null && lastPace !== null ? Math.round(weekPace - lastPace) : null;
  const latest = runs[0];
  const latestMetrics = latest ? calculateRunningMetrics(latest.distance_km, latest.duration_seconds) : null;
  const records = [
    { key: "1k", label: "1 km", run: stats.comparable1k, value: stats.comparable1k ? formatClock(stats.comparable1k.duration_seconds) : null },
    { key: "5k", label: "5 km", run: stats.comparable5k, value: stats.comparable5k ? formatClock(stats.comparable5k.duration_seconds) : null },
    { key: "10k", label: "10 km", run: stats.comparable10k, value: stats.comparable10k ? formatClock(stats.comparable10k.duration_seconds) : null },
    { key: "longest", label: r("longestShort"), run: stats.longestDistance, value: stats.longestDistance ? `${formatKm(stats.longestDistance.distance_km, language)} km` : null },
  ];
  const goal = goals?.weekly_distance_km ?? null;

  return <div className="space-y-4">
    {goal || goals?.weekly_runs ? <ModuleCard>
      <div className="flex items-center gap-4">
        {goal
          ? <ModuleRing value={week.distanceKm} max={goal} label={r("goalOfWeek")} center={<><p className="text-2xl font-bold">{Math.round(Math.min(1, week.distanceKm / goal) * 100)}%</p><p className="text-[11px] text-foreground-muted">{r("goalWord")}</p></>} />
          : <ModuleRing value={week.runs} max={goals!.weekly_runs!} label={r("goalOfWeek")} center={<><p className="text-2xl font-bold">{week.runs}/{goals!.weekly_runs}</p><p className="text-[11px] text-foreground-muted">{r("runsLabel").toLowerCase()}</p></>} />}
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{r("goalOfWeek")}</p>
          {goal && <p className="text-2xl font-bold tabular-nums">{formatKm(week.distanceKm, language)} <span className="text-sm font-medium text-foreground-muted">/ {formatKm(goal, language)} km</span></p>}
          {goals?.weekly_runs && <p className="text-sm">{r("runsPlanned", { done: week.runs, goal: goals.weekly_runs })}</p>}
          {distanceDelta !== 0 && <p className="text-xs font-semibold" style={{ color: distanceDelta > 0 ? "var(--sport-ink)" : "var(--foreground-muted)" }}>{distanceDelta > 0 ? "+" : ""}{formatKm(distanceDelta, language)} km {r("vsLastWeek")}</p>}
        </div>
      </div>
    </ModuleCard> : <ModuleCard title={r("goalOfWeek")} action={<button type="button" className="module-card-link" onClick={() => onGoTo("goals")}>{r("setGoal")}</button>}>
      <p className="text-sm text-foreground-muted">{r("noGoalHint")}</p>
    </ModuleCard>}

    <div className="module-stats">
      <ModuleStat label={r("distanceLabel")} value={formatKm(week.distanceKm, language)} unit="km" tone={tone(distanceDelta)} delta={distanceDelta === 0 ? r("deltaSame") : `${arrow(distanceDelta)} ${formatKm(Math.abs(distanceDelta), language)} km`} />
      <ModuleStat label={r("timeLabel")} value={formatClock(week.durationSeconds)} tone={tone(durationDelta)} delta={durationDelta === 0 ? r("deltaSame") : `${arrow(durationDelta)} ${formatClock(Math.abs(durationDelta))}`} />
      <ModuleStat label={r("paceLabel")} value={formatPace(weekPace)} unit="/km" tone={paceDelta === null ? "neutral" : tone(paceDelta, false)} delta={paceDelta === null || paceDelta === 0 ? r("deltaSame") : paceDelta < 0 ? r("fasterBy", { value: `${Math.abs(paceDelta)} s` }) : r("slowerBy", { value: `${paceDelta} s` })} />
      <ModuleStat label={r("runsLabel")} value={week.runs} tone={tone(runsDelta)} delta={runsDelta === 0 ? r("deltaSame") : `${arrow(runsDelta)} ${Math.abs(runsDelta)}`} />
    </div>

    <ModuleCard title={r("distancePerWeek")} action={<span className="text-xs text-foreground-muted">{r("eightWeeks")}</span>}>
      <ModuleBars label={r("distancePerWeek")} bars={stats.weeklyDistance.map((item, index) => ({ key: item.weekStart, label: `${r("weekShort")}${isoWeekOf(item.weekStart)}`, value: Math.round(item.distanceKm * 10) / 10, highlight: index === stats.weeklyDistance.length - 1 }))} />
    </ModuleCard>

    {latest && <ModuleCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-foreground-muted">{r("lastRunWhen", { when: formatWhen(latest.workout_date, language) })}</p>
          <h2 className="mt-1 truncate text-[17px] font-semibold">{latest.name || r(`runTypes.${latest.run_type}`)}</h2>
        </div>
        <ModulePill>{r(`runTypes.${latest.run_type}`)}</ModulePill>
      </div>
      <dl className="grid grid-cols-4 gap-2 text-sm">
        <div><dt className="text-[11px] text-foreground-muted">{r("distanceLabel")}</dt><dd className="mt-0.5 font-bold tabular-nums">{formatKm(latest.distance_km, language, 2)} km</dd></div>
        <div><dt className="text-[11px] text-foreground-muted">{r("timeLabel")}</dt><dd className="mt-0.5 font-bold tabular-nums">{formatClock(latest.duration_seconds)}</dd></div>
        <div><dt className="text-[11px] text-foreground-muted">{r("pace")}</dt><dd className="mt-0.5 font-bold tabular-nums">{formatPace(latestMetrics?.paceSecondsPerKm)}</dd></div>
        <div><dt className="text-[11px] text-foreground-muted">{r("feeling")}</dt><dd className="mt-0.5 font-bold tabular-nums">{latest.intensity}/5</dd></div>
      </dl>
      {latest.workout_notes && <p className="text-sm text-foreground-muted">« {latest.workout_notes} »</p>}
      <button type="button" className="module-card-link self-start" onClick={() => onOpenRun(latest)}>{r("detailsCta")}</button>
    </ModuleCard>}

    <ModuleCard title={r("personalRecords")} action={<button type="button" className="module-card-link" onClick={() => onGoTo("progress")}>{r("seeAll")}</button>}>
      <div className="grid grid-cols-2 gap-2.5">
        {records.map((record) => <div key={record.key} className="rounded-2xl bg-surface-muted px-3.5 py-3">
          <p className="text-xs text-foreground-muted">{record.label}</p>
          <p className="mt-1 text-[17px] font-bold tabular-nums">{record.value ?? "—"}</p>
        </div>)}
      </div>
    </ModuleCard>

    <div className="module-sticky-cta">
      <button type="button" className="module-primary" onClick={onLogRun}><span aria-hidden="true">+</span>{r("startRun")}</button>
    </div>
  </div>;
}
