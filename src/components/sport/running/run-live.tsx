"use client";

import { useT } from "@/components/language-provider";
import { formatClock } from "./format";

const BLUE_INK = "#04202f";

/** A running stopwatch with laps. No GPS: once stopped, the run form opens with the time filled in. */
export function RunLive({ elapsedMs, running, laps, runType, onPause, onResume, onLap, onCancel, onFinish }: {
  elapsedMs: number;
  running: boolean;
  /** Elapsed milliseconds at each lap press, oldest first. */
  laps: number[];
  runType: string;
  onPause: () => void;
  onResume: () => void;
  onLap: () => void;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const t = useT();
  const w = (key: string, vars?: Record<string, string | number>) => t(`sport.runningUi.v3.${key}`, vars);
  const seconds = Math.floor(elapsedMs / 1000);
  const splits = laps.map((mark, index) => Math.round((mark - (laps[index - 1] ?? 0)) / 1000));
  const recent = splits.map((value, index) => ({ n: index + 1, value, faster: index > 0 && value < splits[index - 1] })).reverse().slice(0, 4);

  return <section aria-labelledby="run-live-title" className="mx-auto flex max-w-md flex-col gap-4 rounded-[28px] border p-4" style={{ minHeight: "min(680px, calc(100dvh - 11rem))", borderColor: "color-mix(in srgb, var(--water) 40%, var(--border))", background: "radial-gradient(120% 60% at 50% 35%, color-mix(in srgb, var(--water) 16%, transparent), var(--surface) 70%)" }} data-run-live>
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: running ? "var(--danger)" : "var(--foreground-muted)", boxShadow: running ? "0 0 0 4px color-mix(in srgb, var(--danger) 25%, transparent)" : undefined }} />
      <h2 id="run-live-title" className="flex-1 text-[13px] font-bold uppercase tracking-wide" style={{ color: running ? "color-mix(in srgb, var(--danger) 70%, var(--foreground))" : "var(--foreground-muted)" }}>{w("live")} · {runType}</h2>
      <button type="button" onClick={onCancel} className="min-h-9 rounded-xl border border-border px-3 text-[13px] font-semibold text-foreground-muted">{w("cancel")}</button>
    </div>

    <div role="timer" aria-live="off" className="flex flex-1 flex-col items-center justify-center gap-2">
      <span className="text-[88px] font-black leading-none tracking-tight tabular-nums" data-run-live-clock>{formatClock(seconds)}</span>
      <span className="text-sm text-foreground-muted">{w("runningTime")}</span>
      {laps.length > 0 && <>
        <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
          <div className="rounded-[18px] border border-border bg-surface p-3.5 text-center"><p className="text-[11px] text-foreground-muted">{w("laps")}</p><p className="mt-1 text-[22px] font-extrabold tabular-nums">{laps.length}</p></div>
          <div className="rounded-[18px] border border-border bg-surface p-3.5 text-center"><p className="text-[11px] text-foreground-muted">{w("lastLap")}</p><p className="mt-1 text-[22px] font-extrabold tabular-nums">{formatClock(splits[splits.length - 1])}</p></div>
        </div>
        <ol className="mt-2 w-full text-[13px] text-foreground-muted">
          {recent.map((lap) => <li key={lap.n} className="flex justify-between border-b border-border px-1 py-1.5 last:border-0"><span>{w("lapN", { n: lap.n })}</span><span className="tabular-nums" style={lap.faster ? { color: "var(--success)", fontWeight: 700 } : undefined}>{formatClock(lap.value)}{lap.faster ? " ▲" : ""}</span></li>)}
        </ol>
      </>}
    </div>

    <p className="text-center text-xs text-foreground-muted">{w("noGps")}</p>
    <div className="grid grid-cols-[1fr_1.4fr_1fr] items-center gap-2.5">
      <button type="button" onClick={onLap} disabled={!running} className="min-h-16 rounded-[20px] border border-border bg-surface text-sm font-bold disabled:opacity-40" data-run-lap>{w("lap")}</button>
      {running
        ? <button type="button" onClick={onPause} className="min-h-20 rounded-[26px] bg-foreground text-base font-extrabold text-background" data-run-pause>{w("pause")}</button>
        : <button type="button" onClick={onResume} className="min-h-20 rounded-[26px] text-base font-extrabold" style={{ background: "var(--water)", color: BLUE_INK }} data-run-resume>{w("resume")}</button>}
      <button type="button" onClick={onFinish} disabled={seconds < 1} className="min-h-16 rounded-[20px] text-sm font-extrabold disabled:opacity-40" style={{ background: "var(--water)", color: BLUE_INK }} data-run-finish>{w("finish")}</button>
    </div>
  </section>;
}
