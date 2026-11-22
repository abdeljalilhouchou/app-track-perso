"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/components/language-provider";
import { readyForNextStep } from "@/lib/calisthenics/insights";
import type { CalisthenicsData } from "@/lib/calisthenics/data";
import { SkillRing } from "./cali-before";

type Skill = CalisthenicsData["skills"][number];
const VIOLET_INK = "#1a1033";
const clock = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : `${seconds} s`;

/** Calisthenics "Progrès": one skill at a time, its ladder of steps and the next move. */
export function CaliSkills({ skills, onEdit, onDelete, onAdvance, logger }: {
  skills: Skill[];
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  /** Moves the skill to its next step; offered once the last 3 results sit on the current step. */
  onAdvance: (skill: Skill) => void;
  /** The result logger for the selected skill. */
  logger: (skill: Skill) => ReactNode;
}) {
  const t = useT();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v2.${key}`, vars);
  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const [selectedId, setSelectedId] = useState(skills[0]?.id ?? "");
  const [logging, setLogging] = useState(false);
  const skill = skills.find((item) => item.id === selectedId) ?? skills[0];
  if (!skill) return null;
  const unit = (value: number) => skill.measurement_type === "hold" ? clock(value) : `${value} reps`;
  const canAdvance = readyForNextStep(skill);
  const total = skill.progression_steps.length;
  const current = Math.max(1, skill.current_step);

  return <div className="space-y-3" data-cali-skills>
    {skills.length > 1 && <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label={c("skillsTitle")}>
      {skills.map((item) => {
        const active = item.id === skill.id;
        return <button key={item.id} type="button" aria-pressed={active} onClick={() => { setSelectedId(item.id); setLogging(false); }} className="min-h-10 shrink-0 rounded-full px-3 text-[13px] font-semibold" style={active ? { border: "1.5px solid var(--habit)", background: "color-mix(in srgb, var(--habit) 16%, var(--surface))" } : { border: "1px solid var(--border)", color: "var(--foreground-muted)" }}>
          {item.name} · {Math.max(1, item.current_step)}/{item.progression_steps.length}
        </button>;
      })}
    </div>}

    <section className="space-y-4 rounded-3xl border p-4" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--habit) 16%, var(--surface)), var(--surface) 60%)", borderColor: "color-mix(in srgb, var(--habit) 40%, var(--border))" }} aria-label={skill.name}>
      <div className="flex items-center gap-3.5">
        <SkillRing current={current} total={total} size={64} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-extrabold">{skill.name}</h3>
          <p className="mt-0.5 text-xs text-foreground-muted">{c(skill.measurement_type === "hold" ? "holdSeconds" : "reps")} · {v("stepOf", { current, total, name: skill.progression_steps[current - 1] ?? "" })}</p>
        </div>
      </div>

      <ol className="m-0 list-none p-0" data-cali-ladder>
        {skill.progression_steps.map((step, index) => {
          const state = index < skill.current_step - 1 ? "done" : index === skill.current_step - 1 ? "current" : index === skill.current_step ? "next" : "locked";
          const best = Math.max(0, ...skill.logs.filter((log) => log.step_index === index).map((log) => log.hold_seconds ?? log.reps ?? 0));
          const last = index === skill.progression_steps.length - 1;
          return <li key={`${step}-${index}`} data-state={state === "locked" ? "next" : state} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold" style={state === "done" ? { background: "var(--habit)", color: VIOLET_INK } : state === "current" ? { background: "var(--sport)", color: "#062016", boxShadow: "0 0 0 4px color-mix(in srgb, var(--sport) 22%, transparent)" } : { border: "1.5px solid var(--border)", color: "var(--foreground-muted)" }}>{state === "done" ? "✓" : index + 1}</span>
              {!last && <span aria-hidden className="my-0.5 w-0.5 flex-1" style={{ minHeight: 14, background: state === "done" ? "var(--habit)" : "var(--border)" }} />}
            </span>
            <span className={`min-w-0 pb-3.5 pt-1 ${state === "locked" ? "opacity-50" : ""}`}>
              <span className="block text-sm font-bold">{step}</span>
              {(best > 0 || state === "current" || state === "next") && <span className="mt-0.5 block text-xs" style={{ color: state === "current" ? "color-mix(in srgb, var(--sport) 70%, var(--foreground))" : "var(--foreground-muted)" }}>
                {state === "done" ? v("bestResult", { value: unit(best) }) : state === "current" ? [c("currentStep"), best > 0 ? v("bestResult", { value: unit(best) }) : null].filter(Boolean).join(" · ") : state === "next" ? c("targetStep") : ""}
              </span>}
            </span>
          </li>;
        })}
      </ol>

      {canAdvance ? <div className="space-y-2.5 rounded-2xl border p-3" style={{ background: "color-mix(in srgb, var(--sport) 10%, transparent)", borderColor: "color-mix(in srgb, var(--sport) 35%, transparent)" }} data-cali-advance>
        <p className="text-[13px]" style={{ color: "color-mix(in srgb, var(--sport) 70%, var(--foreground))" }}>{v("advanceReady")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="module-primary" style={{ minHeight: 44 }} onClick={() => onAdvance(skill)}>{v("advanceStep")}</button>
          <button type="button" onClick={() => setLogging((value) => !value)} className="min-h-11 rounded-xl border border-border bg-surface text-[13px] font-semibold">{c("logResult")}</button>
        </div>
      </div> : <button type="button" onClick={() => setLogging((value) => !value)} aria-expanded={logging} className="min-h-11 w-full rounded-xl text-[13px] font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }} data-cali-log>{c("logResult")}</button>}

      {logging && logger(skill)}

      <div className="flex justify-end gap-1">
        <button type="button" className="min-h-10 rounded-xl px-3 text-[13px] font-semibold" style={{ color: "color-mix(in srgb, var(--habit) 70%, var(--foreground))" }} onClick={() => onEdit(skill)}>{c("editProgram")}</button>
        <button type="button" className="min-h-10 rounded-xl px-3 text-[13px] font-semibold text-danger" onClick={() => onDelete(skill)}>{c("remove")}</button>
      </div>
    </section>
  </div>;
}
