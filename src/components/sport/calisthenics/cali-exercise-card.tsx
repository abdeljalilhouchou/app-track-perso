"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/language-provider";
import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import { ModuleChips, ModulePill } from "@/components/sport/ui/module-kit";

export type DraftSet = { key: string; reps: number | null; holdSeconds: number | null; mode: "reps" | "hold"; assistanceKg: number | null; addedWeightKg: number | null; variation: string; notes: string; done?: boolean };
export type DraftItem = { key: string; exerciseId: string; sets: DraftSet[] };
type Field = "reps" | "holdSeconds" | "assistanceKg" | "addedWeightKg" | "variation" | "notes" | "mode";

const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);

/**
 * One exercise in a Calisthenics session, laid out like the Musculation card: a set per
 * row with its value and a check. A hold set has a timer that writes its seconds when
 * stopped. The session owns the sets; this card only reports edits.
 */
export function CaliExerciseCard({ item, name, exerciseId, tags, measurement, lastText, bestReps, bestHold, onUpdate, onToggleDone, onAddSet, onRemoveSet, onRemoveExercise }: {
  item: DraftItem;
  name: string;
  exerciseId: string;
  tags: string[];
  measurement: "reps" | "hold" | "mixed";
  lastText: string | null;
  bestReps: number;
  bestHold: number;
  onUpdate: (setKey: string, field: Field, value: string | number | null) => void;
  onToggleDone: (setKey: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setKey: string) => void;
  onRemoveExercise: () => void;
}) {
  const t = useT();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v2.${key}`, vars);
  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const [timing, setTiming] = useState<{ setKey: string; startedAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timing) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [timing]);
  const mode = measurement === "mixed" ? (item.sets[0]?.mode ?? "reps") : measurement;
  const allDone = item.sets.length > 0 && item.sets.every((set) => set.done);
  const repsRecord = Math.max(0, ...item.sets.map((set) => set.done && set.mode === "reps" ? set.reps ?? 0 : 0));
  const holdRecord = Math.max(0, ...item.sets.map((set) => set.done && set.mode === "hold" ? set.holdSeconds ?? 0 : 0));
  const record = mode === "reps" ? (bestReps > 0 && repsRecord > bestReps ? `${repsRecord} reps` : null) : (bestHold > 0 && holdRecord > bestHold ? `${holdRecord} s` : null);

  const toggleTimer = (setKey: string) => {
    if (timing?.setKey === setKey) {
      onUpdate(setKey, "holdSeconds", Math.max(1, Math.round((Date.now() - timing.startedAt) / 1000)));
      setTiming(null);
    } else {
      setNow(Date.now());
      setTiming({ setKey, startedAt: Date.now() });
    }
  };

  return <article className="cali-card" data-done={allDone || undefined} data-cali-card={item.key}>
    <div className="cali-card-head">
      <div className="cali-card-icon" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className="min-w-0 text-[17px] font-bold leading-tight">{name}</h3>
          <ExerciseGuideButton name={name} discipline="calisthenics" exerciseId={exerciseId} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{tags.map((tag, index) => <ModulePill key={tag} tone={index === 0 ? "accent" : "neutral"}>{tag}</ModulePill>)}</div>
        <p className="mt-1.5 text-xs font-semibold" style={{ color: lastText ? "var(--sport-ink)" : "var(--foreground-muted)" }}>{lastText ? v("lastTime", { value: lastText }) : v("firstTime")}</p>
      </div>
    </div>

    {measurement === "mixed" && <ModuleChips label={c("measurement")} value={mode} options={[{ value: "reps", label: v("modeReps") }, { value: "hold", label: v("modeHold") }]} onChange={(value) => item.sets.forEach((set) => onUpdate(set.key, "mode", value))} />}

    <div className="cali-sets" data-mode={mode}>
      <span className="cali-col">{v("colSet")}</span>
      {mode === "reps" ? <><span className="cali-col">{v("colReps")}</span><span className="cali-col">{v("colLoad")}</span></> : <span className="cali-col">{v("colHold")}</span>}
      <span /><span />
      {item.sets.map((set, index) => {
        const n = index + 1;
        const running = timing?.setKey === set.key;
        const seconds = running ? Math.floor((now - timing.startedAt) / 1000) : null;
        return <div key={set.key} className="contents" data-cali-set>
          <span className="cali-set-number" data-done={set.done || undefined}>{n}</span>
          {mode === "reps" ? <>
            <input aria-label={`${v("colReps")} ${n}`} type="number" inputMode="numeric" min={1} max={500} value={set.reps ?? ""} onChange={(event) => onUpdate(set.key, "reps", numberOrNull(event.target.value))} className="cali-input" />
            <input aria-label={`${v("colLoad")} ${n}`} type="number" inputMode="decimal" min={0} max={1000} step="0.5" value={set.addedWeightKg ?? ""} placeholder="—" onChange={(event) => onUpdate(set.key, "addedWeightKg", numberOrNull(event.target.value))} className="cali-input" />
          </> : <div className="cali-hold">
            <input aria-label={`${v("colHold")} ${n}`} type="number" inputMode="numeric" min={1} max={7200} value={running ? seconds ?? "" : set.holdSeconds ?? ""} readOnly={running} onChange={(event) => onUpdate(set.key, "holdSeconds", numberOrNull(event.target.value))} className="cali-input" />
            <button type="button" className="cali-timer" data-running={running || undefined} aria-pressed={running} onClick={() => toggleTimer(set.key)} data-cali-timer>{running ? v("stopHold") : "▶"}<span className="sr-only">{running ? "" : v("startHold")}</span></button>
          </div>}
          <button type="button" className="cali-check" aria-pressed={!!set.done} aria-label={v(set.done ? "setValidated" : "validateSet", { n })} onClick={() => onToggleDone(set.key)}>✓</button>
          <button type="button" className="cali-remove" aria-label={v("removeSet", { n })} onClick={() => onRemoveSet(set.key)}>✕</button>
        </div>;
      })}
    </div>

    {record && <p className="text-xs font-semibold" style={{ color: "var(--sport-ink)" }} data-cali-new-record>{v("newSetRecord", { value: record })}</p>}

    <details className="cali-options">
      <summary>{v("setOptions")}</summary>
      <div className="space-y-2 pt-2">
        {item.sets.map((set, index) => <div key={set.key} className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
          <span className="text-center text-xs text-foreground-muted">{index + 1}</span>
          <input aria-label={`${c("assistance")} ${index + 1}`} placeholder={c("assistance")} type="number" inputMode="decimal" min={0} max={1000} step="0.5" value={set.assistanceKg ?? ""} onChange={(event) => onUpdate(set.key, "assistanceKg", numberOrNull(event.target.value))} className="cali-input is-small" />
          <input aria-label={`${c("variation")} ${index + 1}`} placeholder={c("variation")} maxLength={100} value={set.variation} onChange={(event) => onUpdate(set.key, "variation", event.target.value)} className="cali-input is-small" />
          <input aria-label={`${c("setNotes")} ${index + 1}`} placeholder={c("setNotes")} maxLength={500} value={set.notes} onChange={(event) => onUpdate(set.key, "notes", event.target.value)} className="cali-input is-small col-span-2 col-start-2" />
        </div>)}
      </div>
    </details>

    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <button type="button" className="cali-add-set" disabled={item.sets.length >= 100} onClick={onAddSet}>+ {c("addSet")}</button>
      <button type="button" className="module-secondary is-danger" onClick={onRemoveExercise}>{c("remove")}</button>
    </div>
  </article>;
}
