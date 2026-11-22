"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import { Dialog } from "@/components/ui/dialog";
import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import { categoryColor, currentSetIndex, nextOpenItem, sessionTotals, setLabel } from "@/lib/calisthenics/focus";
import type { CalisthenicsExercise } from "@/types/database";
import type { DraftItem, DraftSet } from "./cali-types";

const REST_OPTIONS = [60, 90, 120, 180];
const VIOLET_INK = "#1a1033";
const panel = "rounded-[28px] border-[1.5px] bg-surface";
const clock = (total: number) => `${Math.floor(Math.max(0, total) / 60)}:${String(Math.max(0, Math.round(total)) % 60).padStart(2, "0")}`;
const loadMode = (set: DraftSet) => (set.addedWeightKg ? "weighted" : set.assistanceKg ? "assisted" : "bodyweight");
function restUntil(seconds: number, label: string) { return { end: Date.now() + seconds * 1000, total: seconds, label }; }
function nowMs() { return Date.now(); }

export type FinishPayload = { date: string; durationMinutes: number; intensity: number; notes: string };

export function CaliFocus({ items, setItems, exercisesById, name, startedAt, lastByExercise, defaultDate, busy, onAddExercise, onDiscard, onSave }: {
  items: DraftItem[];
  setItems: (update: (items: DraftItem[]) => DraftItem[]) => void;
  exercisesById: Map<string, CalisthenicsExercise>;
  name: string;
  startedAt: number;
  /** The last session's sets of each exercise, already worded. */
  lastByExercise: Map<string, string>;
  defaultDate: string;
  busy: boolean;
  onAddExercise: () => void;
  onDiscard: () => void;
  onSave: (payload: FinishPayload) => void;
}) {
  const { t, language } = useLanguage();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v3.${key}`, vars);
  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const n = new Intl.NumberFormat(language);
  const units = { reps: v("reps"), seconds: v("seconds") };
  const exerciseName = (exercise: CalisthenicsExercise | undefined) => (exercise ? (language === "ar" ? exercise.name_ar : language === "en" ? exercise.name_en : exercise.name_fr) : "—");

  const [cur, setCur] = useState(() => Math.max(0, items.findIndex((item) => currentSetIndex(item.sets) !== -1)));
  const [now, setNow] = useState(nowMs);
  const [rest, setRest] = useState<{ end: number; total: number; label: string } | null>(null);
  const [restSeconds, setRestSeconds] = useState(90);
  const [chronoStart, setChronoStart] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const [view, setView] = useState<"session" | "finish">("session");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const vibrated = useRef(false);
  const restFired = useRef(false);

  // One clock drives the session, the rest and the hold timer; signals vibrate once each.
  const signals = useRef<{ rest: { end: number } | null; chrono: { start: number; target: number | null } | null }>({ rest: null, chrono: null });
  useEffect(() => {
    document.body.dataset.strengthFocus = "";
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      const { rest: running, chrono } = signals.current;
      if (running && time >= running.end && !restFired.current) { restFired.current = true; navigator.vibrate?.([200, 100, 200]); }
      if (running && time > running.end + 4000) { signals.current.rest = null; setRest(null); }
      if (chrono && chrono.target && time - chrono.start >= chrono.target * 1000 && !vibrated.current) { vibrated.current = true; navigator.vibrate?.(300); }
    }, 250);
    return () => { window.clearInterval(timer); delete document.body.dataset.strengthFocus; };
  }, []);

  const index = Math.min(cur, Math.max(0, items.length - 1));
  const item = items[index] ?? null;
  const exercise = item ? exercisesById.get(item.exerciseId) : undefined;
  const setIndex = item ? currentSetIndex(item.sets) : -1;
  const set = item && setIndex !== -1 ? item.sets[setIndex] : null;
  const color = categoryColor(exercise?.category);
  const target = item?.target ?? null;
  const restLeft = rest ? Math.ceil((rest.end - now) / 1000) : 0;
  const held = chronoStart !== null ? Math.floor((now - chronoStart) / 1000) : 0;

  useEffect(() => {
    signals.current.rest = rest;
    signals.current.chrono = chronoStart === null ? null : { start: chronoStart, target };
  }, [rest, chronoStart, target]);

  function patchSet(patch: Partial<DraftSet>) {
    if (!item || setIndex === -1) return;
    setItems((current) => current.map((row) => (row.key !== item.key ? row : { ...row, sets: row.sets.map((value, i) => (i === setIndex ? { ...value, ...patch } : value)) })));
  }

  function validate(override?: Partial<DraftSet>) {
    if (!item || !set || setIndex === -1) return;
    const done = { ...set, ...override, done: true };
    const value = done.mode === "hold" ? done.holdSeconds ?? 0 : done.reps ?? 0;
    if (!(value > 0)) return;
    const next = items.map((row) => (row.key !== item.key ? row : { ...row, sets: row.sets.map((value2, i) => (i === setIndex ? done : value2)) }));
    setItems(() => next);
    // The next set starts from this one, so a lighter or heavier load carries over.
    const following = next[index].sets[setIndex + 1];
    if (following && !following.done) setItems((rows) => rows.map((row) => (row.key !== item.key ? row : { ...row, sets: row.sets.map((value2, i) => (i === setIndex + 1 ? { ...value2, addedWeightKg: done.addedWeightKg, assistanceKg: done.assistanceKg, variation: value2.variation || done.variation } : value2)) })));
    if (currentSetIndex(next[index].sets) === -1) {
      const open = nextOpenItem(next, index);
      if (open !== -1) setCur(open);
    }
    setChronoStart(null);
    vibrated.current = false;
    restFired.current = false;
    setRest(restUntil(restSeconds, v("saved", { n: setIndex + 1, value: setLabel(done, units) })));
  }

  function step(field: "reps" | "holdSeconds", delta: number) {
    if (!set) return;
    patchSet({ [field]: Math.max(0, (set[field] ?? 0) + delta) });
  }

  function setLoad(mode: "bodyweight" | "weighted" | "assisted") {
    if (!set) return;
    patchSet(mode === "bodyweight" ? { addedWeightKg: null, assistanceKg: null } : mode === "weighted" ? { addedWeightKg: set.addedWeightKg || 2.5, assistanceKg: null } : { assistanceKg: set.assistanceKg || 5, addedWeightKg: null });
  }

  function stepLoad(delta: number) {
    if (!set) return;
    const mode = loadMode(set);
    if (mode === "weighted") patchSet({ addedWeightKg: Math.max(0, (set.addedWeightKg ?? 0) + delta) || null });
    if (mode === "assisted") patchSet({ assistanceKg: Math.max(0, (set.assistanceKg ?? 0) + delta) || null });
  }

  const totals = sessionTotals(items);
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));

  if (view === "finish") return <FinishView totals={totals} name={name} elapsedMinutes={Math.max(1, Math.round(elapsed / 60))} defaultDate={defaultDate} busy={busy} onBack={() => setView("session")} onSave={onSave} />;

  const topBar = <div className="flex items-center gap-2.5 px-1" data-focus-topbar>
    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: rest ? "var(--water)" : "var(--habit)" }} />
    <p className="min-w-0 flex-1 truncate text-[13px] text-foreground-muted"><span className="font-bold text-foreground">{name}</span> · <bdi className="font-semibold tabular-nums text-foreground">{clock(elapsed)}</bdi> · {v("liveStats", { sets: n.format(totals.sets) })}</p>
    <button type="button" disabled={totals.sets === 0} onClick={() => { setRest(null); setChronoStart(null); setView("finish"); }} className="min-h-10 shrink-0 rounded-xl border border-border px-4 text-sm font-bold disabled:opacity-40" data-focus-finish>{v("finish")}</button>
  </div>;

  return <div className="mx-auto flex max-w-md flex-col gap-3" data-cali-focus>
    {topBar}

    {items.length === 0 ? (
      <section className={`${panel} space-y-3 p-5`} style={{ borderColor: "color-mix(in srgb, var(--habit) 50%, var(--border))" }}>
        <p className="text-lg font-bold">{v("emptySession")}</p>
        <button type="button" onClick={onAddExercise} className="min-h-12 w-full rounded-2xl text-sm font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }}>{v("addExercise")}</button>
      </section>
    ) : rest ? (
      <RestView rest={rest} left={restLeft} next={set ? v("setLabel", { n: setIndex + 1 }) + " · " + setLabel(set, units) : null} nextName={exerciseName(exercise)} onShift={(delta) => setRest((value) => (value ? { ...value, end: value.end + delta * 1000 } : value))} onReady={() => setRest(null)} />
    ) : item && exercise ? (
      <section aria-labelledby="cali-focus-name" className={`${panel} flex flex-col overflow-hidden`} style={{ borderColor: `color-mix(in srgb, ${color} 50%, var(--border))` }} data-focus-card>
        <div className="flex items-start gap-3 p-4 pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: `color-mix(in srgb, ${color} 70%, var(--foreground))` }}>{v("exerciseOf", { n: index + 1, total: items.length })} · {c(`categories.${exercise.category}`)}</p>
            <h2 id="cali-focus-name" className="mt-1 text-[22px] font-extrabold leading-tight">{exerciseName(exercise)}</h2>
            <div className="focus-quick mt-2 flex flex-wrap items-center gap-1.5"><ExerciseGuideButton name={exerciseName(exercise)} discipline="calisthenics" exerciseId={exercise.id} label={t("sport.library.technique")} initialTab="technique" /></div>
          </div>
          <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-xl font-extrabold" style={{ background: `color-mix(in srgb, ${color} 22%, var(--surface))`, color: `color-mix(in srgb, ${color} 75%, var(--foreground))` }}>{exerciseName(exercise).slice(0, 2).toUpperCase()}</span>
        </div>

        <ol aria-label={v("sets")} className="grid gap-1.5 px-4 pt-3" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, item.sets.length))}, minmax(0, 1fr))` }} data-focus-sets>
          {item.sets.map((value, i) => {
            if (value.done) return <li key={value.key}><button type="button" onClick={() => setItems((rows) => rows.map((row) => (row.key !== item.key ? row : { ...row, sets: row.sets.map((s, j) => (j === i ? { ...s, done: false } : s)) })))} aria-label={v("setDone", { n: i + 1, value: setLabel(value, units) })} className="flex min-h-12 w-full flex-col items-center justify-center rounded-2xl px-1" style={{ background: "color-mix(in srgb, var(--habit) 18%, var(--surface))" }} data-set-state="done">
              <span className="text-[10px] font-bold uppercase" style={{ color: "color-mix(in srgb, var(--habit) 70%, var(--foreground))" }}>✓ {v("setLabel", { n: i + 1 })}</span>
              <bdi className="text-[13px] font-extrabold tabular-nums">{value.mode === "hold" ? `${value.holdSeconds ?? 0} ${units.seconds}` : `${value.reps ?? 0} ${units.reps}`}</bdi>
            </button></li>;
            const current = i === setIndex;
            return <li key={value.key} className={`flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 ${current ? "border-2 border-foreground" : "border border-dashed border-border text-foreground-muted"}`} aria-current={current ? "step" : undefined} data-set-state={current ? "current" : "planned"}>
              <span className="text-[10px] font-bold uppercase">{v("setLabel", { n: i + 1 })}</span>
              <bdi className="text-[13px] font-bold tabular-nums">{current ? v("setCurrent") : value.mode === "hold" ? `${value.holdSeconds ?? 0} ${units.seconds}` : `${value.reps ?? 0} ${units.reps}`}</bdi>
            </li>;
          })}
        </ol>

        {set ? <>
          {set.mode === "hold" && !manual ? (
            <div className="flex flex-col items-center gap-3 px-4 pt-4" data-focus-chrono>
              <div role="timer" aria-label={v("heldSeconds", { value: held })} className="relative h-[220px] w-[220px]">
                <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden>
                  <circle cx="110" cy="110" r="96" fill="none" stroke="var(--surface-muted)" strokeWidth="14" />
                  <circle cx="110" cy="110" r="96" fill="none" stroke="var(--habit)" strokeWidth="14" strokeLinecap="round" strokeDasharray={2 * Math.PI * 96} strokeDashoffset={2 * Math.PI * 96 * (1 - Math.min(1, held / Math.max(1, target ?? set.holdSeconds ?? 30)))} transform="rotate(-90 110 110)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[68px] font-black leading-none tracking-tight tabular-nums">{chronoStart === null ? set.holdSeconds ?? 0 : held}</span>
                  <span className="mt-1 text-[13px] text-foreground-muted">{v("holdGoal", { count: n.format(target ?? set.holdSeconds ?? 0) })}</span>
                </div>
              </div>
              <p className="text-center text-xs text-foreground-muted">{v("chronoHint")}</p>
            </div>
          ) : (
            <div className="flex justify-center px-4 pt-4">
              <Stepper
                value={set.mode === "hold" ? set.holdSeconds ?? 0 : set.reps ?? 0}
                hint={set.mode === "hold" ? v("holdGoal", { count: n.format(target ?? 0) }) : target ? v("repsGoal", { count: n.format(target) }) : v("noGoal")}
                ariaLabel={set.mode === "hold" ? units.seconds : units.reps}
                plusLabel={set.mode === "hold" ? v("addSecond") : v("addRep")}
                minusLabel={set.mode === "hold" ? v("removeSecond") : v("removeRep")}
                plusText={set.mode === "hold" ? "+ 5" : "+ 1"}
                minusText={set.mode === "hold" ? "− 5" : "− 1"}
                onChange={(value) => patchSet(set.mode === "hold" ? { holdSeconds: value } : { reps: value })}
                onStep={(sign) => step(set.mode === "hold" ? "holdSeconds" : "reps", sign * (set.mode === "hold" ? 5 : 1))}
              />
            </div>
          )}

          <div className="mx-4 mt-3 space-y-2.5 rounded-[18px] border border-border bg-surface-muted p-2.5" data-focus-load>
            <div role="radiogroup" aria-label={v("loadLabel")} className="grid grid-cols-3 gap-1">
              {(["bodyweight", "weighted", "assisted"] as const).map((mode) => <button key={mode} type="button" role="radio" aria-checked={loadMode(set) === mode} onClick={() => setLoad(mode)} className="min-h-10 rounded-xl px-1 text-[13px] font-semibold" style={loadMode(set) === mode ? { background: "var(--surface)", color: "var(--foreground)" } : { color: "var(--foreground-muted)" }}>{v(mode)}</button>)}
            </div>
            {loadMode(set) !== "bodyweight" && <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => stepLoad(-2.5)} aria-label={v("removeKg")} className="h-11 w-12 rounded-xl bg-surface text-base font-bold">−</button>
              <bdi className="text-[22px] font-extrabold tabular-nums">{loadMode(set) === "weighted" ? `+${n.format(set.addedWeightKg ?? 0)} kg` : `−${n.format(set.assistanceKg ?? 0)} kg`}</bdi>
              <button type="button" onClick={() => stepLoad(2.5)} aria-label={v("addKg")} className="h-11 w-12 rounded-xl bg-surface text-base font-bold">+</button>
            </div>}
            <label className="block"><span className="sr-only">{v("variation")}</span><input value={set.variation} maxLength={80} onChange={(event) => patchSet({ variation: event.target.value })} placeholder={`${v("variation")} · ${v("variationPlaceholder")}`} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-[13px] outline-none focus:border-sport" /></label>
          </div>

          <p className="mx-4 mt-3 text-center text-xs text-foreground-muted">{lastByExercise.get(exercise.id) ? v("lastTime", { value: lastByExercise.get(exercise.id)! }) : v("firstTime")}</p>

          <div className="space-y-2 p-4">
            {set.mode === "hold" && !manual ? (
              chronoStart === null
                ? <button type="button" onClick={() => { vibrated.current = false; setChronoStart(Date.now()); }} className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] text-[17px] font-extrabold" style={{ background: "var(--habit)", color: VIOLET_INK, boxShadow: "0 10px 28px -12px var(--habit)" }} data-focus-chrono-start><SportIcon name="play" className="h-5 w-5" />{v("startChrono")}</button>
                : <button type="button" onClick={() => validate({ holdSeconds: held })} className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] bg-foreground text-[17px] font-extrabold text-background" data-focus-chrono-stop>{v("stopChrono", { value: held })}</button>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => validate()} className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] text-[17px] font-extrabold" style={{ background: "var(--habit)", color: VIOLET_INK, boxShadow: "0 10px 28px -12px var(--habit)" }} data-focus-validate>
                <SportIcon name="check" className="h-5 w-5" />{v("validate", { n: setIndex + 1 })}
              </motion.button>
            )}
            {set.mode === "hold" && chronoStart === null && <button type="button" onClick={() => setManual((value) => !value)} className="min-h-10 w-full text-[13px] font-semibold text-foreground-muted" data-focus-manual>{manual ? v("useChrono") : v("manual")}</button>}
          </div>
        </> : (
          <div className="space-y-3 p-4">
            <p className="flex items-center justify-center gap-2 rounded-2xl px-3 py-4 text-sm font-bold" style={{ background: "color-mix(in srgb, var(--habit) 15%, var(--surface))" }}><SportIcon name="check" className="h-4 w-4" />{nextOpenItem(items, index) === -1 ? v("allDone") : v("exerciseDone")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setItems((rows) => rows.map((row) => (row.key !== item.key ? row : { ...row, sets: [...row.sets, { ...row.sets[row.sets.length - 1], key: crypto.randomUUID(), done: false }] })))} className="min-h-11 rounded-xl border border-dashed border-border text-sm font-semibold">{v("addSet")}</button>
              {nextOpenItem(items, index) === -1
                ? <button type="button" onClick={() => setView("finish")} className="min-h-11 rounded-xl text-sm font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }}>{v("finish")}</button>
                : <button type="button" onClick={() => setCur(nextOpenItem(items, index))} className="min-h-11 rounded-xl text-sm font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }}>{v("nextExercise")}</button>}
            </div>
          </div>
        )}
      </section>
    ) : null}

    {items.length > 0 && <nav aria-label={v("exerciseOf", { n: index + 1, total: items.length })} className="flex items-center gap-2" data-focus-nav>
      <button type="button" disabled={index === 0} onClick={() => { setRest(null); setChronoStart(null); setCur(index - 1); }} aria-label={v("previous", { name: exerciseName(exercisesById.get(items[index - 1]?.exerciseId ?? "")) })} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface disabled:opacity-40"><SportIcon name="chevron" className="sport-chevron h-4 w-4 rotate-180 !text-foreground" /></button>
      <div className="flex flex-1 flex-wrap justify-center gap-1.5">
        {items.map((row, i) => <button key={row.key} type="button" onClick={() => { setRest(null); setChronoStart(null); setCur(i); }} aria-label={v("goTo", { name: exerciseName(exercisesById.get(row.exerciseId)) })} aria-current={i === index ? "step" : undefined} className="grid h-6 place-items-center">
          <span className="block h-2 rounded-full transition-all" style={{ width: i === index ? 22 : 8, background: i === index ? "var(--foreground)" : currentSetIndex(row.sets) === -1 ? "var(--habit)" : "var(--border)" }} />
        </button>)}
      </div>
      <button type="button" onClick={() => setOptionsOpen(true)} aria-label={v("options")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-lg" data-focus-options>⋯</button>
      <button type="button" disabled={index >= items.length - 1} onClick={() => { setRest(null); setChronoStart(null); setCur(index + 1); }} aria-label={v("next", { name: exerciseName(exercisesById.get(items[index + 1]?.exerciseId ?? "")) })} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface disabled:opacity-40"><SportIcon name="chevron" className="sport-chevron h-4 w-4 !text-foreground" /></button>
    </nav>}

    <Dialog open={optionsOpen} onClose={() => setOptionsOpen(false)} widthClassName="max-w-sm" ariaLabel={v("options")}>
      <div className="max-h-[85vh] space-y-4 overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-2xl" data-focus-options-sheet>
        <p className="text-base font-bold">{exerciseName(exercise)}</p>
        {item && <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setItems((rows) => rows.map((row) => (row.key !== item.key ? row : { ...row, sets: [...row.sets, { ...row.sets[row.sets.length - 1], key: crypto.randomUUID(), done: false }] })))} className="min-h-11 rounded-xl border border-border text-sm font-semibold" data-focus-add-set>{v("addSet")}</button>
          <button type="button" disabled={item.sets.length <= 1 || !!item.sets[item.sets.length - 1].done} onClick={() => setItems((rows) => rows.map((row) => (row.key !== item.key ? row : { ...row, sets: row.sets.slice(0, -1) })))} className="min-h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-40" data-focus-remove-set>{v("removeSet")}</button>
          <button type="button" onClick={() => { setItems((rows) => rows.filter((row) => row.key !== item.key)); setCur(Math.max(0, index - 1)); setOptionsOpen(false); }} className="col-span-2 min-h-11 rounded-xl border border-border text-sm font-semibold text-danger">{v("removeExercise")}</button>
        </div>}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{v("restTime")}</p>
          <div className="flex flex-wrap gap-1.5">{REST_OPTIONS.map((seconds) => <button key={seconds} type="button" aria-pressed={restSeconds === seconds} onClick={() => setRestSeconds(seconds)} className="min-h-10 rounded-full border px-3.5 text-sm font-semibold" style={restSeconds === seconds ? { background: "var(--habit)", borderColor: "var(--habit)", color: VIOLET_INK } : { borderColor: "var(--border)" }}>{clock(seconds)}</button>)}</div>
        </div>
        <button type="button" onClick={() => { setOptionsOpen(false); onAddExercise(); }} className="min-h-11 w-full rounded-xl border border-dashed border-border text-sm font-semibold">{v("addExercise")}</button>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setOptionsOpen(false); onDiscard(); }} className="min-h-11 flex-1 rounded-xl border border-border text-sm font-semibold text-danger">{v("discard")}</button>
          <button type="button" onClick={() => setOptionsOpen(false)} className="min-h-11 flex-1 rounded-xl text-sm font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }}>{v("close")}</button>
        </div>
      </div>
    </Dialog>
  </div>;
}

function Stepper({ value, hint, ariaLabel, plusLabel, minusLabel, plusText, minusText, onChange, onStep }: { value: number; hint: string; ariaLabel: string; plusLabel: string; minusLabel: string; plusText: string; minusText: string; onChange: (value: number) => void; onStep: (sign: 1 | -1) => void }) {
  return <div className="flex w-[210px] flex-col overflow-hidden rounded-[22px] border border-border bg-surface-muted" data-focus-stepper>
    <button type="button" onClick={() => onStep(1)} aria-label={plusLabel} className="min-h-[50px] border-b border-border text-[17px] font-bold active:bg-border">{plusText}</button>
    <label className="flex flex-col items-center px-2 pb-2 pt-2.5">
      <input data-big-number style={{ "--big-number": "64px" } as CSSProperties} value={value} inputMode="numeric" aria-label={ariaLabel} onChange={(event) => onChange(Math.max(0, Number(event.target.value.replace(/\D/g, "")) || 0))} className="w-full bg-transparent text-center text-[64px] font-black leading-none tracking-tight tabular-nums outline-none" />
      <span className="mt-1 text-center text-xs font-bold uppercase text-foreground-muted">{hint}</span>
    </label>
    <button type="button" onClick={() => onStep(-1)} aria-label={minusLabel} className="min-h-[50px] border-t border-border text-[17px] font-bold active:bg-border">{minusText}</button>
  </div>;
}

function RestView({ rest, left, next, nextName, onShift, onReady }: { rest: { total: number; label: string }; left: number; next: string | null; nextName: string; onShift: (delta: number) => void; onReady: () => void }) {
  const { t } = useLanguage();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v3.${key}`, vars);
  const radius = 102;
  const circumference = 2 * Math.PI * radius;
  const over = left <= 0;
  return <section aria-labelledby="cali-rest" className={`${panel} flex flex-col items-center gap-3.5 px-4 pb-4 pt-5`} style={{ borderColor: "color-mix(in srgb, var(--water) 45%, var(--border))", background: "radial-gradient(120% 70% at 50% 30%, color-mix(in srgb, var(--water) 12%, transparent), var(--surface) 70%)" }} data-focus-rest>
    <p className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold" style={{ background: "color-mix(in srgb, var(--habit) 16%, var(--surface))", color: "color-mix(in srgb, var(--habit) 70%, var(--foreground))" }}><SportIcon name="check" className="h-4 w-4" />{rest.label}</p>
    <h2 id="cali-rest" className="mt-1 text-sm font-bold uppercase tracking-[0.06em]" style={{ color: "color-mix(in srgb, var(--water) 70%, var(--foreground))" }}>{over ? v("restOver") : v("rest")}</h2>
    <div role="timer" aria-live="off" className="relative h-[230px] w-[230px]">
      <svg width="230" height="230" viewBox="0 0 230 230" aria-hidden>
        <circle cx="115" cy="115" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="14" />
        <circle cx="115" cy="115" r={radius} fill="none" stroke={over ? "var(--habit)" : "var(--water)"} strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, left / rest.total)))} transform="rotate(-90 115 115)" style={{ transition: "stroke-dashoffset 0.3s linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[64px] font-black leading-none tracking-tight tabular-nums">{clock(left)}</span>
        <span className="mt-1.5 text-[13px] text-foreground-muted">{v("restOf", { time: clock(rest.total) })}</span>
      </div>
    </div>
    <div className="grid w-full grid-cols-2 gap-2.5">
      <button type="button" onClick={() => onShift(-15)} className="min-h-12 rounded-2xl border border-border bg-surface-muted text-[15px] font-bold">{v("minus15")}</button>
      <button type="button" onClick={() => onShift(15)} className="min-h-12 rounded-2xl border border-border bg-surface-muted text-[15px] font-bold">{v("plus15")}</button>
    </div>
    {next && <div className="w-full rounded-[18px] border border-border bg-surface-muted px-3.5 py-3"><span className="block text-[11px] font-bold uppercase tracking-wide text-foreground-muted">{v("then")} · {nextName}</span><bdi className="mt-0.5 block text-[15px] font-bold">{next}</bdi></div>}
    <button type="button" onClick={onReady} className="min-h-[58px] w-full rounded-[18px] text-[17px] font-extrabold text-[#04202f]" style={{ background: "var(--water)" }} data-focus-ready>{v("ready")}</button>
    <p className="text-center text-xs text-foreground-muted">{v("vibrate")}</p>
  </section>;
}

function FinishView({ totals, name, elapsedMinutes, defaultDate, busy, onBack, onSave }: { totals: { sets: number; reps: number; holdSeconds: number }; name: string; elapsedMinutes: number; defaultDate: string; busy: boolean; onBack: () => void; onSave: (payload: FinishPayload) => void }) {
  const { t, language } = useLanguage();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v3.${key}`, vars);
  const n = new Intl.NumberFormat(language);
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(String(elapsedMinutes));
  const [date, setDate] = useState(defaultDate);
  const hold = totals.holdSeconds >= 60 ? `${Math.floor(totals.holdSeconds / 60)} min ${totals.holdSeconds % 60 ? `${totals.holdSeconds % 60} s` : ""}`.trim() : `${totals.holdSeconds} s`;
  return <div className="mx-auto max-w-md space-y-5" data-focus-finish-view>
    <div className="flex flex-col items-center gap-2 pt-2 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full" style={{ background: "var(--habit)", color: VIOLET_INK, boxShadow: "0 0 0 10px color-mix(in srgb, var(--habit) 15%, transparent)" }}><SportIcon name="check" className="h-8 w-8" /></span>
      <h2 className="mt-3 text-2xl font-extrabold">{v("doneTitle")}</h2>
      <p className="text-sm text-foreground-muted">{name}</p>
    </div>
    <dl className="grid grid-cols-3 gap-2">
      {[[v("sets"), n.format(totals.sets)], [v("repsTotal"), n.format(totals.reps)], [v("holdTotal"), hold]].map(([label, value]) => <div key={label} className="rounded-[18px] border border-border bg-surface px-2 py-3.5 text-center"><dd className="text-xl font-extrabold tabular-nums">{value}</dd><dt className="mt-0.5 text-[11px] text-foreground-muted">{label}</dt></div>)}
    </dl>
    <section className="space-y-2.5">
      <h3 className="text-[15px] font-semibold">{v("feeling")}</h3>
      <div role="radiogroup" aria-label={v("feeling")} className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => <button key={level} type="button" role="radio" aria-checked={intensity === level} onClick={() => setIntensity(level)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border" style={intensity === level ? { borderColor: "var(--habit)", background: "color-mix(in srgb, var(--habit) 15%, var(--surface))" } : { borderColor: "var(--border)", background: "var(--surface)" }}><span className="text-base font-extrabold">{level}</span><span className="text-[10px]">{v(`feel${level}`)}</span></button>)}
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] text-foreground-muted">{v("note")}<textarea rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={v("notePlaceholder")} className="resize-none rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-sport" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5 text-[13px] text-foreground-muted">{v("durationEdit")}<input type="number" min={1} max={600} inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-sport" /></label>
        <label className="flex flex-col gap-1.5 text-[13px] text-foreground-muted">{v("date")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-sport" /></label>
      </div>
    </section>
    <div className="flex flex-col gap-2">
      <button type="button" disabled={busy || totals.sets === 0} onClick={() => onSave({ date, durationMinutes: Math.min(600, Math.max(1, Math.round(Number(duration) || elapsedMinutes))), intensity, notes })} className="min-h-14 rounded-2xl text-base font-extrabold disabled:opacity-50" style={{ background: "var(--habit)", color: VIOLET_INK }} data-focus-save>{busy ? "…" : v("save")}</button>
      {totals.sets === 0 && <p className="text-center text-xs text-foreground-muted">{v("noSetDone")}</p>}
      <button type="button" onClick={onBack} className="min-h-11 self-center text-[13px] font-semibold" style={{ color: "color-mix(in srgb, var(--habit) 70%, var(--foreground))" }}>{v("back")}</button>
    </div>
  </div>;
}
