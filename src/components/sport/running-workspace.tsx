"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/language-provider";
import { deleteRunningSession, saveRunningGoals, saveRunningSession } from "@/lib/actions/running";
import { SportModuleShell, SportModuleTabs, SportStatusMessage } from "@/components/sport/ui/sport-module-shell";
import { SportButton, SportEmptyState } from "@/components/sport/ui/sport-primitives";
import { ModuleCard, ModulePill } from "@/components/sport/ui/module-kit";
import { RunningOverview } from "@/components/sport/running/running-overview";
import { RunningHistory } from "@/components/sport/running/running-history";
import { RunningProgress } from "@/components/sport/running/running-progress";
import { readDistance, RunFormSheet, type RunForm } from "@/components/sport/running/run-form-sheet";
import { formatClock, formatKm, localeOf } from "@/components/sport/running/format";
import { weekHeading } from "@/lib/sport-week";
import type { Language } from "@/lib/language";
import type { RunningGoal } from "@/types/database";
import { computeRunningStats, parseDuration, type RunningGoals, type RunningRun } from "@/lib/running/stats";

type Section = "overview" | "sessions" | "progress" | "goals";
const SECTIONS: Section[] = ["overview", "sessions", "progress", "goals"];
const control = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-sport focus:ring-2 focus:ring-sport/15";
const labelClass = "mb-1.5 block text-xs font-medium text-foreground-muted";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function blankForm(date: string): RunForm {
  return { date, name: "", runType: "easy", distance: "", duration: "", intensity: "3", notes: "", elevation: "", heartRate: "", cadence: "" };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0"><span className={labelClass}>{label}</span>{children}</label>;
}

export function RunningWorkspace({ initialRuns, initialGoals, language, initialDate, initialSessionId }: {
  initialRuns: RunningRun[];
  initialGoals: RunningGoal | null;
  language: Language;
  initialDate: string;
  initialSessionId?: string;
}) {
  const t = useT();
  const r = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.${key}`, vars);
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [goals, setGoals] = useState<RunningGoals | null>(initialGoals);
  const [section, setSection] = useState<Section>(initialSessionId ? "sessions" : "overview");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RunForm>(() => blankForm(initialDate || todayKey()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ key: string; error: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [expandedId, setExpandedId] = useState(initialSessionId ?? "");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerStartedAt = useRef<number | null>(null);
  const timerBaseMs = useRef(0);
  const [goalForm, setGoalForm] = useState({ weeklyDistance: "", weeklyRuns: "", monthlyDistance: "", target5kMin: "", target5kSec: "", target10kMin: "", target10kSec: "" });

  useEffect(() => setRuns(initialRuns), [initialRuns]);
  useEffect(() => {
    setGoals(initialGoals);
    setGoalForm({
      weeklyDistance: initialGoals?.weekly_distance_km?.toString() ?? "",
      weeklyRuns: initialGoals?.weekly_runs?.toString() ?? "",
      monthlyDistance: initialGoals?.monthly_distance_km?.toString() ?? "",
      target5kMin: initialGoals?.target_5k_seconds != null ? String(Math.floor(initialGoals.target_5k_seconds / 60)) : "",
      target5kSec: initialGoals?.target_5k_seconds != null ? String(initialGoals.target_5k_seconds % 60) : "",
      target10kMin: initialGoals?.target_10k_seconds != null ? String(Math.floor(initialGoals.target_10k_seconds / 60)) : "",
      target10kSec: initialGoals?.target_10k_seconds != null ? String(initialGoals.target_10k_seconds % 60) : "",
    });
  }, [initialGoals]);

  useEffect(() => {
    if (!timerRunning) return;
    const tick = () => { if (timerStartedAt.current !== null) setElapsedMs(timerBaseMs.current + Date.now() - timerStartedAt.current); };
    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const stats = useMemo(() => computeRunningStats(runs, goals), [runs, goals]);
  const heading = weekHeading(new Date(), localeOf(language));
  const messageFor = (code: string) => {
    const messages: Record<string, string> = { validation: "errorValidation", schema: "errorSchema", auth: "errorAuth", ownership: "errorOwnership", generic: "errorGeneric", goals: "errorGoals" };
    return messages[code] ?? "errorGeneric";
  };
  const update = <K extends keyof RunForm>(key: K, value: RunForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const openNewRun = () => { setForm(blankForm(initialDate || todayKey())); setEditingId(null); setFormError(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setFormError(null); };
  const startEditing = (run: RunningRun) => {
    setForm({
      date: run.workout_date, name: run.name, runType: run.run_type, distance: String(run.distance_km), duration: formatClock(run.duration_seconds),
      intensity: String(run.intensity), notes: run.workout_notes ?? "",
      elevation: run.elevation_gain_m?.toString() ?? "", heartRate: run.average_heart_rate?.toString() ?? "", cadence: run.cadence_spm?.toString() ?? "",
    });
    setEditingId(run.workout_id);
    setFormError(null);
    setFormOpen(true);
    setStatus(null);
  };

  const onSaveRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    const durationSeconds = parseDuration(form.duration);
    const distanceKm = readDistance(form.distance);
    if (durationSeconds === null || !(distanceKm > 0)) { setFormError(r("errorValidation")); return; }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    const optionalNumber = (value: string) => value.trim() === "" ? null : Number(value);
    try {
      const result = await saveRunningSession({
        workoutId: editingId, date: form.date, name: form.name, runType: form.runType, distanceKm, durationSeconds,
        intensity: Number(form.intensity), notes: form.notes,
        elevationGainM: optionalNumber(form.elevation), averageHeartRate: optionalNumber(form.heartRate), cadenceSpm: optionalNumber(form.cadence),
      });
      if (result.error) setFormError(r(messageFor(result.error)));
      else {
        setStatus({ key: editingId ? "updateSuccess" : "saveSuccess", error: false });
        setFormOpen(false);
        setEditingId(null);
        router.refresh();
      }
    } catch {
      setFormError(r("errorGeneric"));
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const onDelete = async (run: RunningRun) => {
    if (!window.confirm(r("deleteConfirm"))) return;
    try {
      const result = await deleteRunningSession(run.workout_id);
      if (result.error) setStatus({ key: messageFor(result.error), error: true });
      else {
        setRuns((current) => current.filter((item) => item.workout_id !== run.workout_id));
        setStatus({ key: "deleteSuccess", error: false });
        router.refresh();
      }
    } catch {
      setStatus({ key: "errorGeneric", error: true });
    }
  };

  const onSaveGoals = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setStatus(null);
    const parse = (value: string) => value === "" ? null : Number(value);
    // Both fields empty (or zero) means the target is not tracked.
    const parseTime = (minutes: string, seconds: string) => {
      if (minutes === "" && seconds === "") return null;
      const total = (minutes === "" ? 0 : Number(minutes)) * 60 + (seconds === "" ? 0 : Number(seconds));
      return total > 0 ? total : null;
    };
    const values = {
      weeklyDistanceKm: parse(goalForm.weeklyDistance), weeklyRuns: parse(goalForm.weeklyRuns), monthlyDistanceKm: parse(goalForm.monthlyDistance),
      target5kSeconds: parseTime(goalForm.target5kMin, goalForm.target5kSec), target10kSeconds: parseTime(goalForm.target10kMin, goalForm.target10kSec),
    };
    try {
      const result = await saveRunningGoals(values);
      if (result.error) setStatus({ key: messageFor(result.error), error: true });
      else {
        setGoals(Object.values(values).some((value) => value !== null) ? {
          weekly_distance_km: values.weeklyDistanceKm, weekly_runs: values.weeklyRuns, monthly_distance_km: values.monthlyDistanceKm,
          target_5k_seconds: values.target5kSeconds, target_10k_seconds: values.target10kSeconds,
        } : null);
        setStatus({ key: "goalsSaved", error: false });
        router.refresh();
      }
    } catch {
      setStatus({ key: "errorGeneric", error: true });
    } finally { setSaving(false); }
  };

  const stopwatch = {
    elapsedMs,
    running: timerRunning,
    start: () => { timerStartedAt.current = Date.now(); setTimerRunning(true); },
    pause: () => {
      if (timerStartedAt.current !== null) timerBaseMs.current += Date.now() - timerStartedAt.current;
      timerStartedAt.current = null; setTimerRunning(false); setElapsedMs(timerBaseMs.current);
    },
    reset: () => { timerStartedAt.current = null; timerBaseMs.current = 0; setTimerRunning(false); setElapsedMs(0); },
  };

  return (
    <SportModuleShell
      title={t("sport.hub.running.title")}
      eyebrow={r("weekEyebrow", heading)}
      badge={stats.weekStreak >= 2 ? <ModulePill>{r("streak", { count: stats.weekStreak })}</ModulePill> : undefined}
      tabs={<SportModuleTabs label={t("sport.runningUi.subtitle")} value={section} options={SECTIONS.map((item) => ({ value: item, label: r(`sections.${item}`) }))} onChange={setSection} />}
      status={status && <SportStatusMessage error={status.error} onDismiss={() => setStatus(null)} dismissLabel={t("sport.ui.dismissStatus")}>{r(status.key)}</SportStatusMessage>}
    >
      {section === "overview" && (runs.length === 0
        ? <SportEmptyState icon="running" title={r("noRuns")} description={r("noRunsBody")} action={<SportButton onClick={openNewRun}>{r("startRun")}</SportButton>} />
        : <RunningOverview stats={stats} goals={goals} runs={runs} language={language} onLogRun={openNewRun} onOpenRun={(run) => { setExpandedId(run.workout_id); setSection("sessions"); }} onGoTo={setSection} />)}

      {section === "sessions" && (runs.length === 0
        ? <SportEmptyState icon="running" title={r("noRuns")} description={r("noRunsBody")} action={<SportButton onClick={openNewRun}>{r("startRun")}</SportButton>} />
        : <div className="space-y-4">
          <RunningHistory runs={runs} language={language} expandedId={expandedId} onToggle={setExpandedId} onEdit={startEditing} onDelete={(run) => void onDelete(run)} />
          <div className="module-sticky-cta"><button type="button" className="module-primary" onClick={openNewRun}><span aria-hidden="true">+</span>{r("startRun")}</button></div>
        </div>)}

      {section === "progress" && (runs.length === 0
        ? <SportEmptyState icon="running" title={r("noRuns")} description={r("noRunsBody")} action={<SportButton onClick={openNewRun}>{r("startRun")}</SportButton>} />
        : <RunningProgress runs={runs} stats={stats} goals={goals} language={language} />)}

      {section === "goals" && <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={onSaveGoals} className="module-card">
          <div><h2 className="module-card-title">{r("goalsTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{r("goalsHint")}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <GoalField label={r("weeklyDistanceGoal")} value={goalForm.weeklyDistance} min="0.01" max="1000" step="0.01" onChange={(value) => setGoalForm((current) => ({ ...current, weeklyDistance: value }))} />
            <GoalField label={r("weeklyRunsGoal")} value={goalForm.weeklyRuns} min="1" max="14" step="1" onChange={(value) => setGoalForm((current) => ({ ...current, weeklyRuns: value }))} />
            <GoalField label={r("monthlyDistanceGoal")} value={goalForm.monthlyDistance} min="0.01" max="5000" step="0.01" onChange={(value) => setGoalForm((current) => ({ ...current, monthlyDistance: value }))} />
            <TimeGoalField label={r("target5k")} minutes={goalForm.target5kMin} seconds={goalForm.target5kSec} onChange={(minutes, seconds) => setGoalForm((current) => ({ ...current, target5kMin: minutes, target5kSec: seconds }))} />
            <TimeGoalField label={r("target10k")} minutes={goalForm.target10kMin} seconds={goalForm.target10kSec} onChange={(minutes, seconds) => setGoalForm((current) => ({ ...current, target10kMin: minutes, target10kSec: seconds }))} />
          </div>
          <button className="module-primary" type="submit" disabled={saving}>{saving ? r("saving") : r("saveGoals")}</button>
        </form>
        <ModuleCard title={r("progressGoal")}>
          {!goals ? <p className="text-sm text-foreground-muted">{r("goalsHint")}</p> : <div className="space-y-4">
            {goals.weekly_distance_km && <GoalProgress label={r("weeklyDistanceGoal")} current={stats.thisWeek.distanceKm} goal={goals.weekly_distance_km} format={(value) => `${formatKm(value, language)} km`} progress={stats.goalProgress.weeklyDistance ?? 0} />}
            {goals.weekly_runs && <GoalProgress label={r("weeklyRunsGoal")} current={stats.thisWeek.runs} goal={goals.weekly_runs} format={(value) => String(value)} progress={stats.goalProgress.weeklyRuns ?? 0} />}
            {goals.monthly_distance_km && <GoalProgress label={r("monthlyDistanceGoal")} current={stats.thisMonth.distanceKm} goal={goals.monthly_distance_km} format={(value) => `${formatKm(value, language)} km`} progress={stats.goalProgress.monthlyDistance ?? 0} />}
          </div>}
        </ModuleCard>
      </div>}

      {formOpen && <RunFormSheet form={form} update={update} editing={editingId !== null} saving={saving} error={formError} maxDate={initialDate || todayKey()} language={language} stopwatch={stopwatch} onSubmit={(event) => void onSaveRun(event)} onClose={closeForm} />}
    </SportModuleShell>
  );

  function GoalField({ label, value, min, max, step, onChange }: { label: string; value: string; min: string; max: string; step: string; onChange: (value: string) => void }) {
    return <Field label={label}><input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} className={control} onChange={(event) => onChange(event.target.value)} /></Field>;
  }

  function TimeGoalField({ label, minutes, seconds, onChange }: { label: string; minutes: string; seconds: string; onChange: (minutes: string, seconds: string) => void }) {
    return <div className="min-w-0"><span className={labelClass}>{label}</span><div className="grid grid-cols-2 gap-2">
      <Field label={r("minutes")}><input type="number" inputMode="numeric" min="0" max="1439" step="1" value={minutes} className={control} onChange={(event) => onChange(event.target.value, seconds)} /></Field>
      <Field label={r("seconds")}><input type="number" inputMode="numeric" min="0" max="59" step="1" value={seconds} className={control} onChange={(event) => onChange(minutes, event.target.value)} /></Field>
    </div></div>;
  }

  function GoalProgress({ label, current, goal, format, progress }: { label: string; current: number; goal: number; format: (value: number) => string; progress: number }) {
    return <div><div className="mb-1.5 flex justify-between gap-3 text-xs"><span>{label}</span><span className="shrink-0 font-medium tabular-nums">{format(current)} / {format(goal)}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-sport transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} /></div></div>;
  }
}
