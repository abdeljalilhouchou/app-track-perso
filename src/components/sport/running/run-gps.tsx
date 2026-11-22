"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useT } from "@/components/language-provider";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import type { Language } from "@/lib/language";
import { RUN_TYPE_COLORS } from "@/lib/running/colors";
import { addFix, bestEffort, currentPace, emptyTracker, privacyTrim, READY_ACCURACY_M, routeGeometry, simplifyRoute, splitsOf, type GpsRunData, type RoutePoint, type Tracker } from "@/lib/running/gps";
import { formatPace, RUN_TYPES, type RunType } from "@/lib/running/stats";
import { formatClock, formatKm, localeOf } from "./format";
import { RunRoute, SplitBars } from "./run-route";

const BLUE_INK = "#04202f";
const BLUE_TEXT = "color-mix(in srgb, var(--water) 70%, var(--foreground))";
const SETTINGS_KEY = "track-perso:run-gps-settings";
/** Without a real move for this long, auto pause stops the clock. */
const AUTO_PAUSE_MS = 12000;
/** No fix for this long while running: the signal is reported weak. */
const SIGNAL_LOST_MS = 15000;

type Signal = { phase: "locating" | "ready" | "weak" | "denied" | "unavailable"; accuracy: number | null };
type Toast = { n: number; seconds: number };
type View = { moving: number; distanceM: number; pace: number | null; kmMarks: number[]; points: RoutePoint[]; paused: boolean; autoPaused: boolean; weak: boolean; toast: Toast | null };
type Result = { distanceM: number; moving: number; pauseSeconds: number; splits: number[]; route: RoutePoint[]; best1k: number | null };
export type GpsSavePayload = { runType: RunType; distanceKm: number; durationSeconds: number; intensity: number; gps: GpsRunData };

type Run = {
  started: boolean; paused: boolean; autoPaused: boolean;
  /** Moving time banked before `since`, in ms; `since` is when the clock last started. */
  movingBase: number; since: number | null;
  pauseTotal: number; pauseFrom: number | null;
  lastMoveAt: number; lastFixAt: number; tracker: Tracker;
  toast: Toast | null; toastUntil: number; wake: { release: () => Promise<void> } | null;
};

const freshRun = (): Run => ({ started: false, paused: false, autoPaused: false, movingBase: 0, since: null, pauseTotal: 0, pauseFrom: null, lastMoveAt: 0, lastFixAt: 0, tracker: emptyTracker(), toast: null, toastUntil: 0, wake: null });
const movingMs = (run: Run, at: number) => run.movingBase + (run.since !== null ? at - run.since : 0);
const snapshot = (run: Run, at: number): View => ({
  moving: Math.floor(movingMs(run, at) / 1000), distanceM: run.tracker.distanceM, pace: currentPace(run.tracker.points, movingMs(run, at) / 1000),
  kmMarks: run.tracker.kmMarks, points: run.tracker.points, paused: run.paused, autoPaused: run.autoPaused,
  weak: run.started && at - run.lastFixAt > SIGNAL_LOST_MS, toast: at < run.toastUntil ? run.toast : null,
});
const emptyView: View = { moving: 0, distanceM: 0, pace: null, kmMarks: [], points: [], paused: false, autoPaused: false, weak: false, toast: null };

function readSettings() {
  try { const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}"); return { voice: saved.voice !== false, autoPause: saved.autoPause !== false }; }
  catch { return { voice: true, autoPause: true }; }
}

function speak(text: string, language: Language) {
  try {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = localeOf(language);
    window.speechSynthesis.speak(utterance);
  } catch {}
}

async function keepScreenOn(run: Run) {
  try {
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (wakeLock && run.started) run.wake = await wakeLock.request("screen");
  } catch {}
}

/**
 * A run tracked with the phone's GPS: a start screen that waits for a good signal,
 * the live run (distance, time, pace, route, km splits, voice updates, auto pause and
 * an in-app screen lock) and the summary to save. Without GPS it hands over to the
 * plain stopwatch.
 */
export function RunGps({ language, previousBest1k, onExit, onNoGps, onSave }: {
  language: Language;
  previousBest1k: number | null;
  onExit: () => void;
  onNoGps: (runType: RunType) => void;
  /** Returns an error message, or null once saved. */
  onSave: (payload: GpsSavePayload) => Promise<string | null>;
}) {
  const t = useT();
  const g = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.gps.${key}`, vars);
  const [signal, setSignal] = useState<Signal>({ phase: "locating", accuracy: null });
  const [settings, setSettings] = useState(readSettings);
  const [runType, setRunType] = useState<RunType>("easy");
  const [stage, setStage] = useState<"start" | "live" | "finish">("start");
  const [view, setView] = useState<View>(emptyView);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const run = useRef<Run>(freshRun());
  const latest = useRef({ settings, language, g });
  useEffect(() => { latest.current = { settings, language, g }; });

  // Watch the position from the start screen on, so the signal is ready when you go.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const timer = window.setTimeout(() => setSignal({ phase: "unavailable", accuracy: null }));
      return () => window.clearTimeout(timer);
    }
    const current = run.current;
    const watch = navigator.geolocation.watchPosition((position) => {
      const accuracy = Math.round(position.coords.accuracy);
      setSignal({ phase: accuracy <= READY_ACCURACY_M ? "ready" : "weak", accuracy });
      const state = run.current;
      if (!state.started || state.paused) return;
      const at = Date.now();
      state.lastFixAt = at;
      const before = state.tracker.kmMarks.length;
      const { tracker, added } = addFix(state.tracker, { lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy, time: position.timestamp || at }, movingMs(state, at) / 1000);
      state.tracker = tracker;
      if (added > 0) {
        state.lastMoveAt = at;
        if (state.autoPaused) {
          state.autoPaused = false; state.since = at;
          if (state.pauseFrom !== null) state.pauseTotal += at - state.pauseFrom;
          state.pauseFrom = null;
        }
      }
      if (tracker.kmMarks.length > before) {
        const n = tracker.kmMarks.length;
        const seconds = splitsOf(tracker.kmMarks)[n - 1];
        state.toast = { n, seconds }; state.toastUntil = at + 6000;
        const { settings: options, language: lang, g: text } = latest.current;
        if (options.voice) speak(text("announce", { n, min: Math.floor(seconds / 60), sec: seconds % 60 }), lang);
        try { navigator.vibrate?.(250); } catch {}
      }
      setView(snapshot(state, at));
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) setSignal({ phase: "denied", accuracy: null });
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    return () => {
      navigator.geolocation.clearWatch(watch);
      void current.wake?.release().catch(() => {});
    };
  }, []);

  // While running: a clock tick, auto pause, and the screen kept on.
  useEffect(() => {
    if (stage !== "live") return;
    const tick = window.setInterval(() => {
      const state = run.current;
      const at = Date.now();
      if (latest.current.settings.autoPause && !state.paused && !state.autoPaused && state.since !== null && at - state.lastMoveAt > AUTO_PAUSE_MS) {
        // Stop the clock from the last real move, not from now.
        state.movingBase += Math.max(0, state.lastMoveAt - state.since);
        state.since = null; state.autoPaused = true; state.pauseFrom = state.lastMoveAt;
      }
      setView(snapshot(state, at));
    }, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") void keepScreenOn(run.current); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(tick); document.removeEventListener("visibilitychange", onVisible); };
  }, [stage]);

  const changeSettings = (next: typeof settings) => {
    setSettings(next);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  };

  const start = () => {
    const at = Date.now();
    run.current = { ...freshRun(), started: true, since: at, lastMoveAt: at, lastFixAt: at };
    // Speaking once from the tap lets iOS play the later announcements.
    if (settings.voice) speak(g("announceStart"), language);
    void keepScreenOn(run.current);
    setView(snapshot(run.current, at));
    setStage("live");
  };

  const togglePause = () => {
    const state = run.current, at = Date.now();
    if (state.paused) {
      if (state.pauseFrom !== null) state.pauseTotal += at - state.pauseFrom;
      state.paused = false; state.autoPaused = false; state.pauseFrom = null; state.since = at; state.lastMoveAt = at;
    } else {
      if (state.since !== null) state.movingBase += at - state.since;
      if (state.pauseFrom === null) state.pauseFrom = at;
      state.since = null; state.paused = true;
    }
    setView(snapshot(state, at));
  };

  const finish = () => {
    const state = run.current, at = Date.now();
    if (state.since !== null) state.movingBase += at - state.since;
    if (state.pauseFrom !== null) state.pauseTotal += at - state.pauseFrom;
    state.since = null; state.pauseFrom = null; state.started = false;
    void state.wake?.release().catch(() => {});
    state.wake = null;
    const route = simplifyRoute(state.tracker.points);
    setResult({
      distanceM: state.tracker.distanceM, moving: Math.max(1, Math.round(state.movingBase / 1000)), pauseSeconds: Math.round(state.pauseTotal / 1000),
      splits: splitsOf(state.tracker.kmMarks), route, best1k: state.tracker.distanceM >= 1000 ? bestEffort(route, 1000) : null,
    });
    setLocked(false);
    setStage("finish");
  };

  return <div data-run-gps>
    <span hidden data-strength-header />
    {stage === "start" && <GpsStart signal={signal} settings={settings} runType={runType} onRunType={setRunType} onSettings={changeSettings} onStart={start} onBack={onExit} onNoGps={() => onNoGps(runType)} />}
    {stage === "live" && <GpsLive view={view} language={language} runType={runType} onLock={() => setLocked(true)} onPause={togglePause} onFinish={finish} />}
    {stage === "live" && locked && <GpsLock view={view} language={language} onUnlock={() => setLocked(false)} />}
    {stage === "finish" && result && <GpsFinish result={result} runType={runType} language={language} previousBest1k={previousBest1k} onDiscard={onExit} onSave={onSave} />}
  </div>;
}

function Switch({ on, label, hint, icon, onToggle }: { on: boolean; label: string; hint: string; icon: "volume" | "pause"; onToggle: () => void }) {
  return <button type="button" role="switch" aria-checked={on} onClick={onToggle} className="flex w-full items-center gap-3 p-3.5 text-start">
    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]" style={{ background: "color-mix(in srgb, var(--water) 14%, transparent)", color: BLUE_TEXT }}>
      {icon === "volume"
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>}
    </span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-foreground-muted">{hint}</span></span>
    <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full transition-colors" style={{ background: on ? "var(--water)" : "var(--surface-muted)" }}>
      <span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all" style={{ insetInlineStart: on ? 23 : 3 }} />
    </span>
  </button>;
}

function GpsStart({ signal, settings, runType, onRunType, onSettings, onStart, onBack, onNoGps }: {
  signal: Signal; settings: { voice: boolean; autoPause: boolean }; runType: RunType;
  onRunType: (type: RunType) => void; onSettings: (next: { voice: boolean; autoPause: boolean }) => void;
  onStart: () => void; onBack: () => void; onNoGps: () => void;
}) {
  const t = useT();
  const g = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.gps.${key}`, vars);
  const r = (key: string) => t(`sport.runningUi.${key}`);
  const blocked = signal.phase === "denied" || signal.phase === "unavailable";
  const tone = signal.phase === "ready" ? "#34d399" : signal.phase === "weak" ? "var(--nutrition)" : blocked ? "var(--danger)" : "var(--foreground-muted)";
  const title = g(signal.phase === "locating" ? "searching" : signal.phase);
  const hint = signal.phase === "locating" ? g("searchingHint") : g(`${signal.phase}Hint`, { m: signal.accuracy ?? "—" });
  const bars = signal.phase === "ready" ? 4 : signal.phase === "weak" ? 2 : 0;

  return <section className="mx-auto flex max-w-md flex-col gap-[18px]" aria-labelledby="run-gps-title" data-run-gps-start>
    <header className="flex items-center gap-3">
      <button type="button" onClick={onBack} aria-label={t("sport.runningUi.v3.backRunning")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface transition hover:bg-surface-muted"><SportIcon name="chevron" className="sport-context-back-icon h-4 w-4" /></button>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold" style={{ color: BLUE_TEXT }}>{t("sport.hub.running.title")}</p><h1 id="run-gps-title" className="truncate text-[26px] font-bold leading-tight tracking-tight">{t("sport.runningUi.v3.goRun")}</h1></div>
    </header>

    <div role="status" aria-live="polite" className="flex items-center gap-3.5 rounded-[22px] border p-4" style={{ borderColor: `color-mix(in srgb, ${tone} 38%, var(--border))`, background: `radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, ${tone} 16%, transparent), var(--surface) 70%)` }} data-gps-signal={signal.phase}>
      <span aria-hidden className="relative grid h-[52px] w-[52px] shrink-0 place-items-center">
        <span className={`absolute inset-0 rounded-full border-2 ${signal.phase === "locating" ? "animate-ping" : ""}`} style={{ borderColor: `color-mix(in srgb, ${tone} 35%, transparent)` }} />
        <span className="absolute inset-[10px] rounded-full border-2" style={{ borderColor: `color-mix(in srgb, ${tone} 60%, transparent)` }} />
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: tone }} />
      </span>
      <span className="min-w-0 flex-1"><span className="block text-base font-extrabold">{title}</span><span className="mt-0.5 block text-[13px] leading-snug text-foreground-muted">{hint}</span></span>
      {!blocked && <span aria-hidden className="flex items-end gap-[3px]">{[8, 13, 18, 23].map((height, index) => <span key={height} className="w-[5px] rounded-sm" style={{ height, background: index < bars ? tone : "var(--surface-muted)" }} />)}</span>}
    </div>

    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-foreground-muted">{g("runType")}</h2>
      <div role="group" aria-label={g("runType")} className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {RUN_TYPES.map((type) => { const active = type === runType; const color = RUN_TYPE_COLORS[type]; return <button key={type} type="button" aria-pressed={active} onClick={() => onRunType(type)} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold" style={active ? { border: `1.5px solid ${color}`, background: `color-mix(in srgb, ${color} 18%, var(--surface))` } : { border: "1px solid var(--border)", color: "var(--foreground-muted)" }}><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />{r(`runTypes.${type}`)}</button>; })}
      </div>
    </section>

    <div className="divide-y divide-surface-muted overflow-hidden rounded-[20px] border border-border bg-surface">
      <Switch on={settings.voice} label={g("voice")} hint={g("voiceHint")} icon="volume" onToggle={() => onSettings({ ...settings, voice: !settings.voice })} />
      <Switch on={settings.autoPause} label={g("autoPause")} hint={g("autoPauseHint")} icon="pause" onToggle={() => onSettings({ ...settings, autoPause: !settings.autoPause })} />
    </div>

    <p className="rounded-2xl border px-3.5 py-3 text-[12.5px] leading-relaxed" style={{ background: "color-mix(in srgb, var(--nutrition) 10%, transparent)", borderColor: "color-mix(in srgb, var(--nutrition) 30%, transparent)", color: "color-mix(in srgb, var(--nutrition) 75%, var(--foreground))" }}>{g("screenNote")}</p>

    {blocked
      ? <button type="button" onClick={onNoGps} className="flex min-h-16 items-center justify-center gap-2.5 rounded-[22px] text-lg font-black" style={{ background: "var(--water)", color: BLUE_INK }} data-run-gps-nogps-main>{g("noGps")}</button>
      : <>
        <button type="button" onClick={onStart} disabled={signal.phase === "locating"} className="flex min-h-16 items-center justify-center gap-2.5 rounded-[22px] text-lg font-black transition disabled:opacity-45" style={{ background: "var(--water)", color: BLUE_INK, boxShadow: "0 10px 30px color-mix(in srgb, var(--water) 30%, transparent)" }} data-run-gps-go>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>{g("start")}
        </button>
        <button type="button" onClick={onNoGps} className="-mt-1.5 min-h-10 text-[13px] font-semibold text-foreground-muted" data-run-gps-nogps>{g("noGps")}</button>
      </>}
  </section>;
}

function GpsLive({ view, language, runType, onLock, onPause, onFinish }: { view: View; language: Language; runType: RunType; onLock: () => void; onPause: () => void; onFinish: () => void }) {
  const t = useT();
  const g = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.gps.${key}`, vars);
  const w = (key: string) => t(`sport.runningUi.v3.${key}`);
  const splits = splitsOf(view.kmMarks);
  const fastest = splits.length ? Math.min(...splits) : 0;
  const recent = splits.map((value, index) => ({ n: index + 1, value })).reverse().slice(0, 4);
  const average = view.distanceM >= 50 ? (view.moving / view.distanceM) * 1000 : null;
  const partial = (view.distanceM - view.kmMarks.length * 1000) / 1000;
  const shape = routeGeometry(view.points, 100, 140, 12);
  const paused = view.paused || view.autoPaused;
  const status = view.paused ? w("pause") : view.autoPaused ? g("autoPaused") : `${w("live")} · ${t(`sport.runningUi.runTypes.${runType}`)}`;

  return <section aria-label={w("live")} className="mx-auto flex max-w-md flex-col gap-3.5 rounded-[28px] border p-4" style={{ minHeight: "min(720px, calc(100dvh - 9rem))", borderColor: "color-mix(in srgb, var(--water) 40%, var(--border))", background: "radial-gradient(120% 55% at 50% 22%, color-mix(in srgb, var(--water) 16%, transparent), var(--surface) 70%)" }} data-run-gps-live>
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: paused ? "var(--nutrition)" : "var(--danger)", boxShadow: paused ? undefined : "0 0 0 4px color-mix(in srgb, var(--danger) 25%, transparent)" }} />
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold uppercase tracking-wide" style={{ color: paused ? "color-mix(in srgb, var(--nutrition) 75%, var(--foreground))" : "color-mix(in srgb, var(--danger) 70%, var(--foreground))" }}>{status}</span>
      <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={view.weak ? { background: "color-mix(in srgb, var(--nutrition) 16%, transparent)", color: "color-mix(in srgb, var(--nutrition) 75%, var(--foreground))" } : { background: "color-mix(in srgb, #34d399 14%, transparent)", color: "#6ee7b7" }}>
        <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: view.weak ? "var(--nutrition)" : "#34d399" }} />{view.weak ? g("signalLost") : "GPS"}
      </span>
    </div>

    <div className="mt-1 text-center">
      <p className="text-[92px] font-black leading-none tracking-tight tabular-nums" data-run-gps-distance>{formatKm(view.distanceM / 1000, language, 2)}</p>
      <p className="mt-1 text-sm text-foreground-muted">{g("km")}</p>
    </div>

    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-[18px] border border-border bg-surface px-2 py-3 text-center"><p className="text-[11px] text-foreground-muted">{g("time")}</p><p className="mt-1 text-[21px] font-extrabold tabular-nums" role="timer" data-run-gps-clock>{formatClock(view.moving)}</p></div>
      <div className="rounded-[18px] border px-2 py-3 text-center" style={{ background: "color-mix(in srgb, var(--water) 16%, var(--surface))", borderColor: "color-mix(in srgb, var(--water) 40%, var(--border))" }}><p className="text-[11px]" style={{ color: BLUE_TEXT }}>{g("pace")}</p><p className="mt-1 text-[21px] font-extrabold tabular-nums">{paused ? "—" : formatPace(view.pace)}</p></div>
      <div className="rounded-[18px] border border-border bg-surface px-2 py-3 text-center"><p className="text-[11px] text-foreground-muted">{g("average")}</p><p className="mt-1 text-[21px] font-extrabold tabular-nums">{formatPace(average)}</p></div>
    </div>

    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5">
      <div className="grid h-[150px] place-items-center rounded-[18px] border border-border bg-surface">
        {shape ? <svg viewBox="0 0 100 140" className="h-[140px] w-[100px]" role="img" aria-label={g("trace")}>
          <path d={shape.path} fill="none" stroke="var(--water)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={shape.end[0]} cy={shape.end[1]} r="11" fill="none" stroke="color-mix(in srgb, var(--water) 35%, transparent)" strokeWidth="2" />
          <circle cx={shape.end[0]} cy={shape.end[1]} r="6" fill="var(--water)" stroke="var(--surface)" strokeWidth="2" />
        </svg> : <span aria-hidden className="h-3 w-3 animate-pulse rounded-full" style={{ background: "var(--water)" }} />}
      </div>
      <ol className="flex flex-col gap-0.5 text-[13px]" data-run-gps-splits>
        <li className="flex justify-between rounded-[10px] bg-surface px-2.5 py-2 text-foreground-muted"><span>{g("kmNow", { n: view.kmMarks.length + 1 })}</span><span className="font-bold text-foreground tabular-nums">{formatKm(Math.max(0, partial), language, 2)}</span></li>
        {recent.map((split) => <li key={split.n} className="flex justify-between px-2.5 py-2"><span className="text-foreground-muted">{g("kmN", { n: split.n })}</span><span className="font-semibold tabular-nums" style={split.value === fastest && splits.length > 1 ? { color: "var(--success)", fontWeight: 700 } : undefined}>{formatClock(split.value)}{split.value === fastest && splits.length > 1 ? " ▲" : ""}</span></li>)}
      </ol>
    </div>

    {view.toast && <div role="status" className="flex items-center gap-2 self-center rounded-full px-3.5 py-2 text-[13px] font-bold" style={{ background: "var(--foreground)", color: "var(--background)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>
      {g("kmN", { n: view.toast.n })} · {formatClock(view.toast.seconds)}
    </div>}

    <div className="flex-1" />
    <div className="grid grid-cols-[1fr_1.4fr_1fr] items-center gap-2.5">
      <button type="button" onClick={onLock} className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-[20px] border border-border bg-surface text-xs font-bold" data-run-gps-lock>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>{g("lock")}
      </button>
      <button type="button" onClick={onPause} className="flex min-h-20 items-center justify-center gap-2 rounded-[26px] text-base font-extrabold" style={{ background: "var(--foreground)", color: "var(--background)" }} data-run-gps-pause>
        {view.paused
          ? <><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>{w("resume")}</>
          : <><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>{w("pause")}</>}
      </button>
      <button type="button" onClick={onFinish} className="min-h-16 rounded-[20px] text-sm font-extrabold" style={{ background: "var(--water)", color: BLUE_INK }} data-run-gps-finish>{w("finish")}</button>
    </div>
  </section>;
}

function GpsLock({ view, language, onUnlock }: { view: View; language: Language; onUnlock: () => void }) {
  const t = useT();
  const g = (key: string) => t(`sport.runningUi.v3.gps.${key}`);
  const [slide, setSlide] = useState(0);
  const release = () => { if (slide >= 90) onUnlock(); else setSlide(0); };
  return <div role="dialog" aria-modal="true" aria-label={g("locked")} className="fixed inset-0 z-[90] flex flex-col items-center gap-2.5 bg-black px-5 text-[#cfd2dc]" style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)", touchAction: "none" } as CSSProperties} data-run-gps-locked>
    <p className="flex items-center gap-2 text-[13px] font-bold text-[#6b6b80]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>{g("locked")}</p>
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-7">
      <div className="text-center"><p className="text-[110px] font-black leading-none tracking-tight tabular-nums">{formatKm(view.distanceM / 1000, language, 2)}</p><p className="mt-1.5 text-[15px] text-[#6b6b80]">km</p></div>
      <div className="grid w-full max-w-sm grid-cols-2 gap-3 text-center">
        <div><p className="text-[44px] font-extrabold tabular-nums">{formatClock(view.moving)}</p><p className="text-[13px] text-[#6b6b80]">{g("time")}</p></div>
        <div><p className="text-[44px] font-extrabold tabular-nums text-[#7dd3fc]">{view.paused || view.autoPaused ? "—" : formatPace(view.pace)}</p><p className="text-[13px] text-[#6b6b80]">{g("paceUnit")}</p></div>
      </div>
    </div>
    <p className="text-center text-xs text-[#6b6b80]">{g("lockedHint")}</p>
    <label className="relative block h-16 w-full max-w-sm">
      <span className="sr-only">{g("unlock")}</span>
      <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center rounded-full border border-[#23232e] bg-[#121218] text-sm font-semibold text-[#6b6b80]">{g("unlock")} →</span>
      <span aria-hidden className="pointer-events-none absolute top-1.5 grid h-[52px] w-[52px] place-items-center rounded-full" style={{ insetInlineStart: `calc(6px + (100% - 64px) * ${slide / 100})`, background: "var(--water)", color: BLUE_INK }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></svg>
      </span>
      <input type="range" min="0" max="100" value={slide} onChange={(event) => setSlide(Number(event.target.value))} onPointerUp={release} onKeyUp={release} onTouchEnd={release} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" data-run-gps-unlock />
    </label>
  </div>;
}

function GpsFinish({ result, runType, language, previousBest1k, onDiscard, onSave }: { result: Result; runType: RunType; language: Language; previousBest1k: number | null; onDiscard: () => void; onSave: (payload: GpsSavePayload) => Promise<string | null> }) {
  const t = useT();
  const g = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.gps.${key}`, vars);
  const r = (key: string) => t(`sport.runningUi.${key}`);
  const [intensity, setIntensity] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = result.distanceM < 10;
  const km = result.distanceM / 1000;
  const record = result.best1k !== null && (previousBest1k === null || result.best1k < previousBest1k);
  const discard = () => { if (window.confirm(g("discardConfirm"))) onDiscard(); };
  const save = async () => {
    setSaving(true); setError(null);
    const message = await onSave({ runType, distanceKm: Math.round(km * 1000) / 1000, durationSeconds: result.moving, intensity, gps: { route: result.route, splits: result.splits, pauseSeconds: result.pauseSeconds } });
    if (message) { setError(message); setSaving(false); }
  };
  const stat = "rounded-[18px] border border-border bg-surface p-3.5";

  return <section className="mx-auto flex max-w-md flex-col gap-4" aria-labelledby="run-gps-done" data-run-gps-finish-screen>
    <header className="pt-2 text-center">
      <p className="text-[13px] font-bold" style={{ color: BLUE_TEXT }}>{g("done")}</p>
      <h1 id="run-gps-done" className="mt-1 text-[30px] font-extrabold tracking-tight">{g("bravo", { km: formatKm(km, language, 2) })}</h1>
    </header>

    {tooShort ? <p className="rounded-2xl bg-surface-muted p-4 text-center text-sm text-foreground-muted">{g("tooShort")}</p> : <>
      {privacyTrim(result.route).length > 1 && <figure className="relative overflow-hidden rounded-[22px] border border-border" style={{ background: "radial-gradient(90% 90% at 50% 40%, color-mix(in srgb, var(--water) 12%, transparent), var(--surface) 75%)" }}>
        <RunRoute route={result.route} width={358} height={230} label={t("sport.runningUi.v3.gps.trace")} className="block h-auto w-full" />
        <figcaption className="absolute bottom-2.5 start-3 rounded-full bg-background/80 px-2.5 py-1 text-[11px] text-foreground-muted">{g("hiddenEnds")}</figcaption>
      </figure>}

      <div className="grid grid-cols-2 gap-2">
        <div className={stat}><p className="text-xs text-foreground-muted">{g("distance")} <span className="text-[#6ee7b7]">· GPS</span></p><p className="mt-1 text-2xl font-extrabold tabular-nums">{formatKm(km, language, 2)} km</p></div>
        <div className={stat}><p className="text-xs text-foreground-muted">{g("time2")}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{formatClock(result.moving)}</p></div>
        <div className="rounded-[18px] border p-3.5" style={{ background: "color-mix(in srgb, var(--water) 14%, var(--surface))", borderColor: "color-mix(in srgb, var(--water) 35%, var(--border))" }}><p className="text-xs" style={{ color: BLUE_TEXT }}>{g("averagePace")}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{formatPace(km > 0 ? result.moving / km : null)} /km</p></div>
        <div className={stat}><p className="text-xs text-foreground-muted">{g("pauses")}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{formatClock(result.pauseSeconds)}</p></div>
      </div>

      {record && result.best1k !== null && <div className="flex items-center gap-2.5 rounded-2xl border px-3.5 py-3" style={{ background: "color-mix(in srgb, var(--nutrition) 12%, transparent)", borderColor: "color-mix(in srgb, var(--nutrition) 35%, transparent)" }} data-run-gps-record>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--nutrition)" aria-hidden><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
        <span className="text-sm font-bold" style={{ color: "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" }}>{g("newRecord", { time: formatClock(result.best1k) })}</span>
      </div>}

      {result.splits.length > 0 && <section className="space-y-2">
        <h2 className="text-[15px] font-semibold">{g("splits")}</h2>
        <div className="rounded-[20px] border border-border bg-surface px-3.5 py-3"><SplitBars splits={result.splits} label={(n) => g("kmN", { n })} /></div>
        <p className="text-xs text-foreground-muted">{g("splitsHint")}</p>
      </section>}

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-foreground-muted">{g("feeling")}</h2>
        <div role="group" aria-label={g("feeling")} className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => { const active = value === intensity; return <button key={value} type="button" aria-pressed={active} aria-label={`${value} · ${r(`intensityValues.${value}`)}`} onClick={() => setIntensity(value)} className="min-h-12 rounded-[14px] text-base" style={active ? { border: "1.5px solid var(--water)", background: "color-mix(in srgb, var(--water) 16%, var(--surface))", color: BLUE_TEXT, fontWeight: 800 } : { border: "1px solid var(--border)", fontWeight: 700 }}>{value}</button>; })}
        </div>
      </section>
    </>}

    {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
    {!tooShort && <button type="button" onClick={() => void save()} disabled={saving} className="min-h-[58px] rounded-[18px] text-[17px] font-extrabold disabled:opacity-50" style={{ background: "var(--water)", color: BLUE_INK }} data-run-gps-save>{saving ? r("saving") : g("save")}</button>}
    <button type="button" onClick={tooShort ? onDiscard : discard} className="min-h-11 text-sm font-semibold text-danger" data-run-gps-discard>{tooShort ? t("sport.runningUi.v3.backRunning") : g("discard")}</button>
  </section>;
}
