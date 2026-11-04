"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

type Section = "overview" | "session" | "program" | "exercises" | "skills" | "progress" | "history";
type DraftSet = { key: string; reps: number | null; holdSeconds: number | null; mode: "reps" | "hold"; assistanceKg: number | null; addedWeightKg: number | null; variation: string; notes: string };
type DraftItem = { key: string; exerciseId: string; sets: DraftSet[] };
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
const SECTIONS: Section[] = ["overview", "session", "program", "exercises", "skills", "progress", "history"];
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
  const [section, setSection] = useState<Section>(initialSessionId ? "history" : "overview");
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
  const [categoryFilter, setCategoryFilter] = useState("all");
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
  const exercisesById = useMemo(() => new Map(data.exercises.map((exercise) => [exercise.id, exercise])), [data.exercises]);
  const setsByWorkout = useMemo(() => {
    const grouped = new Map<string, CalisthenicsSet[]>();
    for (const set of data.sets) grouped.set(set.workout_id, [...(grouped.get(set.workout_id) ?? []), set]);
    return grouped;
  }, [data.sets]);
  const overviewStats = computeCalisthenicsStats(data.workouts, data.sets);
  const recentWorkout = data.workouts[0];
  const programSessions = data.programs.flatMap((program) => program.sessions.map((session) => ({ program, session })));
  const lastUsedProgramSessionId = data.workouts.find((workout) => workout.calisthenics_program_session_id)?.calisthenics_program_session_id;
  const lastUsed = programSessions.findIndex(({ session }) => session.id === lastUsedProgramSessionId);
  const suggestion = lastUsed >= 0
    ? (() => { const current = programSessions[lastUsed]; const next = current.program.sessions[(current.program.sessions.findIndex((session) => session.id === current.session.id) + 1) % current.program.sessions.length]; return { program: current.program, session: next }; })()
    : programSessions[0];

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
      (categoryFilter === "all" || exercise.category === categoryFilter) && (levelFilter === "all" || exercise.level === levelFilter);
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
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 6);
  const recentWorkouts = data.workouts.filter((workout) => workout.workout_date >= localDateOf(recentCutoff) && workout.workout_date <= localDate());
  const recentWorkoutIds = new Set(recentWorkouts.map((workout) => workout.id));
  const recentSets = data.sets.filter((set) => recentWorkoutIds.has(set.workout_id));
  const recentStats = computeCalisthenicsStats(recentWorkouts, recentSets);
  const recentReps = recentStats.reps.reduce((sum, record) => sum + record.total, 0);
  const recentHold = recentStats.holds.reduce((sum, record) => sum + record.total, 0);
  const activeSkillLogs = data.skills.flatMap((skill) => skill.logs);
  const bestSkillResults = new Map<string, number>();
  for (const log of activeSkillLogs) bestSkillResults.set(log.skill_id, Math.max(bestSkillResults.get(log.skill_id) ?? 0, log.hold_seconds ?? log.reps ?? 0));

  const navigation = <>
    <label className="block sm:hidden">
      <span className="sr-only">{t("sport.calisthenicsUi.navigationLabel")}</span>
      <select className={controlClass} value={section} onChange={(event) => setSection(event.target.value as Section)}>
        {SECTIONS.map((item) => <option key={item} value={item}>{t(`sport.calisthenicsUi.sections.${item}`)}</option>)}
      </select>
    </label>
    <nav aria-label={t("sport.calisthenicsUi.navigationLabel")} className="hidden flex-wrap gap-2 sm:flex">
      {SECTIONS.map((item) => <button key={item} type="button" onClick={() => setSection(item)} aria-current={section === item ? "page" : undefined}
        className={`min-h-10 rounded-xl border px-3 text-xs font-medium transition ${section === item ? "border-sport/50 bg-sport-soft text-sport" : "border-border bg-surface text-foreground-muted hover:bg-surface-muted"}`}>
        {t(`sport.calisthenicsUi.sections.${item}`)}
      </button>)}
    </nav>
  </>;

  const statusMessage = feedback ? <p role="status" className="rounded-xl border border-sport/30 bg-sport-soft/50 px-4 py-3 text-sm text-foreground">{feedback}</p> : null;

  return <div className="space-y-5 animate-fade-in">
    <header className="rounded-3xl border border-sport/30 bg-surface p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sport-soft text-sport"><span className="text-xl">✦</span></span>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sport">{t("sport.hub.calisthenics.title")}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t("sport.calisthenicsUi.overviewTitle")}</h1><p className="mt-1 text-sm text-foreground-muted">{t("sport.hub.calisthenics.description")}</p></div>
      </div>
    </header>
    {navigation}
    {statusMessage}

    {section === "overview" && <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{c("weekSessions")}</p><p className="mt-2 text-3xl font-semibold text-sport">{overviewStats.sessionsThisWeek}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{c("weekMinutes")}</p><p className="mt-2 text-3xl font-semibold text-sport">{overviewStats.minutesThisWeek}</p><p className="text-xs text-foreground-muted">{c("minutesLabel")}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{c("lastSession")}</p>{recentWorkout ? <><p className="mt-2 truncate text-base font-semibold">{recentWorkout.activity}</p><p className="mt-1 text-xs text-foreground-muted">{formatDate(recentWorkout.workout_date, language)} · {recentWorkout.duration_minutes} {c("minutesLabel")}</p></> : <p className="mt-2 text-sm text-foreground-muted">{c("noLastSession")}</p>}</Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{c("totalSessions")}</p><p className="mt-2 text-3xl font-semibold text-sport">{data.workouts.length}</p></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <h2 className="text-sm font-semibold">{c("startSession")}</h2><p className="mt-1 flex-1 text-sm text-foreground-muted">{data.workouts.length === 0 && data.skills.length === 0 ? c("overviewEmpty") : c("continueTraining")}</p>
          <button className={`${buttonClass} mt-4 w-full sm:w-auto`} type="button" onClick={() => setSection("session")}>{c("startSession")}</button>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">{c("suggestion")}</h2>
          {suggestion ? <div className="mt-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{suggestion.program.name} · {suggestion.session.name}</p><p className="mt-1 text-xs text-foreground-muted">{suggestion.session.exercises.length} {c("exercises").toLowerCase()}</p></div><button type="button" className={secondaryButtonClass} onClick={() => startProgramSession(suggestion.session)}>{c("startFromProgram")}</button></div> : <p className="mt-2 text-sm text-foreground-muted">{c("noSuggestion")}</p>}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{c("activeSkills")}</h2><button className={secondaryButtonClass} type="button" onClick={() => setSection("skills")}>{c("skillsTitle")}</button></div>
          {data.skills.length ? <ul className="mt-3 divide-y divide-border">{data.skills.slice(0, 4).map((skill) => <li key={skill.id} className="flex items-center justify-between gap-3 py-3"><span className="truncate text-sm font-medium">{skill.name}</span><span className="text-xs text-foreground-muted">{skill.current_step}/{skill.target_step}</span></li>)}</ul> : <p className="mt-3 text-sm text-foreground-muted">{c("noSkills")}</p>}</Card>
        <Card><h2 className="text-sm font-semibold">{c("recentProgress")}</h2><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-muted p-3"><p className="text-xs text-foreground-muted">{c("totalReps")}</p><p className="mt-1 text-xl font-semibold">{recentReps}</p></div><div className="rounded-xl bg-surface-muted p-3"><p className="text-xs text-foreground-muted">{c("totalHold")}</p><p className="mt-1 text-xl font-semibold">{recentHold} {c("secondsLabel")}</p></div></div></Card>
      </div>
    </div>}

    {section === "session" && <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{c("sessionTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{draftRestored ? c("draftRestored") : c("draftWarning")}</p></div><button type="button" className={secondaryButtonClass} onClick={() => setSection("exercises")}>{c("addExercise")}</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={c("date")}><input type="date" className={controlClass} value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          <Field label={c("duration")}><input type="number" inputMode="numeric" min={1} max={600} className={controlClass} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /></Field>
          <Field label={c("intensity")}><select className={controlClass} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></Field>
          <Field label={c("chooseProgramSession")}><select className={controlClass} value={programSessionId} onChange={(event) => setProgramSessionId(event.target.value)}><option value="">{c("freeSession")}</option>{data.programs.flatMap((program) => program.sessions.map((session) => <option key={session.id} value={session.id}>{program.name} · {session.name}</option>))}</select></Field>
        </div>
        <div className="space-y-3">
          {draftItems.map((item) => {
            const exercise = exercisesById.get(item.exerciseId);
            if (!exercise) return null;
            return <section key={item.key} className="rounded-2xl border border-border bg-background p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{localeName(exercise, language)}</h3><p className="mt-0.5 text-xs text-foreground-muted">{c(`categories.${exercise.category}`)} · {c(`levels.${exercise.level}`)}</p></div><button type="button" className="min-h-10 rounded-lg px-3 text-xs font-medium text-danger hover:bg-danger/10" onClick={() => setDraftItems((items) => items.filter((current) => current.key !== item.key))}>{c("remove")}</button></div>
              <div className="space-y-2">
                {item.sets.map((set, index) => <div key={set.key} className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-2 sm:grid-cols-6 sm:items-end">
                  <div className="col-span-2 flex items-center justify-between sm:col-span-1"><span className="text-xs font-semibold text-foreground-muted">{c("sets")} {index + 1}</span><button type="button" aria-label={c("remove")} className="min-h-9 min-w-9 rounded-lg text-foreground-muted hover:bg-surface-muted" onClick={() => setDraftItems((items) => items.map((current) => current.key !== item.key ? current : ({ ...current, sets: current.sets.filter((candidate) => candidate.key !== set.key) })))}>−</button></div>
                  {exercise.measurement_type === "mixed" && <Field label={c("measurement")} className="col-span-2 sm:col-span-1"><select className={controlClass} value={set.mode} onChange={(event) => updateSet(item.key, set.key, "mode", event.target.value)}><option value="reps">{c("reps")}</option><option value="hold">{c("holdSeconds")}</option></select></Field>}
                  {(set.mode === "reps" || exercise.measurement_type === "reps") && <Field label={c("reps")}><input type="number" inputMode="numeric" min={1} max={500} className={controlClass} value={set.reps ?? ""} onChange={(event) => updateSet(item.key, set.key, "reps", event.target.value === "" ? null : Number(event.target.value))} /></Field>}
                  {(set.mode === "hold" || exercise.measurement_type === "hold") && <Field label={c("holdSeconds")}><input type="number" inputMode="numeric" min={1} max={7200} className={controlClass} value={set.holdSeconds ?? ""} onChange={(event) => updateSet(item.key, set.key, "holdSeconds", event.target.value === "" ? null : Number(event.target.value))} /></Field>}
                  <Field label={c("assistance")}><input type="number" inputMode="decimal" min={0} max={1000} step="0.5" className={controlClass} value={set.assistanceKg ?? ""} onChange={(event) => updateSet(item.key, set.key, "assistanceKg", event.target.value === "" ? null : Number(event.target.value))} /></Field>
                  <Field label={c("addedWeight")}><input type="number" inputMode="decimal" min={0} max={1000} step="0.5" className={controlClass} value={set.addedWeightKg ?? ""} onChange={(event) => updateSet(item.key, set.key, "addedWeightKg", event.target.value === "" ? null : Number(event.target.value))} /></Field>
                  <Field label={c("variation")} className="col-span-2"><input className={controlClass} maxLength={100} value={set.variation} onChange={(event) => updateSet(item.key, set.key, "variation", event.target.value)} /></Field>
                  <Field label={c("setNotes")} className="col-span-2 sm:col-span-3"><input className={controlClass} maxLength={500} value={set.notes} onChange={(event) => updateSet(item.key, set.key, "notes", event.target.value)} /></Field>
                </div>)}
              </div>
              <button type="button" className={`${secondaryButtonClass} mt-3 w-full sm:w-auto`} onClick={() => setDraftItems((items) => items.map((current) => current.key !== item.key ? current : ({ ...current, sets: [...current.sets, blankSet(exercise.measurement_type)] })))} disabled={item.sets.length >= 100}>＋ {c("addSet")}</button>
            </section>;
          })}
        </div>
        {draftItems.length === 0 && <button type="button" onClick={() => setSection("exercises")} className="flex min-h-24 w-full items-center justify-center rounded-2xl border border-dashed border-sport/40 bg-sport-soft/30 p-4 text-sm font-medium text-sport">＋ {c("addExercise")}</button>}
        <Field label={c("notes")}><textarea className={`${controlClass} min-h-24 py-3`} maxLength={2000} value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} /></Field>
        <button type="button" className={`${buttonClass} w-full sm:w-auto`} disabled={busy || !draftItems.length} onClick={submitSession}>{busy ? c("saving") : c("saveSession")}</button>
      </Card>
      <Card className="xl:sticky xl:top-4"><h2 className="text-sm font-semibold">{c("restTimer")}</h2><p aria-live="polite" className="my-4 text-center text-4xl font-semibold tabular-nums text-sport">{String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</p><div className="grid grid-cols-2 gap-2"><button type="button" className={buttonClass} onClick={() => { setSecondsLeft(90); setTimerEnd(Date.now() + 90_000); }}>{c("startTimer")}</button><button type="button" className={secondaryButtonClass} onClick={() => setTimerEnd(null)}>{c("pauseTimer")}</button><button type="button" className={`${secondaryButtonClass} col-span-2`} onClick={() => { setTimerEnd(null); setSecondsLeft(0); }}>{c("resetTimer")}</button></div></Card>
    </div>}

    {section === "exercises" && <div className="space-y-4">
      <Card className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{c("libraryTitle")}</h2><button type="button" className={buttonClass} onClick={() => setExerciseForm({ exerciseKey: `custom-${crypto.randomUUID().replaceAll("-", "")}`, category: "push", primaryMuscle: "chest", level: "beginner", measurementType: "reps", names: { fr: "", en: "", ar: "" }, descriptions: { fr: "", en: "", ar: "" }, instructions: { fr: "", en: "", ar: "" } })}>{c("newExercise")}</button></div>
        <div className="grid gap-3 sm:grid-cols-3"><Field label={c("search")}><input className={controlClass} value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} /></Field><Field label={c("category")}><select className={controlClass} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">{c("all")}</option>{CATEGORIES.map((item) => <option key={item} value={item}>{c(`categories.${item}`)}</option>)}</select></Field><Field label={c("level")}><select className={controlClass} value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">{c("all")}</option>{LEVELS.map((item) => <option key={item} value={item}>{c(`levels.${item}`)}</option>)}</select></Field></div>
      </Card>
      {exerciseForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsExercise({ ...exerciseForm, descriptions: exerciseForm.descriptions, instructions: exerciseForm.instructions }), () => setExerciseForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{exerciseForm.id ? c("editExercise") : c("newExercise")}</h3><button type="button" className={secondaryButtonClass} onClick={() => setExerciseForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-3">{(["fr", "en", "ar"] as const).map((lang) => <Field key={lang} label={c(`name${lang.toUpperCase()}`)}><input required maxLength={80} className={controlClass} value={exerciseForm.names[lang]} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, names: { ...form.names, [lang]: event.target.value } }) : null)} /></Field>)}</div><div className="grid gap-3 sm:grid-cols-3">{(["fr", "en", "ar"] as const).map((lang) => <Field key={lang} label={c(`description${lang.toUpperCase()}`)}><textarea maxLength={500} className={`${controlClass} min-h-20 py-3`} value={exerciseForm.descriptions[lang]} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, descriptions: { ...form.descriptions, [lang]: event.target.value } }) : null)} /></Field>)}</div><div className="grid gap-3 sm:grid-cols-3">{(["fr", "en", "ar"] as const).map((lang) => <Field key={lang} label={c(`instructions${lang.toUpperCase()}`)}><textarea maxLength={500} className={`${controlClass} min-h-20 py-3`} value={exerciseForm.instructions[lang]} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, instructions: { ...form.instructions, [lang]: event.target.value } }) : null)} /></Field>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label={c("category")}><select className={controlClass} value={exerciseForm.category} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, category: event.target.value as Category }) : null)}>{CATEGORIES.map((item) => <option key={item} value={item}>{c(`categories.${item}`)}</option>)}</select></Field><Field label={c("level")}><select className={controlClass} value={exerciseForm.level} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, level: event.target.value as Level }) : null)}>{LEVELS.map((item) => <option key={item} value={item}>{c(`levels.${item}`)}</option>)}</select></Field><Field label={c("measurement")}><select className={controlClass} value={exerciseForm.measurementType} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, measurementType: event.target.value as Measurement }) : null)}>{MEASUREMENTS.map((item) => <option key={item} value={item}>{c(`measurements.${item}`)}</option>)}</select></Field><Field label={c("primaryMuscle")}><input required maxLength={50} className={controlClass} value={exerciseForm.primaryMuscle} onChange={(event) => setExerciseForm((form) => form ? ({ ...form, primaryMuscle: event.target.value }) : null)} /></Field></div><button type="submit" className={buttonClass} disabled={busy}>{c("saveExercise")}</button></form></Card>}
      {filteredExercises.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredExercises.map((exercise) => <Card key={exercise.id} className="flex flex-col"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{localeName(exercise, language)}</h3><p className="mt-1 text-xs text-foreground-muted">{c(`categories.${exercise.category}`)} · {c(`levels.${exercise.level}`)} · {c(`measurements.${exercise.measurement_type}`)} · {muscleLabel(exercise.primary_muscle, t)}</p></div><span className="shrink-0 rounded-full bg-surface-muted px-2 py-1 text-[10px] text-foreground-muted">{exercise.user_id ? c("newExercise") : "Track Perso"}</span></div><p className="mt-3 text-xs leading-relaxed text-foreground-muted">{localizedExerciseText(exercise, language, "description") || fallbackDescription(exercise.category, language)}</p><p className="mt-2 flex-1 text-xs leading-relaxed text-foreground-muted">{localizedExerciseText(exercise, language, "instructions") || fallbackTechnique(exercise.category, language)}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => addExerciseToDraft(exercise.id)}>{c("addExercise")}</button>{exercise.user_id && <><button type="button" className={secondaryButtonClass} onClick={() => setExerciseForm({ id: exercise.id, exerciseKey: exercise.exercise_key, category: exercise.category, primaryMuscle: exercise.primary_muscle, level: exercise.level, measurementType: exercise.measurement_type, names: { fr: exercise.name_fr, en: exercise.name_en, ar: exercise.name_ar }, descriptions: { fr: exercise.description_fr, en: exercise.description_en, ar: exercise.description_ar }, instructions: { fr: exercise.instructions_fr, en: exercise.instructions_en, ar: exercise.instructions_ar } })}>{c("editExercise")}</button><button type="button" className={secondaryButtonClass} onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsExercise(exercise.id))}>{c("remove")}</button></>}</div></Card>)}</div> : <Card><p className="text-sm text-foreground-muted">{c("noExercises")}</p></Card>}
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
      {data.programs.length ? <div className="grid gap-3 lg:grid-cols-2">{data.programs.map((program) => <Card key={program.id}><div className="flex items-start justify-between gap-2"><div><h3 className="text-base font-semibold">{program.name}</h3>{program.notes && <p className="mt-1 text-xs text-foreground-muted">{program.notes}</p>}</div><div className="flex gap-1"><button className={secondaryButtonClass} type="button" onClick={() => setProgramForm(programToForm(program))}>{c("editProgram")}</button><button className={secondaryButtonClass} type="button" onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsProgram(program.id))}>{c("remove")}</button></div></div><div className="mt-3 space-y-2">{program.sessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{session.name}</p><p className="text-xs text-foreground-muted">{session.exercises.length} {c("exercises").toLowerCase()}</p></div><button type="button" className={buttonClass} onClick={() => startProgramSession(session)}>{c("startFromProgram")}</button></div>)}</div></Card>)}</div> : <Card><p className="text-sm text-foreground-muted">{c("noPrograms")}</p></Card>}
    </div>}

    {section === "skills" && <div className="space-y-4">
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{c("skillsTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{c("progressionDisclaimer")}</p></div><button type="button" className={buttonClass} onClick={() => setSkillForm(blankSkill())}>{c("newSkill")}</button></div><div className="mt-3 flex flex-wrap gap-2">{Object.entries(SKILL_PRESETS).map(([key, preset]) => <button type="button" key={key} className={secondaryButtonClass} onClick={() => setSkillForm({ ...blankSkill(), name: preset.name[language], skillKey: key, measurementType: preset.measure, progressionSteps: [...preset.steps[language]] })}>{preset.name[language]}</button>)}</div></Card>
      {skillForm && <Card><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); runMutation(() => saveCalisthenicsSkill({ ...skillForm, startedOn: skillForm.startedOn || null }), () => setSkillForm(null)); }}><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">{skillForm.id ? c("saveSkill") : c("newSkill")}</h3><button type="button" className={secondaryButtonClass} onClick={() => setSkillForm(null)}>{c("remove")}</button></div><div className="grid gap-3 sm:grid-cols-2"><Field label={c("skillName")}><input required maxLength={80} className={controlClass} value={skillForm.name} onChange={(event) => setSkillForm((form) => form ? ({ ...form, name: event.target.value }) : null)} /></Field><Field label={c("measurement")}><select className={controlClass} value={skillForm.measurementType} onChange={(event) => setSkillForm((form) => form ? ({ ...form, measurementType: event.target.value as "reps" | "hold" }) : null)}><option value="hold">{c("holdSeconds")}</option><option value="reps">{c("reps")}</option></select></Field></div><div><p className="mb-2 text-xs font-medium text-foreground-muted">{c("progressionSteps")}</p><div className="space-y-2">{skillForm.progressionSteps.map((step, index) => <div key={index} className="flex gap-2"><input required maxLength={80} className={controlClass} value={step} onChange={(event) => setSkillForm((form) => form ? ({ ...form, progressionSteps: form.progressionSteps.map((value, row) => row === index ? event.target.value : value) }) : null)} /><button type="button" className={secondaryButtonClass} onClick={() => setSkillForm((form) => form ? ({ ...form, progressionSteps: form.progressionSteps.filter((_, row) => row !== index), currentStep: Math.min(form.currentStep, form.progressionSteps.length - 2), targetStep: Math.min(form.targetStep, form.progressionSteps.length - 1) }) : null)}>{c("remove")}</button></div>)}</div><button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setSkillForm((form) => form ? ({ ...form, progressionSteps: [...form.progressionSteps, ""], targetStep: Math.min(form.progressionSteps.length + 1, 30) }) : null)}>＋ {c("addStep")}</button></div><div className="grid gap-3 sm:grid-cols-3"><Field label={c("currentStep")}><select className={controlClass} value={skillForm.currentStep} onChange={(event) => setSkillForm((form) => form ? ({ ...form, currentStep: Number(event.target.value) }) : null)}><option value={0}>—</option>{skillForm.progressionSteps.map((step, index) => <option key={index} value={index + 1}>{step}</option>)}</select></Field><Field label={c("targetStep")}><select className={controlClass} value={skillForm.targetStep} onChange={(event) => setSkillForm((form) => form ? ({ ...form, targetStep: Number(event.target.value) }) : null)}>{skillForm.progressionSteps.map((step, index) => <option key={index} value={index + 1}>{step}</option>)}</select></Field><Field label={c("startedOn")}><input type="date" className={controlClass} value={skillForm.startedOn} onChange={(event) => setSkillForm((form) => form ? ({ ...form, startedOn: event.target.value }) : null)} /></Field></div><Field label={c("skillNotes")}><textarea className={`${controlClass} min-h-20 py-3`} maxLength={2000} value={skillForm.notes} onChange={(event) => setSkillForm((form) => form ? ({ ...form, notes: event.target.value }) : null)} /></Field><button type="submit" className={buttonClass} disabled={busy}>{c("saveSkill")}</button></form></Card>}
      {data.skills.length ? <div className="grid gap-3 lg:grid-cols-2">{data.skills.map((skill) => { const currentLabel = skill.current_step > 0 ? skill.progression_steps[skill.current_step - 1] : c("notStarted"); const targetLabel = skill.progression_steps[skill.target_step - 1]; const percent = Math.min(100, Math.round((skill.current_step / skill.target_step) * 100)); return <Card key={skill.id}><div className="flex items-start justify-between gap-2"><div><h3 className="text-base font-semibold">{skill.name}</h3><p className="mt-1 text-xs text-foreground-muted">{currentLabel} / {targetLabel} · {skill.current_step}/{skill.target_step}</p></div><div className="flex gap-1"><button className={secondaryButtonClass} type="button" onClick={() => setSkillForm({ id: skill.id, name: skill.name, skillKey: skill.skill_key, currentStep: skill.current_step, targetStep: skill.target_step, progressionSteps: [...skill.progression_steps], measurementType: skill.measurement_type, startedOn: skill.started_on ?? "", notes: skill.notes })}>{c("editProgram")}</button><button className={secondaryButtonClass} type="button" onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsSkill(skill.id))}>{c("remove")}</button></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={skill.target_step} aria-valuenow={skill.current_step} aria-label={c("currentStep")}><div className="h-full rounded-full bg-sport transition-[width]" style={{ width: `${percent}%` }} /></div>{skill.started_on && <p className="mt-2 text-xs text-foreground-muted">{formatDate(skill.started_on, language)}</p>}{skill.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground-muted">{skill.notes}</p>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-foreground-muted">{c("bestSet")}: {bestSkillResults.get(skill.id) ?? 0} {skill.measurement_type === "hold" ? c("secondsLabel") : c("reps")}</p><span className="text-xs text-foreground-muted">{skill.logs.length} {c("historyTitle").toLowerCase()}</span></div>{skill.logs.length > 0 && <ul className="mt-3 space-y-1">{skill.logs.slice(0, 3).map((log) => <li key={log.id} className="flex justify-between gap-2 text-xs text-foreground-muted"><span className="truncate">{formatDate(log.logged_on, language)} · {log.step_name}</span><span className="shrink-0">{log.hold_seconds !== null ? `${log.hold_seconds} ${c("secondsLabel")}` : `${log.reps} ${c("reps")}`}</span></li>)}</ul>}<SkillLogger skill={skill} label={c("logResult")} dateLabel={c("logDate")} resultLabel={skill.measurement_type === "hold" ? c("resultHold") : c("resultReps")} notesLabel={c("skillNotes")} submitLabel={c("logResult")} date={date} busy={busy} onSave={(payload) => runMutation(() => logCalisthenicsSkill(payload))} /></Card>; })}</div> : <Card><p className="text-sm text-foreground-muted">{c("noSkills")}</p></Card>}
    </div>}

    {section === "progress" && <div className="space-y-4"><Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{c("progressTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{c("historyTitle")}</p></div><Field label={c("period")} className="w-40"><select className={controlClass} value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="30">{c("last30")}</option><option value="90">{c("last90")}</option><option value="all">{c("all")}</option></select></Field></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-muted p-4"><p className="text-xs text-foreground-muted">{c("totalReps")}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totalReps}</p></div><div className="rounded-xl bg-surface-muted p-4"><p className="text-xs text-foreground-muted">{c("totalHold")}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totalHold} {c("secondsLabel")}</p></div></div></Card><Card><h3 className="mb-2 text-sm font-semibold">{c("weekMinutes")}</h3><WeeklyBarChart data={weeklyChartData(data.workouts, language)} color="var(--sport)" unit={c("minutesLabel")} /></Card><div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="text-sm font-semibold">{c("reps")}</h3>{repsMap.size ? <ul className="mt-2 divide-y divide-border">{Array.from(repsMap.values()).sort((a, b) => b.total - a.total).map((record) => <li key={record.name} className="flex items-center justify-between gap-3 py-3"><span className="truncate text-sm">{record.name}</span><span className="shrink-0 text-xs tabular-nums text-foreground-muted">{record.total} · {c("bestSet")} {record.best}</span></li>)}</ul> : <p className="mt-3 text-sm text-foreground-muted">{c("noProgress")}</p>}</Card><Card><h3 className="text-sm font-semibold">{c("holdSeconds")}</h3>{holdsMap.size ? <ul className="mt-2 divide-y divide-border">{Array.from(holdsMap.values()).sort((a, b) => b.total - a.total).map((record) => <li key={record.name} className="flex items-center justify-between gap-3 py-3"><span className="truncate text-sm">{record.name}</span><span className="shrink-0 text-xs tabular-nums text-foreground-muted">{record.total} {c("secondsLabel")} · {c("bestSet")} {record.best} {c("secondsLabel")}</span></li>)}</ul> : <p className="mt-3 text-sm text-foreground-muted">{c("noProgress")}</p>}</Card></div><Card><h3 className="text-sm font-semibold">{c("activeSkills")}</h3>{data.skills.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{data.skills.map((skill) => <div key={skill.id} className="rounded-xl bg-surface-muted p-3"><div className="flex justify-between gap-2"><span className="truncate text-sm font-medium">{skill.name}</span><span className="text-xs tabular-nums text-foreground-muted">{skill.current_step}/{skill.target_step}</span></div><div className="mt-2 h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-sport" style={{ width: `${Math.min(100, (skill.current_step / skill.target_step) * 100)}%` }} /></div></div>)}</div> : <p className="mt-3 text-sm text-foreground-muted">{c("noSkills")}</p>}</Card></div>}

    {section === "history" && <div className="space-y-4"><Card><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{c("historyTitle")}</h2><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 xl:grid-cols-4"><Field label={c("date")}><input type="date" className={controlClass} value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} /></Field><Field label={c("search")}><input className={controlClass} value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} /></Field><Field label={c("filterExercise")}><select className={controlClass} value={historyExercise} onChange={(event) => setHistoryExercise(event.target.value)}><option value="all">{c("allExercises")}</option>{data.exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{localeName(exercise, language)}</option>)}</select></Field><Field label={c("programTitle")}><select className={controlClass} value={historyProgram} onChange={(event) => setHistoryProgram(event.target.value)}><option value="all">{c("allPrograms")}</option>{data.programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Field></div></div></Card>{filteredWorkouts.length ? filteredWorkouts.map((workout) => { const workoutSets = setsByWorkout.get(workout.id) ?? []; return <details key={workout.id} open={initialSessionId === workout.id} className="rounded-2xl border border-border bg-surface"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{workout.activity}</span><span className="mt-1 block text-xs text-foreground-muted">{formatDate(workout.workout_date, language)} · {workout.duration_minutes} {c("minutesLabel")} · {workout.intensity}/5</span></span><span className="shrink-0 text-xs text-sport">{workoutSets.length} {c("setsLabel")}</span></summary><div className="border-t border-border p-4"><ul className="space-y-2">{workoutSets.map((set) => { const exercise = set.exercise_id ? exercisesById.get(set.exercise_id) : undefined; return <li key={set.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-surface-muted p-3 text-xs"><span className="font-medium">{exercise ? localeName(exercise, language) : set.exercise_name} · {c("sets")} {set.set_number}</span><span className="text-foreground-muted">{set.reps !== null ? `${set.reps} ${c("reps")}` : `${set.hold_seconds} ${c("secondsLabel")}`}{set.assistance_kg ? ` · -${set.assistance_kg} kg` : ""}{set.added_weight_kg ? ` · +${set.added_weight_kg} kg` : ""}</span>{(set.variation || set.notes) && <span className="w-full text-foreground-muted">{[set.variation, set.notes].filter(Boolean).join(" · ")}</span>}</li>; })}</ul>{workout.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground-muted">{workout.notes}</p>}<button type="button" className="mt-3 min-h-10 rounded-lg px-3 text-xs font-medium text-danger hover:bg-danger/10" onClick={() => window.confirm(c("deleteConfirm")) && runMutation(() => deleteCalisthenicsWorkout(workout.id))}>{c("remove")}</button></div></details>; }) : <Card><p className="text-sm text-foreground-muted">{c("noHistory")}</p></Card>}</div>}
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

function localizedExerciseText(exercise: CalisthenicsExercise, language: string, field: "description" | "instructions") {
  const translations = field === "description"
    ? { fr: exercise.description_fr, en: exercise.description_en, ar: exercise.description_ar }
    : { fr: exercise.instructions_fr, en: exercise.instructions_en, ar: exercise.instructions_ar };
  return translations[language === "ar" ? "ar" : language === "en" ? "en" : "fr"];
}

function muscleLabel(muscle: string, t: (path: string) => string) {
  const path = `sport.calisthenicsUi.muscles.${muscle}`;
  const translated = t(path);
  return translated === path ? muscle : translated;
}

function fallbackDescription(category: Category, language: string) {
  const french: Record<Category, string> = {
    push: "Mouvement de poussée pour le haut du corps.", pull: "Mouvement de tirage ou de suspension pour le haut du corps.",
    legs: "Mouvement au poids du corps pour les jambes.", core: "Exercice de stabilité et de contrôle du tronc.",
    skills: "Travail technique progressif d’équilibre ou de force.", mobility: "Travail doux de mobilité articulaire.",
  };
  const english: Record<Category, string> = {
    push: "Upper body pushing movement.", pull: "Upper body pulling or hanging movement.", legs: "Bodyweight movement for the legs.",
    core: "Trunk stability and control exercise.", skills: "Progressive balance or strength skill practice.", mobility: "Gentle joint mobility work.",
  };
  const arabic: Record<Category, string> = {
    push: "حركة دفع للجزء العلوي من الجسم.", pull: "حركة سحب أو تعليق للجزء العلوي من الجسم.", legs: "حركة بوزن الجسم لتقوية الساقين.",
    core: "تمرين لثبات الجذع والتحكم به.", skills: "تدريب تدريجي على التوازن أو القوة.", mobility: "حركة لطيفة لتحسين مرونة المفاصل.",
  };
  return (language === "ar" ? arabic : language === "en" ? english : french)[category];
}

function fallbackTechnique(category: Category, language: string) {
  const french: Record<Category, string> = {
    push: "Garde le tronc stable, contrôle la descente et utilise une amplitude confortable.",
    pull: "Contrôle les épaules et le retour; évite l’élan et arrête en cas de douleur.",
    legs: "Garde le pied stable et le genou dans l’axe; adapte l’amplitude à ton confort.",
    core: "Respire régulièrement et maintiens la position sans cambrer le bas du dos.",
    skills: "Travaille près d’un appui sûr, privilégie le contrôle et arrête avant la perte de forme.",
    mobility: "Reste dans une amplitude confortable et évite les mouvements forcés ou douloureux.",
  };
  const english: Record<Category, string> = {
    push: "Keep your trunk steady, control the lowering phase and use a comfortable range.",
    pull: "Control your shoulders and return; avoid swinging and stop if anything hurts.",
    legs: "Keep your foot grounded and knee aligned; use a comfortable range of motion.",
    core: "Breathe steadily and hold the position without arching your lower back.",
    skills: "Practise near a secure support, focus on control and stop before form breaks down.",
    mobility: "Stay in a comfortable range and avoid forcing painful movement.",
  };
  const arabic: Record<Category, string> = {
    push: "حافظ على ثبات الجذع وتحكم في النزول واستخدم مدى حركة مريحاً.",
    pull: "تحكم في الكتفين والعودة، وتجنب التأرجح وتوقف عند الشعور بالألم.",
    legs: "ثبت القدم وحافظ على استقامة الركبة، واستخدم مدى حركة مريحاً.",
    core: "تنفس بانتظام وحافظ على الوضعية دون تقويس أسفل الظهر.",
    skills: "تمرن قرب دعامة آمنة وركز على التحكم وتوقف قبل فقدان الوضعية.",
    mobility: "تحرك ضمن مدى مريح وتجنب إجبار الحركة المؤلمة.",
  };
  return (language === "ar" ? arabic : language === "en" ? english : french)[category];
}
