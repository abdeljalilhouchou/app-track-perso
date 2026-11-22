"use client";

import Image from "next/image";
import { addDays, format, startOfWeek } from "date-fns";
import { useT } from "@/components/language-provider";
import type { Language } from "@/lib/language";
import { RUN_TYPE_COLORS } from "@/lib/running/colors";
import { calculateRunningMetrics, formatPace, type computeRunningStats, type RunningGoals, type RunningRun } from "@/lib/running/stats";
import { formatClock, formatKm, formatWhen, localeOf } from "./format";

type Stats = ReturnType<typeof computeRunningStats>;
const card = "rounded-3xl border border-border bg-surface";
const INK = "color-mix(in srgb, var(--water) 70%, var(--foreground))";
const BLUE_INK = "#04202f";

/** Running "Course": the week against its goal, the two ways to log a run, the last run, records, the 5 km goal and the week's days. */
export function RunningOverview({ stats, goals, runs, language, today, onLogRun, onStartLive, onOpenRun, onGoTo }: {
  stats: Stats;
  goals: RunningGoals | null;
  runs: RunningRun[];
  language: Language;
  today: string;
  onLogRun: () => void;
  onStartLive: () => void;
  onOpenRun: (run: RunningRun) => void;
  onGoTo: (section: "progress" | "goals") => void;
}) {
  const t = useT();
  const r = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.${key}`, vars);
  const w = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.${key}`, vars);
  const week = stats.thisWeek, last = stats.lastWeek;
  const pace = (distance: number, duration: number) => (distance > 0 ? duration / distance : null);
  const weekPace = pace(week.distanceKm, week.durationSeconds), lastPace = pace(last.distanceKm, last.durationSeconds);
  const paceDelta = weekPace !== null && lastPace !== null ? Math.round(weekPace - lastPace) : null;
  const goalKm = goals?.weekly_distance_km ?? null;
  const share = goalKm ? Math.min(1, week.distanceKm / goalKm) : 0;
  const radius = 44, circumference = 2 * Math.PI * radius;
  const latest = runs[0];
  const latestMetrics = latest ? calculateRunningMetrics(latest.distance_km, latest.duration_seconds) : null;
  const latestRecord = latest && stats.comparable1k?.workout_id === latest.workout_id ? "1 km" : latest && stats.comparable5k?.workout_id === latest.workout_id ? "5 km" : latest && stats.comparable10k?.workout_id === latest.workout_id ? "10 km" : null;
  const records = [
    { key: "1k", label: "1 km", km: 1, run: stats.comparable1k },
    { key: "5k", label: "5 km", km: 5, run: stats.comparable5k },
    { key: "10k", label: "10 km", km: 10, run: stats.comparable10k },
  ];
  const target = goals?.target_5k_seconds ? { label: "5 km", km: 5, seconds: goals.target_5k_seconds, best: stats.comparable5k?.duration_seconds ?? null }
    : goals?.target_10k_seconds ? { label: "10 km", km: 10, seconds: goals.target_10k_seconds, best: stats.comparable10k?.duration_seconds ?? null } : null;
  const weekStart = startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = format(addDays(weekStart, index), "yyyy-MM-dd");
    const km = runs.filter((run) => run.workout_date === date).reduce((sum, run) => sum + run.distance_km, 0);
    return { date, km, today: date === today, label: new Intl.DateTimeFormat(localeOf(language), { weekday: "narrow" }).format(new Date(`${date}T12:00:00`)) };
  });

  return <div className="space-y-5" data-run-overview>
    <section aria-label={r("goalOfWeek")} className={`${card} flex items-center gap-[18px] p-[18px]`} data-run-week>
      <div className="relative h-[104px] w-[104px] shrink-0 module-ring">
        <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
          <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="10" />
          {share > 0 && <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--water)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - share)} transform="rotate(-90 52 52)" />}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold leading-none tabular-nums">{formatKm(week.distanceKm, language)}</span>
          <span className="mt-1 text-[11px] text-foreground-muted">{goalKm ? `/ ${formatKm(goalKm, language)} km` : "km"}</span>
        </div>
      </div>
      <dl className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2"><dt className="text-xs text-foreground-muted">{r("runsLabel")}</dt><dd className="text-[15px] font-extrabold tabular-nums">{goals?.weekly_runs ? w("runsOf", { done: week.runs, goal: goals.weekly_runs }) : week.runs}</dd></div>
        <div className="flex items-baseline justify-between gap-2"><dt className="text-xs text-foreground-muted">{r("timeLabel")}</dt><dd className="text-[15px] font-extrabold tabular-nums">{formatClock(week.durationSeconds)}</dd></div>
        <div className="flex items-baseline justify-between gap-2"><dt className="text-xs text-foreground-muted">{r("paceLabel")}</dt><dd className="text-[15px] font-extrabold tabular-nums">{formatPace(weekPace)}{paceDelta !== null && paceDelta !== 0 && <span className="ms-1 text-[11px] font-semibold" style={{ color: paceDelta < 0 ? "var(--success)" : "var(--foreground-muted)" }}>{paceDelta < 0 ? "▲" : "▼"} {Math.abs(paceDelta)} s</span>}</dd></div>
        <p className="text-[11px] text-foreground-muted">{r("vsLastWeek")}</p>
      </dl>
    </section>

    <section className="grid grid-cols-2 gap-2">
      <button type="button" onClick={onStartLive} className="flex min-h-16 items-center justify-center gap-2 rounded-[18px] text-[15px] font-extrabold" style={{ background: "var(--water)", color: BLUE_INK, boxShadow: "0 10px 28px -12px var(--water)" }} data-run-live-start>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 5v14l12-7z" /></svg>{w("goRun")}
      </button>
      <button type="button" onClick={onLogRun} className="flex min-h-16 items-center justify-center gap-2 rounded-[18px] border-[1.5px] text-[15px] font-bold" style={{ background: "color-mix(in srgb, var(--water) 8%, var(--surface))", borderColor: "color-mix(in srgb, var(--water) 55%, var(--border))", color: "var(--foreground)", boxShadow: "none" }} data-run-log>+ {w("logRun")}</button>
    </section>

    {latest && <section aria-labelledby="run-last" className={`${card} overflow-hidden`} data-run-last>
      <div className="relative h-[150px]">
        <Image src="/images/sport/running.webp" alt="" fill sizes="(max-width: 672px) 100vw, 672px" className="object-cover object-[center_65%]" />
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(0 0 0 / 0.05) 0%, rgb(0 0 0 / 0.5) 55%, rgb(0 0 0 / 0.9) 100%)" }} />
        <div className="absolute inset-x-4 bottom-3 text-white">
          <span className="mb-1.5 inline-block rounded-full bg-black/65 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#7dd3fc]">{w("lastRun", { when: formatWhen(latest.workout_date, language) })}</span>
          <h2 id="run-last" className="truncate text-[22px] font-extrabold">{latest.name || r(`runTypes.${latest.run_type}`)}</h2>
        </div>
      </div>
      <button type="button" onClick={() => onOpenRun(latest)} className="grid w-full grid-cols-3 gap-2 px-4 pt-3.5 text-start">
        <span><span className="block text-[11px] text-foreground-muted">{r("distanceLabel")}</span><span className="mt-0.5 block text-lg font-extrabold tabular-nums">{formatKm(latest.distance_km, language, 2)} km</span></span>
        <span><span className="block text-[11px] text-foreground-muted">{r("pace")}</span><span className="mt-0.5 block text-lg font-extrabold tabular-nums">{formatPace(latestMetrics?.paceSecondsPerKm)} /km</span></span>
        <span><span className="block text-[11px] text-foreground-muted">{r("timeLabel")}</span><span className="mt-0.5 block text-lg font-extrabold tabular-nums">{formatClock(latest.duration_seconds)}</span></span>
      </button>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3.5 pt-3">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${RUN_TYPE_COLORS[latest.run_type]} 18%, transparent)`, color: `color-mix(in srgb, ${RUN_TYPE_COLORS[latest.run_type]} 70%, var(--foreground))` }}>{r(`runTypes.${latest.run_type}`)}</span>
        {latestRecord && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "color-mix(in srgb, var(--mood) 16%, transparent)", color: "color-mix(in srgb, var(--mood) 70%, var(--foreground))" }}>{w("record", { label: latestRecord })}</span>}
      </div>
    </section>}

    <section aria-labelledby="run-records" className="space-y-2.5" data-run-records>
      <div className="flex items-baseline justify-between gap-3"><h2 id="run-records" className="text-[15px] font-semibold">{w("recordsTitle")}</h2><button type="button" onClick={() => onGoTo("progress")} className="min-h-10 text-[13px] font-semibold" style={{ color: INK }}>{w("seeAll")}</button></div>
      <div className="grid grid-cols-3 gap-2">
        {records.map((record) => <div key={record.key} className="flex flex-col rounded-[18px] border p-3" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--water) 18%, var(--surface)), color-mix(in srgb, var(--water) 6%, var(--surface)))", borderColor: "color-mix(in srgb, var(--water) 35%, var(--border))" }}>
          <span className="text-[11px] font-bold" style={{ color: INK }}>{record.label}</span>
          <span className="mt-1.5 text-[19px] font-extrabold tabular-nums">{record.run ? formatClock(record.run.duration_seconds) : "—"}</span>
          <span className="mt-0.5 text-[11px] text-foreground-muted">{record.run ? `${formatPace(record.run.duration_seconds / record.run.distance_km)} /km` : ""}</span>
        </div>)}
      </div>
    </section>

    {target && <section aria-labelledby="run-goal" className={`${card} space-y-2.5 p-4`} data-run-goal>
      <div className="flex items-baseline justify-between gap-3"><h2 id="run-goal" className="text-[15px] font-semibold">{w("goalTime", { distance: target.label, time: formatClock(target.seconds) })}</h2><span className="text-[13px] font-bold tabular-nums">{target.best ? formatClock(target.best) : "—"}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full" style={{ width: `${target.best ? Math.min(100, (target.seconds / target.best) * 100) : 0}%`, background: "linear-gradient(90deg, var(--water), color-mix(in srgb, var(--water) 60%, white))" }} /></div>
      <p className="text-xs text-foreground-muted">{!target.best ? w("noRecord") : target.best <= target.seconds ? w("goalDone") : w("toGain", { time: formatClock(target.best - target.seconds), perKm: Math.round((target.best - target.seconds) / target.km) })}</p>
    </section>}

    <section aria-labelledby="run-days" className="space-y-2.5">
      <h2 id="run-days" className="text-[15px] font-semibold">{w("weekDays")}</h2>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((day) => <li key={day.date} className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] text-foreground-muted" aria-hidden>{day.label}</span>
          <span className="grid h-10 w-full place-items-center rounded-xl text-[11px] font-extrabold tabular-nums" style={day.km > 0 ? { background: "var(--water)", color: BLUE_INK } : day.today ? { border: "2px solid var(--water)" } : { background: "var(--surface-muted)" }}>{day.km > 0 ? formatKm(day.km, language) : ""}</span>
        </li>)}
      </ol>
    </section>
  </div>;
}
