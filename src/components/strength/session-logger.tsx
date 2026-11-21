"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { motion } from "framer-motion";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { useLanguage, useT } from "@/components/language-provider";
import { saveStrengthSession } from "@/lib/actions/strength";
import { exerciseKey, muscleColor, muscleGroupI18nPath, setsVolume } from "@/lib/strength";
import { ExercisePicker } from "@/components/strength/exercise-picker";
import { ExerciseThumbnail } from "@/components/sport/exercises/exercise-thumbnail";
import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import { ExerciseMuscleButton } from "@/components/sport/anatomy/exercise-muscle-button";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import { mediaExperienceId } from "@/lib/exercises/media-experience";
import { EXERCISE_MEDIA_EQUIPMENT } from "@/lib/exercises/media-thumbnails";
import { detectRecords, type ExerciseSummary } from "@/lib/strength-stats";
import { currentSetIndex, musclesWorked, nextOpenExercise, nextTarget, platesPerSide, stepValue, toNumber, usesBarbell } from "@/lib/strength-focus";

export const DRAFT_KEY = "strength-draft-v1";
export const DRAFT_EVENT = "strength-draft-change";

export type DraftSet = { reps: string; weight: string; done: boolean };
export type DraftExercise = { id: string; name: string; muscle: string; targetReps: number | null; sets: DraftSet[] };
export type Draft = {
  name: string;
  templateId: string | null;
  muscleGroups: string[];
  startedAt: number;
  exercises: DraftExercise[];
};

export type SessionResult = {
  name: string;
  volume: number;
  sets: number;
  minutes: number;
  records: { name: string; kind: "poids" | "1RM"; value: string }[];
};

const REST_OPTIONS = [60, 90, 120, 180];

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    window.dispatchEvent(new Event(DRAFT_EVENT));
  } catch {
    // storage unavailable: nothing to clear
  }
}

/** The raw saved draft (or null). Reading through useSyncExternalStore keeps SSR and hydration consistent. */
export function useSavedDraft(): string | null {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener(DRAFT_EVENT, notify);
      window.addEventListener("storage", notify);
      return () => {
        window.removeEventListener(DRAFT_EVENT, notify);
        window.removeEventListener("storage", notify);
      };
    },
    () => {
      try {
        return localStorage.getItem(DRAFT_KEY);
      } catch {
        return null;
      }
    },
    () => null
  );
}

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

const panel = "rounded-[28px] border-[1.5px] bg-surface";

/** A rest that ends `seconds` from now. */
function restUntil(seconds: number, label: string) {
  return { end: Date.now() + seconds * 1000, total: seconds, fired: false, label };
}

export function SessionLogger({
  initial,
  summaries,
  catalog,
  today,
  onExit,
  onSaved,
}: {
  initial: Draft;
  summaries: ExerciseSummary[];
  catalog: { name: string; muscle: string }[];
  today: string;
  onExit: () => void;
  onSaved: (result: SessionResult) => void;
}) {
  const t = useT();
  const { language } = useLanguage();
  const f = (key: string, vars?: Record<string, string | number>) => t(`sport.focus.${key}`, vars);
  const n = useMemo(() => new Intl.NumberFormat(language, { maximumFractionDigits: 2 }), [language]);
  const muscleLabel = (group: string) => {
    const path = muscleGroupI18nPath(group);
    return path ? t(path) : group;
  };
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [draft, setDraft] = useState<Draft>(initial);
  const [cur, setCur] = useState(() => {
    const open = initial.exercises.findIndex((exercise) => currentSetIndex(exercise.sets) !== -1);
    return open === -1 ? 0 : open;
  });
  const [now, setNow] = useState(() => Date.now());
  const [restSeconds, setRestSeconds] = useState(90);
  const [rest, setRest] = useState<{ end: number; total: number; fired: boolean; label: string } | null>(null);
  const restRef = useRef(rest);
  const [view, setView] = useState<"session" | "finish">("session");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [durationInput, setDurationInput] = useState<string | null>(null);

  const summaryByKey = useMemo(() => new Map(summaries.map((summary) => [summary.key, summary])), [summaries]);

  // The draft survives refreshes and accidental navigation.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage unavailable: the session still works, it just can't be resumed
    }
  }, [draft]);

  // The page around the session steps aside while it runs.
  useEffect(() => {
    document.body.dataset.strengthFocus = "";
    return () => { delete document.body.dataset.strengthFocus; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const time = Date.now();
      setNow(time);
      const current = restRef.current;
      if (!current) return;
      if (!current.fired && time >= current.end) {
        current.fired = true;
        navigator.vibrate?.([200, 100, 200]);
      }
      if (time > current.end + 4000) {
        restRef.current = null;
        setRest(null);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  function startRest(seconds: number, label: string) {
    const value = restUntil(seconds, label);
    restRef.current = value;
    setRest(value);
  }
  function stopRest() {
    restRef.current = null;
    setRest(null);
  }

  function updateExercise(id: string, change: (exercise: DraftExercise) => DraftExercise) {
    setDraft((current) => ({ ...current, exercises: current.exercises.map((exercise) => (exercise.id === id ? change(exercise) : exercise)) }));
  }

  const formatSet = (weight: number, reps: number) => (weight > 0 ? `${n.format(weight)} × ${n.format(reps)}` : `${n.format(reps)} ${f("reps")}`);

  /** What a set starts with: the previous set of today, today's aim, then last session's same set. */
  function prefill(exercise: DraftExercise, index: number): { weight: string; reps: string } {
    const before = exercise.sets.slice(0, index).reverse().find((set) => set.done && toNumber(set.reps) > 0);
    if (before) return { weight: before.weight, reps: before.reps };
    const summary = summaryByKey.get(exerciseKey(exercise.name));
    const last = summary?.sessions[summary.sessions.length - 1];
    const aim = last ? nextTarget(last.sets, exercise.targetReps) : null;
    if (aim) return { weight: aim.weight > 0 ? String(aim.weight) : "", reps: String(aim.reps) };
    return { weight: "", reps: exercise.targetReps ? String(exercise.targetReps) : "" };
  }

  const exercises = draft.exercises;
  const index = Math.min(cur, Math.max(0, exercises.length - 1));
  const exercise = exercises[index] ?? null;

  function valueOf(target: DraftExercise, setIndex: number) {
    const set = target.sets[setIndex];
    const base = prefill(target, setIndex);
    return { weight: set.weight !== "" ? set.weight : base.weight, reps: set.reps !== "" ? set.reps : base.reps };
  }

  function editCurrent(field: "weight" | "reps", value: string) {
    if (!exercise) return;
    const setIndex = currentSetIndex(exercise.sets);
    if (setIndex === -1) return;
    const shown = valueOf(exercise, setIndex);
    updateExercise(exercise.id, (target) => ({
      ...target,
      sets: target.sets.map((set, i) => (i === setIndex ? { ...set, weight: shown.weight, reps: shown.reps, [field]: value } : set)),
    }));
  }

  function validate() {
    if (!exercise) return;
    const setIndex = currentSetIndex(exercise.sets);
    if (setIndex === -1) return;
    const shown = valueOf(exercise, setIndex);
    if (!(toNumber(shown.reps) > 0)) return;
    const updated = { ...exercise, sets: exercise.sets.map((set, i) => (i === setIndex ? { weight: shown.weight, reps: shown.reps, done: true } : set)) };
    const nextExercises = exercises.map((item) => (item.id === exercise.id ? updated : item));
    setDraft((current) => ({ ...current, exercises: nextExercises }));
    if (currentSetIndex(updated.sets) === -1) {
      const following = nextOpenExercise(nextExercises, index);
      if (following !== -1) setCur(following);
    }
    startRest(restSeconds, f("saved", { n: setIndex + 1, value: formatSet(toNumber(shown.weight), toNumber(shown.reps)) }));
  }

  function reopenSet(setIndex: number) {
    if (!exercise) return;
    updateExercise(exercise.id, (target) => ({ ...target, sets: target.sets.map((set, i) => (i === setIndex ? { ...set, done: false } : set)) }));
  }

  function addExercise(name: string, muscle: string) {
    const clean = name.trim();
    if (!clean) return;
    setDraft((current) => ({
      ...current,
      exercises: [...current.exercises, { id: crypto.randomUUID(), name: clean, muscle, targetReps: null, sets: [0, 1, 2].map(() => ({ reps: "", weight: "", done: false })) }],
    }));
    setCur(exercises.length);
    setOptionsOpen(false);
  }

  function moveExercise(direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    setDraft((current) => {
      const next = [...current.exercises];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, exercises: next };
    });
    setCur(target);
  }

  function removeExercise() {
    if (!exercise) return;
    const hasData = exercise.sets.some((set) => set.done);
    if (hasData && !confirm(t("sport.sessionLogger.confirmRemoveExercise", { name: exercise.name }))) return;
    setDraft((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exercise.id) }));
    setCur(Math.max(0, index - 1));
    setOptionsOpen(false);
  }

  const payloadExercises = exercises.map((item) => ({
    name: item.name,
    muscle: item.muscle,
    sets: item.sets.filter((set) => set.done).map((set) => ({ reps: Math.round(toNumber(set.reps)), weight: toNumber(set.weight) })).filter((set) => set.reps > 0),
  }));
  const loggedSets = payloadExercises.reduce((sum, item) => sum + item.sets.length, 0);
  const totalVolume = payloadExercises.reduce((sum, item) => sum + setsVolume(item.sets), 0);
  const elapsedSeconds = Math.max(0, Math.round((now - draft.startedAt) / 1000));
  const suggestedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const duration = durationInput === null ? suggestedMinutes : Math.round(toNumber(durationInput));
  const volumeText = totalVolume >= 1000 ? `${n.format(Math.round(totalVolume / 100) / 10)} t` : `${n.format(totalVolume)} kg`;
  const records = detectRecords(summaries, payloadExercises);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await run(
        () => saveStrengthSession({ name: draft.name, date: today, templateId: draft.templateId, muscleGroups: draft.muscleGroups, durationMinutes: duration, intensity, notes, exercises: payloadExercises }),
        { success: t("sport.common.sessionSavedToast", { name: draft.name }), failure: t("sport.common.sessionNotSaved") }
      );
      if (!result || result.error) return setError(result?.error ?? t("sport.common.saveError"));
      clearDraft();
      onSaved({ name: draft.name, volume: totalVolume, sets: loggedSets, minutes: duration, records });
    });
  }

  const topBar = (
    <div className="flex items-center gap-2.5 px-1" data-focus-topbar>
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: rest ? "var(--water)" : "var(--sport)" }} />
      <div className="min-w-0 flex-1">
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          aria-label={t("sport.sessionLogger.nameAria")}
          className="w-full truncate bg-transparent text-[15px] font-bold outline-none focus:underline"
        />
        <p className="text-xs text-foreground-muted"><bdi className="font-semibold tabular-nums text-foreground">{clock(elapsedSeconds)}</bdi> · {f(loggedSets === 1 ? "liveStatsOne" : "liveStats", { sets: n.format(loggedSets), volume: volumeText })}</p>
      </div>
      <button type="button" disabled={loggedSets === 0} onClick={() => { stopRest(); setView("finish"); }} className="min-h-10 shrink-0 rounded-xl border border-border px-4 text-sm font-bold transition hover:bg-surface-muted disabled:opacity-40" data-focus-finish>
        {f("finish")}
      </button>
    </div>
  );

  if (view === "finish") {
    return (
      <FinishView
        draft={draft}
        f={f}
        n={n}
        muscleLabel={muscleLabel}
        duration={duration}
        durationInput={durationInput}
        suggestedMinutes={suggestedMinutes}
        setDurationInput={setDurationInput}
        volumeText={volumeText}
        loggedSets={loggedSets}
        records={records}
        intensity={intensity}
        setIntensity={setIntensity}
        notes={notes}
        setNotes={setNotes}
        error={error}
        pending={pending}
        onSave={save}
        onBack={() => setView("session")}
      />
    );
  }

  const restRemaining = rest ? Math.ceil((rest.end - now) / 1000) : 0;
  const setIndex = exercise ? currentSetIndex(exercise.sets) : -1;
  const shown = exercise && setIndex !== -1 ? valueOf(exercise, setIndex) : null;
  const summary = exercise ? summaryByKey.get(exerciseKey(exercise.name)) : undefined;
  const lastSession = summary?.sessions[summary.sessions.length - 1];
  const lastSet = lastSession && setIndex !== -1 ? lastSession.sets[setIndex] ?? lastSession.sets[lastSession.sets.length - 1] : lastSession?.sets[0];
  const priorMax = summary?.records.maxWeight?.weight ?? null;
  const mediaId = exercise ? mediaExperienceId(exercise.name, exercise.muscle) : null;
  const equipment = mediaId ? EXERCISE_MEDIA_EQUIPMENT[mediaId] : [];
  const plates = exercise && shown && usesBarbell(exercise.name, equipment) ? platesPerSide(toNumber(shown.weight)) : null;
  const weightStep = shown && toNumber(shown.weight) < 10 ? 1 : 2.5;
  const nextUp = (() => {
    if (!exercise) return null;
    if (setIndex !== -1) return f("thenSet", { n: setIndex + 1, value: shown ? formatSet(toNumber(shown.weight), toNumber(shown.reps)) : "" });
    return null;
  })();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3" data-focus-session>
      {topBar}

      {exercises.length === 0 ? (
        <section className={`${panel} space-y-4 p-5`} style={{ borderColor: "color-mix(in srgb, var(--sport) 50%, var(--border))" }}>
          <p className="text-lg font-bold">{f("emptyTitle")}</p>
          <ExercisePicker catalog={catalog} excludedKeys={[]} defaultMuscle={initial.muscleGroups[0] ?? "Pectoraux"} onPick={addExercise} />
        </section>
      ) : rest ? (
        <RestView
          label={rest.label}
          remaining={restRemaining}
          total={rest.total}
          f={f}
          next={nextUp ? { title: nextUp, detail: exercise?.name ?? "" } : null}
          onShift={(delta) => startRest(Math.max(5, restRemaining + delta), rest.label)}
          onReady={stopRest}
        />
      ) : exercise ? (
        <section aria-labelledby="focus-exercise" className={`${panel} flex flex-col overflow-hidden`} style={{ borderColor: "color-mix(in srgb, var(--sport) 50%, var(--border))" }} data-focus-card>
          <div className="flex items-start gap-3 p-4 pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}>
                {f("exerciseOf", { n: index + 1, total: exercises.length })} · <span style={{ color: muscleColor(exercise.muscle) }}>{muscleLabel(exercise.muscle)}</span>
              </p>
              <h2 id="focus-exercise" className="mt-1 text-[21px] font-extrabold leading-tight">{exercise.name}</h2>
              <div className="focus-quick mt-2 flex flex-wrap items-center gap-1.5">
                <ExerciseGuideButton name={exercise.name} exerciseKey={mediaId ?? undefined} label={t("sport.library.technique")} initialTab="technique" />
                <ExerciseMuscleButton name={exercise.name} muscle={exercise.muscle} label={t("sport.library.muscles3D")} />
              </div>
            </div>
            <div className="w-[88px] shrink-0 overflow-hidden rounded-2xl" data-focus-thumbnail><ExerciseThumbnail name={exercise.name} muscle={exercise.muscle} large /></div>
          </div>

          <ol aria-label={f("sets")} className="grid gap-1.5 px-4 pt-3" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, exercise.sets.length))}, minmax(0, 1fr))` }} data-focus-sets>
            {exercise.sets.map((set, i) => {
              const weight = toNumber(set.weight);
              const isRecord = set.done && priorMax !== null && weight > priorMax;
              if (set.done) {
                return <li key={i}><button type="button" onClick={() => reopenSet(i)} aria-label={f("setDone", { n: i + 1, value: formatSet(weight, toNumber(set.reps)) })} className="flex min-h-12 w-full flex-col items-center justify-center rounded-2xl bg-sport-soft px-1" data-set-state="done">
                  <span className="text-[10px] font-bold uppercase" style={{ color: isRecord ? "var(--mood)" : "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}>{isRecord ? `★ ${f("record")}` : `✓ ${f("setLabel", { n: i + 1 })}`}</span>
                  <bdi className="text-[13px] font-extrabold tabular-nums">{formatSet(weight, toNumber(set.reps))}</bdi>
                </button></li>;
              }
              const current = i === setIndex;
              const planned = prefill(exercise, i);
              return <li key={i} className={`flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 ${current ? "border-2 border-foreground" : "border border-dashed border-border text-foreground-muted"}`} aria-current={current ? "step" : undefined} data-set-state={current ? "current" : "planned"}>
                <span className="text-[10px] font-bold uppercase">{f("setLabel", { n: i + 1 })}</span>
                <bdi className="text-[13px] font-bold tabular-nums">{current ? f("setCurrent") : planned.reps ? formatSet(toNumber(planned.weight), toNumber(planned.reps)) : "—"}</bdi>
              </li>;
            })}
          </ol>

          {shown ? <>
            <div className="grid grid-cols-2 gap-2.5 px-4 pt-3.5">
              <Stepper
                label={f("load")}
                hint={f("load").toUpperCase()}
                value={language === "fr" ? shown.weight.replace(".", ",") : shown.weight}
                inputMode="decimal"
                ariaLabel={t("sport.sessionLogger.weightAria", { n: setIndex + 1 })}
                plusLabel={f("addLoad", { step: n.format(weightStep) })}
                minusLabel={f("removeLoad", { step: n.format(weightStep) })}
                plusText={`+ ${n.format(weightStep)}`}
                minusText={`− ${n.format(weightStep)}`}
                onChange={(value) => editCurrent("weight", value)}
                onStep={(sign) => editCurrent("weight", stepValue(shown.weight, sign * weightStep))}
              />
              <Stepper
                label={f("reps")}
                hint={exercise.targetReps ? f("repsGoal", { count: n.format(exercise.targetReps) }).toUpperCase() : f("reps").toUpperCase()}
                value={shown.reps}
                inputMode="numeric"
                ariaLabel={t("sport.sessionLogger.repsAria", { n: setIndex + 1 })}
                plusLabel={f("addRep")}
                minusLabel={f("removeRep")}
                plusText="+ 1"
                minusText="− 1"
                onChange={(value) => editCurrent("reps", value)}
                onStep={(sign) => editCurrent("reps", stepValue(shown.reps, sign))}
              />
            </div>
            <div className="mx-4 mt-3 flex flex-wrap justify-between gap-x-3 gap-y-1 rounded-2xl bg-surface-muted px-3 py-2.5 text-xs text-foreground-muted" data-focus-hints>
              {plates ? <span>{f("plates", { bar: n.format(20), plates: plates.map((plate) => n.format(plate)).join(" + ") })}</span> : null}
              <span>{lastSet ? f("lastSet", { value: formatSet(lastSet.weight, lastSet.reps) }) : f("firstTime")}</span>
            </div>
            <div className="p-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={validate}
                disabled={!(toNumber(shown.reps) > 0)}
                className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] text-[17px] font-extrabold text-[#062016] disabled:opacity-40"
                style={{ background: "var(--sport)", boxShadow: "0 10px 28px -12px var(--sport)" }}
                data-focus-validate
              >
                <SportIcon name="check" className="h-5 w-5" />
                {f("validate", { n: setIndex + 1 })}
              </motion.button>
            </div>
          </> : (
            <div className="space-y-3 p-4">
              <p className="flex items-center justify-center gap-2 rounded-2xl bg-sport-soft px-3 py-4 text-sm font-bold"><SportIcon name="check" className="h-4 w-4" />{nextOpenExercise(exercises, index) === -1 ? f("allDone") : f("exerciseDone")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateExercise(exercise.id, (target) => ({ ...target, sets: [...target.sets, { reps: "", weight: "", done: false }] }))} className="min-h-11 rounded-xl border border-dashed border-border text-sm font-semibold">{f("addSet")}</button>
                {nextOpenExercise(exercises, index) === -1
                  ? <button type="button" onClick={() => setView("finish")} className="min-h-11 rounded-xl text-sm font-bold text-[#062016]" style={{ background: "var(--sport)" }}>{f("finish")}</button>
                  : <button type="button" onClick={() => setCur(nextOpenExercise(exercises, index))} className="min-h-11 rounded-xl text-sm font-bold text-[#062016]" style={{ background: "var(--sport)" }}>{f("nextExercise")}</button>}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {exercises.length > 0 && (
        <nav aria-label={f("exerciseOf", { n: index + 1, total: exercises.length })} className="flex items-center gap-2" data-focus-nav>
          <button type="button" disabled={index === 0} onClick={() => { stopRest(); setCur(index - 1); }} aria-label={f("previous", { name: exercises[index - 1]?.name ?? "" })} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface disabled:opacity-40"><SportIcon name="chevron" className="sport-chevron h-4 w-4 rotate-180 !text-foreground" /></button>
          <div className="flex flex-1 flex-wrap justify-center gap-1.5">
            {exercises.map((item, i) => {
              const finished = currentSetIndex(item.sets) === -1;
              return <button key={item.id} type="button" onClick={() => { stopRest(); setCur(i); }} aria-label={f("goTo", { name: item.name })} aria-current={i === index ? "step" : undefined} className="grid h-6 place-items-center">
                <span className="block h-2 rounded-full transition-all" style={{ width: i === index ? 22 : 8, background: i === index ? "var(--foreground)" : finished ? "var(--sport)" : "var(--border)" }} />
              </button>;
            })}
          </div>
          <button type="button" onClick={() => setOptionsOpen(true)} aria-label={f("options")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-lg" data-focus-options>⋯</button>
          <button type="button" disabled={index >= exercises.length - 1} onClick={() => { stopRest(); setCur(index + 1); }} aria-label={f("next", { name: exercises[index + 1]?.name ?? "" })} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface disabled:opacity-40"><SportIcon name="chevron" className="sport-chevron h-4 w-4 !text-foreground" /></button>
        </nav>
      )}

      <Dialog open={optionsOpen} onClose={() => setOptionsOpen(false)} widthClassName="max-w-sm" ariaLabel={f("options")}>
        <div className="max-h-[85vh] space-y-4 overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-2xl" data-focus-options-sheet>
          <p className="text-base font-bold">{exercise?.name ?? f("options")}</p>
          {exercise && <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => updateExercise(exercise.id, (target) => ({ ...target, sets: [...target.sets, { reps: "", weight: "", done: false }] }))} className="min-h-11 rounded-xl border border-border text-sm font-semibold" data-focus-add-set>{f("addSet")}</button>
            <button type="button" disabled={exercise.sets.length <= 1 || exercise.sets[exercise.sets.length - 1].done} onClick={() => updateExercise(exercise.id, (target) => ({ ...target, sets: target.sets.slice(0, -1) }))} className="min-h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-40" data-focus-remove-set>{f("removeSet")}</button>
            <button type="button" disabled={index === 0} onClick={() => moveExercise(-1)} className="min-h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-40">{f("moveUp")}</button>
            <button type="button" disabled={index >= exercises.length - 1} onClick={() => moveExercise(1)} className="min-h-11 rounded-xl border border-border text-sm font-semibold disabled:opacity-40">{f("moveDown")}</button>
            <button type="button" onClick={removeExercise} className="col-span-2 min-h-11 rounded-xl border border-border text-sm font-semibold text-danger">{f("removeExercise")}</button>
          </div>}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{f("restTime")}</p>
            <div className="flex flex-wrap gap-1.5">
              {REST_OPTIONS.map((seconds) => <button key={seconds} type="button" aria-pressed={restSeconds === seconds} onClick={() => setRestSeconds(seconds)} className="min-h-10 rounded-full border px-3.5 text-sm font-semibold" style={restSeconds === seconds ? { background: "var(--sport)", borderColor: "var(--sport)", color: "#062016" } : { borderColor: "var(--border)" }}>{clock(seconds)}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{f("addExercise")}</p>
            <ExercisePicker catalog={catalog} excludedKeys={exercises.map((item) => exerciseKey(item.name))} defaultMuscle={exercise?.muscle ?? initial.muscleGroups[0] ?? "Pectoraux"} onPick={addExercise} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOptionsOpen(false); setConfirmDiscard(true); }} className="min-h-11 flex-1 rounded-xl border border-border text-sm font-semibold text-danger">{f("discard")}</button>
            <button type="button" onClick={() => setOptionsOpen(false)} className="min-h-11 flex-1 rounded-xl text-sm font-bold text-[#062016]" style={{ background: "var(--sport)" }}>{f("close")}</button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        title={t("sport.sessionLogger.discardTitle")}
        message={t("sport.sessionLogger.discardMessage")}
        confirmLabel={t("sport.sessionLogger.discard")}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          clearDraft();
          onExit();
        }}
      />
    </div>
  );
}

function Stepper({ label, hint, value, inputMode, ariaLabel, plusLabel, minusLabel, plusText, minusText, onChange, onStep }: {
  label: string; hint: string; value: string; inputMode: "decimal" | "numeric"; ariaLabel: string; plusLabel: string; minusLabel: string; plusText: string; minusText: string;
  onChange: (value: string) => void; onStep: (sign: 1 | -1) => void;
}) {
  return <div className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-surface-muted" data-focus-stepper={label}>
    <button type="button" onClick={() => onStep(1)} aria-label={plusLabel} className="min-h-12 border-b border-border text-base font-bold transition active:bg-border">{plusText}</button>
    <label className="flex flex-col items-center px-1 pb-2 pt-2.5">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9.,]/g, ""))}
        inputMode={inputMode}
        aria-label={ariaLabel}
        placeholder="0"
        className="w-full bg-transparent text-center text-[46px] font-black leading-none tracking-tight tabular-nums outline-none"
      />
      <span className="mt-1 text-center text-[11px] font-bold text-foreground-muted">{hint}</span>
    </label>
    <button type="button" onClick={() => onStep(-1)} aria-label={minusLabel} className="min-h-12 border-t border-border text-base font-bold transition active:bg-border">{minusText}</button>
  </div>;
}

function RestView({ label, remaining, total, f, next, onShift, onReady }: {
  label: string; remaining: number; total: number; f: (key: string, vars?: Record<string, string | number>) => string;
  next: { title: string; detail: string } | null; onShift: (delta: number) => void; onReady: () => void;
}) {
  const radius = 102;
  const circumference = 2 * Math.PI * radius;
  const share = Math.max(0, Math.min(1, remaining / total));
  const over = remaining <= 0;
  return <section aria-labelledby="focus-rest" className={`${panel} flex flex-col items-center gap-3.5 px-4 pb-4 pt-5`} style={{ borderColor: "color-mix(in srgb, var(--water) 45%, var(--border))", background: "radial-gradient(120% 70% at 50% 30%, color-mix(in srgb, var(--water) 12%, transparent), var(--surface) 70%)" }} data-focus-rest>
    <p className="flex items-center gap-2 rounded-full bg-sport-soft px-3.5 py-2 text-[13px] font-bold" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}><SportIcon name="check" className="h-4 w-4" />{label}</p>
    <h2 id="focus-rest" className="mt-1 text-sm font-bold uppercase tracking-[0.06em]" style={{ color: "color-mix(in srgb, var(--water) 70%, var(--foreground))" }}>{over ? f("restOver") : f("rest")}</h2>
    <div role="timer" aria-live="off" className="relative h-[230px] w-[230px]">
      <svg width="230" height="230" viewBox="0 0 230 230" aria-hidden>
        <circle cx="115" cy="115" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="14" />
        <circle cx="115" cy="115" r={radius} fill="none" stroke={over ? "var(--sport)" : "var(--water)"} strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - share)} transform="rotate(-90 115 115)" style={{ transition: "stroke-dashoffset 0.5s linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[64px] font-black leading-none tracking-tight tabular-nums">{clock(Math.max(0, remaining))}</span>
        <span className="mt-1.5 text-[13px] text-foreground-muted">{f("restOf", { time: clock(total) })}</span>
      </div>
    </div>
    <div className="grid w-full grid-cols-2 gap-2.5">
      <button type="button" onClick={() => onShift(-15)} className="min-h-12 rounded-2xl border border-border bg-surface-muted text-[15px] font-bold">{f("minus15")}</button>
      <button type="button" onClick={() => onShift(15)} className="min-h-12 rounded-2xl border border-border bg-surface-muted text-[15px] font-bold">{f("plus15")}</button>
    </div>
    {next && <div className="w-full rounded-[18px] border border-border bg-surface-muted px-3.5 py-3">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-foreground-muted">{f("then")} · {next.detail}</span>
      <bdi className="mt-0.5 block text-[15px] font-bold">{next.title}</bdi>
    </div>}
    <button type="button" onClick={onReady} className="min-h-[58px] w-full rounded-[18px] text-[17px] font-extrabold text-[#04202f]" style={{ background: "var(--water)" }} data-focus-ready>{f("ready")}</button>
    <p className="text-center text-xs text-foreground-muted">{f("vibrate")}</p>
  </section>;
}

function FinishView({ draft, f, n, muscleLabel, duration, durationInput, suggestedMinutes, setDurationInput, volumeText, loggedSets, records, intensity, setIntensity, notes, setNotes, error, pending, onSave, onBack }: {
  draft: Draft; f: (key: string, vars?: Record<string, string | number>) => string; n: Intl.NumberFormat; muscleLabel: (group: string) => string;
  duration: number; durationInput: string | null; suggestedMinutes: number; setDurationInput: (value: string) => void; volumeText: string; loggedSets: number;
  records: SessionResult["records"]; intensity: number; setIntensity: (value: number) => void; notes: string; setNotes: (value: string) => void;
  error: string | null; pending: boolean; onSave: () => void; onBack: () => void;
}) {
  const worked = musclesWorked(draft.exercises);
  const most = Math.max(1, ...worked.map((item) => item.sets));
  return <div className="mx-auto max-w-md space-y-5" data-focus-finish-view>
    <div className="flex flex-col items-center gap-2 pt-2 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full text-[#062016]" style={{ background: "var(--sport)", boxShadow: "0 0 0 10px color-mix(in srgb, var(--sport) 15%, transparent)" }}><SportIcon name="check" className="h-8 w-8" /></span>
      <h2 className="mt-3 text-2xl font-extrabold">{f("doneTitle")}</h2>
      <p className="text-sm text-foreground-muted">{draft.name}</p>
    </div>
    <dl className="grid grid-cols-3 gap-2">
      {[[f("duration"), `${n.format(duration)} min`], [f("volume"), volumeText], [f("sets"), n.format(loggedSets)]].map(([label, value]) => (
        <div key={label} className="rounded-[18px] border border-border bg-surface px-2 py-3.5 text-center"><dd className="text-xl font-extrabold tabular-nums">{value}</dd><dt className="mt-0.5 text-[11px] text-foreground-muted">{label}</dt></div>
      ))}
    </dl>
    {records.length > 0 && <section className="space-y-2.5 rounded-[22px] border-[1.5px] p-4" style={{ borderColor: "color-mix(in srgb, var(--mood) 40%, var(--border))", background: "color-mix(in srgb, var(--mood) 8%, var(--surface))" }} data-focus-records>
      <h3 className="text-[15px] font-bold" style={{ color: "color-mix(in srgb, var(--mood) 70%, var(--foreground))" }}>★ {f("records", { count: n.format(records.length) })}</h3>
      {records.map((record) => <p key={`${record.name}-${record.kind}`} className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate">{record.name}</span><bdi className="shrink-0 font-bold">{record.kind === "1RM" ? `1RM ${record.value}` : record.value}</bdi></p>)}
    </section>}
    {worked.length > 0 && <section className="space-y-2.5">
      <h3 className="text-[15px] font-semibold">{f("musclesWorked")}</h3>
      <ul className="space-y-2.5 rounded-[20px] border border-border bg-surface p-3.5">
        {worked.map((item) => <li key={item.muscle} className="grid grid-cols-[92px_minmax(0,1fr)_64px] items-center gap-2.5 text-[13px]">
          <span className="truncate">{muscleLabel(item.muscle)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${(item.sets / most) * 100}%`, background: "var(--sport)" }} /></span>
          <span className="text-end text-foreground-muted">{f(item.sets === 1 ? "setsCountOne" : "setsCount", { count: n.format(item.sets) })}</span>
        </li>)}
      </ul>
    </section>}
    <section className="space-y-2.5">
      <h3 className="text-[15px] font-semibold">{f("feeling")}</h3>
      <div role="radiogroup" aria-label={f("feeling")} className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => <button key={level} type="button" role="radio" aria-checked={intensity === level} onClick={() => setIntensity(level)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border" style={intensity === level ? { borderColor: "var(--sport)", background: "var(--sport-soft)" } : { borderColor: "var(--border)", background: "var(--surface)" }}>
          <span className="text-base font-extrabold">{level}</span><span className="text-[10px]">{f(`feel${level}`)}</span>
        </button>)}
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] text-foreground-muted">{f("note")}
        <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={f("notePlaceholder")} className="resize-none rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-sport" />
      </label>
      <label className="flex items-center justify-between gap-3 text-[13px] text-foreground-muted">{f("durationEdit")}
        <input type="number" min={1} inputMode="numeric" value={durationInput ?? String(suggestedMinutes)} onChange={(event) => setDurationInput(event.target.value)} className="w-24 rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm text-foreground outline-none focus:border-sport" />
      </label>
    </section>
    {error && <p className="text-xs text-danger">{error}</p>}
    <div className="flex flex-col gap-2">
      <button type="button" disabled={pending} onClick={onSave} className="min-h-14 rounded-2xl text-base font-extrabold text-[#062016] disabled:opacity-50" style={{ background: "var(--sport)" }} data-focus-save>{pending ? "…" : f("save")}</button>
      <button type="button" onClick={onBack} className="min-h-11 self-center text-[13px] font-semibold" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}>{f("backToSession")}</button>
    </div>
  </div>;
}
