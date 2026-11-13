"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChartPlaceholder } from "@/components/charts/deferred-chart";
import { useT } from "@/components/language-provider";
import { deleteRunningSession, saveRunningGoals, saveRunningSession } from "@/lib/actions/running";
import { formatLocalizedDate } from "@/lib/format-date";
import { SportModuleShell, SportModuleTabs, SportStatusMessage } from "@/components/sport/ui/sport-module-shell";
import { SportStatCard } from "@/components/sport/ui/sport-stat-card";
import { SportProgressRing } from "@/components/sport/ui/sport-progress";
import { SportHeatmap } from "@/components/sport/sport-overview";
import { SportButton, SportEmptyState } from "@/components/sport/ui/sport-primitives";
import type { Language } from "@/lib/language";
import type { RunningGoal } from "@/types/database";
import { calculateRunningMetrics, computeRunningStats, formatDuration, formatPace, RUN_TYPES, type RunningGoals, type RunningRun, type RunType } from "@/lib/running/stats";

type Section = "overview" | "sessions" | "progress" | "goals";
const RunningDistanceChart = dynamic(() => import("@/components/charts/running-plots").then((module) => module.RunningDistanceChart), { ssr: false, loading: ChartPlaceholder });
const RunningPaceChart = dynamic(() => import("@/components/charts/running-plots").then((module) => module.RunningPaceChart), { ssr: false, loading: ChartPlaceholder });
type RunForm = {
  date: string; name: string; runType: RunType; distance: string; hours: string; minutes: string; seconds: string;
  intensity: string; notes: string; elevation: string; heartRate: string; cadence: string;
};

const control = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-sport focus:ring-2 focus:ring-sport/15";
const button = "inline-flex min-h-11 items-center justify-center rounded-xl bg-sport px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1.5 block text-xs font-medium text-foreground-muted";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function blankForm(date: string): RunForm {
  return { date, name: "", runType: "free", distance: "", hours: "0", minutes: "0", seconds: "0", intensity: "3", notes: "", elevation: "", heartRate: "", cadence: "" };
}

function formatDistance(value: number, language: Language, digits = 2) {
  return new Intl.NumberFormat(language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: digits }).format(value);
}

function MetricCard({ title, value, unit, detail }: { title: string; value: string | number; unit?: string; detail?: string }) {
  return <SportStatCard label={title} value={value} unit={unit} detail={detail} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className={labelClass}>{label}</span>{children}</label>;
}

function GoalField({ label, value, min, max, step, onChange }: { label: string; value: string; min: string; max: string; step: string; onChange: (value: string) => void }) {
  return <Field label={label}><input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} className={control} onChange={(event) => onChange(event.target.value)} /></Field>;
}

export function RunningWorkspace({
  initialRuns,
  initialGoals,
  language,
  initialDate,
  initialSessionId,
}: {
  initialRuns: RunningRun[];
  initialGoals: RunningGoal | null;
  language: Language;
  initialDate: string;
  initialSessionId?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [runs, setRuns] = useState(initialRuns);
  const [goals, setGoals] = useState<RunningGoals | null>(initialGoals);
  const [section, setSection] = useState<Section>(initialSessionId ? "sessions" : "overview");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RunForm>(() => blankForm(initialDate || todayKey()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ key: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [period, setPeriod] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [minDistance, setMinDistance] = useState("");
  const [page, setPage] = useState(1);
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
    const tick = () => {
      if (timerStartedAt.current !== null) setElapsedMs(timerBaseMs.current + Date.now() - timerStartedAt.current);
    };
    const interval = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const stats = useMemo(() => computeRunningStats(runs, goals), [runs, goals]);
  const locale = language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
  const sections: Section[] = ["overview", "sessions", "progress", "goals"];
  const messageFor = (code: string) => {
    const messages: Record<string, string> = { validation: "errorValidation", schema: "errorSchema", auth: "errorAuth", ownership: "errorOwnership", generic: "errorGeneric", goals: "errorGoals" };
    return messages[code] ?? "errorGeneric";
  };
  const signedCount = (value: number) => new Intl.NumberFormat(locale, { signDisplay: "exceptZero", maximumFractionDigits: 0 }).format(value);
  const signedDistance = (value: number) => new Intl.NumberFormat(locale, { signDisplay: "exceptZero", maximumFractionDigits: 2 }).format(Math.round(value * 100) / 100);
  const signedDuration = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : "±"}${formatDuration(Math.abs(value))}`;
  const update = <K extends keyof RunForm>(key: K, value: RunForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => { setForm(blankForm(initialDate || todayKey())); setEditingId(null); };
  const startEditing = (run: RunningRun) => {
    setForm({
      date: run.workout_date, name: run.name, runType: run.run_type, distance: String(run.distance_km),
      hours: String(Math.floor(run.duration_seconds / 3600)), minutes: String(Math.floor((run.duration_seconds % 3600) / 60)),
      seconds: String(run.duration_seconds % 60), intensity: String(run.intensity), notes: run.workout_notes ?? "",
      elevation: run.elevation_gain_m?.toString() ?? "", heartRate: run.average_heart_rate?.toString() ?? "", cadence: run.cadence_spm?.toString() ?? "",
    });
    setEditingId(run.workout_id);
    setSection("sessions");
    setFormOpen(true);
    setStatus(null);
  };

  const onSaveRun = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setStatus(null);
    const distance = Number(form.distance);
    const hours = Number(form.hours);
    const minutes = Number(form.minutes);
    const seconds = Number(form.seconds);
    if (![hours, minutes, seconds].every(Number.isInteger) || hours < 0 || hours > 168 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59 || hours * 3600 + minutes * 60 + seconds < 1) {
      setStatus({ key: "errorValidation", error: true });
      setSaving(false); savingRef.current = false; return;
    }
    const optionalNumber = (value: string) => value === "" ? null : Number(value);
    const input = {
      workoutId: editingId,
      date: form.date,
      name: form.name,
      runType: form.runType,
      distanceKm: distance,
      durationSeconds: hours * 3600 + minutes * 60 + seconds,
      intensity: Number(form.intensity),
      notes: form.notes,
      elevationGainM: optionalNumber(form.elevation),
      averageHeartRate: optionalNumber(form.heartRate),
      cadenceSpm: optionalNumber(form.cadence),
    };
    try {
      const result = await saveRunningSession(input);
      if (result.error) setStatus({ key: messageFor(result.error), error: true });
      else {
        setStatus({ key: editingId ? "updateSuccess" : "saveSuccess", error: false });
        resetForm();
        setFormOpen(false);
        router.refresh();
      }
    } catch {
      setStatus({ key: "errorGeneric", error: true });
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const onDelete = async (run: RunningRun) => {
    if (!window.confirm(t("sport.runningUi.deleteConfirm"))) return;
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

  const onSaveGoals = async (event: React.FormEvent<HTMLFormElement>) => {
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
      weeklyDistanceKm: parse(goalForm.weeklyDistance),
      weeklyRuns: parse(goalForm.weeklyRuns),
      monthlyDistanceKm: parse(goalForm.monthlyDistance),
      target5kSeconds: parseTime(goalForm.target5kMin, goalForm.target5kSec),
      target10kSeconds: parseTime(goalForm.target10kMin, goalForm.target10kSec),
    };
    try {
      const result = await saveRunningGoals(values);
      if (result.error) setStatus({ key: messageFor(result.error), error: true });
      else {
        setGoals(Object.values(values).some((value) => value !== null) ? {
          weekly_distance_km: values.weeklyDistanceKm, weekly_runs: values.weeklyRuns,
          monthly_distance_km: values.monthlyDistanceKm, target_5k_seconds: values.target5kSeconds, target_10k_seconds: values.target10kSeconds,
        } : null);
        setStatus({ key: "goalsSaved", error: false });
        router.refresh();
      }
    } catch {
      setStatus({ key: "errorGeneric", error: true });
    } finally { setSaving(false); }
  };

  const beginTimer = () => {
    timerStartedAt.current = Date.now();
    setTimerRunning(true);
  };
  const pauseTimer = () => {
    if (timerStartedAt.current !== null) timerBaseMs.current += Date.now() - timerStartedAt.current;
    timerStartedAt.current = null;
    setTimerRunning(false);
    setElapsedMs(timerBaseMs.current);
  };
  const stopTimer = () => {
    if (timerStartedAt.current !== null) timerBaseMs.current += Date.now() - timerStartedAt.current;
    timerStartedAt.current = null;
    setTimerRunning(false);
    setElapsedMs(timerBaseMs.current);
  };
  const resetTimer = () => { timerStartedAt.current = null; timerBaseMs.current = 0; setTimerRunning(false); setElapsedMs(0); };
  const copyTimerDuration = () => {
    const total = Math.floor(elapsedMs / 1000);
    update("hours", String(Math.floor(total / 3600)));
    update("minutes", String(Math.floor((total % 3600) / 60)));
    update("seconds", String(total % 60));
  };

  const filteredRuns = runs.filter((run) => {
    if (filterType !== "all" && run.run_type !== filterType) return false;
    if (minDistance !== "" && run.distance_km < Number(minDistance)) return false;
    if (period !== "all") {
      const days = Number(period);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
      if (run.workout_date < cutoffKey) return false;
    }
    return true;
  });
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredRuns.length / pageSize));
  const visibleRuns = filteredRuns.slice((page - 1) * pageSize, page * pageSize);
  const chartWeeks = stats.weeklyDistance.map((week) => ({
    label: formatLocalizedDate(week.weekStart, language, { day: "numeric", month: "short" }),
    value: Math.round(week.distanceKm * 100) / 100,
  }));
  const chartMonths = stats.monthlyDistance.map((month) => ({
    label: new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(`${month.month}-01T12:00:00`)),
    value: Math.round(month.distanceKm * 100) / 100,
  }));
  const paceTrend = stats.paceTrend.map((item) => ({ label: formatLocalizedDate(item.date, language, { day: "numeric", month: "short" }), pace: item.pace }));
  const currentMetrics = form.distance && Number(form.distance) > 0
    ? calculateRunningMetrics(Number(form.distance), Math.max(1, Number(form.hours) * 3600 + Number(form.minutes) * 60 + Number(form.seconds)))
    : null;

  return (
    <SportModuleShell
      title={t("sport.hub.running.title")}
      description={t("sport.runningUi.subtitle")}
      icon="running"
      tabs={<SportModuleTabs label={t("sport.runningUi.subtitle")} value={section} options={sections.map((item) => ({ value: item, label: t(`sport.runningUi.sections.${item}`) }))} onChange={setSection} />}
      status={status && <SportStatusMessage error={status.error} onDismiss={() => setStatus(null)} dismissLabel={t("sport.ui.dismissStatus")}>{t(`sport.runningUi.${status.key}`)}</SportStatusMessage>}
    >

      {section === "overview" && <div className="space-y-5">
        {runs.length === 0 ? <SportEmptyState icon="running" title={t("sport.runningUi.noRuns")} description={t("sport.runningUi.noRunsBody")} action={<SportButton onClick={() => { resetForm(); setFormOpen(true); setSection("sessions"); }}>{t("sport.runningUi.startRun")}</SportButton>} /> : <>
          <div className="sport-stat-grid">
            <MetricCard title={t("sport.runningUi.runsThisWeek")} value={stats.thisWeek.runs} detail={`${signedCount(stats.thisWeek.runs - stats.lastWeek.runs)} ${t("sport.runningUi.vsLastWeek")}`} />
            <MetricCard title={t("sport.runningUi.distanceThisWeek")} value={formatDistance(stats.thisWeek.distanceKm, language)} unit="km" detail={`${signedDistance(stats.thisWeek.distanceKm - stats.lastWeek.distanceKm)} km ${t("sport.runningUi.vsLastWeek")}`} />
            <MetricCard title={t("sport.runningUi.durationThisWeek")} value={formatDuration(stats.thisWeek.durationSeconds)} detail={`${signedDuration(stats.thisWeek.durationSeconds - stats.lastWeek.durationSeconds)} ${t("sport.runningUi.vsLastWeek")}`} />
            <MetricCard title={t("sport.runningUi.averagePace")} value={formatPace(stats.thisWeek.distanceKm > 0 ? stats.thisWeek.durationSeconds / stats.thisWeek.distanceKm : null)} unit={t("sport.runningUi.minPerKm")} detail={t("sport.runningUi.lastWeekValue", { value: formatPace(stats.lastWeek.distanceKm > 0 ? stats.lastWeek.durationSeconds / stats.lastWeek.distanceKm : null) })} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
            <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{t("sport.runningUi.lastRun")}</h2><p className="mt-1 text-xs text-foreground-muted">{formatLocalizedDate(runs[0].workout_date, language, { dateStyle: "medium" })}</p></div><button type="button" className={secondary} onClick={() => startEditing(runs[0])}>{t("sport.runningUi.viewDetails")}</button></div>
              <p className="mt-4 text-xl font-semibold">{runs[0].name || t(`sport.runningUi.runTypes.${runs[0].run_type}`)}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-foreground-muted"><span>{formatDistance(runs[0].distance_km, language)} km</span><span>{formatDuration(runs[0].duration_seconds)}</span><span>{formatPace(calculateRunningMetrics(runs[0].distance_km, runs[0].duration_seconds)?.paceSecondsPerKm)} {t("sport.runningUi.minPerKm")}</span></div>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.runningUi.thisMonth")}</h2><p className="mt-2 text-3xl font-semibold text-sport">{formatDistance(stats.thisMonth.distanceKm, language)} <span className="text-sm">km</span></p><p className="mt-1 text-xs text-foreground-muted">{stats.thisMonth.runs} {t("sport.runningUi.totalRuns").toLowerCase()}</p></section>
          </div>
          {(goals?.weekly_distance_km || goals?.weekly_runs) && <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="mb-4 text-sm font-semibold">{t("sport.runningUi.weekGoal")}</h2><div className="grid gap-4 sm:grid-cols-2">
            {goals.weekly_distance_km && <div className="flex items-center gap-4"><SportProgressRing label={t("sport.runningUi.weeklyDistanceGoal")} value={stats.thisWeek.distanceKm} max={goals.weekly_distance_km} valueText={`${Math.round((stats.goalProgress.weeklyDistance ?? 0) * 100)}%`} /><div className="min-w-0"><p className="text-xs text-foreground-muted">{t("sport.runningUi.weeklyDistanceGoal")}</p><p className="mt-1 text-sm font-semibold tabular-nums">{formatDistance(stats.thisWeek.distanceKm, language)} / {formatDistance(goals.weekly_distance_km, language)} km</p></div></div>}
            {goals.weekly_runs && <div className="flex items-center gap-4"><SportProgressRing label={t("sport.runningUi.weeklyRunsGoal")} value={stats.thisWeek.runs} max={goals.weekly_runs} valueText={`${Math.round((stats.goalProgress.weeklyRuns ?? 0) * 100)}%`} /><div className="min-w-0"><p className="text-xs text-foreground-muted">{t("sport.runningUi.weeklyRunsGoal")}</p><p className="mt-1 text-sm font-semibold tabular-nums">{stats.thisWeek.runs} / {goals.weekly_runs}</p></div></div>}
          </div></section>}
        </>}
        {runs.length > 0 && <button type="button" className={button} onClick={() => { resetForm(); setFormOpen(true); setSection("sessions"); }}>{t("sport.runningUi.startRun")}</button>}
      </div>}

      {section === "sessions" && <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("sport.runningUi.historyTitle")}</h2>
          <button type="button" className={formOpen ? secondary : button} aria-expanded={formOpen} onClick={() => { resetForm(); setFormOpen((open) => !open); }}>{formOpen ? t("sport.runningUi.closeForm") : t("sport.runningUi.startRun")}</button>
        </div>
        {formOpen && <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <form onSubmit={onSaveRun} className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div><h2 className="text-lg font-semibold">{t(editingId ? "sport.runningUi.editRun" : "sport.runningUi.runFormTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{t("sport.runningUi.subtitle")}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("sport.runningUi.date")}><input required type="date" max={initialDate} value={form.date} className={control} onChange={(event) => update("date", event.target.value)} /></Field>
            <Field label={t("sport.runningUi.name")}><input maxLength={100} value={form.name} className={control} placeholder={t("sport.runningUi.namePlaceholder")} onChange={(event) => update("name", event.target.value)} /></Field>
            <Field label={t("sport.runningUi.runType")}><select value={form.runType} className={control} onChange={(event) => update("runType", event.target.value as RunType)}>{RUN_TYPES.map((item) => <option key={item} value={item}>{t(`sport.runningUi.runTypes.${item}`)}</option>)}</select></Field>
            <Field label={t("sport.runningUi.distance")}><input required type="number" inputMode="decimal" min="0.001" max="1000" step="0.001" value={form.distance} className={control} onChange={(event) => update("distance", event.target.value)} /></Field>
            <div className="sm:col-span-2"><span className={labelClass}>{t("sport.runningUi.duration")}</span><div className="grid grid-cols-3 gap-2">
              <Field label={t("sport.runningUi.hours")}><input required type="number" inputMode="numeric" min="0" max="168" step="1" value={form.hours} className={control} onChange={(event) => update("hours", event.target.value)} /></Field>
              <Field label={t("sport.runningUi.minutes")}><input required type="number" inputMode="numeric" min="0" max="59" step="1" value={form.minutes} className={control} onChange={(event) => update("minutes", event.target.value)} /></Field>
              <Field label={t("sport.runningUi.seconds")}><input required type="number" inputMode="numeric" min="0" max="59" step="1" value={form.seconds} className={control} onChange={(event) => update("seconds", event.target.value)} /></Field>
            </div></div>
            <Field label={t("sport.runningUi.intensity")}><select value={form.intensity} className={control} onChange={(event) => update("intensity", event.target.value)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5 · {t(`sport.runningUi.intensityValues.${value}`)}</option>)}</select></Field>
            <Field label={t("sport.runningUi.elevation")}><input type="number" inputMode="numeric" min="0" max="100000" step="1" value={form.elevation} className={control} onChange={(event) => update("elevation", event.target.value)} /></Field>
            <Field label={t("sport.runningUi.heartRate")}><input type="number" inputMode="numeric" min="30" max="250" step="1" value={form.heartRate} className={control} onChange={(event) => update("heartRate", event.target.value)} /></Field>
            <Field label={t("sport.runningUi.cadence")}><input type="number" inputMode="numeric" min="1" max="300" step="1" value={form.cadence} className={control} onChange={(event) => update("cadence", event.target.value)} /></Field>
          </div>
          <Field label={t("sport.runningUi.notes")}><textarea maxLength={2000} rows={3} value={form.notes} className={`${control} py-3`} placeholder={t("sport.runningUi.notesPlaceholder")} onChange={(event) => update("notes", event.target.value)} /></Field>
          {currentMetrics && <div data-run-metrics className="flex flex-wrap gap-4 rounded-xl bg-sport-soft/60 px-4 py-3 text-sm"><span>{t("sport.runningUi.pace")}: <strong className="text-sport">{formatPace(currentMetrics.paceSecondsPerKm)} {t("sport.runningUi.minPerKm")}</strong></span><span>{t("sport.runningUi.speed")}: <strong className="text-sport">{formatDistance(currentMetrics.speedKmh, language)} {t("sport.runningUi.kmPerHour")}</strong></span></div>}
          <div className="flex flex-wrap gap-2"><button className={button} disabled={saving} type="submit">{saving ? t("sport.runningUi.saving") : t(editingId ? "sport.runningUi.updateRun" : "sport.runningUi.saveRun")}</button>{editingId && <button type="button" className={secondary} onClick={resetForm}>{t("sport.runningUi.cancelEdit")}</button>}</div>
        </form>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 xl:sticky xl:top-4"><h2 className="text-sm font-semibold">{t("sport.runningUi.manualTimer")}</h2><p className="mt-1 text-xs leading-relaxed text-foreground-muted">{t("sport.runningUi.timerHint")}</p><p aria-live="polite" className="my-5 text-center text-4xl font-semibold tabular-nums text-sport">{formatDuration(Math.floor(elapsedMs / 1000))}</p><div className="grid grid-cols-2 gap-2">{!timerRunning ? <button type="button" className={secondary} onClick={beginTimer}>{elapsedMs > 0 ? t("sport.runningUi.resumeTimer") : t("sport.runningUi.startTimer")}</button> : <button type="button" className={secondary} onClick={pauseTimer}>{t("sport.runningUi.pauseTimer")}</button>}<button type="button" className={secondary} disabled={elapsedMs === 0 && !timerRunning} onClick={stopTimer}>{t("sport.runningUi.stopTimer")}</button><button type="button" className={secondary} onClick={resetTimer}>{t("sport.runningUi.resetTimer")}</button><button type="button" className={`${secondary} col-span-2`} disabled={elapsedMs < 1000 || timerRunning} onClick={copyTimerDuration}>{t("sport.runningUi.useTimer")}</button></div></section>
        </div>}

        <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="mb-3 text-sm font-semibold">{t("sport.runningUi.historyTitle")}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("sport.runningUi.period")}><select className={control} value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}><option value="all">{t("sport.runningUi.allPeriods")}</option><option value="7">{t("sport.runningUi.last7Days")}</option><option value="30">{t("sport.runningUi.last30Days")}</option><option value="90">{t("sport.runningUi.last90Days")}</option></select></Field>
          <Field label={t("sport.runningUi.runTypeFilter")}><select className={control} value={filterType} onChange={(event) => { setFilterType(event.target.value); setPage(1); }}><option value="all">{t("sport.runningUi.allTypes")}</option>{RUN_TYPES.map((item) => <option key={item} value={item}>{t(`sport.runningUi.runTypes.${item}`)}</option>)}</select></Field>
          <Field label={t("sport.runningUi.minDistance")}><input className={control} type="number" inputMode="decimal" min="0" step="0.1" value={minDistance} onChange={(event) => { setMinDistance(event.target.value); setPage(1); }} /></Field>
          <div className="flex items-end"><button type="button" className={secondary} onClick={() => { setPeriod("all"); setFilterType("all"); setMinDistance(""); setPage(1); }}>{t("sport.runningUi.clearFilters")}</button></div>
        </div></div>
        {visibleRuns.length ? <div className="space-y-3">{visibleRuns.map((run) => {
          const pace = calculateRunningMetrics(run.distance_km, run.duration_seconds)?.paceSecondsPerKm;
          const opened = expandedId === run.workout_id;
          return <article key={run.workout_id} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
            <button type="button" aria-expanded={opened} className="flex min-h-20 w-full items-center justify-between gap-3 p-4 text-start hover:bg-surface-muted" onClick={() => setExpandedId(opened ? "" : run.workout_id)}>
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{run.name || t(`sport.runningUi.runTypes.${run.run_type}`)}</span><span className="mt-1 block text-xs text-foreground-muted">{formatLocalizedDate(run.workout_date, language, { dateStyle: "medium" })} · {t(`sport.runningUi.runTypes.${run.run_type}`)}</span></span>
              <span className="shrink-0 text-end"><span className="block text-sm font-semibold tabular-nums">{formatDistance(run.distance_km, language)} km</span><span className="mt-1 block text-xs text-foreground-muted">{formatDuration(run.duration_seconds)} · {formatPace(pace)} {t("sport.runningUi.minPerKm")}</span></span>
            </button>
            {opened && <div className="border-t border-border p-4"><div className="grid gap-2 text-xs text-foreground-muted sm:grid-cols-2 lg:grid-cols-3"><span>{t("sport.runningUi.speed")}: {formatDistance(calculateRunningMetrics(run.distance_km, run.duration_seconds)?.speedKmh ?? 0, language)} {t("sport.runningUi.kmPerHour")}</span><span>{t("sport.runningUi.intensity")}: {run.intensity}/5</span>{run.elevation_gain_m !== null && <span>{t("sport.runningUi.elevation")}: {run.elevation_gain_m} m</span>}{run.average_heart_rate !== null && <span>{t("sport.runningUi.heartRate")}: {run.average_heart_rate} bpm</span>}{run.cadence_spm !== null && <span>{t("sport.runningUi.cadence")}: {run.cadence_spm}</span>}</div>{run.workout_notes && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground-muted">{run.workout_notes}</p>}<div className="mt-3 flex flex-wrap gap-2"><button className={secondary} type="button" onClick={() => startEditing(run)}>{t("sport.runningUi.editRun")}</button><button className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger/10" type="button" onClick={() => void onDelete(run)}>{t("sport.runningUi.deleteRun")}</button></div></div>}
          </article>;
        })}</div> : <p className="rounded-xl bg-surface-muted p-5 text-sm text-foreground-muted">{t("sport.runningUi.noFilteredRuns")}</p>}
        {filteredRuns.length > pageSize && <div className="flex items-center justify-center gap-3"><button className={secondary} type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("sport.runningUi.previous")}</button><span className="text-xs text-foreground-muted">{t("sport.runningUi.page")} {page} / {pageCount}</span><button className={secondary} type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>{t("sport.runningUi.next")}</button></div>}
        </div>
      </div>}

      {section === "progress" && <div className="space-y-4">
        <div className="sport-stat-grid"><MetricCard title={t("sport.runningUi.totalRuns")} value={stats.runCount} /><MetricCard title={t("sport.runningUi.totalDistance")} value={formatDistance(stats.totalDistanceKm, language)} unit="km" /><MetricCard title={t("sport.runningUi.totalTime")} value={formatDuration(stats.totalDurationSeconds)} /><MetricCard title={t("sport.runningUi.averagePace")} value={formatPace(stats.weightedAveragePace)} unit={t("sport.runningUi.minPerKm")} /><MetricCard title={t("sport.runningUi.bestPace")} value={formatPace(stats.bestPace)} unit={t("sport.runningUi.minPerKm")} /></div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2"><ChartCard title={t("sport.runningUi.weeklyDistance")} data={chartWeeks} unit="km" /><ChartCard title={t("sport.runningUi.monthlyDistance")} data={chartMonths} unit="km" /></div>
        <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="mb-3 text-sm font-semibold">{t("sport.runningUi.paceTrend")}</h2>{paceTrend.length ? <div className="h-56 w-full"><RunningPaceChart data={paceTrend} unit={t("sport.runningUi.minPerKm")} label={t("sport.runningUi.pace")} /></div> : <p className="text-sm text-foreground-muted">{t("sport.runningUi.noRunsBody")}</p>}</section>
        <div className="grid gap-4 sm:grid-cols-2"><RecordCard title={t("sport.runningUi.longestRun")} run={stats.longestDistance} value={(run) => `${formatDistance(run.distance_km, language)} km`} language={language} /><RecordCard title={t("sport.runningUi.longestDuration")} run={stats.longestDuration} value={(run) => formatDuration(run.duration_seconds)} language={language} /></div>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="text-sm font-semibold">{t("sport.runningUi.records")}</h2><p className="mt-1 text-xs leading-relaxed text-foreground-muted">{t("sport.runningUi.toleranceNote")}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><ComparableRecord title={t("sport.runningUi.record1k")} run={stats.comparable1k} language={language} /><ComparableRecord title={t("sport.runningUi.record5k")} run={stats.comparable5k} language={language} /><ComparableRecord title={t("sport.runningUi.record10k")} run={stats.comparable10k} language={language} /></div></section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="text-sm font-semibold">{t("sport.runningUi.consistency")}</h2><p className="mt-2 text-3xl font-semibold text-sport">{stats.weeklyConsistency} / 8</p></section>
        <SportHeatmap heat={stats.heat} />
      </div>}

      {section === "goals" && <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={onSaveGoals} className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5"><div><h2 className="text-lg font-semibold">{t("sport.runningUi.goalsTitle")}</h2><p className="mt-1 text-xs text-foreground-muted">{t("sport.runningUi.goalsHint")}</p></div><div className="grid gap-3 sm:grid-cols-2"><GoalField label={t("sport.runningUi.weeklyDistanceGoal")} value={goalForm.weeklyDistance} min="0.01" max="1000" step="0.01" onChange={(value) => setGoalForm((current) => ({ ...current, weeklyDistance: value }))} /><GoalField label={t("sport.runningUi.weeklyRunsGoal")} value={goalForm.weeklyRuns} min="1" max="14" step="1" onChange={(value) => setGoalForm((current) => ({ ...current, weeklyRuns: value }))} /><GoalField label={t("sport.runningUi.monthlyDistanceGoal")} value={goalForm.monthlyDistance} min="0.01" max="5000" step="0.01" onChange={(value) => setGoalForm((current) => ({ ...current, monthlyDistance: value }))} /><TimeGoalField label={t("sport.runningUi.target5k")} minutes={goalForm.target5kMin} seconds={goalForm.target5kSec} onChange={(minutes, seconds) => setGoalForm((current) => ({ ...current, target5kMin: minutes, target5kSec: seconds }))} /><TimeGoalField label={t("sport.runningUi.target10k")} minutes={goalForm.target10kMin} seconds={goalForm.target10kSec} onChange={(minutes, seconds) => setGoalForm((current) => ({ ...current, target10kMin: minutes, target10kSec: seconds }))} /></div><button className={button} type="submit" disabled={saving}>{saving ? t("sport.runningUi.saving") : t("sport.runningUi.saveGoals")}</button></form>
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="text-sm font-semibold">{t("sport.runningUi.progressGoal")}</h2>{!goals ? <p className="text-sm text-foreground-muted">{t("sport.runningUi.goalsHint")}</p> : <div className="space-y-4">{goals.weekly_distance_km && <GoalProgress label={t("sport.runningUi.weeklyDistanceGoal")} current={stats.thisWeek.distanceKm} goal={goals.weekly_distance_km} format={(value) => `${formatDistance(value, language)} km`} progress={stats.goalProgress.weeklyDistance ?? 0} />}{goals.weekly_runs && <GoalProgress label={t("sport.runningUi.weeklyRunsGoal")} current={stats.thisWeek.runs} goal={goals.weekly_runs} format={(value) => String(value)} progress={stats.goalProgress.weeklyRuns ?? 0} />}{goals.monthly_distance_km && <GoalProgress label={t("sport.runningUi.monthlyDistanceGoal")} current={stats.thisMonth.distanceKm} goal={goals.monthly_distance_km} format={(value) => `${formatDistance(value, language)} km`} progress={stats.goalProgress.monthlyDistance ?? 0} />}{goals.target_5k_seconds !== null && <p className="text-sm"><span className="font-medium">{t("sport.runningUi.target5k")}:</span> {formatDuration(goals.target_5k_seconds)} <span className="text-foreground-muted">· {t("sport.runningUi.record5k")}: {stats.comparable5k ? formatDuration(stats.comparable5k.duration_seconds) : t("sport.runningUi.noRecord")}</span></p>}{goals.target_10k_seconds !== null && <p className="text-sm"><span className="font-medium">{t("sport.runningUi.target10k")}:</span> {formatDuration(goals.target_10k_seconds)} <span className="text-foreground-muted">· {t("sport.runningUi.record10k")}: {stats.comparable10k ? formatDuration(stats.comparable10k.duration_seconds) : t("sport.runningUi.noRecord")}</span></p>}</div>}</section>
      </div>}
    </SportModuleShell>
  );

  function TimeGoalField({ label, minutes, seconds, onChange }: { label: string; minutes: string; seconds: string; onChange: (minutes: string, seconds: string) => void }) {
    return <div className="min-w-0"><span className={labelClass}>{label}</span><div className="grid grid-cols-2 gap-2">
      <Field label={t("sport.runningUi.minutes")}><input type="number" inputMode="numeric" min="0" max="1439" step="1" value={minutes} className={control} onChange={(event) => onChange(event.target.value, seconds)} /></Field>
      <Field label={t("sport.runningUi.seconds")}><input type="number" inputMode="numeric" min="0" max="59" step="1" value={seconds} className={control} onChange={(event) => onChange(minutes, event.target.value)} /></Field>
    </div></div>;
  }

  function GoalProgress({ label, current, goal, format, progress }: { label: string; current: number; goal: number; format: (value: number) => string; progress: number }) {
    return <div><div className="mb-1.5 flex justify-between gap-3 text-xs"><span>{label}</span><span className="shrink-0 font-medium tabular-nums">{format(current)} / {format(goal)}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-sport transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} /></div></div>;
  }

  function ChartCard({ title, data, unit }: { title: string; data: { label: string; value: number }[]; unit: string }) {
    return <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="mb-3 text-sm font-semibold">{title}</h2><div className="h-56 w-full"><RunningDistanceChart data={data} unit={unit} language={language} /></div></section>;
  }

  function RecordCard({ title, run, value, language: recordLanguage }: { title: string; run: RunningRun | null; value: (run: RunningRun) => string; language: Language }) {
    return <section className="rounded-2xl border border-border bg-surface p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{title}</h2>{run ? <p className="mt-2 text-xl font-semibold text-sport">{value(run)}<span className="mt-1 block text-xs font-normal text-foreground-muted">{formatLocalizedDate(run.workout_date, recordLanguage, { dateStyle: "medium" })}</span></p> : <p className="mt-2 text-sm text-foreground-muted">—</p>}</section>;
  }

  function ComparableRecord({ title, run, language: recordLanguage }: { title: string; run: RunningRun | null; language: Language }) {
    return <div className="rounded-xl bg-surface-muted p-3"><p className="text-xs text-foreground-muted">{title}</p>{run ? <p className="mt-1 font-semibold tabular-nums">{formatDuration(run.duration_seconds)}<span className="ms-2 text-xs font-normal text-foreground-muted">{formatDistance(run.distance_km, recordLanguage)} km · {formatLocalizedDate(run.workout_date, recordLanguage, { dateStyle: "medium" })}</span></p> : <p className="mt-1 text-sm text-foreground-muted">{t("sport.runningUi.noRecord")}</p>}</div>;
  }

}
