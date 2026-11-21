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
  const most = Math.max(1, ...weeklyMuscles.flatMap((muscle) => [muscle.thisWeekSets, muscle.lastWeekSets]));
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
          <span className="flex items-center gap-2 text-xs text-foreground-muted">
            <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: "var(--sport)" }} />{f("thisWeekShort")}</span>
            <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-sm bg-border" />{f("lastWeekShort")}</span>
          </span>
        </div>
        {weeklyMuscles.length ? (
          <ul className={`${card} space-y-2.5 p-3.5`}>
            {weeklyMuscles.map((muscle) => (
              <li key={muscle.muscle} className="grid grid-cols-[96px_minmax(0,1fr)_32px] items-center gap-2.5 text-[13px]">
                <span className="truncate" style={{ color: `color-mix(in srgb, ${muscleColor(muscle.muscle)} 70%, var(--foreground))` }}>{muscleLabel(muscle.muscle)}</span>
                <span className="flex flex-col gap-[3px]">
                  <span className="block h-[7px] rounded-full" style={{ width: `${Math.max(2, (muscle.thisWeekSets / most) * 100)}%`, background: "var(--sport)" }} />
                  <span className="block h-1 rounded-full bg-border" style={{ width: `${Math.max(2, (muscle.lastWeekSets / most) * 100)}%` }} />
                </span>
                <span className="text-end font-bold tabular-nums">{n.format(muscle.thisWeekSets)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-dashed border-border p-5 text-center text-sm text-foreground-muted">{f("noMuscles")}</p>
        )}
      </section>

      <section aria-labelledby="progress-regularity" className="space-y-2.5" data-progress-regularity>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="progress-regularity" className="text-[15px] font-semibold">{f("regularity")}</h2>
          <span className="text-xs text-foreground-muted">{f("regularityScope")}</span>
        </div>
        <div className={`${card} p-3.5`}>
          <div className="grid grid-flow-col grid-cols-12 grid-rows-7 gap-1" aria-hidden>
            {grid.weeks.flatMap((week) => week.days.map((cell) => (
              <span key={cell.date} className="aspect-square rounded-[4px]" style={{ background: cell.future ? "transparent" : cell.count ? (cell.count > 1 ? "color-mix(in srgb, var(--sport) 60%, white)" : "var(--sport)") : "var(--surface-muted)" }} />
            )))}
          </div>
          <p className="mt-2.5 text-xs text-foreground-muted">{f("regularitySummary", { count: n.format(grid.total), goal: n.format(grid.goalWeeks) })}</p>
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
