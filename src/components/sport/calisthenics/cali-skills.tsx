"use client";

import { useState, type ReactNode } from "react";
import { useT } from "@/components/language-provider";
import { ModuleBars, ModuleCard, ModuleChips } from "@/components/sport/ui/module-kit";
import { readyForNextStep, type ExerciseRecord } from "@/lib/calisthenics/insights";
import type { CalisthenicsData } from "@/lib/calisthenics/data";

type Skill = CalisthenicsData["skills"][number];
const clock = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : `${seconds} s`;

/** Calisthenics "Progrès": one skill's step ladder, its recent results, and records by exercise. */
export function CaliSkills({ skills, records, onEdit, onDelete, onAdvance, logger }: {
  skills: Skill[];
  records: (ExerciseRecord & { label: string })[];
  onEdit: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  /** Moves the skill to its next step; offered once the last 3 results sit on the current step. */
  onAdvance: (skill: Skill) => void;
  /** The existing result logger for the selected skill. */
  logger: (skill: Skill) => ReactNode;
}) {
  const t = useT();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v2.${key}`, vars);
  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const [selectedId, setSelectedId] = useState(skills[0]?.id ?? "");
  const skill = skills.find((item) => item.id === selectedId) ?? skills[0];
  const unit = (value: number) => skill?.measurement_type === "hold" ? clock(value) : `${value} reps`;
  const canAdvance = !!skill && readyForNextStep(skill);
  const logs = skill ? [...skill.logs].sort((a, b) => a.logged_on.localeCompare(b.logged_on) || a.created_at.localeCompare(b.created_at)).slice(-6) : [];

  return <div className="space-y-4">
    {skills.length > 1 && <ModuleChips label={c("skillsTitle")} value={skill?.id ?? ""} options={skills.map((item) => ({ value: item.id, label: item.name }))} onChange={setSelectedId} />}

    {skill && <ModuleCard title={skill.name} action={<span className="text-[13px] font-semibold" style={{ color: "color-mix(in srgb, var(--accent) 75%, var(--foreground))" }}>{v("stepOf", { current: Math.max(1, skill.current_step), total: skill.progression_steps.length, name: "" }).replace(/\s·\s*$/, "")}</span>}>
      <p className="-mt-1 text-xs text-foreground-muted">{v("ladderHint")}</p>
      <ol className="cali-ladder" data-cali-ladder>
        {skill.progression_steps.map((step, index) => {
          const state = index < skill.current_step - 1 ? "done" : index === skill.current_step - 1 ? "current" : "next";
          const best = Math.max(0, ...skill.logs.filter((log) => log.step_index === index).map((log) => log.hold_seconds ?? log.reps ?? 0));
          return <li key={`${step}-${index}`} data-state={state}>
            <span className="cali-ladder-dot" aria-hidden="true">{state === "done" ? "✓" : index + 1}</span>
            <div className={state === "current" ? "cali-ladder-current" : undefined}>
              <p className="font-semibold" style={{ color: state === "next" ? "var(--foreground-muted)" : undefined }}>{step}</p>
              {best > 0 && <p className="mt-0.5 text-xs text-foreground-muted">{v("bestResult", { value: unit(best) })}</p>}
            </div>
          </li>;
        })}
      </ol>
      {logs.length >= 2 && <div className="space-y-2">
        <p className="text-[13px] font-semibold">{v("bestPerSession")}</p>
        <ModuleBars label={v("bestPerSession")} bars={logs.map((log, index) => ({ key: log.id, label: String(log.hold_seconds ?? log.reps ?? 0), value: log.hold_seconds ?? log.reps ?? 0, highlight: index === logs.length - 1 }))} />
      </div>}
      {canAdvance && <div className="space-y-2 rounded-2xl p-3" style={{ background: "color-mix(in srgb, var(--sport) 10%, transparent)" }} data-cali-advance>
        <p className="text-[13px]">{v("advanceReady")}</p>
        <button type="button" className="module-primary" onClick={() => onAdvance(skill)}>{v("advanceStep")}</button>
      </div>}
      {logger(skill)}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="module-secondary" onClick={() => onEdit(skill)}>{c("editProgram")}</button>
        <button type="button" className="module-secondary is-danger" onClick={() => onDelete(skill)}>{c("remove")}</button>
      </div>
    </ModuleCard>}

    <ModuleCard title={v("recordsByExercise")}>
      {records.length ? <div className="grid grid-cols-2 gap-2.5">
        {records.map((record) => <div key={`${record.key}-${record.kind}`} className="rounded-2xl bg-surface-muted px-3.5 py-3">
          <p className="truncate text-xs text-foreground-muted">{record.label}</p>
          <p className="mt-1 text-[17px] font-bold tabular-nums">{record.kind === "hold" ? clock(record.value) : `${record.value} reps`}</p>
        </div>)}
      </div> : <p className="text-sm text-foreground-muted">{v("noRecords")}</p>}
    </ModuleCard>
  </div>;
}
