"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/language-provider";
import { saveStrengthSession } from "@/lib/actions/strength";
import { exerciseKey, formatWeight, muscleColor, muscleGroupI18nPath, setsVolume } from "@/lib/strength";
import { ExercisePicker } from "@/components/strength/exercise-picker";
import { detectRecords, type ExerciseSummary } from "@/lib/strength-stats";

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
const fieldClass =
  "w-full rounded-lg border border-border bg-surface-muted px-2 py-2 text-center text-sm outline-none focus:border-sport focus:ring-2 focus:ring-sport/30";

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

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

function compactSets(sets: { reps: number; weight: number }[], t: ReturnType<typeof useT>) {
  return sets
    .map((s) => (s.weight > 0 ? `${formatWeight(s.weight)}×${s.reps}` : t("sport.common.repsValue", { reps: s.reps })))
    .join(" · ");
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
  const muscleLabel = (group: string) => {
    const path = muscleGroupI18nPath(group);
    return path ? t(path) : group;
  };
  const isClient = useIsClient();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [draft, setDraft] = useState<Draft>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [restSeconds, setRestSeconds] = useState(90);
  const [rest, setRest] = useState<{ end: number; total: number; fired: boolean } | null>(null);
  const restRef = useRef(rest);
  const [showFinish, setShowFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [durationInput, setDurationInput] = useState<string | null>(null);

  const lastByKey = useMemo(() => {
    const map = new Map<string, ExerciseSummary["sessions"][number]>();
    for (const s of summaries) {
      const last = s.sessions[s.sessions.length - 1];
      if (last) map.set(s.key, last);
    }
    return map;
  }, [summaries]);

  // Draft survives refreshes and accidental navigation
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage unavailable: the session still works, it just can't be resumed
    }
  }, [draft]);

  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const r = restRef.current;
      if (!r) return;
      if (!r.fired && n >= r.end) {
        r.fired = true;
        navigator.vibrate?.([200, 100, 200]);
      }
      if (n > r.end + 4000) {
        restRef.current = null;
        setRest(null);
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  function startRest(seconds = restSeconds) {
    const value = { end: Date.now() + seconds * 1000, total: seconds, fired: false };
    restRef.current = value;
    setRest(value);
  }

  function stopRest() {
    restRef.current = null;
    setRest(null);
  }

  function updateExercise(id: string, fn: (e: DraftExercise) => DraftExercise) {
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? fn(e) : e)) }));
  }

  function placeholderFor(exercise: DraftExercise, index: number): { reps: number; weight: number } | null {
    const prev = exercise.sets[index - 1];
    if (prev && num(prev.reps) > 0) return { reps: num(prev.reps), weight: num(prev.weight) };
    const last = lastByKey.get(exerciseKey(exercise.name));
    if (!last) return null;
    return last.sets[index] ?? last.sets[last.sets.length - 1] ?? null;
  }

  function toggleDone(exercise: DraftExercise, index: number) {
    const set = exercise.sets[index];
    if (set.done) {
      updateExercise(exercise.id, (e) => ({
        ...e,
        sets: e.sets.map((s, i) => (i === index ? { ...s, done: false } : s)),
      }));
      return;
    }
    const filled = num(set.reps) > 0;
    const ph = filled ? null : placeholderFor(exercise, index);
    updateExercise(exercise.id, (e) => ({
      ...e,
      sets: e.sets.map((s, i) =>
        i === index
          ? {
              done: true,
              reps: filled ? s.reps : ph ? String(ph.reps) : e.targetReps ? String(e.targetReps) : s.reps,
              weight: s.weight !== "" ? s.weight : ph ? String(ph.weight || "") : s.weight,
            }
          : s
      ),
    }));
    startRest();
  }

  function addExercise(name: string, muscle: string) {
    const clean = name.trim();
    if (!clean) return;
    setDraft((d) => ({
      ...d,
      exercises: [
        ...d.exercises,
        {
          id: crypto.randomUUID(),
          name: clean,
          muscle,
          targetReps: null,
          sets: [0, 1, 2].map(() => ({ reps: "", weight: "", done: false })),
        },
      ],
    }));
  }

  function moveExercise(id: string, dir: -1 | 1) {
    setDraft((d) => {
      const i = d.exercises.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.exercises.length) return d;
      const next = [...d.exercises];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, exercises: next };
    });
  }

  const payloadExercises = draft.exercises.map((e) => ({
    name: e.name,
    muscle: e.muscle,
    sets: e.sets.map((s) => ({ reps: Math.round(num(s.reps)), weight: num(s.weight) })).filter((s) => s.reps > 0),
  }));
  const loggedSets = payloadExercises.reduce((s, e) => s + e.sets.length, 0);
  const totalVolume = payloadExercises.reduce((s, e) => s + setsVolume(e.sets), 0);
  const elapsedSeconds = Math.max(0, Math.round((now - draft.startedAt) / 1000));
  const suggestedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const duration = durationInput === null ? suggestedMinutes : Math.round(num(durationInput));

  function save() {
    setError(null);
    const records = detectRecords(summaries, payloadExercises);
    startTransition(async () => {
      const result = await run(
        () =>
          saveStrengthSession({
            name: draft.name,
            date: today,
            templateId: draft.templateId,
            muscleGroups: draft.muscleGroups,
            durationMinutes: duration,
            intensity,
            notes,
            exercises: payloadExercises,
          }),
        { success: t("sport.common.sessionSavedToast", { name: draft.name }), failure: t("sport.common.sessionNotSaved") }
      );
      if (!result || result.error) return setError(result?.error ?? t("sport.common.saveError"));
      clearDraft();
      onSaved({ name: draft.name, volume: totalVolume, sets: loggedSets, minutes: duration, records });
    });
  }

  const restRemaining = rest ? Math.ceil((rest.end - now) / 1000) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              aria-label={t("sport.sessionLogger.nameAria")}
              className="w-full max-w-sm bg-transparent text-xl font-semibold tracking-tight outline-none focus:underline"
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {draft.muscleGroups.map((g) => (
                <span
                  key={g}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: `color-mix(in srgb, ${muscleColor(g)} 16%, transparent)`, color: muscleColor(g) }}
                >
                  {muscleLabel(g)}
                </span>
              ))}
              <span className="text-xs capitalize text-foreground-muted">{format(new Date(), "EEEE d MMMM", { locale: fr })}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div>
              <p className="text-xl font-semibold tabular-nums" style={{ color: "var(--sport)" }}>
                {clock(elapsedSeconds)}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-muted">{t("sport.sessionLogger.durationStat")}</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{loggedSets}</p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-muted">{t("sport.sessionLogger.setsStat")}</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{totalVolume.toLocaleString("fr-FR")}</p>
              <p className="text-[10px] uppercase tracking-wide text-foreground-muted">{t("sport.sessionLogger.volumeStat")}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          <span>{t("sport.sessionLogger.restBetweenSets")}</span>
          {REST_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRestSeconds(s)}
              className="rounded-full border px-2.5 py-1 transition"
              style={{
                borderColor: restSeconds === s ? "var(--sport)" : "color-mix(in srgb, var(--sport) 35%, var(--border))",
                background: restSeconds === s ? "var(--sport)" : "transparent",
                color: restSeconds === s ? "var(--on-accent)" : undefined,
              }}
            >
              {s >= 120 ? `${s / 60} ${t("sport.common.min")}` : `${s} ${t("sport.common.sec")}`}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises */}
      {draft.exercises.map((exercise, exIndex) => {
        const last = lastByKey.get(exerciseKey(exercise.name));
        const hasData = exercise.sets.some((s) => s.reps !== "" || s.weight !== "");
        return (
          <motion.div
            key={exercise.id}
            layout
            className="rounded-2xl border-[1.5px] bg-surface p-4"
            style={{ borderColor: `color-mix(in srgb, ${muscleColor(exercise.muscle)} 50%, var(--border))` }}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{exercise.name}</p>
                <p className="text-xs" style={{ color: muscleColor(exercise.muscle) }}>
                  {muscleLabel(exercise.muscle)}
                  {exercise.targetReps ? (
                    <span className="text-foreground-muted">
                      {" "}
                      {t("sport.sessionLogger.targetLabel", { sets: exercise.sets.length, reps: exercise.targetReps })}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground-muted">
                  {last ? t("sport.sessionLogger.lastTime", { sets: compactSets(last.sets, t) }) : t("sport.sessionLogger.firstTime")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-foreground-muted">
                <button
                  type="button"
                  disabled={exIndex === 0}
                  onClick={() => moveExercise(exercise.id, -1)}
                  aria-label={t("sport.sessionLogger.moveExerciseUpAria")}
                  className="rounded-md px-1.5 py-1 text-xs transition hover:bg-surface-muted disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={exIndex === draft.exercises.length - 1}
                  onClick={() => moveExercise(exercise.id, 1)}
                  aria-label={t("sport.sessionLogger.moveExerciseDownAria")}
                  className="rounded-md px-1.5 py-1 text-xs transition hover:bg-surface-muted disabled:opacity-30"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasData || confirm(t("sport.sessionLogger.confirmRemoveExercise", { name: exercise.name }))) {
                      setDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== exercise.id) }));
                    }
                  }}
                  aria-label={t("sport.sessionLogger.removeExerciseAria")}
                  className="rounded-md px-1.5 py-1 text-xs transition hover:bg-surface-muted hover:text-danger"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-[2rem_1fr_1fr_2.5rem_1.5rem] items-center gap-2 text-center text-[10px] uppercase tracking-wide text-foreground-muted">
              <span>{t("sport.sessionLogger.colSet")}</span>
              <span>kg</span>
              <span>{t("sport.sessionLogger.colReps")}</span>
              <span />
              <span />
            </div>
            <div className="space-y-1.5">
              {exercise.sets.map((set, i) => {
                const ph = placeholderFor(exercise, i);
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[2rem_1fr_1fr_2.5rem_1.5rem] items-center gap-2"
                    style={{ opacity: set.done ? 0.75 : 1 }}
                  >
                    <span className="text-center text-sm font-medium text-foreground-muted">{i + 1}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={0}
                      value={set.weight}
                      placeholder={ph && ph.weight ? formatWeight(ph.weight) : "0"}
                      onChange={(e) =>
                        updateExercise(exercise.id, (ex) => ({
                          ...ex,
                          sets: ex.sets.map((s, idx) => (idx === i ? { ...s, weight: e.target.value } : s)),
                        }))
                      }
                      aria-label={t("sport.sessionLogger.weightAria", { n: i + 1 })}
                      className={fieldClass}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={set.reps}
                      placeholder={ph ? String(ph.reps) : exercise.targetReps ? String(exercise.targetReps) : "0"}
                      onChange={(e) =>
                        updateExercise(exercise.id, (ex) => ({
                          ...ex,
                          sets: ex.sets.map((s, idx) => (idx === i ? { ...s, reps: e.target.value } : s)),
                        }))
                      }
                      aria-label={t("sport.sessionLogger.repsAria", { n: i + 1 })}
                      className={fieldClass}
                    />
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleDone(exercise, i)}
                      aria-label={t(set.done ? "sport.sessionLogger.setValidatedAria" : "sport.sessionLogger.validateSetAria")}
                      aria-pressed={set.done}
                      className="flex h-9 w-full items-center justify-center rounded-lg border-[1.5px] text-sm font-bold transition-colors"
                      style={{
                        borderColor: "var(--sport)",
                        background: set.done ? "var(--sport)" : "transparent",
                        color: set.done ? "var(--on-accent)" : "var(--sport)",
                      }}
                    >
                      ✓
                    </motion.button>
                    <button
                      type="button"
                      onClick={() =>
                        updateExercise(exercise.id, (ex) => ({ ...ex, sets: ex.sets.filter((_, idx) => idx !== i) }))
                      }
                      aria-label={t("sport.sessionLogger.removeSetAria", { n: i + 1 })}
                      className="text-xs text-foreground-muted transition hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                updateExercise(exercise.id, (ex) => ({ ...ex, sets: [...ex.sets, { reps: "", weight: "", done: false }] }))
              }
              className="mt-3 rounded-lg border border-dashed border-sport/50 px-3 py-1.5 text-xs font-medium text-sport transition hover:bg-sport-soft"
            >
              {t("sport.sessionLogger.addSet")}
            </button>
          </motion.div>
        );
      })}

      {/* Add exercise */}
      <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-4">
        <ExercisePicker
          catalog={catalog}
          excludedKeys={draft.exercises.map((e) => exerciseKey(e.name))}
          defaultMuscle={initial.muscleGroups[0] ?? "Pectoraux"}
          onPick={addExercise}
        />
      </div>

      {!showFinish && loggedSets === 0 && (
        <p className="rounded-xl border border-dashed border-sport/40 px-3 py-2 text-xs text-foreground-muted">
          {t("sport.sessionLogger.needRepsHint")}
        </p>
      )}

      {/* Finish */}
      {!showFinish ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loggedSets === 0}
            onClick={() => setShowFinish(true)}
            className="flex-1 rounded-xl bg-sport px-5 py-3 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-40"
          >
            {t("sport.sessionLogger.finishSession", {
              count: loggedSets,
              unit: t(loggedSets > 1 ? "sport.common.setOther" : "sport.common.setOne"),
            })}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground-muted transition hover:bg-surface-muted hover:text-danger"
          >
            {t("sport.sessionLogger.discard")}
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.sessionLogger.summaryTitle")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-foreground-muted">
              {t("sport.sessionLogger.durationMinutesLabel")}
              <input
                type="number"
                min={1}
                value={durationInput ?? String(suggestedMinutes)}
                onChange={(e) => setDurationInput(e.target.value)}
                className={`${fieldClass} text-left`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-foreground-muted">
              {t("sport.sessionLogger.intensityFeelLabel")}
              <select
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className={`${fieldClass} text-left text-foreground`}
              >
                <option value={1}>{t("sport.common.intensity1")}</option>
                <option value={2}>{t("sport.common.intensity2")}</option>
                <option value={3}>{t("sport.common.intensity3")}</option>
                <option value={4}>{t("sport.common.intensity4")}</option>
                <option value={5}>{t("sport.common.intensity5")}</option>
              </select>
            </label>
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("sport.sessionLogger.notesPlaceholder")}
            className={`${fieldClass} text-left`}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="flex-1 rounded-xl bg-sport px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? t("sport.common.saving") : t("sport.common.saveSessionButton")}
            </button>
            <button
              type="button"
              onClick={() => setShowFinish(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
            >
              {t("sport.sessionLogger.back")}
            </button>
          </div>
        </div>
      )}

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

      {/* Rest timer: portaled because a transformed ancestor would break `position: fixed` */}
      {isClient &&
        createPortal(
          <AnimatePresence>
            {rest && (
              <motion.div
                key="rest"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,22rem)] -translate-x-1/2 rounded-2xl border-[1.5px] border-sport bg-surface p-3 shadow-2xl md:bottom-6"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                      {restRemaining > 0 ? t("sport.sessionLogger.restLabel") : t("sport.sessionLogger.restOverLabel")}
                    </p>
                    <p className="text-2xl font-semibold tabular-nums" style={{ color: restRemaining > 0 ? "var(--sport)" : "var(--success)" }}>
                      {restRemaining > 0 ? clock(restRemaining) : t("sport.sessionLogger.goLabel")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startRest(Math.max(15, restRemaining + 15))}
                    className="rounded-lg border border-sport/40 px-2.5 py-1.5 text-xs font-medium transition hover:bg-surface-muted"
                  >
                    {t("sport.sessionLogger.plus15", { unit: t("sport.common.sec") })}
                  </button>
                  <button
                    type="button"
                    onClick={stopRest}
                    className="rounded-lg bg-sport px-3 py-1.5 text-xs font-semibold text-on-accent transition hover:opacity-90"
                  >
                    {t("sport.sessionLogger.skip")}
                  </button>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, (restRemaining / rest.total) * 100))}%`,
                      background: "var(--sport)",
                      transition: "width 0.5s linear",
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
