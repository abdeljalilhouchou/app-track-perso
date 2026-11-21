"use client";

import { useState } from "react";
import { WeeklyLineChart } from "@/components/charts/weekly-line-chart";
import { useLanguage } from "@/components/language-provider";
import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import { muscleColor, muscleGroupI18nPath } from "@/lib/strength";
import { exerciseCurve, progressFigures, regularity, type ProgressWorkout } from "@/lib/strength-progress";
import type { ExerciseSummary, MuscleWeek } from "@/lib/strength-stats";
import { formatLocalizedDate } from "@/lib/format-date";

const PERIODS = [
  { days: 28, key: "weeks4" },
  { days: 91, key: "months3" },
  { days: 365, key: "year1" },
] as const;

const card = "rounded-3xl border border-border bg-surface";

export function ProgressView({ workouts, exercises, weeklyMuscles, weeklyGoal }: { workouts: ProgressWorkout[]; exercises: ExerciseSummary[]; weeklyMuscles: MuscleWeek[]; weeklyGoal: number }) {
  const { t, language } = useLanguage();
  const f = (key: string, vars?: Record<string, string | number>) => t(`sport.focus.${key}`, vars);
  const n = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const muscleLabel = (group: string) => {
    const path = muscleGroupI18nPath(group);
    return path ? t(path) : group;
  };
  const [days, setDays] = useState<number>(91);
  const ranked = [...exercises].filter((exercise) => exercise.sessions.some((session) => session.topWeight > 0)).sort((a, b) => b.sessions.length - a.sessions.length);
  const [selected, setSelected] = useState(ranked[0]?.key ?? "");
  const exercise = ranked.find((item) => item.key === selected) ?? ranked[0] ?? null;

  const figures = progressFigures(workouts, exercises, days);
  const tons = (kg: number) => (kg >= 1000 ? `${n.format(Math.round(kg / 100) / 10)} t` : `${n.format(kg)} kg`);
  const delta = (value: number | null, unit = "") => (value === null ? null : value === 0 ? f("samePeriod") : `${value > 0 ? "▲" : "▼"} ${n.format(Math.abs(value))}${unit} ${f("vsBefore")}`);
  const kpis = [
    { label: f("kpiSessions"), value: n.format(figures.sessions), detail: delta(figures.sessionsChange), up: figures.sessionsChange > 0 },
    { label: f("kpiVolume"), value: tons(figures.volume), detail: delta(figures.volumeChange, " %"), up: (figures.volumeChange ?? 0) > 0 },
    { label: f("kpiAverage"), value: `${n.format(figures.averageMinutes)} min`, detail: delta(figures.averageChange, " min"), up: false },
    { label: f("kpiRecords"), value: n.format(figures.records), detail: figures.records ? null : f("noRecords"), up: false },
  ];

  const curve = exercise ? exerciseCurve(exercise, days) : null;
  const dates = workouts.map((workout) => workout.date);
  const grid = regularity(dates, weeklyGoal);
  const scale = Math.max(weeklyGoal + 1, ...grid.weeks.map((week) => week.total));
  // Sets per muscle: an axis that always shows the 10–20 advised zone.
  const axis = Math.max(24, ...weeklyMuscles.flatMap((muscle) => [muscle.thisWeekSets + 2, muscle.lastWeekSets + 2]));
  const pct = (sets: number) => Math.min(100, (sets / axis) * 100);
  const trained = weeklyMuscles.filter((muscle) => muscle.thisWeekSets > 0).sort((a, b) => b.thisWeekSets - a.thisWeekSets);
  const untrained = weeklyMuscles.filter((muscle) => muscle.thisWeekSets === 0 && muscle.lastWeekSets > 0);
  const setsNow = weeklyMuscles.reduce((sum, muscle) => sum + muscle.thisWeekSets, 0);
  const setsDiff = setsNow - weeklyMuscles.reduce((sum, muscle) => sum + muscle.lastWeekSets, 0);
  const records = exercises
    .filter((item) => item.records.maxWeight && item.records.maxWeight.weight > 0)
    .sort((a, b) => b.records.maxWeight!.date.localeCompare(a.records.maxWeight!.date))
    .slice(0, 5);
  const day = (date: string) => formatLocalizedDate(date, language, { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-progress-view>
      <div role="radiogroup" aria-label={f("period")} className="flex gap-1.5">
        {PERIODS.map((period) => (
          <button key={period.days} type="button" role="radio" aria-checked={days === period.days} onClick={() => setDays(period.days)} className="min-h-10 rounded-full px-3.5 text-[13px] font-semibold transition" style={days === period.days ? { background: "var(--foreground)", color: "var(--background)" } : { border: "1px solid var(--border)", color: "var(--foreground-muted)" }}>
            {f(period.key)}
          </button>
        ))}
      </div>

      <section aria-label={f("period")} className="grid grid-cols-2 gap-2" data-progress-kpis>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`${card} rounded-[18px] p-3.5`}>
            <p className="text-xs text-foreground-muted">{kpi.label}</p>
            <p className="mt-1 text-[22px] font-extrabold tabular-nums">{kpi.value}</p>
            {kpi.detail && <p className={`mt-0.5 text-[11px] font-semibold ${kpi.up ? "text-success" : "text-foreground-muted"}`}>{kpi.detail}</p>}
          </div>
        ))}
      </section>

      <section aria-labelledby="progress-exercise" className="space-y-2.5">
        <h2 id="progress-exercise" className="text-[15px] font-semibold">{f("byExercise")}</h2>
        {exercise && curve ? (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" data-progress-exercises>
              {ranked.slice(0, 10).map((item) => (
                <button key={item.key} type="button" aria-pressed={item.key === exercise.key} onClick={() => setSelected(item.key)} className="min-h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold" style={item.key === exercise.key ? { border: "1.5px solid var(--sport)", background: "var(--sport-soft)", color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" } : { border: "1px solid var(--border)" }}>
                  {item.name}
                </button>
              ))}
            </div>
            <div className={`${card} space-y-3 p-4`} data-progress-curve>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-foreground-muted">{f("topLoad")}</p>
                  <p className="mt-0.5 text-[26px] font-extrabold tabular-nums">{exercise.records.maxWeight ? `${n.format(exercise.records.maxWeight.weight)} kg` : "—"}</p>
                </div>
                <div className="flex items-end gap-2">
                  <div className="text-end">
                    <p className="text-xs text-foreground-muted">{f("est1RM")}</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums">{exercise.records.best1RM ? `${n.format(exercise.records.best1RM.value)} kg` : "—"}</p>
                  </div>
                  <ExerciseGuideButton name={exercise.name} />
                </div>
              </div>
              {curve.points.length >= 2 ? (
                <WeeklyLineChart data={curve.points.map((point) => ({ label: formatLocalizedDate(point.date, language, { day: "numeric", month: "short" }), value: point.topWeight }))} color="var(--sport)" unit="kg" />
              ) : (
                <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-foreground-muted">{f("fewPoints")}</p>
              )}
              {curve.gain !== null && <p className="text-[13px] font-semibold" style={{ color: curve.gain >= 0 ? "color-mix(in srgb, var(--sport) 62%, var(--foreground))" : "var(--danger)" }}>{f("gain", { gain: `${curve.gain >= 0 ? "+" : "−"}${n.format(Math.abs(curve.gain))}`, count: n.format(curve.points.length) })}</p>}
            </div>
          </>
        ) : (
          <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">{f("noExercise")}</p>
        )}
      </section>

      <section aria-labelledby="progress-muscles" className="space-y-2.5" data-progress-muscles>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="progress-muscles" className="text-[15px] font-semibold">{f("setsPerMuscle")}</h2>
          <span className="text-xs text-foreground-muted">{f("thisWeekShort")}</span>
        </div>
        {weeklyMuscles.length ? (
          <div className={`${card} space-y-3.5 p-4`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[30px] font-extrabold leading-none tracking-tight tabular-nums">{n.format(setsNow)} <span className="text-sm font-semibold text-foreground-muted">{f(setsNow === 1 ? "setsCountOne" : "setsCount", { count: "" }).trim()}</span></p>
                <p className="mt-1.5 text-xs font-semibold" style={{ color: setsDiff > 0 ? "var(--success)" : setsDiff < 0 ? "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" : "var(--foreground-muted)" }}>
                  {setsDiff === 0 ? f("sameLastWeek") : f("vsLastWeek", { arrow: setsDiff > 0 ? "▲" : "▼", count: n.format(Math.abs(setsDiff)) })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-[11px] text-foreground-muted">
                <span className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-[18px] rounded-[3px] border border-dashed" style={{ background: "color-mix(in srgb, var(--sport) 16%, transparent)", borderColor: "color-mix(in srgb, var(--sport) 50%, transparent)" }} />{f("zoneLegend")}</span>
                <span className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-0.5 rounded-sm bg-foreground" />{f("lastWeekLegend")}</span>
              </div>
            </div>
            {trained.length > 0 && (
              <ul className="space-y-3">
                {trained.map((muscle) => {
                  const diff = muscle.thisWeekSets - muscle.lastWeekSets;
                  const low = muscle.thisWeekSets < 10;
                  const color = muscleColor(muscle.muscle);
                  return (
                    <li key={muscle.muscle} className="grid grid-cols-[92px_minmax(0,1fr)_44px] items-center gap-2.5" aria-label={f("muscleRow", { muscle: muscleLabel(muscle.muscle), now: muscle.thisWeekSets, last: muscle.lastWeekSets })}>
                      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold"><span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} /><span className="truncate">{muscleLabel(muscle.muscle)}</span></span>
                      <span aria-hidden className="relative h-3 rounded-md bg-surface-muted">
                        <span className="absolute inset-y-0 border-x border-dashed" style={{ insetInlineStart: `${pct(10)}%`, width: `${pct(20) - pct(10)}%`, background: "color-mix(in srgb, var(--sport) 10%, transparent)", borderColor: "color-mix(in srgb, var(--sport) 45%, transparent)" }} />
                        <span className="absolute inset-y-0.5 start-0.5 rounded" style={{ width: `calc(${pct(muscle.thisWeekSets)}% - 4px)`, background: color }} />
                        {muscle.lastWeekSets > 0 && <span className="absolute -inset-y-[3px] w-0.5 rounded-sm bg-foreground" style={{ insetInlineStart: `calc(${pct(muscle.lastWeekSets)}% - 1px)`, boxShadow: "0 0 0 2px var(--surface)" }} />}
                      </span>
                      <span className="text-end leading-tight">
                        <span className="block text-base font-extrabold tabular-nums" style={low ? { color: "color-mix(in srgb, var(--nutrition) 85%, var(--foreground))" } : undefined}>{n.format(muscle.thisWeekSets)}</span>
                        <span className="block text-[11px] font-semibold tabular-nums" style={{ color: diff > 0 ? "var(--success)" : diff < 0 ? "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" : "var(--foreground-muted)" }}>{diff === 0 ? "=" : `${diff > 0 ? "+" : "−"}${n.format(Math.abs(diff))}`}</span>
                      </span>
                    </li>
                  );
                })}
                <li aria-hidden className="grid grid-cols-[92px_minmax(0,1fr)_44px] gap-2.5 text-[10px] text-foreground-muted">
                  <span />
                  <span className="relative h-3">
                    <span className="absolute start-0">0</span>
                    <span className="absolute -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: `${pct(10)}%` }}>{n.format(10)}</span>
                    <span className="absolute -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: `${pct(20)}%` }}>{n.format(20)}</span>
                  </span>
                  <span />
                </li>
              </ul>
            )}
            {untrained.length > 0 && (
              <div className={trained.length ? "border-t border-border pt-3" : ""} data-progress-untrained>
                <p className="mb-2 text-xs text-foreground-muted">{f("notTrained")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {untrained.map((muscle) => (
                    <span key={muscle.muscle} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold">
                      {muscleLabel(muscle.muscle)} <span className="font-medium text-foreground-muted">· {f("lastWeekCount", { count: n.format(muscle.lastWeekSets) })}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-border p-5 text-center text-sm text-foreground-muted">{f("noMuscles")}</p>
        )}
        {weeklyMuscles.length > 0 && <p className="text-[11px] leading-relaxed text-foreground-muted">{f("zoneNote")}</p>}
      </section>

      <section aria-labelledby="progress-regularity" className="space-y-2.5" data-progress-regularity>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="progress-regularity" className="text-[15px] font-semibold">{f("regularity")}</h2>
          <span className="text-xs text-foreground-muted">{f("regularityScope")}</span>
        </div>
        <div className={`${card} space-y-4 p-4`}>
          <dl className="grid grid-cols-3 gap-2">
            {[[f("goalReachedWeeks"), f("goalReachedValue", { count: n.format(grid.goalWeeks) })], [f("currentStreak"), f("streakValue", { count: n.format(grid.streak) })], [f("weeklyAverage"), f("averageValue", { count: n.format(grid.average) })]].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-2xl bg-surface-muted px-2.5 py-2">
                <dt className="truncate text-[11px] text-foreground-muted">{label}</dt>
                <dd className="mt-0.5 truncate text-[15px] font-extrabold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="relative h-[132px]" role="img" aria-label={f("regularitySummary", { count: n.format(grid.total), goal: n.format(grid.goalWeeks) })}>
            <div aria-hidden className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${(weeklyGoal / scale) * 100}%`, borderColor: "color-mix(in srgb, var(--sport) 55%, transparent)" }}>
              <span className="absolute -top-[18px] end-0 rounded bg-surface px-1 text-[10px] font-semibold" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}>{f("goalLine", { count: n.format(weeklyGoal) })}</span>
            </div>
            <ol className="absolute inset-0 grid grid-cols-12 items-end gap-1.5">
              {grid.weeks.map((week, index) => {
                const reached = week.total >= weeklyGoal;
                const current = index === grid.weeks.length - 1;
                return (
                  <li key={week.start} className="flex h-full flex-col justify-end" title={f("weekBar", { date: formatLocalizedDate(week.start, language, { day: "numeric", month: "short" }), count: n.format(week.total) })}>
                    {week.total > 0 && <span className="mb-0.5 text-center text-[10px] font-bold tabular-nums text-foreground-muted">{n.format(week.total)}</span>}
                    <span className="block rounded-md" style={{ height: week.total ? `${Math.max(6, (week.total / scale) * 100)}%` : "3px", background: week.total === 0 ? "var(--surface-muted)" : reached ? "var(--sport)" : "color-mix(in srgb, var(--sport) 35%, var(--surface-muted))", outline: current ? "1.5px solid var(--foreground)" : undefined, outlineOffset: current ? 2 : undefined }} />
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="grid grid-cols-12 gap-1.5 text-[10px] text-foreground-muted" aria-hidden>
            {grid.weeks.map((week, index) => <span key={week.start} className="text-center">{index % 4 === 0 || index === 11 ? formatLocalizedDate(week.start, language, { day: "numeric", month: "short" }).replace(".", "") : ""}</span>)}
          </div>
        </div>
      </section>

      {records.length > 0 && (
        <section aria-labelledby="progress-records" className="space-y-2.5" data-progress-records>
          <h2 id="progress-records" className="text-[15px] font-semibold">{f("personalRecords")}</h2>
          <ul className={`${card} overflow-hidden`}>
            {records.map((item, index) => (
              <li key={item.key} className={`flex items-center gap-3 px-3.5 py-3 ${index ? "border-t border-border" : ""}`}>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block text-xs text-foreground-muted">{day(item.records.maxWeight!.date)}</span></span>
                <bdi className="shrink-0 text-[15px] font-extrabold tabular-nums">{n.format(item.records.maxWeight!.weight)} kg × {n.format(item.records.maxWeight!.reps)}</bdi>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
