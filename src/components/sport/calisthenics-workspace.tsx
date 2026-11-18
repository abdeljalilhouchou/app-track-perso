"use client";

import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import { SportButton, SportEmptyState, SportLink } from "@/components/sport/ui/sport-primitives";
import { SportModuleShell, SportModuleTabs, SportStatusMessage } from "@/components/sport/ui/sport-module-shell";
import { SportHeatmap } from "@/components/sport/sport-overview";
import { CaliOverview } from "@/components/sport/calisthenics/cali-overview";
import { CaliExerciseCard, type DraftItem, type DraftSet } from "@/components/sport/calisthenics/cali-exercise-card";
import { CaliSkills } from "@/components/sport/calisthenics/cali-skills";
import { ModuleCard, ModuleChips, ModulePill } from "@/components/sport/ui/module-kit";
import { compareWeeks, exerciseRecords, weekBalance } from "@/lib/calisthenics/insights";
import { weekHeading } from "@/lib/sport-week";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, useT } from "@/components/language-provider";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { computeCalisthenicsStats } from "@/lib/calisthenics/stats";
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

type Section = "overview" | "session" | "program" | "exercises" | "progress";
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
const SECTIONS: Section[] = ["overview", "session", "program", "exercises", "progress"];
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
  const [section, setSection] = useState<Section>(initialSessionId ? "session" : "overview");
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [date, setDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [intensity, setIntensity] = useState(3);
  const [sessionNotes, setSessionNotes] = useState("");
  const [programSessionId, setProgramSessionId] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [exerciseForm, setExerciseForm] = useState<ExerciseForm | null>(null);
  const [programForm, setProgramForm] = useState<ProgramForm | null>(null);
  const [skillForm, setSkillForm] = useState<SkillForm | null>(null);
  const [historyExercise, setHistoryExercise] = useState("all");
  const [historyDate, setHistoryDate] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyProgram, setHistoryProgram] = useState("all");
  const [period, setPeriod] = useState<"30" | "90" | "all">("90");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);

  const c = (key: string) => t(`sport.calisthenicsUi.${key}`);
  const sectionId = useId();
  const exercisesById = useMemo(() => new Map(data.exercises.map((exercise) => [exercise.id, exercise])), [data.exercises]);
  const setsByWorkout = useMemo(() => {
    const grouped = new Map<string, CalisthenicsSet[]>();
    for (const set of data.sets) grouped.set(set.workout_id, [...(grouped.get(set.workout_id) ?? []), set]);
    return grouped;
  }, [data.sets]);
  const overviewStats = computeCalisthenicsStats(data.workouts, data.sets);
  const programSessions = data.programs.flatMap((program) => program.sessions.map((session) => ({ program, session })));
  const lastUsedProgramSessionId = data.workouts.find((workout) => workout.calisthenics_program_session_id)?.calisthenics_program_session_id;
  const lastUsed = programSessions.findIndex(({ session }) => session.id === lastUsedProgramSessionId);
  const suggestion = lastUsed >= 0
    ? (() => { const current = programSessions[lastUsed]; const next = current.program.sessions[(current.program.sessions.findIndex((session) => session.id === current.session.id) + 1) % current.program.sessions.length]; return { program: current.program, session: next }; })()
    : programSessions[0];
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v2.${key}`, vars);
  const heading = weekHeading(new Date(), language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR");
  const weeks = compareWeeks(data.workouts, data.sets);
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
          const draft = JSON.parse(saved) as Partial<{ date: string; durationMinutes: number; intensity: number; notes: string; programSessionId: string; items: DraftItem[] }>;
          if (Array.isArray(draft.items) && draft.items.length <= 50 && draft.items.every((item) => item && typeof item.exerciseId === "string" && Array.isArray(item.sets))) {
            setDate(typeof draft.date === "string" ? draft.date : localDate());
            setDurationMinutes(Number.isInteger(draft.durationMinutes) ? draft.durationMinutes! : 45);
            setIntensity(Number.isInteger(draft.intensity) ? draft.intensity! : 3);
            setSessionNotes(typeof draft.notes === "string" ? draft.notes : "");
            setProgramSessionId(typeof draft.programSessionId === "string" ? draft.programSessionId : "");
            setDraftItems(draft.items);
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
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ date, durationMinutes, intensity, notes: sessionNotes, programSessionId, items: draftItems }));
    } catch {
      // Storage may be disabled or full; the in-memory session remains usable.
    }
  }, [draftReady, date, durationMinutes, intensity, sessionNotes, programSessionId, draftItems]);

  useEffect(() => {
    if (!draftItems.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftItems.length]);

  useEffect(() => {
    if (timerEnd === null) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setTimerEnd(null);
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [timerEnd]);

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
    setDraftItems((current) => [...current, { key: crypto.randomUUID(), exerciseId, sets }]);
    setSection("session");
  };

  const startProgramSession = (session: CalisthenicsProgramSession & { exercises: CalisthenicsProgramExercise[] }) => {
    setProgramSessionId(session.id);
    setDraftItems(session.exercises.map((item) => ({
      key: crypto.randomUUID(), exerciseId: item.exercise_id ?? "",
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
    setSection("session");
  };

  const updateSet = (itemKey: string, setKey: string, field: keyof DraftSet, value: string | number | null) => {
    setDraftItems((items) => items.map((item) => item.key !== itemKey ? item : ({
      ...item, sets: item.sets.map((set) => set.key !== setKey ? set : ({ ...set, [field]: value })),
    })));
  };

  const submitSession = () => {
    const items = draftItems.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets.map((set) => ({
        reps: set.mode === "reps" ? set.reps : null,
        holdSeconds: set.mode === "hold" ? set.holdSeconds : null,
        assistanceKg: set.assistanceKg,
        addedWeightKg: set.addedWeightKg,
        variation: set.variation,
        notes: set.notes,
      })),
    }));
    runMutation(() => saveCalisthenicsWorkout({ date, durationMinutes, intensity, notes: sessionNotes, programSessionId: programSessionId || null, items }), () => {
      setDraftItems([]); setProgramSessionId(""); setSessionNotes(""); setDate(localDate()); setDurationMinutes(45); setIntensity(3); setDraftRestored(false);
    });
  };

  const filteredExercises = data.exercises.filter((exercise) => {
    const name = localeName(exercise, language).toLowerCase();
    return (!exerciseSearch || name.includes(exerciseSearch.toLowerCase()) || exercise.exercise_key.includes(exerciseSearch.toLowerCase())) &&
      (levelFilter === "all" || exercise.level === levelFilter);
  });

  const filteredWorkouts = data.workouts.filter((workout) => {
    const workoutSets = setsByWorkout.get(workout.id) ?? [];
    return (!historyDate || workout.workout_date === historyDate) &&
      (historyProgram === "all" || data.programs.some((program) => program.id === historyProgram && program.sessions.some((session) => session.id === workout.calisthenics_program_session_id))) &&
      (historyExercise === "all" || workoutSets.some((set) => set.exercise_id === historyExercise)) &&
      (!historySearch || `${workout.activity} ${workout.notes ?? ""}`.toLowerCase().includes(historySearch.toLowerCase()));
  });
  const periodStart = new Date();
  if (period !== "all") periodStart.setDate(periodStart.getDate() - Number(period) + 1);
  const periodWorkouts = data.workouts.filter((workout) => period === "all" || workout.workout_date >= localDateOf(periodStart));
  const periodWorkoutIds = new Set(periodWorkouts.map((workout) => workout.id));
  const periodSets = data.sets.filter((set) => periodWorkoutIds.has(set.workout_id));
  const periodStats = computeCalisthenicsStats(periodWorkouts, periodSets);
  const repsMap = new Map(periodStats.reps.map((record) => [record.key, { ...record, name: exercisesById.has(record.key) ? localeName(exercisesById.get(record.key)!, language) : record.name }]));
  const holdsMap = new Map(periodStats.holds.map((record) => [record.key, { ...record, name: exercisesById.has(record.key) ? localeName(exercisesById.get(record.key)!, language) : record.name }]));
  const totalReps = periodStats.reps.reduce((sum, record) => sum + record.total, 0);
  const totalHold = periodStats.holds.reduce((sum, record) => sum + record.total, 0);
  const activeSkillLogs = data.skills.flatMap((skill) => skill.logs);
  const bestSkillResults = new Map<string, number>();
  for (const log of activeSkillLogs) bestSkillResults.set(log.skill_id, Math.max(bestSkillResults.get(log.skill_id) ?? 0, log.hold_seconds ?? log.reps ?? 0));

  const navigation = <SportModuleTabs label={t("sport.calisthenicsUi.navigationLabel")} value={section} options={SECTIONS.map((item) => ({ value: item, label: t(`sport.calisthenicsUi.sections.${item}`) }))} onChange={setSection} />;

  const statusMessage = feedback ? <SportStatusMessage onDismiss={() => setFeedback("")} dismissLabel={t("sport.ui.dismissStatus")}>{feedback}</SportStatusMessage> : null;

  return <SportModuleShell
    title={t("sport.hub.calisthenics.title")}
    eyebrow={v("weekEyebrow", heading)}
    badge={overviewStats.weekStreak >= 2 ? <ModulePill>{v("streak", { count: overviewStats.weekStreak })}</ModulePill> : undefined}
    tabs={navigation}
    status={statusMessage}
  >

    {section === "overview" && (data.workouts.length === 0 && !suggestion
      ? <SportEmptyState icon="activity" title={c("noLastSession")} description={c("overviewEmpty")} action={<SportButton onClick={() => setSection("session")}>{c("startSession")}</SportButton>} />
      : <CaliOverview
        next={suggestion ? {
          program: suggestion.program.name,
          session: suggestion.session.name,
          exercises: suggestion.session.exercises.map((item) => {
            const exercise = exercisesById.get(item.exercise_id ?? "");
            const target = item.target_hold_seconds ? `${item.target_sets}×${item.target_hold_seconds} s` : `${item.target_sets}×${item.target_reps ?? "–"}`;
            return { id: item.id, label: `${exercise ? localeName(exercise, language) : "—"} ${target}` };
          }),
          start: () => startProgramSession(suggestion.session),
        } : null}
        week={weeks.current}
        previous={weeks.previous}
        skill={data.skills[0] ?? null}
        records={records}
        balance={balance}
        onStartFree={() => setSection("session")}
        onCreateProgram={() => setSection("program")}
        onSeeSkills={() => setSection("progress")}
      />)}

    {section === "session" && <div className="space-y-4">
      <ModuleCard highlight>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--sport-ink)" }}>{v("sessionInProgress")}</p>
        <h2 className="text-xl font-bold tracking-tight">{data.programs.flatMap((program) => program.sessions).find((session) => session.id === programSessionId)?.name ?? v("freeSessionTitle")}</h2>
        {draftItems.length > 0 && (() => {
          const done = draftItems.filter((item) => item.sets.length > 0 && item.sets.every((set) => set.done)).length;
          return <div className="flex items-center gap-2.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${(done / draftItems.length) * 100}%`, background: "var(--sport)" }} /></span>
            <span className="text-xs text-foreground-muted">{v("exercisesDone", { done, total: draftItems.length })}</span>
          </div>;
        })()}
        <p className="text-xs text-foreground-muted">{draftRestored ? c("draftRestored") : c("draftWarning")}</p>
      </ModuleCard>

      {draftItems.map((item) => {
        const exercise = exercisesById.get(item.exerciseId);
        if (!exercise) return null;
        return <CaliExerciseCard key={item.key} item={item} name={localeName(exercise, language)} exerciseId={exercise.id}
          tags={[c(`categories.${exercise.category}`), c(`levels.${exercise.level}`)]}
          measurement={exercise.measurement_type}
          lastText={lastByExercise.get(exercise.id) ?? null}
          bestReps={bestFor(exercise.id, "reps")}
          bestHold={bestFor(exercise.id, "hold")}
          onUpdate={(setKey, field, value) => updateSet(item.key, setKey, field, value)}
          onToggleDone={(setKey) => {
            const set = item.sets.find((candidate) => candidate.key === setKey);
            setDraftItems((items) => items.map((current) => current.key !== item.key ? current : ({ ...current, sets: current.sets.map((candidate) => candidate.key === setKey ? { ...candidate, done: !candidate.done } : candidate) })));
            // Completing a set starts the rest countdown, as in Musculation.
            if (set && !set.done) { setSecondsLeft(90); setTimerEnd(Date.now() + 90_000); }
          }}
          onAddSet={() => setDraftItems((items) => items.map((current) => current.key !== item.key ? current : ({ ...current, sets: [...current.sets, blankSet(exercise.measurement_type)] })))}
          onRemoveSet={(setKey) => setDraftItems((items) => items.map((current) => current.key !== item.key ? current : ({ ...current, sets: current.sets.filter((candidate) => candidate.key !== setKey) })))}
          onRemoveExercise={() => setDraftItems((items) => items.filter((current) => current.key !== item.key))}
        />;
      })}

      <button type="button" onClick={() => setSection("exercises")} className="flex min-h-14 w-full items-center justify-center rounded-2xl border-[1.5px] border-dashed border-border text-[15px] font-semibold text-foreground-muted">+ {v("addExerciseCta")}</button>

      <details className="module-card">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">{v("sessionDetails")}</summary>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={c("date")}><input type="date" className={controlClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Field label={c("duration")}><input type="number" inputMode="numeric" min={1} max={600} className={controlClass} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /></Field>
          <Field label={c("intensity")}><select className={controlClass} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></Field>
          <Field label={c("chooseProgramSession")}><select className={controlClass} value={programSessionId} onChange={(event) => setProgramSessionId(event.target.value)}><option value="">{c("freeSession")}</option>{data.programs.flatMap((program) => program.sessions.map((session) => <option key={session.id} value={session.id}>{program.name} · {session.name}</option>))}</select></Field>
        </div>
        <Field label={c("notes")}><textarea className={`${controlClass} min-h-20 py-3`} maxLength={2000} value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} /></Field>
      </details>

      {timerEnd !== null && secondsLeft > 0 && <div className="cali-rest" role="timer" aria-live="off">
        <div className="flex-1"><p className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">{v("restLabel")}</p><p className="text-2xl font-bold tabular-nums" style={{ color: "var(--sport-ink)" }}>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p></div>
        <button type="button" className="module-secondary" onClick={() => setTimerEnd((end) => (end ?? Date.now()) + 15_000)}>{v("plus15")}</button>
        <button type="button" className="module-secondary" style={{ background: "var(--sport)", color: "#062016", borderColor: "var(--sport)" }} onClick={() => { setTimerEnd(null); setSecondsLeft(0); }}>{v("skipRest")}</button>
      </div>}

      {draftItems.length > 0 && <div className="cali-footer">
        <button type="button" className="module-primary" disabled={busy} onClick={submitSession}>{busy ? c("saving") : v("finishSession")}</button>
        <button type="button" className="module-secondary" style={{ minHeight: 52 }} onClick={() => { if (window.confirm(v("discardConfirm"))) { setDraftItems([]); setProgramSessionId(""); setDraftRestored(false); setTimerEnd(null); setSecondsLeft(0); } }}>{v("discardSession")}</button>
      </div>}
    </div>}

    {section === "exercises" && <div className="space-y-4">
      <div className="flex gap-2">
        <label htmlFor="cali-search" className="sr-only">{v("searchPlaceholder")}</label>
        <input id="cali-search" className={`${controlClass} min-h-12 flex-1`} placeholder={v("searchPlaceholder")} value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} />
        <button type="button" aria-label={v("createExercise")} className="module-primary" style={{ width: 48, minHeight: 48, flexShrink: 0, fontSize: 22 }} onClick={() => setExerciseForm({ exerciseKey: `custom-${crypto.randomUUID().replaceAll("-", "")}`, category: "push", primaryMuscle: "chest", level: "beginner", measurementType: "reps", names: { fr: "", en: "", ar: "" }, descriptions: { fr: "", en: "", ar: "" }, instructions: { fr: "", en: "", ar: "" } })}>+</button>
      </div>
      <ModuleChips label={c("level")} value={levelFilter} options={[{ value: "all", label: v("allLevels") }, ...LEVELS.map((level) => ({ value: level, label: c(`levels.${level}`) }))]} onChange={setLevelFilter} />
      {exerciseForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsExercise({ ...exerciseForm, descriptions: exerciseForm.descriptions, instructions: exerciseForm.instructions }), () => setExerciseForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{exerciseForm.id ? c("editExercise") : c("newExercise")}</h3><button type="button" className={secondaryButtonClass} onClick={() => setExerciseForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-3">{(["fr", "en", "ar"] as const).map((lang) => <Field key={lang} label={c(`name${lang.toUpperCase()}`)}><input required maxLength={80} className={controlClass} value={exerciseForm.names[lang]} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, names: { ...form.names, [lang]: event.target.value } }) : null)} /></Field>)}</div><div className="grid gap-3 sm:grid-cols-3">{(["fr", "en", "ar"] as const).map((lang) => <Field key={lang} label={c(`description${lang.toUpperCase()}`)}><textarea maxLength={500} className={`${controlClass} min-h-20 py-3`} value={exerciseForm.descriptions[lang]} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, descriptions: { ...form.descriptions, [lang]: event.target.value } }) : null)} /></Field>)}</div><div className="grid gap-3 sm:grid-cols-3">{(["fr", "en", "ar"] as const).map((lang) => <Field key={lang} label={c(`instructions${lang.toUpperCase()}`)}><textarea maxLength={500} className={`${controlClass} min-h-20 py-3`} value={exerciseForm.instructions[lang]} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, instructions: { ...form.instructions, [lang]: event.target.value } }) : null)} /></Field>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label={c("category")}><select className={controlClass} value={exerciseForm.category} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, category: event.target.value as Category }) : null)}>{CATEGORIES.map((item) => <option key={item} value={item}>{c(`categories.${item}`)}</option>)}</select></Field><Field label={c("level")}><select className={controlClass} value={exerciseForm.level} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, level: event.target.value as Level }) : null)}>{LEVELS.map((item) => <option key={item} value={item}>{c(`levels.${item}`)}</option>)}</select></Field><Field label={c("measurement")}><select className={controlClass} value={exerciseForm.measurementType} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, measurementType: event.target.value as Measurement }) : null)}>{MEASUREMENTS.map((item) => <option key={item} value={item}>{c(`measurements.${item}`)}</option>)}</select></Field><Field label={c("primaryMuscle")}><input required maxLength={50} className={controlClass} value={exerciseForm.primaryMuscle} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, primaryMuscle: event.target.value }) : null)} /></Field></div><button type="submit" className={buttonClass} disabled={busy}>{c("saveExercise")}</button></form></Card>}
      {filteredExercises.length ? CATEGORIES.filter((category) => filteredExercises.some((exercise) => exercise.category === category)).map((category) => <section key={category} aria-labelledby={`${sectionId}-${category}`} className="space-y-2">
        <h3 id={`${sectionId}-${category}`} className="sport-group-heading">{c(`categories.${category}`)}<span>{filteredExercises.filter((exercise) => exercise.category === category).length}</span></h3>
        <div className="overflow-hidden rounded-[18px] border border-border bg-surface">
          {filteredExercises.filter((exercise) => exercise.category === category).map((exercise) => {
            const record = exercise.measurement_type === "hold" ? bestFor(exercise.id, "hold") : bestFor(exercise.id, "reps");
            return <div key={exercise.id} className="cali-lib-row" data-cali-exercise={exercise.exercise_key}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{localeName(exercise, language)}</p>
                <p className="truncate text-xs text-foreground-muted">{muscleLabel(exercise.primary_muscle, t)} · {c(`measurements.${exercise.measurement_type}`)}{record > 0 ? ` · ${v("recordShort", { value: exercise.measurement_type === "hold" ? `${record} s` : record })}` : ""}</p>
                {exercise.user_id && <div className="mt-1 flex gap-3 text-xs font-semibold"><button type="button" className="module-card-link" onClick={() => setExerciseForm({ id: exercise.id, exerciseKey: exercise.exercise_key, category: exercise.category, primaryMuscle: exercise.primary_muscle, level: exercise.level, measurementType: exercise.measurement_type, names: { fr: exercise.name_fr, en: exercise.name_en, ar: exercise.name_ar }, descriptions: { fr: exercise.description_fr, en: exercise.description_en, ar: exercise.description_ar }, instructions: { fr: exercise.instructions_fr, en: exercise.instructions_en, ar: exercise.instructions_ar } })}>{c("editExercise")}</button><button type="button" className="module-card-link" style={{ color: "var(--danger)" }} onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsExercise(exercise.id))}>{c("remove")}</button></div>}
              </div>
              <ModulePill tone={exercise.level === "advanced" ? "accent" : "neutral"}>{c(`levels.${exercise.level}`)}</ModulePill>
              <ExerciseGuideButton name={localeName(exercise, language)} discipline="calisthenics" exerciseId={exercise.id} />
              <button type="button" className="cali-lib-add" aria-label={v("addToSession", { name: localeName(exercise, language) })} onClick={() => addExerciseToDraft(exercise.id)}>+</button>
            </div>;
          })}
        </div>
      </section>) : <ModuleCard><p className="text-sm text-foreground-muted">{c("noExercises")}</p></ModuleCard>}
      <SportLink href="/sport/exercises?discipline=calisthenics" icon="exercise">{t("sport.library.title")}</SportLink>
    </div>}

    {section === "program" && <div className="space-y-4">
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{c("programTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{c("templates")}</p></div><button className={buttonClass} type="button" onClick={() => setProgramForm(blankProgram())}>{c("newProgram")}</button></div><div className="mt-3 flex flex-wrap gap-2">{templateButtons(c).map((template) => <button key={template.key} className={secondaryButtonClass} type="button" onClick={() => { const preset = templateProgram(template, data.exercises); setProgramForm(preset); }}>{template.label}</button>)}</div></Card>
      {programForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsProgram(programForm), () => setProgramForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{programForm.id ? c("editProgram") : c("newProgram")}</h3><button className={secondaryButtonClass} type="button" onClick={() => setProgramForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-2"><Field label={c("programName")}><input required maxLength={80} className={controlClass} value={programForm.name} onChange={(event) => setProgramForm((form) => form ? ({ ...form, name: event.target.value }) : null)} /></Field><Field label={c("programNotes")}><input maxLength={2000} className={controlClass} value={programForm.notes} onChange={(event) => setProgramForm((form) => form ? ({ ...form, notes: event.target.value }) : null)} /></Field></div>
        {programForm.sessions.map((session, sessionIndex) => <div key={session.id ?? `session-${sessionIndex}`} className="space-y-3 rounded-2xl border border-border bg-background p-3"><div className="flex items-end gap-2"><Field label={`${c("programSessionName")} ${sessionIndex + 1}`} className="flex-1"><input required maxLength={80} className={controlClass} value={session.name} onChange={(event) => setProgramForm((form) => form ? ({ ...form, sessions: form.sessions.map((item, index) => index === sessionIndex ? ({ ...item, name: event.target.value }) : item) }) : null)} /></Field><div className="flex gap-1"><button type="button" aria-label={c("moveUp")} className={secondaryButtonClass} disabled={sessionIndex === 0} onClick={() => setProgramForm((form) => form ? moveProgramSession(form, sessionIndex, -1) : null)}>↑</button><button type="button" aria-label={c("moveDown")} className={secondaryButtonClass} disabled={sessionIndex === programForm.sessions.length - 1} onClick={() => setProgramForm((form) => form ? moveProgramSession(form, sessionIndex, 1) : null)}>↓</button><button type="button" className={secondaryButtonClass} disabled={programForm.sessions.length === 1} onClick={() => setProgramForm((form) => form ? ({ ...form, sessions: form.sessions.filter((_, index) => index !== sessionIndex) }) : null)}>{c("remove")}</button></div></div>
          {session.exercises.map((item, exerciseIndex) => { const exercise = exercisesById.get(item.exerciseId); return <div key={item.id ?? `${item.exerciseId}-${exerciseIndex}`} className="grid gap-2 rounded-xl bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_auto] sm:items-end"><p className="truncate text-sm font-medium">{exercise ? localeName(exercise, language) : item.exerciseId}</p><Field label={c("targetSets")}><input type="number" min={1} max={20} className={controlClass} value={item.targetSets} onChange={(event) => setProgramForm((form) => form ? updateProgramExercise(form, sessionIndex, exerciseIndex, { targetSets: Number(event.target.value) }) : null)} /></Field>{exercise?.measurement_type !== "hold" && <Field label={c("targetReps")}><input type="number" min={1} max={500} className={controlClass} value={item.targetReps ?? ""} onChange={(event) => setProgramForm((form) => form ? updateProgramExercise(form, sessionIndex, exerciseIndex, { targetReps: event.target.value === "" ? null : Number(event.target.value), targetHoldSeconds: null }) : null)} /></Field>}{exercise?.measurement_type !== "reps" && <Field label={c("targetHold")}><input type="number" min={1} max={7200} className={controlClass} value={item.targetHoldSeconds ?? ""} onChange={(event) => setProgramForm((form) => form ? updateProgramExercise(form, sessionIndex, exerciseIndex, { targetHoldSeconds: event.target.value === "" ? null : Number(event.target.value), targetReps: null }) : null)} /></Field>}<div className="flex gap-1"><button type="button" aria-label={c("moveUp")} className={secondaryButtonClass} disabled={exerciseIndex === 0} onClick={() => setProgramForm((form) => form ? moveProgramExercise(form, sessionIndex, exerciseIndex, -1) : null)}>↑</button><button type="button" aria-label={c("moveDown")} className={secondaryButtonClass} disabled={exerciseIndex === session.exercises.length - 1} onClick={() => setProgramForm((form) => form ? moveProgramExercise(form, sessionIndex, exerciseIndex, 1) : null)}>↓</button><button type="button" className={secondaryButtonClass} onClick={() => setProgramForm((form) => form ? ({ ...form, sessions: form.sessions.map((current, index) => index !== sessionIndex ? current : ({ ...current, exercises: current.exercises.filter((_, row) => row !== exerciseIndex) })) }) : null)}>{c("remove")}</button></div></div>; })}
          <div className="flex gap-2"><select id={`program-exercise-${sessionIndex}`} className={controlClass}><option value="">{c("chooseExercise")}</option>{data.exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{localeName(exercise, language)}</option>)}</select><button type="button" className={secondaryButtonClass} disabled={session.exercises.length >= 50} onClick={() => { const select = document.getElementById(`program-exercise-${sessionIndex}`) as HTMLSelectElement | null; const exercise = select?.value ? exercisesById.get(select.value) : undefined; if (!exercise) return; setProgramForm((form) => form ? addProgramExercise(form, sessionIndex, exercise) : null); }}>{c("addProgramExercise")}</button></div>
        </div>)}
        <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButtonClass} disabled={programForm.sessions.length >= 20} onClick={() => setProgramForm((form) => form ? ({ ...form, sessions: [...form.sessions, { name: "", exercises: [] }] }) : null)}>＋ {c("addProgramSession")}</button><button type="submit" className={buttonClass} disabled={busy}>{c("saveProgram")}</button></div>
      </form></Card>}
      {data.programs.length ? <div className="grid gap-3 lg:grid-cols-2">{data.programs.map((program) => <Card key={program.id}><div className="flex items-start justify-between gap-2"><div><h3 className="text-base font-semibold">{program.name}</h3>{program.notes && <p className="mt-1 text-xs text-foreground-muted">{program.notes}</p>}</div><div className="flex gap-1"><button className={secondaryButtonClass} type="button" onClick={() => setProgramForm(programToForm(program))}>{c("editProgram")}</button><button className={secondaryButtonClass} type="button" onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsProgram(program.id))}>{c("remove")}</button></div></div><div className="mt-3 space-y-2">{program.sessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{session.name}</p><p className="text-xs text-foreground-muted">{session.exercises.length} {c("sections.exercises").toLowerCase()}</p></div><button type="button" className={buttonClass} onClick={() => startProgramSession(session)}>{c("startFromProgram")}</button></div>)}</div></Card>)}</div> : <Card><p className="text-sm text-foreground-muted">{c("noPrograms")}</p></Card>}
    </div>}

    {section === "progress" && <div className="space-y-4">
      <CaliSkills
        skills={data.skills}
        records={records}
        onEdit={(skill) => setSkillForm({ id: skill.id, name: skill.name, skillKey: skill.skill_key, currentStep: skill.current_step, targetStep: skill.target_step, progressionSteps: [...skill.progression_steps], measurementType: skill.measurement_type, startedOn: skill.started_on ?? "", notes: skill.notes })}
        onDelete={(skill) => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsSkill(skill.id))}
        logger={(skill) => <SkillLogger key={skill.id} skill={skill} label={c("logResult")} dateLabel={c("logDate")} resultLabel={skill.measurement_type === "hold" ? c("resultHold") : c("resultReps")} notesLabel={c("skillNotes")} submitLabel={c("logResult")} date={date} busy={busy} onSave={(payload) => runMutation(() => logCalisthenicsSkill(payload))} />}
      />
      {skillForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsSkill({ ...skillForm, startedOn: skillForm.startedOn || null }), () => setSkillForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{skillForm.id ? c("saveSkill") : c("newSkill")}</h3><button type="button" className={secondaryButtonClass} onClick={() => setSkillForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-2"><Field label={c("skillName")}><input required maxLength={80} className={controlClass} value={skillForm.name} onChange={(event) => setSkillForm((form) => form ? ({ ...form, name: event.target.value }) : null)} /></Field><Field label={c("measurement")}><select className={controlClass} value={skillForm.measurementType} onChange={(event) => setSkillForm((form) => form ? ({ ...form, measurementType: event.target.value as "reps" | "hold" }) : null)}><option value="hold">{c("holdSeconds")}</option><option value="reps">{c("reps")}</option></select></Field></div><div><p className="mb-2 text-xs font-medium text-foreground-muted">{c("progressionSteps")}</p><div className="space-y-2">{skillForm.progressionSteps.map((step, index) => <div key={index} className="flex gap-2"><input required maxLength={80} className={controlClass} value={step} onChange={(event) => setSkillForm((form) => form ? ({ ...form, progressionSteps: form.progressionSteps.map((value, row) => row === index ? event.target.value : value) }) : null)} /><button type="button" className={secondaryButtonClass} onClick={() => setSkillForm((form) => form ? ({ ...form, progressionSteps: form.progressionSteps.filter((_, row) => row !== index), currentStep: Math.min(form.currentStep, form.progressionSteps.length - 2), targetStep: Math.min(form.targetStep, form.progressionSteps.length - 1) }) : null)}>{c("remove")}</button></div>)}</div><button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setSkillForm((form) => form ? ({ ...form, progressionSteps: [...form.progressionSteps, ""], targetStep: Math.min(form.progressionSteps.length + 1, 30) }) : null)}>＋ {c("addStep")}</button></div><div className="grid gap-3 sm:grid-cols-3"><Field label={c("currentStep")}><select className={controlClass} value={skillForm.currentStep} onChange={(event) => setSkillForm((form) => form ? ({ ...form, currentStep: Number(event.target.value) }) : null)}><option value={0}>—</option>{skillForm.progressionSteps.map((step, index) => <option key={index} value={index + 1}>{step}</option>)}</select></Field><Field label={c("targetStep")}><select className={controlClass} value={skillForm.targetStep} onChange={(event) => setSkillForm((form) => form ? ({ ...form, targetStep: Number(event.target.value) }) : null)}>{skillForm.progressionSteps.map((step, index) => <option key={index} value={index + 1}>{step}</option>)}</select></Field><Field label={c("startedOn")}><input type="date" className={controlClass} value={skillForm.startedOn} onChange={(event) => setSkillForm((form) => form ? ({ ...form, startedOn: event.target.value }) : null)} /></Field></div><Field label={c("skillNotes")}><textarea className={`${controlClass} min-h-20 py-3`} maxLength={2000} value={skillForm.notes} onChange={(event) => setSkillForm((form) => form ? ({ ...form, notes: event.target.value }) : null)} /></Field><button type="submit" className={buttonClass} disabled={busy}>{c("saveSkill")}</button></form></Card>}
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{c("skillsTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{c("progressionDisclaimer")}</p></div><button type="button" className={buttonClass} onClick={() => setSkillForm(blankSkill())}>{c("newSkill")}</button></div><div className="mt-3 flex flex-wrap gap-2">{Object.entries(SKILL_PRESETS).map(([key, preset]) => <button type="button" key={key} className={secondaryButtonClass} onClick={() => setSkillForm({ ...blankSkill(), name: preset.name[language], skillKey: key, measurementType: preset.measure, progressionSteps: [...preset.steps[language]] })}>{preset.name[language]}</button>)}</div></Card>
      <SportHeatmap heat={overviewStats.heat} />
    </div>}

    {section === "progress" && <div className="space-y-4"><Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{c("progressTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{c("historyTitle")}</p></div><Field label={c("period")} className="w-40"><select className={controlClass} value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="30">{c("last30")}</option><option value="90">{c("last90")}</option><option value="all">{c("all")}</option></select></Field></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-muted p-4"><p className="text-xs text-foreground-muted">{c("totalReps")}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totalReps}</p></div><div className="rounded-xl bg-surface-muted p-4"><p className="text-xs text-foreground-muted">{c("totalHold")}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totalHold} {c("secondsLabel")}</p></div></div></Card><Card><h3 className="mb-2 text-sm font-semibold">{c("weekMinutes")}</h3><WeeklyBarChart data={weeklyChartData(data.workouts, language)} color="var(--sport)" unit={c("minutesLabel")} /></Card><div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="text-sm font-semibold">{c("reps")}</h3>{repsMap.size ? <ul className="mt-2 divide-y divide-border">{Array.from(repsMap.values()).sort((a, b) => b.total - a.total).map((record) => <li key={record.name} className="flex items-center justify-between gap-3 py-3"><span className="truncate text-sm">{record.name}</span><span className="shrink-0 text-xs tabular-nums text-foreground-muted">{record.total} · {c("bestSet")} {record.best}</span></li>)}</ul> : <p className="mt-3 text-sm text-foreground-muted">{c("noProgress")}</p>}</Card><Card><h3 className="text-sm font-semibold">{c("holdSeconds")}</h3>{holdsMap.size ? <ul className="mt-2 divide-y divide-border">{Array.from(holdsMap.values()).sort((a, b) => b.total - a.total).map((record) => <li key={record.name} className="flex items-center justify-between gap-3 py-3"><span className="truncate text-sm">{record.name}</span><span className="shrink-0 text-xs tabular-nums text-foreground-muted">{record.total} {c("secondsLabel")} · {c("bestSet")} {record.best} {c("secondsLabel")}</span></li>)}</ul> : <p className="mt-3 text-sm text-foreground-muted">{c("noProgress")}</p>}</Card></div><Card><h3 className="text-sm font-semibold">{c("activeSkills")}</h3>{data.skills.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{data.skills.map((skill) => <div key={skill.id} className="rounded-xl bg-surface-muted p-3"><div className="flex justify-between gap-2"><span className="truncate text-sm font-medium">{skill.name}</span><span className="text-xs tabular-nums text-foreground-muted">{skill.current_step}/{skill.target_step}</span></div><div className="mt-2 h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-sport" style={{ width: `${Math.min(100, (skill.current_step / skill.target_step) * 100)}%` }} /></div></div>)}</div> : <p className="mt-3 text-sm text-foreground-muted">{c("noSkills")}</p>}</Card></div>}

    {section === "session" && <div className="space-y-4"><Card><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{c("historyTitle")}</h2><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 xl:grid-cols-4"><Field label={c("date")}><input type="date" className={controlClass} value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} /></Field><Field label={c("search")}><input className={controlClass} value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} /></Field><Field label={c("filterExercise")}><select className={controlClass} value={historyExercise} onChange={(event) => setHistoryExercise(event.target.value)}><option value="all">{c("allExercises")}</option>{data.exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{localeName(exercise, language)}</option>)}</select></Field><Field label={c("programTitle")}><select className={controlClass} value={historyProgram} onChange={(event) => setHistoryProgram(event.target.value)}><option value="all">{c("allPrograms")}</option>{data.programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Field></div></div></Card>{filteredWorkouts.length ? filteredWorkouts.map((workout) => { const workoutSets = setsByWorkout.get(workout.id) ?? []; return <details key={workout.id} open={initialSessionId === workout.id} className="rounded-2xl border border-border bg-surface"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{workout.activity}</span><span className="mt-1 block text-xs text-foreground-muted">{formatDate(workout.workout_date, language)} · {workout.duration_minutes} {c("minutesLabel")} · {workout.intensity}/5</span></span><span className="shrink-0 text-xs text-sport">{workoutSets.length} {c("setsLabel")}</span></summary><div className="border-t border-border p-4"><ul className="space-y-2">{workoutSets.map((set) => { const exercise = set.exercise_id ? exercisesById.get(set.exercise_id) : undefined; return <li key={set.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-surface-muted p-3 text-xs"><span className="font-medium">{exercise ? localeName(exercise, language) : set.exercise_name} · {c("sets")} {set.set_number}</span><span className="text-foreground-muted">{set.reps !== null ? `${set.reps} ${c("reps")}` : `${set.hold_seconds} ${c("secondsLabel")}`}{set.assistance_kg ? ` · -${set.assistance_kg} kg` : ""}{set.added_weight_kg ? ` · +${set.added_weight_kg} kg` : ""}</span>{(set.variation || set.notes) && <span className="w-full text-foreground-muted">{[set.variation, set.notes].filter(Boolean).join(" · ")}</span>}</li>; })}</ul>{workout.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground-muted">{workout.notes}</p>}<button type="button" className="mt-3 min-h-10 rounded-lg px-3 text-xs font-medium text-danger hover:bg-danger/10" onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsWorkout(workout.id))}>{c("remove")}</button></div></details>; }) : <Card><p className="text-sm text-foreground-muted">{c("noHistory")}</p></Card>}</div>}
  </SportModuleShell>;
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
  return <form className="mt-4 grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2" onSubmit={(event) => {
    event.preventDefault();
    onSave({ skillId: skill.id, date: logDate, stepIndex, reps: skill.measurement_type === "reps" ? Number(value) : null, holdSeconds: skill.measurement_type === "hold" ? Number(value) : null, notes });
    setValue(""); setNotes("");
  }}><p className="text-xs font-semibold sm:col-span-2">{label}</p><Field label={dateLabel}><input type="date" className={controlClass} value={logDate} onChange={(event) => setLogDate(event.target.value)} /></Field><Field label={c("currentStep")}><select className={controlClass} value={stepIndex} onChange={(event) => setStepIndex(Number(event.target.value))}>{skill.progression_steps.map((step, index) => <option key={index} value={index}>{step}</option>)}</select></Field><Field label={resultLabel}><input required type="number" inputMode="numeric" min={1} max={skill.measurement_type === "hold" ? 7200 : 500} className={controlClass} value={value} onChange={(event) => setValue(event.target.value)} /></Field><Field label={notesLabel}><input maxLength={1000} className={controlClass} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field><button className={`${buttonClass} sm:col-span-2`} disabled={busy}>{submitLabel}</button></form>;
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

function weeklyChartData(workouts: CalisthenicsData["workouts"], language: string) {
  const currentWeek = startOfCurrentWeek();
  return Array.from({ length: 8 }, (_, index) => {
    const weekStart = new Date(currentWeek);
    weekStart.setDate(weekStart.getDate() - (7 - index) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const key = localDateOf(weekStart);
    return {
      label: formatDate(key, language),
      value: workouts.filter((workout) => workout.workout_date >= key && workout.workout_date < localDateOf(weekEnd) && workout.workout_date <= localDate()).reduce((sum, workout) => sum + workout.duration_minutes, 0),
    };
  });
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function muscleLabel(muscle: string, t: (path: string) => string) {
  const path = `sport.calisthenicsUi.muscles.${muscle}`;
  const translated = t(path);
  return translated === path ? muscle : translated;
}

