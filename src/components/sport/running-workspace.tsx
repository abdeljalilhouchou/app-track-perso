"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/language-provider";
import { deleteRunningSession, saveRunningGoals, saveRunningSession } from "@/lib/actions/running";
import { SportStatusMessage } from "@/components/sport/ui/sport-module-shell";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import { SportButton, SportEmptyState } from "@/components/sport/ui/sport-primitives";
import { RunningOverview } from "@/components/sport/running/running-overview";
import { RunningHistory } from "@/components/sport/running/running-history";
import { RunningProgress } from "@/components/sport/running/running-progress";
import { RunLive } from "@/components/sport/running/run-live";
import { RunGps, type GpsSavePayload } from "@/components/sport/running/run-gps";
import { readDistance, RunFormSheet, type RunForm } from "@/components/sport/running/run-form-sheet";
import { formatClock, formatKm } from "@/components/sport/running/format";
import type { Language } from "@/lib/language";
import type { RunningGoal } from "@/types/database";
import { computeRunningStats, parseDuration, type RunningGoals, type RunningRun } from "@/lib/running/stats";

type Section = "overview" | "sessions" | "progress" | "goals" | "live" | "gps";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function blankForm(date: string): RunForm {
  return { date, name: "", runType: "easy", distance: "", duration: "", intensity: "3", notes: "", elevation: "", heartRate: "", cadence: "" };
}

function goalFormOf(goals: RunningGoal | null) {
  const minutes = (value: number | null | undefined) => value != null ? String(Math.floor(value / 60)) : "";
  const seconds = (value: number | null | undefined) => value != null ? String(value % 60).padStart(2, "0") : "";
  return {
    weeklyDistance: goals?.weekly_distance_km?.toString() ?? "", weeklyRuns: goals?.weekly_runs?.toString() ?? "", monthlyDistance: goals?.monthly_distance_km?.toString() ?? "",
    target5kMin: minutes(goals?.target_5k_seconds), target5kSec: seconds(goals?.target_5k_seconds),
    target10kMin: minutes(goals?.target_10k_seconds), target10kSec: seconds(goals?.target_10k_seconds),
  };
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
  const [laps, setLaps] = useState<number[]>([]);
  const [goalForm, setGoalForm] = useState(() => goalFormOf(initialGoals));

  // A server refresh brings new props: adopt them during render rather than in an effect.
  const [seenRuns, setSeenRuns] = useState(initialRuns);
  if (seenRuns !== initialRuns) { setSeenRuns(initialRuns); setRuns(initialRuns); }
  const [seenGoals, setSeenGoals] = useState(initialGoals);
  if (seenGoals !== initialGoals) { setSeenGoals(initialGoals); setGoals(initialGoals); setGoalForm(goalFormOf(initialGoals)); }

  useEffect(() => {
    if (!timerRunning) return;
    const tick = () => { if (timerStartedAt.current !== null) setElapsedMs(timerBaseMs.current + Date.now() - timerStartedAt.current); };
    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const stats = useMemo(() => computeRunningStats(runs, goals), [runs, goals]);
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

  const w = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.${key}`, vars);
  const today = initialDate || todayKey();
  const weekLine = goals?.weekly_distance_km ? w("weekGoal", { done: formatKm(stats.thisWeek.distanceKm, language), goal: formatKm(goals.weekly_distance_km, language) }) : w("weekPlain", { done: formatKm(stats.thisWeek.distanceKm, language) });
  const tabs: { id: Section; label: string }[] = [{ id: "overview", label: w("tabCourse") }, { id: "progress", label: w("tabProgress") }, { id: "sessions", label: w("tabHistory") }];
  const startLive = () => { stopwatch.reset(); setLaps([]); timerStartedAt.current = Date.now(); setTimerRunning(true); setSection("live"); };
  const onSaveGps = async (payload: GpsSavePayload) => {
    try {
      const result = await saveRunningSession({ date: todayKey(), name: "", notes: "", ...payload });
      if (result.error) return r(messageFor(result.error));
      setStatus({ key: result.routeSaved === false ? "v3.gps.routeNotSaved" : "saveSuccess", error: false });
      setSection("overview");
      router.refresh();
      return null;
    } catch {
      return r("errorGeneric");
    }
  };
  const finishLive = () => {
    stopwatch.pause();
    const seconds = Math.floor((timerBaseMs.current) / 1000);
    setForm({ ...blankForm(today), duration: formatClock(seconds) });
    setEditingId(null); setFormError(null); setFormOpen(true);
    stopwatch.reset(); setLaps([]); setSection("overview");
  };
  const goalSteps: { key: "weeklyDistance" | "weeklyRuns" | "monthlyDistance"; label: string; step: number; unit: string; now: string; progress: number | null }[] = [
    { key: "weeklyDistance", label: r("weeklyDistanceGoal"), step: 1, unit: "km", now: w("nowWeek", { value: `${formatKm(stats.thisWeek.distanceKm, language)} km` }), progress: stats.goalProgress.weeklyDistance },
    { key: "weeklyRuns", label: r("weeklyRunsGoal"), step: 1, unit: "", now: w("nowWeek", { value: String(stats.thisWeek.runs) }), progress: stats.goalProgress.weeklyRuns },
    { key: "monthlyDistance", label: r("monthlyDistanceGoal"), step: 5, unit: "km", now: w("nowMonth", { value: `${formatKm(stats.thisMonth.distanceKm, language)} km` }), progress: stats.goalProgress.monthlyDistance },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5" data-run-workspace style={{ "--sport": "var(--water)", "--sport-soft": "color-mix(in srgb, var(--water) 14%, var(--surface))", "--sport-ink": "color-mix(in srgb, var(--water) 62%, var(--foreground))", "--sport-action": "var(--water)" } as CSSProperties}>
      {section !== "live" && section !== "gps" && <>
        <header className="flex items-center gap-3" data-strength-header>
          <Link href={section === "goals" ? "#" : "/sport"} onClick={(event) => { if (section === "goals") { event.preventDefault(); setSection("overview"); } }} prefetch={false} aria-label={section === "goals" ? w("backRunning") : t("sport.focus.backToSport")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface transition hover:bg-surface-muted"><SportIcon name="chevron" className="sport-context-back-icon h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold" style={{ color: "color-mix(in srgb, var(--water) 70%, var(--foreground))" }}>{section === "goals" ? t("sport.hub.running.title") : weekLine}</p>
            <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight">{section === "goals" ? w("goals") : t("sport.hub.running.title")}</h1>
          </div>
          {section !== "goals" && <button type="button" onClick={() => setSection("goals")} className="flex h-11 shrink-0 items-center rounded-2xl border border-border bg-surface px-3.5 text-[13px] font-semibold transition hover:bg-surface-muted" data-run-goals-link>{w("goals")}</button>}
        </header>
        {section !== "goals" && <div role="tablist" aria-label={t("sport.runningUi.subtitle")} className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1" data-run-tabs>
          {tabs.map((tab) => { const active = section === tab.id; return <button key={tab.id} type="button" role="tab" aria-selected={active} onClick={() => setSection(tab.id)} className="min-h-[38px] min-w-0 truncate rounded-xl px-1 text-[13px] font-semibold transition" style={active ? { background: "var(--water)", color: "#04202f" } : { color: "var(--foreground-muted)" }} data-run-tab={tab.id}>{tab.label}</button>; })}
        </div>}
        {status && <SportStatusMessage error={status.error} onDismiss={() => setStatus(null)} dismissLabel={t("sport.ui.dismissStatus")}>{r(status.key)}</SportStatusMessage>}
      </>}

      {section === "gps" && <RunGps language={language} previousBest1k={stats.comparable1k?.duration_seconds ?? null} onExit={() => setSection("overview")} onNoGps={(runType) => { update("runType", runType); startLive(); }} onSave={onSaveGps} />}
      {section === "live" && <span hidden data-strength-header />}
      {section === "live" && <RunLive elapsedMs={elapsedMs} running={timerRunning} laps={laps} runType={r(`runTypes.${form.runType}`)} onPause={stopwatch.pause} onResume={stopwatch.start} onLap={() => setLaps((current) => [...current, timerBaseMs.current + (timerStartedAt.current !== null ? Date.now() - timerStartedAt.current : 0)])} onCancel={() => { stopwatch.reset(); setLaps([]); setSection("overview"); }} onFinish={finishLive} />}

      {section === "overview" && (runs.length === 0
        ? <SportEmptyState icon="running" title={r("noRuns")} description={r("noRunsBody")} action={<div className="flex flex-wrap justify-center gap-2"><SportButton onClick={openNewRun}>{r("startRun")}</SportButton><button type="button" onClick={() => setSection("gps")} className="sport-button sport-button-secondary">{w("goRun")}</button></div>} />
        : <RunningOverview stats={stats} goals={goals} runs={runs} language={language} today={today} onLogRun={openNewRun} onStartLive={() => setSection("gps")} onOpenRun={(run) => { setExpandedId(run.workout_id); setSection("sessions"); }} onGoTo={setSection} />)}

      {section === "sessions" && (runs.length === 0
        ? <SportEmptyState icon="running" title={r("noRuns")} description={r("noRunsBody")} action={<SportButton onClick={openNewRun}>{r("startRun")}</SportButton>} />
        : <RunningHistory runs={runs} language={language} expandedId={expandedId} onToggle={setExpandedId} onEdit={startEditing} onDelete={(run) => void onDelete(run)} />)}

      {section === "progress" && (runs.length === 0
        ? <SportEmptyState icon="running" title={r("noRuns")} description={r("noRunsBody")} action={<SportButton onClick={openNewRun}>{r("startRun")}</SportButton>} />
        : <RunningProgress runs={runs} stats={stats} goals={goals} language={language} />)}

      {section === "goals" && <form onSubmit={onSaveGoals} className="space-y-5" data-run-goals>
        <section className="space-y-2.5">
          <h2 className="text-[15px] font-semibold">{w("volume")}</h2>
          {goalSteps.map((goal) => { const value = goalForm[goal.key]; const number = Number(value) || 0; return <div key={goal.key} className="space-y-2.5 rounded-[20px] border border-border bg-surface p-3.5">
            <div className="flex items-center justify-between gap-2.5">
              <span className="min-w-0"><span className="block text-sm font-bold">{goal.label}</span><span className="block text-xs text-foreground-muted">{goal.now}</span></span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button type="button" aria-label={w("decrease", { label: goal.label })} onClick={() => setGoalForm((current) => ({ ...current, [goal.key]: number - goal.step > 0 ? String(number - goal.step) : "" }))} className="h-10 w-10 rounded-xl bg-surface-muted text-base font-bold">−</button>
                <label className="w-16"><span className="sr-only">{goal.label}</span><input type="number" inputMode="decimal" min="0" value={value} onChange={(event) => setGoalForm((current) => ({ ...current, [goal.key]: event.target.value }))} placeholder="—" className="w-full bg-transparent text-center text-lg font-extrabold tabular-nums outline-none" /></label>
                <button type="button" aria-label={w("increase", { label: goal.label })} onClick={() => setGoalForm((current) => ({ ...current, [goal.key]: String(number + goal.step) }))} className="h-10 w-10 rounded-xl bg-surface-muted text-base font-bold">+</button>
              </span>
            </div>
            {goal.progress !== null && <div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full" style={{ width: `${Math.round(goal.progress * 100)}%`, background: "var(--water)" }} /></div>}
          </div>; })}
        </section>
        <section className="space-y-2.5">
          <h2 className="text-[15px] font-semibold">{w("times")}</h2>
          {([["5 km", 5, "target5kMin", "target5kSec", stats.comparable5k], ["10 km", 10, "target10kMin", "target10kSec", stats.comparable10k]] as const).map(([label, km, minKey, secKey, best]) => {
            const targetSeconds = (Number(goalForm[minKey]) || 0) * 60 + (Number(goalForm[secKey]) || 0);
            const gap = best && targetSeconds ? best.duration_seconds - targetSeconds : null;
            return <div key={label} className="space-y-2.5 rounded-[20px] border p-3.5" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--water) 16%, var(--surface)), color-mix(in srgb, var(--water) 5%, var(--surface)))", borderColor: "color-mix(in srgb, var(--water) 35%, var(--border))" }}>
              <div className="flex items-baseline justify-between gap-3"><span className="text-base font-extrabold">{label}</span>{targetSeconds > 0 && <span className="text-xs text-foreground-muted">{w("pacePer", { pace: formatClock(Math.round(targetSeconds / km)) })}</span>}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><span className="text-[11px] text-foreground-muted">{w("goalLabel")}</span>
                  <div className="flex h-12 items-center justify-center gap-1 rounded-xl border border-border bg-surface-muted">
                    <label><span className="sr-only">{`${label} ${r("minutes")}`}</span><input type="number" inputMode="numeric" min="0" max="1439" value={goalForm[minKey]} onChange={(event) => setGoalForm((current) => ({ ...current, [minKey]: event.target.value }))} placeholder="mm" className="w-12 bg-transparent text-end text-lg font-extrabold tabular-nums outline-none" /></label>
                    <span className="text-lg font-extrabold">:</span>
                    <label><span className="sr-only">{`${label} ${r("seconds")}`}</span><input type="number" inputMode="numeric" min="0" max="59" value={goalForm[secKey]} onChange={(event) => setGoalForm((current) => ({ ...current, [secKey]: event.target.value }))} placeholder="ss" className="w-12 bg-transparent text-lg font-extrabold tabular-nums outline-none" /></label>
                  </div>
                </div>
                <div className="space-y-1"><span className="text-[11px] text-foreground-muted">{w("yourRecord")}</span><div className="grid h-12 place-items-center rounded-xl bg-surface-muted text-lg font-extrabold tabular-nums">{best ? formatClock(best.duration_seconds) : "—"}</div></div>
              </div>
              {gap !== null && <p className="text-xs font-semibold" style={{ color: gap <= 30 ? "color-mix(in srgb, var(--sport) 70%, var(--foreground))" : "var(--foreground-muted)" }}>{gap <= 0 ? w("goalDone") : gap <= 30 ? w("nearly", { time: formatClock(gap) }) : w("toGain", { time: formatClock(gap), perKm: Math.round(gap / km) })}</p>}
            </div>;
          })}
        </section>
        <button className="min-h-[54px] w-full rounded-2xl text-base font-extrabold disabled:opacity-50" style={{ background: "var(--water)", color: "#04202f" }} type="submit" disabled={saving} data-run-goals-save>{saving ? r("saving") : r("saveGoals")}</button>
      </form>}

      {formOpen && <RunFormSheet form={form} update={update} editing={editingId !== null} saving={saving} error={formError} maxDate={today} language={language} onSubmit={(event) => void onSaveRun(event)} onClose={closeForm} />}
    </div>
  );
}
