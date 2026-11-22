"use client";

import { useId } from "react";
import { privacyTrim, routeGeometry, type RoutePoint } from "@/lib/running/gps";
import { formatClock } from "./format";

/** A route drawn as a line, start in green and finish in red. `hideEnds` drops the first and last 200 m. */
export function RunRoute({ route, width, height, hideEnds = true, label, className }: { route: RoutePoint[]; width: number; height: number; hideEnds?: boolean; label: string; className?: string }) {
  const id = useId();
  const shape = routeGeometry(hideEnds ? privacyTrim(route) : route, width, height, 14);
  if (!shape) return null;
  return <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={label}>
    <defs><pattern id={`${id}-grid`} width={width / 4} height={height / 4} patternUnits="userSpaceOnUse"><path d={`M ${width / 4} 0 L 0 0 0 ${height / 4}`} fill="none" stroke="var(--surface-muted)" strokeWidth="1" /></pattern></defs>
    <rect width={width} height={height} fill={`url(#${id}-grid)`} />
    <path d={shape.path} fill="none" stroke="var(--water)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={shape.start[0]} cy={shape.start[1]} r="6" fill="#34d399" stroke="var(--surface)" strokeWidth="2.5" />
    <circle cx={shape.end[0]} cy={shape.end[1]} r="6" fill="var(--danger)" stroke="var(--surface)" strokeWidth="2.5" />
  </svg>;
}

/** Seconds per km as bars: the fastest km is full length and green. */
export function SplitBars({ splits, label, vertical = false }: { splits: number[]; label: (n: number) => string; vertical?: boolean }) {
  if (!splits.length) return null;
  const fastest = Math.min(...splits);
  if (vertical) return <div>
    <div className="flex h-[70px] items-end gap-1.5 px-0.5" aria-hidden>
      {splits.map((split, index) => <span key={index} className="flex-1 rounded-t-md rounded-b-sm" style={{ height: `${Math.max(12, (fastest / split) * 100)}%`, background: split === fastest ? "var(--water)" : `color-mix(in srgb, var(--water) ${Math.round(30 + (fastest / split) * 30)}%, var(--surface-muted))` }} />)}
    </div>
    <ol className="mt-1 grid gap-1.5 text-center text-[10px] text-foreground-muted" style={{ gridTemplateColumns: `repeat(${splits.length}, minmax(0, 1fr))` }}>
      {splits.map((split, index) => <li key={index} aria-label={`${label(index + 1)} ${formatClock(split)}`} className="truncate tabular-nums" style={split === fastest ? { color: "var(--success)", fontWeight: 700 } : undefined}>{formatClock(split)}</li>)}
    </ol>
  </div>;
  return <ol className="space-y-2.5 text-[13px]">
    {splits.map((split, index) => <li key={index} className="grid grid-cols-[34px_minmax(0,1fr)_48px] items-center gap-2.5">
      <span className="text-foreground-muted">{index + 1}</span>
      <span aria-hidden className="h-2.5 rounded-full" style={{ width: `${(fastest / split) * 100}%`, background: split === fastest ? "var(--water)" : `color-mix(in srgb, var(--water) ${Math.round(30 + (fastest / split) * 30)}%, var(--surface-muted))` }} />
      <span className="text-end font-semibold tabular-nums" style={split === fastest ? { color: "var(--success)", fontWeight: 800 } : undefined}><span className="sr-only">{label(index + 1)} </span>{formatClock(split)}</span>
    </li>)}
  </ol>;
}
