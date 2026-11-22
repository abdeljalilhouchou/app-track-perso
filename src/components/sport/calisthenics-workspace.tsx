"use client";

import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import Link from "next/link";
import { SportLink } from "@/components/sport/ui/sport-primitives";
import { SportStatusMessage } from "@/components/sport/ui/sport-module-shell";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import type { DraftItem, DraftSet } from "@/components/sport/calisthenics/cali-types";
import { CaliSkills } from "@/components/sport/calisthenics/cali-skills";
import { CaliFocus, type FinishPayload } from "@/components/sport/calisthenics/cali-focus";
import { CaliBefore } from "@/components/sport/calisthenics/cali-before";
import { CaliHistory } from "@/components/sport/calisthenics/cali-history";
import { ModuleCard, ModuleChips } from "@/components/sport/ui/module-kit";
import { exerciseRecords, weekBalance } from "@/lib/calisthenics/insights";
import { categoryColor } from "@/lib/calisthenics/focus";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, useT } from "@/components/language-provider";
import {
  deleteCalisthenicsExercise,
  deleteCalisthenicsProgram,
  deleteCalisthenicsSkill,
  deleteCalisthenicsWorkout,
  logCalisthenicsSkill,
  saveCalisthenicsExercise,
  saveCalisthenicsProgram,
  saveCalisthenicsSkill,
  saveCalisthenicsWorkout,
  type Category,
  type Level,
  type Measurement,
} from "@/lib/actions/calisthenics";
import type { CalisthenicsData } from "@/lib/calisthenics/data";
import type {
  CalisthenicsExercise,
  CalisthenicsProgramExercise,
  CalisthenicsProgramSession,
  CalisthenicsSet,
} from "@/types/database";

type Section = "session" | "program" | "exercises" | "progress" | "history";
type ProgramForm = {
  id?: string;
  name: string;
  notes: string;
  sessions: { id?: string; name: string; exercises: { id?: string; exerciseId: string; targetSets: number; targetReps: number | null; targetHoldSeconds: number | null; assistanceKg: number | null; addedWeightKg: number | null; notes: string }[] }[];
};
type SkillForm = { id?: string; name: string; skillKey: string; currentStep: number; targetStep: number; progressionSteps: string[]; measurementType: "reps" | "hold"; startedOn: string; notes: string };
type ExerciseForm = {
  id?: string;
  exerciseKey: string;
  category: Category;
  primaryMuscle: string;
  level: Level;
  measurementType: Measurement;
  names: { fr: string; en: string; ar: string };
  descriptions: { fr: string; en: string; ar: string };
  instructions: { fr: string; en: string; ar: string };
};

const DRAFT_KEY = "track-perso:calisthenics-session-v1";
const CATEGORIES: Category[] = ["push", "pull", "legs", "core", "skills", "mobility"];
const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
const MEASUREMENTS: Measurement[] = ["reps", "hold", "mixed"];
const SKILL_PRESETS = {
  handstand: { name: { fr: "Handstand", en: "Handstand", ar: "الوقوف على اليدين" }, measure: "hold" as const, steps: { fr: ["Wall hold", "Wall handstand contrôlé", "Freestanding attempts", "Freestanding hold"], en: ["Wall hold", "Controlled wall handstand", "Freestanding attempts", "Freestanding hold"], ar: ["ثبات على الحائط", "وقوف مضبوط على الحائط", "محاولات حرة", "ثبات حر"] } },
  l_sit: { name: { fr: "L-Sit", en: "L-Sit", ar: "إل-سِت" }, measure: "hold" as const, steps: { fr: ["Tuck support", "Tuck L-Sit", "One-leg L-Sit", "Full L-Sit"], en: ["Tuck support", "Tuck L-Sit", "One-leg L-Sit", "Full L-Sit"], ar: ["ارتكاز مضموم", "إل-سِت مضموم", "إل-سِت بساق واحدة", "إل-سِت كامل"] } },
  muscle_up: { name: { fr: "Muscle-up", en: "Muscle-up", ar: "ماسل أب" }, measure: "reps" as const, steps: { fr: ["Tractions explosives", "Transition assistée", "Muscle-up négatif", "Muscle-up strict"], en: ["Explosive pull-ups", "Assisted transition", "Negative muscle-up", "Strict muscle-up"], ar: ["عقلة انفجارية", "انتقال بمساعدة", "ماسل أب سلبي", "ماسل أب مضبوط"] } },
  front_lever: { name: { fr: "Front Lever", en: "Front Lever", ar: "فرونت ليفر" }, measure: "hold" as const, steps: { fr: ["Tuck", "Advanced tuck", "One-leg", "Full"], en: ["Tuck", "Advanced tuck", "One-leg", "Full"], ar: ["مضموم", "مضموم متقدم", "ساق واحدة", "كامل"] } },
  back_lever: { name: { fr: "Back Lever", en: "Back Lever", ar: "باك ليفر" }, measure: "hold" as const, steps: { fr: ["Tuck", "Advanced tuck", "One-leg", "Full"], en: ["Tuck", "Advanced tuck", "One-leg", "Full"], ar: ["مضموم", "مضموم متقدم", "ساق واحدة", "كامل"] } },
  planche: { name: { fr: "Planche", en: "Planche", ar: "بلانش" }, measure: "hold" as const, steps: { fr: ["Planche lean", "Tuck planche", "Advanced tuck", "Straddle / full"], en: ["Planche lean", "Tuck planche", "Advanced tuck", "Straddle / full"], ar: ["ميل البلانش", "بلانش مضمومة", "مضمومة متقدمة", "متباعدة / كاملة"] } },
} as const;

const localeName = (exercise: CalisthenicsExercise, locale: string) => locale === "ar" ? exercise.name_ar : locale === "en" ? exercise.name_en : exercise.name_fr;
const localDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
const blankSet = (measurement: Measurement): DraftSet => ({
  key: crypto.randomUUID(), reps: measurement === "hold" ? null : 8, holdSeconds: measurement === "hold" ? 20 : null,
  mode: measurement === "hold" ? "hold" : "reps", assistanceKg: null, addedWeightKg: null, variation: "", notes: "",
});
const blankProgram = (): ProgramForm => ({ name: "", notes: "", sessions: [{ name: "", exercises: [] }] });
const blankSkill = (): SkillForm => ({ name: "", skillKey: "custom", currentStep: 0, targetStep: 1, progressionSteps: [""], measurementType: "hold", startedOn: "", notes: "" });

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5 ${className}`}>{children}</section>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 space-y-1.5 text-xs font-medium text-foreground-muted ${className}`}>
    <span>{label}</span>{children}
  </label>;
}

const controlClass = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-sport focus:ring-2 focus:ring-sport/20";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sport px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60";
const secondaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60";

export function CalisthenicsWorkspace({ data, initialSessionId }: { data: CalisthenicsData; initialSessionId?: string }) {
  const t = useT();
  const { language } = useLanguage();
  const router = useRouter();
  const [section, setSection] = useState<Section>(initialSessionId ? "history" : "session");
  const [focusOpen, setFocusOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [, setDraftRestored] = useState(false);
  const [date, setDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  // When the draft got its first exercise; the session length comes from it unless typed in.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, setDurationTouched] = useState(false);
  const [intensity, setIntensity] = useState(3);
  const [sessionNotes, setSessionNotes] = useState("");
  const [programSessionId, setProgramSessionId] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [exerciseForm, setExerciseForm] = useState<ExerciseForm | null>(null);
  const [programForm, setProgramForm] = useState<ProgramForm | null>(null);
  const [skillForm, setSkillForm] = useState<SkillForm | null>(null);
  const [period, setPeriod] = useState<"30" | "90" | "all">("90");

  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const sectionId = useId();
  const exercisesById = useMemo(() => new Map(data.exercises.map((exercise) => [exercise.id, exercise])), [data.exercises]);
  const setsByWorkout = useMemo(() => {
    const grouped = new Map<string, CalisthenicsSet[]>();
    for (const set of data.sets) grouped.set(set.workout_id, [...(grouped.get(set.workout_id) ?? []), set]);
    return grouped;
  }, [data.sets]);
  const programSessions = data.programs.flatMap((program) => program.sessions.map((session) => ({ program, session })));
  const lastUsedProgramSessionId = data.workouts.find((workout) => workout.calisthenics_program_session_id)?.calisthenics_program_session_id;
  const lastUsed = programSessions.findIndex(({ session }) => session.id === lastUsedProgramSessionId);
  const suggestion = lastUsed >= 0
    ? (() => { const current = programSessions[lastUsed]; const next = current.program.sessions[(current.program.sessions.findIndex((session) => session.id === current.session.id) + 1) % current.program.sessions.length]; return { program: current.program, session: next }; })()
    : programSessions[0];
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v2.${key}`, vars);
  const w = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v3.${key}`, vars);
  const records = exerciseRecords(data.workouts, data.sets).map((record) => ({ ...record, label: exercisesById.has(record.key) ? localeName(exercisesById.get(record.key)!, language) : record.name }));
  const balance = weekBalance(data.workouts, data.sets, (set) => set.exercise_id ? exercisesById.get(set.exercise_id)?.category : undefined);
  const bestFor = (exerciseId: string, kind: "reps" | "hold") => records.find((record) => record.key === exerciseId && record.kind === kind)?.value ?? 0;
  // The values of each exercise's most recent session, newest workouts first.
  const lastByExercise = new Map<string, string>();
  for (const workout of data.workouts) {
    const rows = setsByWorkout.get(workout.id) ?? [];
    for (const set of rows) {
      if (!set.exercise_id || lastByExercise.has(set.exercise_id)) continue;
      lastByExercise.set(set.exercise_id, rows.filter((row) => row.exercise_id === set.exercise_id).map((row) => row.hold_seconds !== null ? `${row.hold_seconds} s` : String(row.reps ?? 0)).join(" · "));
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft = JSON.parse(saved) as Partial<{ date: string; durationMinutes: number; intensity: number; notes: string; programSessionId: string; items: DraftItem[]; startedAt: number }>;
          if (Array.isArray(draft.items) && draft.items.length <= 50 && draft.items.every((item) => item && typeof item.exerciseId === "string" && Array.isArray(item.sets))) {
            setDate(typeof draft.date === "string" ? draft.date : localDate());
            setDurationMinutes(Number.isInteger(draft.durationMinutes) ? draft.durationMinutes! : 45);
            setIntensity(Number.isInteger(draft.intensity) ? draft.intensity! : 3);
            setSessionNotes(typeof draft.notes === "string" ? draft.notes : "");
            setProgramSessionId(typeof draft.programSessionId === "string" ? draft.programSessionId : "");
            setDraftItems(draft.items);
            setStartedAt(typeof draft.startedAt === "number" && draft.startedAt <= Date.now() ? draft.startedAt : Date.now());
            setDraftRestored(draft.items.length > 0);
          } else {
            setDate(localDate());
          }
        } else {
          setDate(localDate());
        }
      } catch {
        try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* storage is unavailable */ }
        setDate(localDate());
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    if (draftItems.length === 0) {
      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* storage is unavailable */ }
      return;
    }
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ date, durationMinutes, intensity, notes: sessionNotes, programSessionId, items: draftItems, startedAt }));
    } catch {
      // Storage may be disabled or full; the in-memory session remains usable.
    }
  }, [draftReady, date, durationMinutes, intensity, sessionNotes, programSessionId, draftItems, startedAt]);

  useEffect(() => {
    if (!draftItems.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftItems.length]);

  const messageForError = (error: string) => {
    const keys: Record<string, string> = {
      schema_not_ready: "schema", not_signed_in: "auth", invalid_input: "invalid", not_found: "notFound",
      save_failed: "failed", exercise_in_use: "failed",
    };
    return t(`sport.calisthenicsUi.errors.${keys[error] ?? "failed"}`);
  };
  const runMutation = (task: () => Promise<{ error: string | null; notice?: string }>, onSuccess?: () => void) => {
    startTransition(async () => {
      setFeedback("");
      try {
        const result = await task();
        if (result.error) setFeedback(messageForError(result.error));
        else {
          setFeedback(result.notice === "sport_habit_undone" ? c("errors.sportHabitUndone") : result.notice === "sport_habit_checked" ? c("sportHabitChecked") : result.notice || c("errors.success"));
          onSuccess?.();
          router.refresh();
        }
      } catch {
        setFeedback(c("errors.failed"));
      }
    });
  };

  const addExerciseToDraft = (exerciseId: string, target?: CalisthenicsProgramExercise) => {
    const exercise = exercisesById.get(exerciseId);
    if (!exercise) return;
    if (draftItems.length >= 50) { setFeedback(c("errors.invalid")); return; }
    setStartedAt((value) => value ?? Date.now());
    const count = target?.target_sets ?? 3;
    const sets = Array.from({ length: count }, () => {
      const item = blankSet(exercise.measurement_type);
      if (target) {
        item.reps = target.target_reps;
        item.holdSeconds = target.target_hold_seconds;
        item.assistanceKg = target.assistance_kg;
        item.addedWeightKg = target.added_weight_kg;
      }
      return item;
    });
    setDraftItems((current) => [...current, { key: crypto.randomUUID(), exerciseId, sets, target: target ? (exercise.measurement_type === "hold" ? target.target_hold_seconds : target.target_reps) : null }]);
    setSection("session");
  };

  const startProgramSession = (session: CalisthenicsProgramSession & { exercises: CalisthenicsProgramExercise[] }) => {
    setProgramSessionId(session.id);
    setDraftItems(session.exercises.map((item) => ({
      key: crypto.randomUUID(), exerciseId: item.exercise_id ?? "", target: item.measurement_type === "hold" ? item.target_hold_seconds : item.target_reps,
      sets: Array.from({ length: item.target_sets }, () => {
        const set = blankSet(item.measurement_type);
        set.reps = item.target_reps;
        set.holdSeconds = item.target_hold_seconds;
        set.assistanceKg = item.assistance_kg;
        set.addedWeightKg = item.added_weight_kg;
        return set;
      }),
    })).filter((item) => item.exerciseId));
    setDurationMinutes(45);
    setDurationTouched(false);
    setStartedAt(() => Date.now());
    setFocusOpen(true);
    setSection("session");
  };

  const submitFocus = (payload: FinishPayload) => {
    const items = draftItems.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets.filter((set) => set.done).map((set) => ({ reps: set.mode === "reps" ? set.reps : null, holdSeconds: set.mode === "hold" ? set.holdSeconds : null, assistanceKg: set.assistanceKg, addedWeightKg: set.addedWeightKg, variation: set.variation, notes: set.notes })),
    })).filter((item) => item.sets.length > 0);
    runMutation(() => saveCalisthenicsWorkout({ date: payload.date, durationMinutes: payload.durationMinutes, intensity: payload.intensity, notes: payload.notes, programSessionId: programSessionId || null, items }), () => {
      setDraftItems([]); setProgramSessionId(""); setSessionNotes(""); setDate(localDate()); setDurationMinutes(45); setIntensity(3); setDraftRestored(false); setStartedAt(null); setDurationTouched(false); setFocusOpen(false); setSection("history");
    });
  };

  const filteredExercises = data.exercises.filter((exercise) => {
    const name = localeName(exercise, language).toLowerCase();
    return (!exerciseSearch || name.includes(exerciseSearch.toLowerCase()) || exercise.exercise_key.includes(exerciseSearch.toLowerCase())) &&
      (levelFilter === "all" || exercise.level === levelFilter);
  });


  // This week, the program in use and what the cards need.
  const todayKey = localDate();
  const weekStartKey = localDateOf(startOfCurrentWeek());
  const weekWorkouts = data.workouts.filter((workout) => workout.workout_date >= weekStartKey && workout.workout_date <= todayKey);
  const activeProgram = suggestion?.program ?? data.programs[0] ?? null;
  const doneThisWeek: Record<string, string> = {};
  for (const workout of weekWorkouts) if (workout.calisthenics_program_session_id && !doneThisWeek[workout.calisthenics_program_session_id]) doneThisWeek[workout.calisthenics_program_session_id] = workout.workout_date;
  const lastBest = new Map<string, number>();
  for (const workout of data.workouts) for (const set of setsByWorkout.get(workout.id) ?? []) {
    if (!set.exercise_id || lastBest.has(set.exercise_id)) continue;
    const rows = (setsByWorkout.get(workout.id) ?? []).filter((row) => row.exercise_id === set.exercise_id);
    lastBest.set(set.exercise_id, Math.max(...rows.map((row) => row.hold_seconds ?? row.reps ?? 0)));
  }
  const lastWeekBalance = weekBalance(data.workouts, data.sets, (set) => set.exercise_id ? exercisesById.get(set.exercise_id)?.category : undefined, daysAgo(7));
  const balanceRows = (["push", "pull", "legs", "core"] as const).map((category) => ({ category, sets: balance.counts[category], last: lastWeekBalance.counts[category] }));
  const recordsByWorkout = new Map<string, Set<string>>();
  for (const record of records) for (const workout of data.workouts) {
    if (workout.workout_date !== record.date || !(setsByWorkout.get(workout.id) ?? []).some((set) => set.exercise_id === record.key)) continue;
    recordsByWorkout.set(workout.id, new Set([...(recordsByWorkout.get(workout.id) ?? []), record.key]));
  }
  const programTotals = new Map<string, number>();
  for (const session of activeProgram?.sessions ?? []) for (const line of session.exercises) {
    const category = exercisesById.get(line.exercise_id ?? "")?.category ?? line.category;
    programTotals.set(category, (programTotals.get(category) ?? 0) + line.target_sets);
  }
  const programBalance = (["push", "pull", "legs", "core", "skills"] as const).map((category) => ({ category, sets: programTotals.get(category) ?? 0 }));
  const programMost = Math.max(1, ...programBalance.map((item) => item.sets));
  const programLow = programBalance.filter((item) => item.category !== "skills" && item.sets < programMost / 3);
  const weekAxis = Math.max(4, ...balanceRows.flatMap((row) => [row.sets + 1, row.last + 1]));
  const sessionName = data.programs.flatMap((program) => program.sessions).find((session) => session.id === programSessionId)?.name ?? v("freeSessionTitle");
  const inSession = focusOpen || draftItems.length > 0;
  const startFree = () => { setProgramSessionId(""); setStartedAt((value) => value ?? Date.now()); setFocusOpen(true); setSection("exercises"); };
  const discard = () => { if (window.confirm(v("discardConfirm"))) { setDraftItems([]); setProgramSessionId(""); setDraftRestored(false); setStartedAt(null); setDurationTouched(false); setFocusOpen(false); } };
  const redo = (workout: CalisthenicsData["workouts"][number]) => {
    if (draftItems.length && !window.confirm(w("redoConfirm"))) return;
    const items: DraftItem[] = [];
    for (const row of setsByWorkout.get(workout.id) ?? []) {
      if (!row.exercise_id || !exercisesById.has(row.exercise_id)) continue;
      let item = items.find((entry) => entry.exerciseId === row.exercise_id);
      if (!item) { item = { key: crypto.randomUUID(), exerciseId: row.exercise_id, sets: [], target: row.hold_seconds ?? row.reps }; items.push(item); }
      item.sets.push({ key: crypto.randomUUID(), reps: row.reps, holdSeconds: row.hold_seconds, mode: row.hold_seconds !== null ? "hold" : "reps", assistanceKg: row.assistance_kg, addedWeightKg: row.added_weight_kg, variation: row.variation, notes: "" });
    }
    setDraftItems(items); setProgramSessionId(workout.calisthenics_program_session_id ?? ""); setStartedAt(Date.now()); setDurationTouched(false); setFocusOpen(true); setSection("session");
  };

  // Progress figures over the chosen period, against the period before.
  const periodDays = period === "30" ? 28 : period === "90" ? 91 : 365;
  const sinceKey = localDateOf(daysAgo(periodDays - 1));
  const beforeKey = localDateOf(daysAgo(periodDays * 2 - 1));
  const inPeriod = data.workouts.filter((workout) => workout.workout_date >= sinceKey && workout.workout_date <= todayKey);
  const inBefore = data.workouts.filter((workout) => workout.workout_date >= beforeKey && workout.workout_date < sinceKey);
  const sumOf = (rows: CalisthenicsData["workouts"], field: "reps" | "hold_seconds") => rows.reduce((total, workout) => total + (setsByWorkout.get(workout.id) ?? []).reduce((sum, set) => sum + (set[field] ?? 0), 0), 0);
  const kpis = [
    { label: w("kpiSessions"), value: String(inPeriod.length), change: inPeriod.length - inBefore.length as number | null, unit: "" },
    { label: w("kpiReps"), value: new Intl.NumberFormat(language).format(sumOf(inPeriod, "reps")), change: sumOf(inPeriod, "reps") - sumOf(inBefore, "reps") as number | null, unit: "" },
    { label: w("kpiHold"), value: holdText(sumOf(inPeriod, "hold_seconds")), change: Math.round((sumOf(inPeriod, "hold_seconds") - sumOf(inBefore, "hold_seconds")) / 60) as number | null, unit: " min" },
    { label: w("kpiRecords"), value: String(records.filter((record) => record.date >= sinceKey).length), change: null as number | null, unit: "" },
  ];

  const tabs: { id: Section; label: string }[] = [{ id: "session", label: w("tabSession") }, { id: "program", label: w("tabProgram") }, { id: "progress", label: w("tabProgress") }, { id: "history", label: w("tabHistory") }];
  const statusMessage = feedback ? <SportStatusMessage onDismiss={() => setFeedback("")} dismissLabel={t("sport.ui.dismissStatus")}>{feedback}</SportStatusMessage> : null;
  const ink = "color-mix(in srgb, var(--habit) 70%, var(--foreground))";
  const VIOLET_INK = "#1a1033";

  return <div className="mx-auto max-w-2xl space-y-5" data-cali-workspace>
    <header className="flex items-center gap-3" data-strength-header data-focus-hide>
      <Link href="/sport" prefetch={false} aria-label={w("backToSport")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface transition hover:bg-surface-muted"><SportIcon name="chevron" className="sport-context-back-icon h-4 w-4" /></Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold" style={{ color: ink }}>{w("weekShort", { done: weekWorkouts.length, goal: data.weeklyGoal })}</p>
        <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{t("sport.hub.calisthenics.title")}</h1>
      </div>
      <button type="button" onClick={() => setSection("exercises")} className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 text-[13px] font-semibold transition hover:bg-surface-muted" data-cali-exercises-link><SportIcon name="exercise" className="h-[18px] w-[18px]" />{w("exercises")}</button>
    </header>

    <div role="tablist" aria-label={c("navigationLabel")} className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface p-1" data-focus-hide data-cali-tabs>
      {tabs.map((tab) => {
        const active = section === tab.id;
        return <button key={tab.id} type="button" role="tab" aria-selected={active} onClick={() => setSection(tab.id)} className="min-h-[38px] min-w-0 truncate rounded-xl px-1 text-[13px] font-semibold transition" style={active ? { background: "var(--habit)", color: VIOLET_INK } : { color: "var(--foreground-muted)" }} data-cali-tab={tab.id}>{tab.label}</button>;
      })}
    </div>

    {statusMessage}

    {section === "session" && (inSession
      ? <CaliFocus
        items={draftItems}
        setItems={(update) => { setStartedAt((value) => value ?? Date.now()); setDraftItems(update); }}
        exercisesById={exercisesById}
        name={sessionName}
        startedAt={startedAt ?? 0}
        lastByExercise={lastByExercise}
        defaultDate={date || todayKey}
        busy={busy}
        onAddExercise={() => setSection("exercises")}
        onDiscard={discard}
        onSave={submitFocus}
      />
      : <CaliBefore
        program={activeProgram}
        programs={data.programs}
        suggestedId={suggestion?.session.id ?? null}
        doneThisWeek={doneThisWeek}
        sessionsThisWeek={weekWorkouts.length}
        goal={data.weeklyGoal}
        exercisesById={exercisesById}
        lastBest={lastBest}
        skill={data.skills[0] ?? null}
        balance={balanceRows}
        onStart={startProgramSession}
        onFree={startFree}
        onCreateProgram={() => { setSection("program"); setProgramForm(blankProgram()); }}
        onSkill={() => setSection("progress")}
      />)}

    {section === "exercises" && <div className="space-y-4" data-cali-exercises>
      <button type="button" onClick={() => setSection("session")} className="flex min-h-11 items-center gap-2 text-sm font-semibold" style={{ color: ink }}><SportIcon name="chevron" className="sport-context-back-icon h-4 w-4 !text-current" />{w("tabSession")}</button>
      <div className="flex gap-2">
        <label htmlFor="cali-search" className="sr-only">{v("searchPlaceholder")}</label>
        <input id="cali-search" className={`${controlClass} min-h-12 flex-1`} placeholder={v("searchPlaceholder")} value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} />
        <button type="button" aria-label={v("createExercise")} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[22px] font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }} onClick={() => setExerciseForm({ exerciseKey: `custom-${crypto.randomUUID().replaceAll("-", "")}`, category: "push", primaryMuscle: "chest", level: "beginner", measurementType: "reps", names: { fr: "", en: "", ar: "" }, descriptions: { fr: "", en: "", ar: "" }, instructions: { fr: "", en: "", ar: "" } })}>+</button>
      </div>
      <ModuleChips label={c("level")} value={levelFilter} options={[{ value: "all", label: v("allLevels") }, ...LEVELS.map((level) => ({ value: level, label: c(`levels.${level}`) }))]} onChange={setLevelFilter} />
      {exerciseForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsExercise({ ...exerciseForm, descriptions: exerciseForm.descriptions, instructions: exerciseForm.instructions }), () => setExerciseForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{exerciseForm.id ? c("editExercise") : c("newExercise")}</h3><button type="button" className={secondaryButtonClass} onClick={() => setExerciseForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-3">{(["fr", "en", "ar"] as const).map((lang) => <Field key={lang} label={c(`name${lang.toUpperCase()}`)}><input required maxLength={80} className={controlClass} value={exerciseForm.names[lang]} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, names: { ...form.names, [lang]: event.target.value } }) : null)} /></Field>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label={c("category")}><select className={controlClass} value={exerciseForm.category} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, category: event.target.value as Category }) : null)}>{CATEGORIES.map((item) => <option key={item} value={item}>{c(`categories.${item}`)}</option>)}</select></Field><Field label={c("level")}><select className={controlClass} value={exerciseForm.level} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, level: event.target.value as Level }) : null)}>{LEVELS.map((item) => <option key={item} value={item}>{c(`levels.${item}`)}</option>)}</select></Field><Field label={c("measurement")}><select className={controlClass} value={exerciseForm.measurementType} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, measurementType: event.target.value as Measurement }) : null)}>{MEASUREMENTS.map((item) => <option key={item} value={item}>{c(`measurements.${item}`)}</option>)}</select></Field><Field label={c("primaryMuscle")}><input required maxLength={50} className={controlClass} value={exerciseForm.primaryMuscle} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, primaryMuscle: event.target.value }) : null)} /></Field></div><button type="submit" className={buttonClass} disabled={busy}>{c("saveExercise")}</button></form></Card>}
      {filteredExercises.length ? CATEGORIES.filter((category) => filteredExercises.some((exercise) => exercise.category === category)).map((category) => <section key={category} aria-labelledby={`${sectionId}-${category}`} className="space-y-2">
        <h3 id={`${sectionId}-${category}`} className="flex items-center gap-2 text-[15px] font-bold"><span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: categoryColor(category) }} />{c(`categories.${category}`)}<span className="text-xs font-normal text-foreground-muted">{filteredExercises.filter((exercise) => exercise.category === category).length}</span></h3>
        <div className="space-y-2">
          {filteredExercises.filter((exercise) => exercise.category === category).map((exercise) => {
            const record = exercise.measurement_type === "hold" ? bestFor(exercise.id, "hold") : bestFor(exercise.id, "reps");
            const color = categoryColor(exercise.category);
            return <div key={exercise.id} className="flex items-center gap-3 rounded-[18px] border p-3" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 20%, var(--surface)), color-mix(in srgb, ${color} 7%, var(--surface)))`, borderColor: `color-mix(in srgb, ${color} 35%, var(--border))`, borderStyle: exercise.user_id ? "dashed" : "solid" }} data-cali-exercise={exercise.exercise_key}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{localeName(exercise, language)}</p>
                <p className="truncate text-xs text-foreground-muted">{c(`levels.${exercise.level}`)} · {c(`measurements.${exercise.measurement_type}`)}{record > 0 ? ` · ${v("recordShort", { value: exercise.measurement_type === "hold" ? `${record} s` : record })}` : ""}</p>
                {exercise.user_id && <div className="mt-1 flex gap-3 text-xs font-semibold"><button type="button" className="min-h-9" style={{ color: ink }} onClick={() => setExerciseForm({ id: exercise.id, exerciseKey: exercise.exercise_key, category: exercise.category, primaryMuscle: exercise.primary_muscle, level: exercise.level, measurementType: exercise.measurement_type, names: { fr: exercise.name_fr, en: exercise.name_en, ar: exercise.name_ar }, descriptions: { fr: exercise.description_fr, en: exercise.description_en, ar: exercise.description_ar }, instructions: { fr: exercise.instructions_fr, en: exercise.instructions_en, ar: exercise.instructions_ar } })}>{c("editExercise")}</button><button type="button" className="min-h-9 text-danger" onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsExercise(exercise.id))}>{c("remove")}</button></div>}
              </div>
              <ExerciseGuideButton name={localeName(exercise, language)} discipline="calisthenics" exerciseId={exercise.id} />
              <button type="button" className="cali-lib-add grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl font-bold" style={{ background: "var(--habit)", color: VIOLET_INK }} aria-label={v("addToSession", { name: localeName(exercise, language) })} onClick={() => { setFocusOpen(true); addExerciseToDraft(exercise.id); }}>+</button>
            </div>;
          })}
        </div>
      </section>) : <ModuleCard><p className="text-sm text-foreground-muted">{c("noExercises")}</p></ModuleCard>}
      <SportLink href="/sport/exercises?discipline=calisthenics" icon="exercise">{t("sport.library.title")}</SportLink>
    </div>}

    {section === "program" && <div className="space-y-5" data-cali-program>
      {activeProgram && <section className="space-y-2.5 rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-foreground-muted">{w("activeProgram")}</p>
            <p className="mt-0.5 truncate text-xl font-extrabold">{activeProgram.name}</p>
          </div>
          {suggestion && <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--habit) 16%, var(--surface))", color: ink }}>{w("nextUp", { name: suggestion.session.name })}</span>}
        </div>
        <p className="text-[13px] text-foreground-muted">{[w("rotation", { count: activeProgram.sessions.length }), data.programs.length > 1 ? w("otherPrograms", { count: data.programs.length - 1 }) : null].filter(Boolean).join(" · ")}</p>
      </section>}

      {programForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsProgram(programForm), () => setProgramForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{programForm.id ? c("editProgram") : c("newProgram")}</h3><button className={secondaryButtonClass} type="button" onClick={() => setProgramForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-2"><Field label={c("programName")}><input required maxLength={80} className={controlClass} value={programForm.name} onChange={(event) => setProgramForm((form) => form ? ({ ...form, name: event.target.value }) : null)} /></Field><Field label={c("programNotes")}><input maxLength={2000} className={controlClass} value={programForm.notes} onChange={(event) => setProgramForm((form) => form ? ({ ...form, notes: event.target.value }) : null)} /></Field></div>
        {programForm.sessions.map((session, sessionIndex) => <div key={session.id ?? `session-${sessionIndex}`} className="space-y-3 rounded-2xl border border-border bg-background p-3"><div className="flex items-end gap-2"><Field label={`${c("programSessionName")} ${sessionIndex + 1}`} className="flex-1"><input required maxLength={80} className={controlClass} value={session.name} onChange={(event) => setProgramForm((form) => form ? ({ ...form, sessions: form.sessions.map((item, index) => index === sessionIndex ? ({ ...item, name: event.target.value }) : item) }) : null)} /></Field><div className="flex gap-1"><button type="button" aria-label={c("moveUp")} className={secondaryButtonClass} disabled={sessionIndex === 0} onClick={() => setProgramForm((form) => form ? moveProgramSession(form, sessionIndex, -1) : null)}>↑</button><button type="button" aria-label={c("moveDown")} className={secondaryButtonClass} disabled={sessionIndex === programForm.sessions.length - 1} onClick={() => setProgramForm((form) => form ? moveProgramSession(form, sessionIndex, 1) : null)}>↓</button><button type="button" className={secondaryButtonClass} disabled={programForm.sessions.length === 1} onClick={() => setProgramForm((form) => form ? ({ ...form, sessions: form.sessions.filter((_, index) => index !== sessionIndex) }) : null)}>{c("remove")}</button></div></div>
          {session.exercises.map((item, exerciseIndex) => { const exercise = exercisesById.get(item.exerciseId); return <div key={item.id ?? `${item.exerciseId}-${exerciseIndex}`} className="grid gap-2 rounded-xl bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_auto] sm:items-end"><p className="truncate text-sm font-medium">{exercise ? localeName(exercise, language) : item.exerciseId}</p><Field label={c("targetSets")}><input type="number" min={1} max={20} className={controlClass} value={item.targetSets} onChange={(event) => setProgramForm((form) => form ? updateProgramExercise(form, sessionIndex, exerciseIndex, { targetSets: Number(event.target.value) }) : null)} /></Field>{exercise?.measurement_type !== "hold" && <Field label={c("targetReps")}><input type="number" min={1} max={500} className={controlClass} value={item.targetReps ?? ""} onChange={(event) => setProgramForm((form) => form ? updateProgramExercise(form, sessionIndex, exerciseIndex, { targetReps: event.target.value === "" ? null : Number(event.target.value), targetHoldSeconds: null }) : null)} /></Field>}{exercise?.measurement_type !== "reps" && <Field label={c("targetHold")}><input type="number" min={1} max={7200} className={controlClass} value={item.targetHoldSeconds ?? ""} onChange={(event) => setProgramForm((form) => form ? updateProgramExercise(form, sessionIndex, exerciseIndex, { targetHoldSeconds: event.target.value === "" ? null : Number(event.target.value), targetReps: null }) : null)} /></Field>}<div className="flex gap-1"><button type="button" aria-label={c("moveUp")} className={secondaryButtonClass} disabled={exerciseIndex === 0} onClick={() => setProgramForm((form) => form ? moveProgramExercise(form, sessionIndex, exerciseIndex, -1) : null)}>↑</button><button type="button" aria-label={c("moveDown")} className={secondaryButtonClass} disabled={exerciseIndex === session.exercises.length - 1} onClick={() => setProgramForm((form) => form ? moveProgramExercise(form, sessionIndex, exerciseIndex, 1) : null)}>↓</button><button type="button" className={secondaryButtonClass} onClick={() => setProgramForm((form) => form ? ({ ...form, sessions: form.sessions.map((current, index) => index !== sessionIndex ? current : ({ ...current, exercises: current.exercises.filter((_, row) => row !== exerciseIndex) })) }) : null)}>{c("remove")}</button></div></div>; })}
          <div className="flex gap-2"><select id={`program-exercise-${sessionIndex}`} className={controlClass}><option value="">{c("chooseExercise")}</option>{data.exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{localeName(exercise, language)}</option>)}</select><button type="button" className={secondaryButtonClass} disabled={session.exercises.length >= 50} onClick={() => { const select = document.getElementById(`program-exercise-${sessionIndex}`) as HTMLSelectElement | null; const exercise = select?.value ? exercisesById.get(select.value) : undefined; if (!exercise) return; setProgramForm((form) => form ? addProgramExercise(form, sessionIndex, exercise) : null); }}>{c("addProgramExercise")}</button></div>
        </div>)}
        <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButtonClass} disabled={programForm.sessions.length >= 20} onClick={() => setProgramForm((form) => form ? ({ ...form, sessions: [...form.sessions, { name: "", exercises: [] }] }) : null)}>＋ {c("addProgramSession")}</button><button type="submit" className={buttonClass} disabled={busy}>{c("saveProgram")}</button></div>
      </form></Card>}

      {data.programs.length ? data.programs.map((program) => <section key={program.id} aria-label={program.name} className="space-y-2.5" data-cali-program-card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-[15px] font-semibold">{program.id === activeProgram?.id ? w("sessions") : program.name}</h2>
          <div className="flex shrink-0 gap-1">
            <button type="button" className="min-h-10 rounded-xl px-3 text-[13px] font-semibold" style={{ color: ink }} onClick={() => setProgramForm(programToForm(program))}>{w("edit")}</button>
            <button type="button" className="min-h-10 rounded-xl px-3 text-[13px] font-semibold text-danger" onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsProgram(program.id))}>{w("delete")}</button>
          </div>
        </div>
        {program.sessions.map((session, sessionIndex) => {
          const next = session.id === suggestion?.session.id;
          return <details key={session.id} open={next} className="group overflow-hidden rounded-3xl bg-surface" style={{ border: next ? "1.5px solid color-mix(in srgb, var(--habit) 45%, var(--border))" : "1px solid var(--border)" }}>
            <summary className="flex cursor-pointer list-none items-center gap-2.5 p-3.5 [&::-webkit-details-marker]:hidden">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold" style={next ? { background: "var(--habit)", color: VIOLET_INK } : { background: "var(--surface-muted)" }}>{String.fromCharCode(65 + (sessionIndex % 26))}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-base font-bold">{session.name}</span><span className="block text-xs text-foreground-muted">{w("sessionStats", { count: session.exercises.length, sets: session.exercises.reduce((sum, item) => sum + item.target_sets, 0) })}</span></span>
              <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0 rotate-90 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="border-t border-border px-3.5 pb-3.5">
              <ol>
                {session.exercises.map((line, index) => {
                  const exercise = exercisesById.get(line.exercise_id ?? "");
                  return <li key={line.id} className={`flex min-h-12 items-center gap-3 py-2 ${index ? "border-t border-border" : ""}`}>
                    <span aria-hidden className="h-7 w-1 shrink-0 rounded-full" style={{ background: categoryColor(exercise?.category ?? line.category) }} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{exercise ? localeName(exercise, language) : line.exercise_name}</span><span className="block text-[11px] text-foreground-muted">{c(`categories.${exercise?.category ?? line.category}`)}{line.added_weight_kg ? ` · +${line.added_weight_kg} kg` : line.assistance_kg ? ` · −${line.assistance_kg} kg` : ""}</span></span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums">{line.target_sets} × {line.target_hold_seconds ? `${line.target_hold_seconds} s` : line.target_reps ?? "–"}</span>
                  </li>;
                })}
              </ol>
              <button type="button" onClick={() => startProgramSession(session)} className="mt-2 min-h-11 w-full rounded-xl text-[13px] font-bold" style={{ background: "color-mix(in srgb, var(--habit) 16%, var(--surface))", color: ink }} data-cali-program-start>{w("startSession")}</button>
            </div>
          </details>;
        })}
      </section>) : !programForm && <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">{w("noPrograms")}</p>}

      <button type="button" onClick={() => setProgramForm(blankProgram())} className="min-h-[52px] w-full rounded-3xl border-[1.5px] border-dashed border-border text-sm font-bold transition hover:bg-surface-muted">{w("newProgram")}</button>
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{w("fromTemplate")}</p>
        <div className="flex flex-wrap gap-1.5">{templateButtons(c).map((template) => <button key={template.key} className="min-h-10 rounded-full border border-border px-3.5 text-[13px] font-semibold" type="button" onClick={() => setProgramForm(templateProgram(template, data.exercises))}>{template.label}</button>)}</div>
      </section>

      {activeProgram && programBalance.some((item) => item.sets > 0) && <section className="space-y-2.5" data-cali-program-balance>
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-[15px] font-semibold">{w("balance")}</h2><span className="text-xs text-foreground-muted">{w("balanceScope")}</span></div>
        <div className="space-y-2.5 rounded-3xl border border-border bg-surface p-3.5">
          {programBalance.map((item) => { const lowItem = programLow.includes(item); return <div key={item.category} className="grid grid-cols-[84px_minmax(0,1fr)_28px] items-center gap-2.5 text-[13px]">
            <span className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: categoryColor(item.category) }} />{c(`categories.${item.category}`)}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${Math.max(3, (item.sets / programMost) * 100)}%`, background: lowItem ? "var(--nutrition)" : categoryColor(item.category) }} /></span>
            <span className="text-end font-bold tabular-nums" style={lowItem ? { color: "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" } : undefined}>{item.sets}</span>
          </div>; })}
          <p className="text-xs" style={{ color: programLow.length ? "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" : "var(--foreground-muted)" }}>{programLow.length ? w("balanceLow", { list: programLow.map((item) => c(`categories.${item.category}`)).join(", ") }) : w("balanceOk")}</p>
        </div>
      </section>}
    </div>}

    {section === "progress" && <div className="space-y-6" data-cali-progress>
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-[15px] font-semibold">{w("skills")}</h2><button type="button" onClick={() => setSkillForm(blankSkill())} className="min-h-10 text-[13px] font-semibold" style={{ color: ink }}>{w("newSkill")}</button></div>
        {data.skills.length > 0 && <CaliSkills
          skills={data.skills}
          onEdit={(skill) => setSkillForm({ id: skill.id, name: skill.name, skillKey: skill.skill_key, currentStep: skill.current_step, targetStep: skill.target_step, progressionSteps: [...skill.progression_steps], measurementType: skill.measurement_type, startedOn: skill.started_on ?? "", notes: skill.notes })}
          onDelete={(skill) => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsSkill(skill.id))}
          onAdvance={(skill) => runMutation(() => saveCalisthenicsSkill({ id: skill.id, name: skill.name, skillKey: skill.skill_key, currentStep: skill.current_step + 1, targetStep: Math.max(skill.target_step, skill.current_step + 1), progressionSteps: [...skill.progression_steps], measurementType: skill.measurement_type, startedOn: skill.started_on || null, notes: skill.notes }))}
          logger={(skill) => <SkillLogger key={skill.id} skill={skill} label={c("logResult")} dateLabel={c("logDate")} resultLabel={skill.measurement_type === "hold" ? c("resultHold") : c("resultReps")} notesLabel={c("skillNotes")} submitLabel={c("logResult")} date={date} busy={busy} onSave={(payload) => runMutation(() => logCalisthenicsSkill(payload))} />}
        />}
        {skillForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsSkill({ ...skillForm, startedOn: skillForm.startedOn || null }), () => setSkillForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{skillForm.id ? c("saveSkill") : c("newSkill")}</h3><button type="button" className={secondaryButtonClass} onClick={() => setSkillForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-2"><Field label={c("skillName")}><input required maxLength={80} className={controlClass} value={skillForm.name} onChange={(event) => setSkillForm((form) => form ? ({ ...form, name: event.target.value }) : null)} /></Field><Field label={c("measurement")}><select className={controlClass} value={skillForm.measurementType} onChange={(event) => setSkillForm((form) => form ? ({ ...form, measurementType: event.target.value as "reps" | "hold" }) : null)}><option value="hold">{c("holdSeconds")}</option><option value="reps">{c("reps")}</option></select></Field></div><div><p className="mb-2 text-xs font-medium text-foreground-muted">{c("progressionSteps")}</p><div className="space-y-2">{skillForm.progressionSteps.map((step, index) => <div key={index} className="flex gap-2"><input required maxLength={80} className={controlClass} value={step} onChange={(event) => setSkillForm((form) => form ? ({ ...form, progressionSteps: form.progressionSteps.map((value, row) => row === index ? event.target.value : value) }) : null)} /><button type="button" className={secondaryButtonClass} onClick={() => setSkillForm((form) => form ? ({ ...form, progressionSteps: form.progressionSteps.filter((_, row) => row !== index), currentStep: Math.min(form.currentStep, form.progressionSteps.length - 2), targetStep: Math.min(form.targetStep, form.progressionSteps.length - 1) }) : null)}>{c("remove")}</button></div>)}</div><button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setSkillForm((form) => form ? ({ ...form, progressionSteps: [...form.progressionSteps, ""], targetStep: Math.min(form.progressionSteps.length + 1, 30) }) : null)}>＋ {c("addStep")}</button></div><div className="grid gap-3 sm:grid-cols-3"><Field label={c("currentStep")}><select className={controlClass} value={skillForm.currentStep} onChange={(event) => setSkillForm((form) => form ? ({ ...form, currentStep: Number(event.target.value) }) : null)}><option value={0}>—</option>{skillForm.progressionSteps.map((step, index) => <option key={index} value={index + 1}>{step}</option>)}</select></Field><Field label={c("targetStep")}><select className={controlClass} value={skillForm.targetStep} onChange={(event) => setSkillForm((form) => form ? ({ ...form, targetStep: Number(event.target.value) }) : null)}>{skillForm.progressionSteps.map((step, index) => <option key={index} value={index + 1}>{step}</option>)}</select></Field><Field label={c("startedOn")}><input type="date" className={controlClass} value={skillForm.startedOn} onChange={(event) => setSkillForm((form) => form ? ({ ...form, startedOn: event.target.value }) : null)} /></Field></div><Field label={c("skillNotes")}><textarea className={`${controlClass} min-h-20 py-3`} maxLength={2000} value={skillForm.notes} onChange={(event) => setSkillForm((form) => form ? ({ ...form, notes: event.target.value }) : null)} /></Field><button type="submit" className={buttonClass} disabled={busy}>{c("saveSkill")}</button></form></Card>}
        {!skillForm && <div className="flex flex-wrap gap-1.5">{Object.entries(SKILL_PRESETS).map(([key, preset]) => <button type="button" key={key} className="min-h-10 rounded-full border border-border px-3.5 text-[13px] font-semibold" onClick={() => setSkillForm({ ...blankSkill(), name: preset.name[language], skillKey: key, measurementType: preset.measure, progressionSteps: [...preset.steps[language]] })}>+ {preset.name[language]}</button>)}</div>}
      </section>

      <section className="space-y-2.5" data-cali-kpis>
        <div role="radiogroup" aria-label={w("period")} className="flex gap-1.5">
          {([["30", w("period4w")], ["90", w("period3m")], ["all", w("period1y")]] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={period === value} onClick={() => setPeriod(value)} className="min-h-10 rounded-full px-3.5 text-[13px] font-semibold" style={period === value ? { background: "var(--foreground)", color: "var(--background)" } : { border: "1px solid var(--border)", color: "var(--foreground-muted)" }}>{label}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {kpis.map((kpi) => <div key={kpi.label} className="rounded-[18px] border border-border bg-surface p-3.5"><p className="text-xs text-foreground-muted">{kpi.label}</p><p className="mt-1 text-[22px] font-extrabold tabular-nums">{kpi.value}</p>{kpi.change !== null && <p className={`mt-0.5 text-[11px] font-semibold ${kpi.change > 0 ? "text-success" : "text-foreground-muted"}`}>{kpi.change === 0 ? w("samePeriod") : `${kpi.change > 0 ? "▲" : "▼"} ${Math.abs(kpi.change)}${kpi.unit} ${w("vsBefore")}`}</p>}</div>)}
        </div>
      </section>

      <section className="space-y-2.5" data-cali-records>
        <h2 className="text-[15px] font-semibold">{w("recordsTitle")}</h2>
        {records.length ? <div className="space-y-2">{records.slice(0, 6).map((record) => { const exercise = exercisesById.get(record.key); const color = categoryColor(exercise?.category); return <div key={`${record.key}-${record.kind}`} className="flex items-center gap-3 rounded-[18px] border px-3.5 py-3" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 18%, var(--surface)), color-mix(in srgb, ${color} 6%, var(--surface)))`, borderColor: `color-mix(in srgb, ${color} 35%, var(--border))` }}>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{record.label}</span><span className="mt-0.5 flex items-center gap-1.5">{exercise && <span className="rounded-full px-1.5 py-px text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${color} 26%, transparent)`, color: `color-mix(in srgb, ${color} 70%, var(--foreground))` }}>{c(`categories.${exercise.category}`)}</span>}<span className="text-[11px] text-foreground-muted">{formatDate(record.date, language)}</span></span></span>
          <span className="text-end"><span className="block text-[17px] font-extrabold tabular-nums">{record.kind === "hold" ? `${record.value} s` : `${record.value} ${w("reps")}`}</span>{record.isNew && <span className="block text-[10px] font-bold" style={{ color: "var(--mood)" }}>{w("recordNew")}</span>}</span>
        </div>; })}</div> : <p className="rounded-3xl border border-dashed border-border p-5 text-center text-sm text-foreground-muted">{w("noRecords")}</p>}
      </section>

      <section className="space-y-2.5" data-cali-week-balance>
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-[15px] font-semibold">{w("balanceWeek")}</h2><span className="text-xs text-foreground-muted">{w("balanceWeekScope")} · <span className="text-foreground">▮</span> {w("lastWeek")}</span></div>
        <div className="space-y-3 rounded-3xl border border-border bg-surface p-3.5">
          {balanceRows.map((row) => { const diff = row.sets - row.last; const color = categoryColor(row.category); return <div key={row.category} className="grid grid-cols-[76px_minmax(0,1fr)_36px] items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />{c(`categories.${row.category}`)}</span>
            <span aria-hidden className="relative h-3 rounded-md bg-surface-muted"><span className="absolute inset-y-0.5 start-0.5 rounded" style={{ width: `calc(${(row.sets / weekAxis) * 100}% - 4px)`, background: color }} />{row.last > 0 && <span className="absolute -inset-y-[3px] w-0.5 rounded-sm bg-foreground" style={{ insetInlineStart: `calc(${(row.last / weekAxis) * 100}% - 1px)`, boxShadow: "0 0 0 2px var(--surface)" }} />}</span>
            <span className="text-end leading-tight"><span className="block text-[15px] font-extrabold tabular-nums">{row.sets}</span><span className="block text-[11px] font-semibold" style={{ color: diff > 0 ? "var(--success)" : diff < 0 ? "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" : "var(--foreground-muted)" }}>{diff === 0 ? "=" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`}</span></span>
          </div>; })}
        </div>
      </section>
    </div>}

    {section === "history" && <CaliHistory
      workouts={data.workouts.filter((workout) => workout.workout_date <= todayKey)}
      setsByWorkout={setsByWorkout}
      exercisesById={exercisesById}
      recordsByWorkout={recordsByWorkout}
      openId={initialSessionId ?? null}
      today={todayKey}
      busy={busy}
      onRedo={redo}
      onDelete={(workout) => { if (window.confirm(w("deleteConfirm"))) runMutation(() => deleteCalisthenicsWorkout(workout.id)); }}
    />}
  </div>;
}


function SkillLogger({ skill, label, dateLabel, resultLabel, notesLabel, submitLabel, date, busy, onSave }: {
  skill: CalisthenicsData["skills"][number]; label: string; dateLabel: string; resultLabel: string; notesLabel: string; submitLabel: string;
  date: string; busy: boolean; onSave: (payload: unknown) => void;
}) {
  const [logDate, setLogDate] = useState(date);
  const [stepIndex, setStepIndex] = useState(Math.max(0, skill.current_step - 1));
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const t = useT();
  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  return <form className="grid gap-3 rounded-2xl border border-border bg-surface p-3.5 sm:grid-cols-2" data-cali-logger onSubmit={(event) => {
    event.preventDefault();
    onSave({ skillId: skill.id, date: logDate, stepIndex, reps: skill.measurement_type === "reps" ? Number(value) : null, holdSeconds: skill.measurement_type === "hold" ? Number(value) : null, notes });
    setValue(""); setNotes("");
  }}>
    <p className="text-sm font-bold sm:col-span-2">{label}</p>
    <label className="flex flex-col items-center gap-1 rounded-2xl border-[1.5px] p-3 sm:col-span-2" style={{ borderColor: "var(--habit)", background: "color-mix(in srgb, var(--habit) 8%, var(--surface))" }}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">{resultLabel}</span>
      <input required type="number" inputMode="numeric" min={1} max={skill.measurement_type === "hold" ? 7200 : 500} value={value} onChange={(event) => setValue(event.target.value)} placeholder="0" data-big-number className="w-full bg-transparent text-center text-[44px] font-black tabular-nums outline-none" />
    </label>
    <Field label={c("currentStep")}><select className={controlClass} value={stepIndex} onChange={(event) => setStepIndex(Number(event.target.value))}>{skill.progression_steps.map((step, index) => <option key={index} value={index}>{step}</option>)}</select></Field>
    <Field label={dateLabel}><input type="date" className={controlClass} value={logDate} onChange={(event) => setLogDate(event.target.value)} /></Field>
    <Field label={notesLabel} className="sm:col-span-2"><input maxLength={1000} className={controlClass} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
    <button className="min-h-12 rounded-xl text-sm font-bold sm:col-span-2 disabled:opacity-50" style={{ background: "var(--habit)", color: "#1a1033" }} disabled={busy}>{submitLabel}</button>
  </form>;
}

function updateProgramExercise(form: ProgramForm, sessionIndex: number, exerciseIndex: number, patch: Partial<ProgramForm["sessions"][number]["exercises"][number]>): ProgramForm {
  return { ...form, sessions: form.sessions.map((session, index) => index !== sessionIndex ? session : ({ ...session, exercises: session.exercises.map((exercise, row) => row !== exerciseIndex ? exercise : ({ ...exercise, ...patch })) })) };
}

function moveProgramSession(form: ProgramForm, index: number, delta: -1 | 1): ProgramForm {
  const target = index + delta;
  if (target < 0 || target >= form.sessions.length) return form;
  const sessions = [...form.sessions];
  [sessions[index], sessions[target]] = [sessions[target], sessions[index]];
  return { ...form, sessions };
}

function moveProgramExercise(form: ProgramForm, sessionIndex: number, index: number, delta: -1 | 1): ProgramForm {
  const exercises = [...form.sessions[sessionIndex].exercises];
  const target = index + delta;
  if (target < 0 || target >= exercises.length) return form;
  [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
  return { ...form, sessions: form.sessions.map((session, row) => row === sessionIndex ? { ...session, exercises } : session) };
}

function addProgramExercise(form: ProgramForm, sessionIndex: number, exercise: CalisthenicsExercise): ProgramForm {
  const isHold = exercise.measurement_type === "hold";
  const item = { exerciseId: exercise.id, targetSets: 3, targetReps: isHold ? null : 8, targetHoldSeconds: isHold ? 20 : null, assistanceKg: null, addedWeightKg: null, notes: "" };
  return { ...form, sessions: form.sessions.map((session, index) => index !== sessionIndex ? session : ({ ...session, exercises: [...session.exercises, item] })) };
}

function programToForm(program: CalisthenicsData["programs"][number]): ProgramForm {
  return { id: program.id, name: program.name, notes: program.notes, sessions: program.sessions.map((session) => ({ id: session.id, name: session.name, exercises: session.exercises.map((exercise) => ({ id: exercise.id, exerciseId: exercise.exercise_id ?? "", targetSets: exercise.target_sets, targetReps: exercise.target_reps, targetHoldSeconds: exercise.target_hold_seconds, assistanceKg: exercise.assistance_kg, addedWeightKg: exercise.added_weight_kg, notes: exercise.notes })) })) };
}

function templateButtons(c: (key: string) => string) {
  return [
    { key: "full", label: c("templateFullBody") }, { key: "pushpull", label: c("templatePushPull") }, { key: "upper", label: c("templateUpper") },
    { key: "core", label: c("templateCore") }, { key: "skills", label: c("templateSkill") },
  ];
}

function templateProgram(template: { key: string; label: string }, exercises: CalisthenicsExercise[]): ProgramForm {
  const definitions: Record<string, string[]> = {
    full: ["wall-push-up", "australian-row", "bodyweight-squat", "plank"],
    pushpull: ["incline-push-up", "assisted-pull-up", "split-squat", "hollow-body-hold"],
    upper: ["push-up", "pull-up", "dips", "australian-row"],
    core: ["hollow-body-hold", "tuck-l-sit", "wall-handstand-hold"],
    skills: ["freestanding-handstand", "tuck-front-lever", "tuck-planche", "muscle-up-progression"],
  };
  const picked = (definitions[template.key] ?? []).map((key) => exercises.find((exercise) => exercise.exercise_key === key)).filter((exercise): exercise is CalisthenicsExercise => Boolean(exercise));
  return {
    name: template.label,
    notes: "",
    sessions: [{ name: template.label, exercises: picked.map((exercise) => ({ exerciseId: exercise.id, targetSets: 3, targetReps: exercise.measurement_type === "hold" ? null : 8, targetHoldSeconds: exercise.measurement_type === "hold" ? 20 : null, assistanceKg: null, addedWeightKg: null, notes: "" })) }],
  };
}

function startOfCurrentWeek() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function localDateOf(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}


function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}



function holdText(seconds: number) {
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ""}` : `${seconds} s`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}
