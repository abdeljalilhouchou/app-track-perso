"use client";

import { useT } from "@/components/language-provider";
import { ModuleCard, ModulePill, ModuleStat, type Tone } from "@/components/sport/ui/module-kit";
import { BALANCE_CATEGORIES, type ExerciseRecord, type WeekFigures, type weekBalance } from "@/lib/calisthenics/insights";
import type { CalisthenicsData } from "@/lib/calisthenics/data";

export type NextSession = { program: string; session: string; exercises: { id: string; label: string }[]; start: () => void } | null;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Calisthenics "Aperçu": what to do next, the week's figures, the skill being worked, records and balance. */
export function CaliOverview({ next, week, previous, skill, records, balance, onStartFree, onCreateProgram, onSeeSkills }: {
  next: NextSession;
  week: WeekFigures;
  previous: WeekFigures;
  skill: CalisthenicsData["skills"][number] | null;
  records: (ExerciseRecord & { label: string })[];
  balance: ReturnType<typeof weekBalance>;
  onStartFree: () => void;
  onCreateProgram: () => void;
  onSeeSkills: () => void;
}) {
  const t = useT();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v2.${key}`, vars);
  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const delta = (now: number, before: number, format: (value: number) => string = String): { delta: string; tone: Tone } =>
    now === before ? { delta: v("deltaSame"), tone: "neutral" } : { delta: `${now > before ? "▲" : "▼"} ${format(Math.abs(now - before))}`, tone: now > before ? "good" : "bad" };
  const best = skill ? Math.max(0, ...skill.logs.map((log) => log.hold_seconds ?? log.reps ?? 0)) : 0;
  const steps = skill?.progression_steps ?? [];
  const current = skill ? Math.max(0, Math.min(skill.current_step, steps.length)) : 0;

  return <div className="space-y-4">
    <ModuleCard highlight>
      {next ? <>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--sport-ink)" }}>{v("nextSession", { program: next.program })}</p>
          <h2 className="mt-1.5 text-[22px] font-bold tracking-tight">{next.session}</h2>
          <p className="mt-1 text-[13px] text-foreground-muted">{v("exercisesCount", { count: next.exercises.length })}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">{next.exercises.map((exercise) => <span key={exercise.id} className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "color-mix(in srgb, var(--sport) 30%, var(--border))" }}>{exercise.label}</span>)}</div>
        <button type="button" className="module-primary" onClick={next.start} data-cali-start-next>{v("startThisSession")}</button>
        <button type="button" className="module-card-link self-center" onClick={onStartFree}>{v("freeSessionLink")}</button>
      </> : <>
        <p className="text-sm text-foreground-muted">{v("noProgramHint")}</p>
        <button type="button" className="module-primary" onClick={onStartFree}>{v("startFree")}</button>
        <button type="button" className="module-card-link self-center" onClick={onCreateProgram}>{v("createProgram")}</button>
      </>}
    </ModuleCard>

    <div className="module-stats">
      <ModuleStat label={v("sessionsLabel")} value={week.sessions} {...delta(week.sessions, previous.sessions)} />
      <ModuleStat label={v("minutesStat")} value={week.minutes} unit="min" {...delta(week.minutes, previous.minutes, (value) => `${value} min`)} />
      <ModuleStat label={v("repsStat")} value={week.reps} {...delta(week.reps, previous.reps)} />
      <ModuleStat label={v("holdStat")} value={clock(week.holdSeconds)} delta={v("holdHint")} />
    </div>

    <ModuleCard title={v("skillInProgress")} action={<button type="button" className="module-card-link" onClick={onSeeSkills}>{v("seeSkills")}</button>}>
      {skill && steps.length ? <>
        <div>
          <p className="text-base font-bold">{skill.name}</p>
          <p className="mt-0.5 text-[13px] text-foreground-muted">{v("stepOf", { current: Math.max(1, current), total: steps.length, name: steps[Math.max(0, current - 1)] })}</p>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-hidden="true">
          {steps.map((step, index) => <span key={`${step}-${index}`} className="h-2 rounded-full" style={{ background: index < current ? "var(--accent)" : "var(--surface-muted)" }} />)}
        </div>
        <p className="text-xs text-foreground-muted">
          {best > 0 && v("bestResult", { value: skill.measurement_type === "hold" ? `${best} s` : `${best} ${c("reps").toLowerCase()}` })}
          {best > 0 && current < steps.length && " · "}
          {current < steps.length && v("nextStep", { name: steps[current] })}
        </p>
      </> : <p className="text-sm text-foreground-muted">{v("noSkillYet")}</p>}
    </ModuleCard>

    {records.length > 0 && <ModuleCard title={v("recentRecords")}>
      <ul className="-my-1 divide-y divide-border">
        {records.slice(0, 3).map((record) => <li key={`${record.key}-${record.kind}`} className="flex items-center justify-between gap-3 py-3" data-cali-record>
          <div className="min-w-0"><p className="truncate font-semibold">{record.label}</p><p className="text-xs text-foreground-muted">{v(record.kind === "hold" ? "holdKind" : "inOneSet")}</p></div>
          <div className="flex shrink-0 items-center gap-2">{record.isNew && <ModulePill>{v("newBadge")}</ModulePill>}<p className="text-[17px] font-bold tabular-nums">{record.kind === "hold" ? clock(record.value) : `${record.value} reps`}</p></div>
        </li>)}
      </ul>
    </ModuleCard>}

    <ModuleCard title={v("weekBalance")}>
      <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 text-[13px]">
        {BALANCE_CATEGORIES.map((category) => <div key={category} className="contents">
          <span>{c(`categories.${category}`)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${balance.max ? (balance.counts[category] / balance.max) * 100 : 0}%`, background: balance.lagging.includes(category) ? "#f59e0b" : "var(--sport)" }} /></span>
          <span className="text-end text-foreground-muted tabular-nums">{v("setsCount", { count: balance.counts[category] })}</span>
        </div>)}
      </div>
      {balance.lagging.map((category) => <p key={category} className="text-xs font-medium" style={{ color: "var(--mood-text)" }}>{v("lagging", { category: c(`categories.${category}`) })}</p>)}
    </ModuleCard>
  </div>;
}
