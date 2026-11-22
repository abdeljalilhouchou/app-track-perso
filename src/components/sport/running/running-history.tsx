"use client";

import { useState } from "react";
import { format, startOfWeek, subWeeks } from "date-fns";
import { useT } from "@/components/language-provider";
import { RUN_TYPE_COLORS } from "@/lib/running/colors";
import type { Language } from "@/lib/language";
import { calculateRunningMetrics, formatPace, type RunningRun, type RunType } from "@/lib/running/stats";
import { formatClock, formatKm, localeOf } from "./format";

const PAGE = 20;
const BLUE_TEXT = "color-mix(in srgb, var(--water) 70%, var(--foreground))";
const tagStyle = (type: RunType) => ({ background: `color-mix(in srgb, ${RUN_TYPE_COLORS[type]} 18%, transparent)`, color: `color-mix(in srgb, ${RUN_TYPE_COLORS[type]} 75%, var(--foreground))` });
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
    {presentTypes.length > 1 && <div role="group" aria-label={r("runTypeFilter")} className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" data-run-filters>
      {["all", ...presentTypes].map((value) => { const active = type === value; return <button key={value} type="button" aria-pressed={active} onClick={() => { setType(value); setShown(PAGE); }} className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px]" style={active ? { background: "var(--foreground)", color: "var(--background)", fontWeight: 700 } : { border: "1px solid var(--border)", color: "var(--foreground-muted)", fontWeight: 600 }}>
        {value !== "all" && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: RUN_TYPE_COLORS[value as RunType] }} />}{value === "all" ? r("allFilter") : r(`runTypes.${value}`)}
      </button>; })}
    </div>}
    {groups.length === 0 && <p className="rounded-2xl bg-surface-muted p-5 text-sm text-foreground-muted">{r("noFilteredRuns")}</p>}
    {groups.map((group) => {
      const km = group.runs.reduce((sum, run) => sum + run.distance_km, 0);
      const seconds = group.runs.reduce((sum, run) => sum + run.duration_seconds, 0);
      return <section key={group.key} className="space-y-2" aria-label={weekTitle(group.key)}>
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-foreground-muted">{weekTitle(group.key)}</h2>
          <p className="text-xs text-foreground-muted tabular-nums">{r("runsTotal", { count: group.runs.length, distance: formatKm(km, language) })} · {formatClock(seconds)}</p>
        </div>
        {group.runs.map((run) => {
          const metrics = calculateRunningMetrics(run.distance_km, run.duration_seconds);
          const open = expandedId === run.workout_id;
          const day = new Date(`${run.workout_date}T12:00:00`);
          return <article key={run.workout_id} className="overflow-hidden rounded-[20px] border bg-surface" style={{ borderColor: open ? "color-mix(in srgb, var(--water) 40%, var(--border))" : "var(--border)", borderWidth: open ? 1.5 : 1 }} data-open={open || undefined} data-run-row={run.workout_id}>
            <button type="button" aria-expanded={open} className="run-row-main flex w-full items-center gap-3 p-3.5 text-start" onClick={() => onToggle(open ? "" : run.workout_id)}>
              <span className="w-11 shrink-0 text-center"><span className="block text-[11px] uppercase text-foreground-muted">{weekday.format(day).replace(".", "")}</span><span className="block text-xl font-extrabold">{day.getDate()}</span></span>
              <span className="min-w-0 flex-1 text-start">
                <span className="block truncate text-[15px] font-semibold">{run.name || r(`runTypes.${run.run_type}`)}</span>
                <span className="mt-1 flex items-center gap-1.5"><span className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold" style={tagStyle(run.run_type)}>{r(`runTypes.${run.run_type}`)}</span><span className="truncate text-xs text-foreground-muted tabular-nums">{formatClock(run.duration_seconds)}</span></span>
              </span>
              <span className="shrink-0 text-end"><span className="block text-[17px] font-extrabold tabular-nums">{formatKm(run.distance_km, language)} km</span><span className="block text-xs font-semibold tabular-nums" style={{ color: BLUE_TEXT }}>{formatPace(metrics?.paceSecondsPerKm)} /km</span></span>
            </button>
            {open && <div className="space-y-3 border-t border-surface-muted px-3.5 pb-3.5 pt-3">
              <dl className="grid grid-cols-4 gap-2 text-center text-sm">
                <div><dt className="text-[11px] text-foreground-muted">{r("speed")}</dt><dd className="mt-0.5 font-semibold">{formatKm(metrics?.speedKmh ?? 0, language)} {r("kmPerHour")}</dd></div>
                <div><dt className="text-[11px] text-foreground-muted">{r("feeling")}</dt><dd className="mt-0.5 font-semibold">{run.intensity}/5</dd></div>
                {run.elevation_gain_m !== null && <div><dt className="text-[11px] text-foreground-muted">D+</dt><dd className="mt-0.5 font-semibold">+{run.elevation_gain_m} m</dd></div>}
                {run.average_heart_rate !== null && <div><dt className="text-[11px] text-foreground-muted">♥</dt><dd className="mt-0.5 font-semibold">{run.average_heart_rate} bpm</dd></div>}
                {run.cadence_spm !== null && <div><dt className="text-[11px] text-foreground-muted">{r("cadence").split(" (")[0]}</dt><dd className="mt-0.5 font-semibold">{run.cadence_spm}</dd></div>}
              </dl>
              {run.workout_notes && <p className="whitespace-pre-wrap rounded-xl bg-surface-muted px-3 py-2.5 text-[13px] text-foreground-muted">« {run.workout_notes} »</p>}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="min-h-11 rounded-xl text-[13px] font-bold" style={{ background: "color-mix(in srgb, var(--water) 16%, var(--surface))", color: BLUE_TEXT }} onClick={() => onEdit(run)}>{r("editRun")}</button>
                <button type="button" className="min-h-11 rounded-xl border border-border text-[13px] font-semibold text-danger" onClick={() => onDelete(run)}>{r("deleteRun")}</button>
              </div>
            </div>}
          </article>;
        })}
      </section>;
    })}
    {filtered.length > shown && <button type="button" className="module-secondary w-full" onClick={() => setShown((value) => value + PAGE)}>{r("showMore")}</button>}
  </div>;
}
