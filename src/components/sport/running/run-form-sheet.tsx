"use client";

import { useEffect, useRef, type FormEvent } from "react";
import { useT } from "@/components/language-provider";
import { ModuleChips } from "@/components/sport/ui/module-kit";
import type { Language } from "@/lib/language";
import { calculateRunningMetrics, formatPace, parseDuration, RUN_TYPES, type RunType } from "@/lib/running/stats";
import { formatClock, formatKm } from "./format";

export type RunForm = {
  date: string; name: string; runType: RunType; distance: string; duration: string;
  intensity: string; notes: string; elevation: string; heartRate: string; cadence: string;
};

export const readDistance = (text: string) => Number(text.trim().replace(",", "."));

/**
 * Log or edit a run, in a sheet over the current tab: it rises from the bottom on a
 * phone and opens as a dialog on wider screens. The workspace owns the form and the
 * stopwatch, so closing the sheet loses neither.
 */
export function RunFormSheet({ form, update, editing, saving, error, maxDate, language, stopwatch, onSubmit, onClose }: {
  form: RunForm;
  update: <K extends keyof RunForm>(key: K, value: RunForm[K]) => void;
  editing: boolean;
  saving: boolean;
  error: string | null;
  maxDate: string;
  language: Language;
  stopwatch: { elapsedMs: number; running: boolean; start: () => void; pause: () => void; reset: () => void };
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const t = useT();
  const r = (key: string) => t(`sport.runningUi.${key}`);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const panel = dialog.current;
    const overflow = document.body.style.overflow;
    panel?.showModal();
    document.body.style.overflow = "hidden";
    return () => { panel?.close(); document.body.style.overflow = overflow; };
  }, []);

  const seconds = parseDuration(form.duration);
  const distance = readDistance(form.distance);
  const metrics = seconds && distance > 0 ? calculateRunningMetrics(distance, seconds) : null;
  const elapsed = Math.floor(stopwatch.elapsedMs / 1000);

  return <dialog ref={dialog} className="sport-ui run-sheet" aria-labelledby="run-sheet-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <form onSubmit={onSubmit} className="run-sheet-form">
      <div className="run-sheet-head">
        <span className="run-sheet-grip" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="run-sheet-title" className="text-[22px] font-bold tracking-tight">{r(editing ? "editRun" : "newRun")}</h2>
          <button type="button" className="run-sheet-close" aria-label={r("close")} onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="run-sheet-body">
        {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{r("runTypeLabel")}</p>
          <ModuleChips label={r("runTypeLabel")} value={form.runType} options={RUN_TYPES.map((type) => ({ value: type, label: r(`runTypes.${type}`) }))} onChange={(value) => update("runType", value)} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="run-big-field">
            <span>{r("distanceLabel")}</span>
            <span className="run-big-input"><input required inputMode="decimal" autoComplete="off" value={form.distance} placeholder="0,0" onChange={(event) => update("distance", event.target.value)} data-run-distance /><em>km</em></span>
          </label>
          <label className="run-big-field">
            <span>{r("duration")}</span>
            <span className="run-big-input"><input required inputMode="numeric" autoComplete="off" value={form.duration} placeholder={r("durationPlaceholder")} onChange={(event) => update("duration", event.target.value)} data-run-duration /></span>
          </label>
        </div>

        {metrics && <div data-run-metrics className="grid grid-cols-2 rounded-2xl border px-4 py-3" style={{ background: "var(--sport-soft)", borderColor: "color-mix(in srgb, var(--sport) 30%, var(--border))" }}>
          <div><p className="text-xs text-foreground-muted">{r("computedPace")}</p><p className="mt-1 text-[22px] font-bold" style={{ color: "var(--sport-ink)" }}>{formatPace(metrics.paceSecondsPerKm)} <span className="text-[13px]">{r("minPerKm")}</span></p></div>
          <div><p className="text-xs text-foreground-muted">{r("speed")}</p><p className="mt-1 text-[22px] font-bold" style={{ color: "var(--sport-ink)" }}>{formatKm(metrics.speedKmh, language)} <span className="text-[13px]">{r("kmPerHour")}</span></p></div>
        </div>}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{r("feeling")}</p>
          <div role="group" aria-label={r("feeling")} className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={form.intensity === String(value)} className="run-feel" onClick={() => update("intensity", String(value))}>
              <span className="text-base font-bold">{value}</span><span>{r(`intensityValues.${value}`)}</span>
            </button>)}
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2.5">
          <label className="run-field"><span>{r("date")}</span><input required type="date" max={maxDate} value={form.date} onChange={(event) => update("date", event.target.value)} /></label>
          <label className="run-field"><span>{r("notes")}</span><input maxLength={2000} value={form.notes} placeholder={r("notesPlaceholder")} onChange={(event) => update("notes", event.target.value)} /></label>
        </div>

        <details className="run-more">
          <summary>{r("moreDetails")}</summary>
          <div className="grid grid-cols-2 gap-2.5 pt-3">
            <label className="run-field col-span-2"><span>{r("name")}</span><input maxLength={100} value={form.name} placeholder={r("namePlaceholder")} onChange={(event) => update("name", event.target.value)} /></label>
            <label className="run-field"><span>{r("elevation")}</span><input inputMode="numeric" value={form.elevation} onChange={(event) => update("elevation", event.target.value)} /></label>
            <label className="run-field"><span>{r("heartRate")}</span><input inputMode="numeric" value={form.heartRate} onChange={(event) => update("heartRate", event.target.value)} /></label>
            <label className="run-field col-span-2"><span>{r("cadence")}</span><input inputMode="numeric" value={form.cadence} onChange={(event) => update("cadence", event.target.value)} /></label>
          </div>
        </details>

        <details className="run-more" open={stopwatch.running || stopwatch.elapsedMs > 0 || undefined}>
          <summary>{r("useStopwatch")}</summary>
          <div className="space-y-3 pt-3">
            <p aria-live="polite" className="text-center text-4xl font-bold tabular-nums" style={{ color: "var(--sport-ink)" }}>{formatClock(elapsed)}</p>
            <div className="grid grid-cols-3 gap-2">
              {stopwatch.running
                ? <button type="button" className="module-secondary" onClick={stopwatch.pause}>{r("pauseTimer")}</button>
                : <button type="button" className="module-secondary" onClick={stopwatch.start}>{r(elapsed > 0 ? "resumeTimer" : "startTimer")}</button>}
              <button type="button" className="module-secondary" onClick={stopwatch.reset}>{r("resetTimer")}</button>
              <button type="button" className="module-secondary" disabled={elapsed < 1 || stopwatch.running} onClick={() => update("duration", formatClock(elapsed))}>{r("useTimer")}</button>
            </div>
            <p className="text-xs text-foreground-muted">{r("timerHint")}</p>
          </div>
        </details>
      </div>

      <div className="run-sheet-foot">
        <button type="submit" className="module-primary" disabled={saving}>{saving ? r("saving") : r(editing ? "updateRun" : "saveRunFull")}</button>
      </div>
    </form>
  </dialog>;
}
