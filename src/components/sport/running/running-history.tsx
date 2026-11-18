"use client";

import { useState } from "react";
import { format, startOfWeek, subWeeks } from "date-fns";
import { useT } from "@/components/language-provider";
import { ModuleChips } from "@/components/sport/ui/module-kit";
import type { Language } from "@/lib/language";
import { calculateRunningMetrics, formatPace, type RunningRun } from "@/lib/running/stats";
import { formatClock, formatKm, localeOf } from "./format";

const PAGE = 20;
const weekKey = (dateKey: string) => format(startOfWeek(new Date(`${dateKey}T12:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd");

/** Runs grouped by week (newest first), filterable by type, each opening onto its details. */
export function RunningHistory({ runs, language, expandedId, onToggle, onEdit, onDelete }: {
  runs: RunningRun[];
  language: Language;
  expandedId: string;
  onToggle: (id: string) => void;
  onEdit: (run: RunningRun) => void;
  onDelete: (run: RunningRun) => void;
}) {
  const t = useT();
  const r = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.${key}`, vars);
  const [type, setType] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const presentTypes = [...new Set(runs.map((run) => run.run_type))];
  const filtered = runs.filter((run) => type === "all" || run.run_type === type);
  const visible = filtered.slice(0, shown);
  const thisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeek = format(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), "yyyy-MM-dd");
  const groups: { key: string; runs: RunningRun[] }[] = [];
  for (const run of visible) {
    const key = weekKey(run.workout_date);
    const group = groups.at(-1);
    if (group?.key === key) group.runs.push(run); else groups.push({ key, runs: [run] });
  }
  const weekTitle = (key: string) => key === thisWeek ? r("thisWeekGroup") : key === lastWeek ? r("lastWeekGroup")
    : r("weekOf", { date: new Intl.DateTimeFormat(localeOf(language), { day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00`)) });
  const totalKm = runs.reduce((sum, run) => sum + run.distance_km, 0);
  const weekday = new Intl.DateTimeFormat(localeOf(language), { weekday: "short" });

  return <div className="space-y-4">
    <p className="text-sm text-foreground-muted">{r("runsTotal", { count: runs.length, distance: formatKm(totalKm, language, 0) })}</p>
    {presentTypes.length > 1 && <ModuleChips label={r("runTypeFilter")} value={type} options={[{ value: "all", label: r("allFilter") }, ...presentTypes.map((value) => ({ value, label: r(`runTypes.${value}`) }))]} onChange={(value) => { setType(value); setShown(PAGE); }} />}
    {groups.length === 0 && <p className="rounded-2xl bg-surface-muted p-5 text-sm text-foreground-muted">{r("noFilteredRuns")}</p>}
    {groups.map((group) => {
      const km = group.runs.reduce((sum, run) => sum + run.distance_km, 0);
      const seconds = group.runs.reduce((sum, run) => sum + run.duration_seconds, 0);
      return <section key={group.key} className="space-y-2" aria-label={weekTitle(group.key)}>
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-foreground-muted">{weekTitle(group.key)}</h2>
          <p className="text-xs text-foreground-muted tabular-nums">{formatKm(km, language)} km · {formatClock(seconds)}</p>
        </div>
        {group.runs.map((run) => {
          const metrics = calculateRunningMetrics(run.distance_km, run.duration_seconds);
          const open = expandedId === run.workout_id;
          const day = new Date(`${run.workout_date}T12:00:00`);
          return <article key={run.workout_id} className="run-row" data-open={open || undefined} data-run-row={run.workout_id}>
            <button type="button" aria-expanded={open} className="run-row-main" onClick={() => onToggle(open ? "" : run.workout_id)}>
              <span className="run-row-date"><span>{weekday.format(day).replace(".", "").toUpperCase()}</span><strong>{day.getDate()}</strong></span>
              <span className="min-w-0 flex-1 text-start">
                <span className="block truncate text-[15px] font-semibold">{run.name || r(`runTypes.${run.run_type}`)}</span>
                <span className="mt-0.5 block truncate text-xs text-foreground-muted">{r(`runTypes.${run.run_type}`)} · {formatClock(run.duration_seconds)} · {formatPace(metrics?.paceSecondsPerKm)} /km</span>
              </span>
              <span className="text-xl font-bold tabular-nums">{formatKm(run.distance_km, language)}<span className="text-xs font-medium text-foreground-muted"> km</span></span>
            </button>
            {open && <div className="space-y-2.5 px-3.5 pb-3.5">
              <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface-muted p-3 text-sm">
                <div><dt className="text-[11px] text-foreground-muted">{r("speed")}</dt><dd className="mt-0.5 font-semibold">{formatKm(metrics?.speedKmh ?? 0, language)} {r("kmPerHour")}</dd></div>
                <div><dt className="text-[11px] text-foreground-muted">{r("feeling")}</dt><dd className="mt-0.5 font-semibold">{run.intensity}/5</dd></div>
                {run.elevation_gain_m !== null && <div><dt className="text-[11px] text-foreground-muted">D+</dt><dd className="mt-0.5 font-semibold">+{run.elevation_gain_m} m</dd></div>}
                {run.average_heart_rate !== null && <div><dt className="text-[11px] text-foreground-muted">♥</dt><dd className="mt-0.5 font-semibold">{run.average_heart_rate} bpm</dd></div>}
                {run.cadence_spm !== null && <div><dt className="text-[11px] text-foreground-muted">{r("cadence").split(" (")[0]}</dt><dd className="mt-0.5 font-semibold">{run.cadence_spm}</dd></div>}
              </dl>
              {run.workout_notes && <p className="whitespace-pre-wrap text-sm text-foreground-muted">« {run.workout_notes} »</p>}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="module-secondary" onClick={() => onEdit(run)}>{r("editRun")}</button>
                <button type="button" className="module-secondary is-danger" onClick={() => onDelete(run)}>{r("deleteRun")}</button>
              </div>
            </div>}
          </article>;
        })}
      </section>;
    })}
    {filtered.length > shown && <button type="button" className="module-secondary w-full" onClick={() => setShown((value) => value + PAGE)}>{r("showMore")}</button>}
  </div>;
}
