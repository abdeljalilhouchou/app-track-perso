"use client";

import { useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";
import { Dialog } from "@/components/ui/dialog";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import { categoryColor, nextAim } from "@/lib/calisthenics/focus";
import { readyForNextStep } from "@/lib/calisthenics/insights";
import { formatLocalizedDate } from "@/lib/format-date";
import type { CalisthenicsData } from "@/lib/calisthenics/data";
import type { CalisthenicsExercise } from "@/types/database";

type Program = CalisthenicsData["programs"][number];
type Session = Program["sessions"][number];
type Skill = CalisthenicsData["skills"][number];
const VIOLET_INK = "#1a1033";
const ink = "color-mix(in srgb, var(--habit) 70%, var(--foreground))";

export function CaliBefore({ program, programs, suggestedId, doneThisWeek, sessionsThisWeek, goal, exercisesById, lastBest, skill, balance, onStart, onFree, onCreateProgram, onSkill }: {
  program: Program | null;
  programs: Program[];
  suggestedId: string | null;
  /** Program sessions done this week, with their day. */
  doneThisWeek: Record<string, string>;
  sessionsThisWeek: number;
  goal: number;
  exercisesById: Map<string, CalisthenicsExercise>;
  /** Best reps or seconds of each exercise's most recent session. */
  lastBest: Map<string, number>;
  skill: Skill | null;
  balance: { category: string; sets: number }[];
  onStart: (session: Session) => void;
  onFree: () => void;
  onCreateProgram: () => void;
  onSkill: () => void;
}) {
  const { t, language } = useLanguage();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v3.${key}`, vars);
  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const n = new Intl.NumberFormat(language);
  const nameOf = (exercise: CalisthenicsExercise | undefined) => (exercise ? (language === "ar" ? exercise.name_ar : language === "en" ? exercise.name_en : exercise.name_fr) : "—");
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const all = programs.flatMap((item) => item.sessions.map((session) => ({ program: item, session })));
  const chosen = all.find((entry) => entry.session.id === chosenId)?.session ?? program?.sessions.find((session) => session.id === suggestedId) ?? program?.sessions[0] ?? null;
  const most = Math.max(1, ...balance.map((item) => item.sets));
  const low = balance.filter((item) => item.category !== "skills" && item.sets < most / 3);

  if (!program && !chosen) {
    return <div className="mx-auto max-w-2xl space-y-4" data-cali-before>
      <div className="rounded-3xl border-[1.5px] border-dashed p-8 text-center" style={{ borderColor: "color-mix(in srgb, var(--habit) 45%, var(--border))" }}>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--habit) 16%, var(--surface))", color: ink }}><SportIcon name="calisthenics" className="h-7 w-7" /></span>
        <p className="mt-3 font-semibold">{v("emptyTitle")}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">{v("emptyBody")}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onCreateProgram} className="min-h-11 rounded-xl px-5 text-sm font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }}>{v("createProgram")}</button>
          <button type="button" onClick={onFree} className="min-h-11 rounded-xl border border-border px-5 text-sm font-semibold" data-cali-free>{v("free")}</button>
        </div>
      </div>
    </div>;
  }

  const totalSets = chosen?.exercises.reduce((sum, item) => sum + item.target_sets, 0) ?? 0;
  const categories = [...new Set(chosen?.exercises.map((item) => exercisesById.get(item.exercise_id ?? "")?.category).filter(Boolean) as string[])];

  return <div className="mx-auto max-w-2xl space-y-5" data-cali-before>
    {program && <section aria-label={v("programLabel", { name: program.name })} className="space-y-2.5" data-cali-strip>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-semibold">{v("programLabel", { name: program.name })}</p>
        <span className="shrink-0 text-xs text-foreground-muted">{v("weekShort", { done: n.format(sessionsThisWeek), goal: n.format(goal) })}</span>
      </div>
      <ol className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {program.sessions.map((session) => {
          const done = doneThisWeek[session.id];
          const selected = chosen?.id === session.id;
          return <li key={session.id} className="min-w-[104px] flex-1">
            <button type="button" aria-pressed={selected} onClick={() => setChosenId(session.id)} className="flex min-h-14 w-full flex-col items-start justify-center rounded-2xl px-3 py-2 text-start" style={selected ? { border: "2px solid var(--habit)" } : done ? { background: "color-mix(in srgb, var(--habit) 16%, var(--surface))" } : { border: "1px solid var(--border)", background: "var(--surface)" }}>
              <span className="w-full truncate text-[13px] font-bold" style={done && !selected ? { color: ink } : undefined}>{done ? "✓ " : ""}{session.name}</span>
              <span className="text-[11px]" style={{ color: session.id === suggestedId && !done ? ink : "var(--foreground-muted)" }}>{done ? v("doneOn", { day: formatLocalizedDate(done, language, { weekday: "short", day: "numeric" }) }) : session.id === suggestedId ? v("today") : v("upNext")}</span>
            </button>
          </li>;
        })}
      </ol>
    </section>}

    {chosen && <section aria-labelledby="cali-session-of-day" className="overflow-hidden rounded-3xl border-[1.5px]" style={{ borderColor: "color-mix(in srgb, var(--habit) 45%, var(--border))", background: "color-mix(in srgb, var(--habit) 6%, var(--surface))" }} data-cali-hero>
      <div className="relative h-[176px]">
        <Image src="/images/sport/calisthenics.webp" alt="" fill priority sizes="(max-width: 672px) 100vw, 672px" className="object-cover object-[center_55%]" />
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(0 0 0 / 0.1) 0%, rgb(0 0 0 / 0.45) 50%, rgb(0 0 0 / 0.88) 100%)" }} />
        <div className="absolute inset-x-[18px] bottom-3.5 text-white">
          {chosen.id === suggestedId && <span className="mb-2 inline-block rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#c4b5fd]">{v("sessionOfDay")}</span>}
          <h2 id="cali-session-of-day" className="text-[28px] font-extrabold leading-tight">{chosen.name}</h2>
          <p className="mt-0.5 text-[13px] text-white/85">{[v("sessionStats", { count: n.format(chosen.exercises.length), sets: n.format(totalSets) }), categories.map((item) => c(`categories.${item}`)).join(", ")].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 p-[18px] pt-4">
        {chosen.exercises.length > 0 && <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 px-0.5 pb-1.5 text-[11px] text-foreground-muted"><span>{v("colExercise")}</span><span className="text-end">{v("colLast")}</span><span className="min-w-16 text-end" style={{ color: ink }}>{v("colGoal")}</span></div>
          <ol>
            {chosen.exercises.slice(0, 4).map((line, i) => {
              const exercise = exercisesById.get(line.exercise_id ?? "");
              const hold = line.measurement_type === "hold";
              const unit = hold ? v("seconds") : v("reps");
              const last = lastBest.get(line.exercise_id ?? "") ?? null;
              const aim = nextAim(last, hold ? line.target_hold_seconds : line.target_reps, hold ? "hold" : "reps");
              const color = categoryColor(exercise?.category ?? line.category);
              return <li key={line.id} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-0.5 py-2.5 ${i ? "border-t border-border" : ""}`} data-cali-hero-exercise>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{nameOf(exercise) === "—" ? line.exercise_name : nameOf(exercise)}</span>
                  <span className="mt-0.5 flex items-center gap-1.5"><span className="rounded-full px-1.5 py-px text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color: `color-mix(in srgb, ${color} 70%, var(--foreground))` }}>{c(`categories.${exercise?.category ?? line.category}`)}</span><span className="text-xs text-foreground-muted">{n.format(line.target_sets)} × {hold ? `${line.target_hold_seconds ?? "–"} ${unit}` : line.target_reps ?? "–"}</span></span>
                </span>
                <span className="text-end text-[13px] text-foreground-muted">{last !== null ? `${n.format(last)} ${unit}` : "—"}</span>
                <span className="min-w-16 text-end text-[13px] font-bold" style={aim?.up ? { color: ink } : undefined}>{aim ? `${aim.up ? "↑ " : ""}${n.format(aim.value)} ${unit}` : "—"}</span>
              </li>;
            })}
          </ol>
          {chosen.exercises.length > 4 && <p className="mt-1.5 text-[13px] text-foreground-muted">{v("more", { count: n.format(chosen.exercises.length - 4) })}</p>}
        </div>}
        <button type="button" onClick={() => onStart(chosen)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl text-base font-extrabold transition-transform active:scale-[0.98]" style={{ background: "var(--habit)", color: VIOLET_INK, boxShadow: "0 10px 28px -12px var(--habit)" }} data-cali-start><SportIcon name="play" className="h-[18px] w-[18px]" />{v("start")}</button>
        {all.length > 1 && <button type="button" onClick={() => setPicker(true)} className="min-h-11 rounded-2xl border border-border bg-surface text-[13px] font-semibold">{v("change")}</button>}
      </div>
    </section>}

    {skill && skill.progression_steps.length > 0 && <section aria-labelledby="cali-skill" className="space-y-2.5">
      <h2 id="cali-skill" className="text-[15px] font-semibold">{v("skillInProgress")}</h2>
      <button type="button" onClick={onSkill} className="flex w-full items-center gap-3.5 rounded-[20px] border p-3.5 text-start" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--habit) 22%, var(--surface)), color-mix(in srgb, var(--habit) 8%, var(--surface)))", borderColor: "color-mix(in srgb, var(--habit) 40%, var(--border))" }} data-cali-skill>
        <SkillRing current={Math.max(1, skill.current_step)} total={skill.progression_steps.length} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">{skill.name}</span>
          <span className="mt-0.5 block truncate text-xs text-foreground-muted">{v("skillStep", { current: Math.max(1, skill.current_step), step: skill.progression_steps[Math.max(0, skill.current_step - 1)] ?? "" })}</span>
          {readyForNextStep(skill) && <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: "color-mix(in srgb, var(--sport) 16%, transparent)", color: "color-mix(in srgb, var(--sport) 70%, var(--foreground))" }}>{v("readyNext", { step: skill.current_step + 1 })}</span>}
        </span>
        <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0" />
      </button>
    </section>}

    {balance.some((item) => item.sets > 0) && <section aria-labelledby="cali-balance" className="space-y-2.5" data-cali-balance>
      <div className="flex items-baseline justify-between gap-3"><h2 id="cali-balance" className="text-[15px] font-semibold">{v("weekBalance")}</h2><span className="text-xs text-foreground-muted">{v("setsUnit")}</span></div>
      <div className="grid grid-cols-4 gap-2">
        {balance.filter((item) => item.category !== "skills").map((item) => <div key={item.category} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-2.5 py-3">
          <span className="truncate text-xs text-foreground-muted">{c(`categories.${item.category}`)}</span>
          <span className="text-xl font-extrabold tabular-nums">{n.format(item.sets)}</span>
          <span className="h-[5px] overflow-hidden rounded bg-surface-muted"><span className="block h-full rounded" style={{ width: `${(item.sets / most) * 100}%`, background: categoryColor(item.category) }} /></span>
        </div>)}
      </div>
      {low.length > 0 && <p className="text-xs" style={{ color: "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" }}>{v("lowBalance", { category: low.map((item) => c(`categories.${item.category}`)).join(", ") })}</p>}
    </section>}

    <section aria-labelledby="cali-else" className="space-y-2.5">
      <h2 id="cali-else" className="text-[15px] font-semibold">{v("somethingElse")}</h2>
      <button type="button" onClick={onFree} className="flex w-full items-center gap-3 rounded-[20px] border border-border bg-surface p-3.5 text-start transition hover:bg-surface-muted" data-cali-free>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "color-mix(in srgb, var(--habit) 16%, var(--surface))", color: ink }}><SportIcon name="plus" className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{v("free")}</span><span className="block text-xs text-foreground-muted">{v("freeHint")}</span></span>
        <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0" />
      </button>
    </section>

    <Dialog open={picker} onClose={() => setPicker(false)} widthClassName="max-w-sm" ariaLabel={v("changeTitle")}>
      <div className="max-h-[80vh] space-y-3 overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-2xl">
        <p className="text-base font-bold">{v("changeTitle")}</p>
        <ul className="space-y-1.5">
          {all.map(({ program: owner, session }) => <li key={session.id}><button type="button" onClick={() => { setChosenId(session.id); setPicker(false); }} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 text-start" style={{ borderColor: chosen?.id === session.id ? "var(--habit)" : "var(--border)" }}>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{session.name}</span><span className="block truncate text-xs text-foreground-muted">{owner.name}</span></span>
            {doneThisWeek[session.id] && <span className="text-xs font-semibold" style={{ color: ink }}>✓</span>}
          </button></li>)}
        </ul>
        <button type="button" onClick={() => setPicker(false)} className="min-h-11 w-full rounded-xl border border-border text-sm font-semibold">{v("close")}</button>
      </div>
    </Dialog>
  </div>;
}

export function SkillRing({ current, total, size = 56 }: { current: number; total: number; size?: number }) {
  const stroke = 6;
  const radius = size / 2 - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  return <span className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--habit)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(1, current / Math.max(1, total)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
    <span className="absolute inset-0 grid place-items-center text-sm font-extrabold">{current}/{total}</span>
  </span>;
}
