"use client";

import { useState } from "react";
import { addWeeks, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { useT } from "@/components/language-provider";
import { formatLocalizedDate } from "@/lib/format-date";
import type { Language } from "@/lib/language";
import { RUN_TYPE_COLORS } from "@/lib/running/colors";
import { calculateRunningMetrics, formatPace, RUN_TYPES, type computeRunningStats, type RunningGoals, type RunningRun } from "@/lib/running/stats";
import { formatClock, formatKm, localeOf } from "./format";

type Period = "4w" | "3m" | "year";
const DAYS: Record<Period, number> = { "4w": 28, "3m": 91, year: 365 };
const WEEKS = 12;
const key = (date: Date) => format(date, "yyyy-MM-dd");
const nowDate = () => new Date();
const hours = (seconds: number) => `${Math.floor(seconds / 3600)} h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}`;
const card = "rounded-[20px] border border-border bg-surface";
const blueCard = { background: "linear-gradient(135deg, color-mix(in srgb, var(--water) 18%, var(--surface)), color-mix(in srgb, var(--water) 6%, var(--surface)))", borderColor: "color-mix(in srgb, var(--water) 35%, var(--border))" };
const BLUE_TEXT = "color-mix(in srgb, var(--water) 70%, var(--foreground))";
const UP = "color-mix(in srgb, var(--sport) 70%, var(--foreground))";

/** Running "Progrès": period figures against the one before, records, weekly distance, pace and kinds of runs. */
export function RunningProgress({ runs, stats, goals, language }: { runs: RunningRun[]; stats: ReturnType<typeof computeRunningStats>; goals: RunningGoals | null; language: Language }) {
  const t = useT();
  const r = (name: string, vars?: Record<string, string | number>) => t(`sport.runningUi.${name}`, vars);
  const w = (name: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.${name}`, vars);
  const [period, setPeriod] = useState<Period>("3m");
  const now = nowDate();
  const from = key(subDays(now, DAYS[period])), previousFrom = key(subDays(now, DAYS[period] * 2));
  const within = runs.filter((run) => run.workout_date >= from);
  const before = runs.filter((run) => run.workout_date >= previousFrom && run.workout_date < from);
  const sum = (rows: RunningRun[], pick: (run: RunningRun) => number) => rows.reduce((total, run) => total + pick(run), 0);
  const pace = (rows: RunningRun[]) => { const km = sum(rows, (run) => run.distance_km); return km > 0 ? sum(rows, (run) => run.duration_seconds) / km : null; };
  const current = pace(within), previous = pace(before);

  const deltaText = (diff: number, text: string, better: boolean) => diff === 0 ? { text: w("samePeriod"), good: false } : { text: `${diff > 0 === better ? "▲" : "▼"} ${text} ${w("vsBefore")}`, good: diff > 0 === better ? true : false };
  const kmNow = sum(within, (run) => run.distance_km), kmBefore = sum(before, (run) => run.distance_km);
  const timeNow = sum(within, (run) => run.duration_seconds), timeBefore = sum(before, (run) => run.duration_seconds);
  const paceDiff = current !== null && previous !== null ? Math.round(previous - current) : null;
  const kpis = [
    { id: "distance", label: w("kpiDistance"), value: `${formatKm(kmNow, language, 0)} km`, delta: before.length ? deltaText(Math.round(kmNow - kmBefore), `${formatKm(Math.abs(kmNow - kmBefore), language, 0)} km`, true) : null },
    { id: "runs", label: w("kpiRuns"), value: String(within.length), delta: before.length ? deltaText(within.length - before.length, String(Math.abs(within.length - before.length)), true) : null },
    { id: "pace", label: w("kpiPace"), value: `${formatPace(current)} /km`, delta: paceDiff !== null ? deltaText(paceDiff, `${Math.abs(paceDiff)} s/km`, true) : null },
    { id: "time", label: w("kpiTime"), value: hours(timeNow), delta: before.length ? deltaText(Math.round((timeNow - timeBefore) / 60), hours(Math.abs(timeNow - timeBefore)), true) : null },
  ];

  const isRecent = (run: RunningRun | null) => !!run && run.workout_date >= key(subDays(now, 7));
  const shortDate = (run: RunningRun) => formatLocalizedDate(run.workout_date, language, { day: "numeric", month: "short" });
  const records = [
    { id: "1k", label: "1 km", run: stats.comparable1k, value: (run: RunningRun) => formatClock(run.duration_seconds), meta: (run: RunningRun) => shortDate(run) },
    { id: "5k", label: "5 km", run: stats.comparable5k, value: (run: RunningRun) => formatClock(run.duration_seconds), meta: (run: RunningRun) => `${formatPace(run.duration_seconds / run.distance_km)} /km · ${shortDate(run)}` },
    { id: "10k", label: "10 km", run: stats.comparable10k, value: (run: RunningRun) => formatClock(run.duration_seconds), meta: (run: RunningRun) => `${formatPace(run.duration_seconds / run.distance_km)} /km · ${shortDate(run)}` },
    { id: "max", label: w("longest"), run: stats.longestDistance, value: (run: RunningRun) => `${formatKm(run.distance_km, language)} km`, meta: (run: RunningRun) => `${formatClock(run.duration_seconds)} · ${shortDate(run)}` },
  ];

  const firstWeek = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), WEEKS - 1);
  const weeks = Array.from({ length: WEEKS }, (_, index) => {
    const start = addWeeks(firstWeek, index), end = key(addWeeks(start, 1));
    return { start, km: sum(runs.filter((run) => run.workout_date >= key(start) && run.workout_date < end), (run) => run.distance_km) };
  });
  const goalKm = goals?.weekly_distance_km ?? null;
  const top = Math.max(1, goalKm ?? 0, ...weeks.map((week) => week.km)) * 1.15;
  const dayMonth = new Intl.DateTimeFormat(localeOf(language), { day: "numeric", month: "short" });

  const trend = [...within].sort((a, b) => a.workout_date.localeCompare(b.workout_date))
    .map((run) => calculateRunningMetrics(run.distance_km, run.duration_seconds)?.paceSecondsPerKm ?? 0).filter((value) => value > 0);
  const fast = Math.min(...trend), slow = Math.max(...trend);
  const span = Math.max(10, slow - fast);
  const points = trend.map((value, index) => [trend.length === 1 ? 165 : 36 + (index * 286) / (trend.length - 1), 20 + ((value - (fast - span * 0.1)) / (span * 1.2)) * 90] as const);
  const trendGain = trend.length >= 2 ? Math.round(trend[0] - trend[trend.length - 1]) : null;

  const types = RUN_TYPES.map((type) => ({ type, count: within.filter((run) => run.run_type === type).length })).filter((item) => item.count > 0);

  return <div className="space-y-5">
    <div role="radiogroup" aria-label={r("period")} className="flex gap-1.5">
      {(["4w", "3m", "year"] as const).map((value) => { const active = value === period; return <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setPeriod(value)} className="min-h-[38px] rounded-full px-3.5 text-[13px]" style={active ? { background: "var(--foreground)", color: "var(--background)", fontWeight: 700 } : { border: "1px solid var(--border)", color: "var(--foreground-muted)", fontWeight: 600 }}>{r(`periods.${value}`)}</button>; })}
    </div>

    <section className="grid grid-cols-2 gap-2" data-run-kpis>
      {kpis.map((kpi) => <div key={kpi.id} className={`${card} rounded-[18px] p-3.5`}>
        <p className="text-xs text-foreground-muted">{kpi.label}</p>
        <p className="mt-1 text-[22px] font-extrabold tabular-nums">{kpi.value}</p>
        {kpi.delta && <p className="mt-0.5 text-[11px] font-semibold" style={{ color: kpi.delta.good ? UP : "var(--foreground-muted)" }}>{kpi.delta.text}</p>}
      </div>)}
    </section>

    <section className="space-y-2.5" aria-labelledby="run-progress-records">
      <h2 id="run-progress-records" className="text-[15px] font-semibold">{w("recordsTitle")}</h2>
      <div className="grid grid-cols-2 gap-2">
        {records.map((record) => <div key={record.id} className="flex flex-col rounded-[18px] border p-3.5" style={blueCard} data-run-record={record.id}>
          <span className="flex items-center justify-between gap-2"><span className="text-xs font-bold" style={{ color: BLUE_TEXT }}>{record.label}</span>{isRecent(record.run) && <span className="text-[10px] font-bold" style={{ color: "var(--nutrition)" }}>{w("newRecord")}</span>}</span>
          {record.run ? <>
            <span className="mt-1.5 text-[22px] font-extrabold tabular-nums">{record.value(record.run)}</span>
            <span className="mt-0.5 truncate text-[11px] text-foreground-muted">{record.meta(record.run)}</span>
          </> : <span className="mt-1.5 text-xs text-foreground-muted">{w("noRecord")}</span>}
        </div>)}
      </div>
      <p className="text-xs text-foreground-muted">{r("toleranceNote")}</p>
    </section>

    <section className="space-y-2.5" aria-labelledby="run-progress-weeks">
      <div className="flex items-baseline justify-between gap-3"><h2 id="run-progress-weeks" className="text-[15px] font-semibold">{w("distanceWeeks")}</h2>{goalKm && <span className="text-xs text-foreground-muted">{w("goalKm", { km: formatKm(goalKm, language) })}</span>}</div>
      <div className={`${card} px-3.5 pb-2.5 pt-4`} data-run-weeks>
        <div className="relative h-[140px]">
          {goalKm && <div aria-hidden className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${(goalKm / top) * 100}%`, borderColor: "color-mix(in srgb, var(--water) 60%, transparent)" }}><span className="absolute -top-[17px] end-0 bg-surface px-1 text-[10px] font-semibold" style={{ color: BLUE_TEXT }}>{formatKm(goalKm, language)} km</span></div>}
          <div className="absolute inset-0 grid items-end gap-1.5" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
            {weeks.map((week, index) => { const reached = goalKm ? week.km >= goalKm : false; const last = index === WEEKS - 1; return <span key={index} title={`${dayMonth.format(week.start)} · ${formatKm(week.km, language)} km`} className="block rounded-md" style={{ height: `${Math.max(week.km > 0 ? 3 : 1.5, (week.km / top) * 100)}%`, background: reached || (!goalKm && week.km > 0) ? "var(--water)" : "color-mix(in srgb, var(--water) 35%, var(--surface-muted))", outline: last ? "1.5px solid var(--foreground)" : undefined, outlineOffset: last ? 2 : undefined }} />; })}
          </div>
        </div>
        <div className="mt-1.5 grid gap-1.5 text-center text-[10px] text-foreground-muted" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
          {weeks.map((week, index) => <span key={index} className="truncate">{index % 4 === 0 || index === WEEKS - 1 ? dayMonth.format(week.start).replace(".", "") : ""}</span>)}
        </div>
      </div>
    </section>

    <section className="space-y-2.5" aria-labelledby="run-progress-pace">
      <div className="flex items-baseline justify-between gap-3"><h2 id="run-progress-pace" className="text-[15px] font-semibold">{r("pace")}</h2>{trendGain !== null && trendGain !== 0 && <span className="text-xs font-semibold" style={{ color: trendGain > 0 ? UP : "var(--foreground-muted)" }}>{trendGain > 0 ? "▲" : "▼"} {Math.abs(trendGain)} s/km · {r(`periods.${period}`)}</span>}</div>
      <div className={`${card} p-3.5`} data-run-pace>
        {trend.length >= 2 ? <svg viewBox="0 0 330 130" className="h-auto w-full" role="img" aria-label={`${r("pace")} ${formatPace(trend[0])} → ${formatPace(trend[trend.length - 1])} /km`}>
          {[20, 65, 110].map((y) => <line key={y} x1="30" y1={y} x2="330" y2={y} stroke="var(--surface-muted)" />)}
          {[20, 65, 110].map((y) => <text key={y} x="0" y={y + 3} fill="var(--foreground-muted)" fontSize="10">{formatPace(fast - span * 0.1 + ((y - 20) / 90) * span * 1.2)}</text>)}
          <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="var(--water)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="5" fill="var(--water)" stroke="var(--surface)" strokeWidth="2" />
        </svg> : <p className="text-sm text-foreground-muted">{r("noPeriodRuns")}</p>}
        <p className="mt-1.5 text-xs text-foreground-muted">{w("paceUp")}</p>
      </div>
    </section>

    {types.length > 0 && <section className="space-y-2.5" aria-labelledby="run-progress-types">
      <h2 id="run-progress-types" className="text-[15px] font-semibold">{w("typesTitle")}</h2>
      <div className={`${card} space-y-3 p-3.5`} data-run-types-split>
        <div aria-hidden className="flex h-3 overflow-hidden rounded-full">{types.map((item) => <span key={item.type} style={{ width: `${(item.count / within.length) * 100}%`, background: RUN_TYPE_COLORS[item.type] }} />)}</div>
        <ul className="grid grid-cols-2 gap-2 text-xs">{types.map((item) => <li key={item.type} className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: RUN_TYPE_COLORS[item.type] }} />{r(`runTypes.${item.type}`)} · {item.count}</li>)}</ul>
      </div>
    </section>}
  </div>;
}
