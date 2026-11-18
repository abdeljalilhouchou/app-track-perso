"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Small building blocks shared by the Running and Calisthenics workspaces, so both
 * modules read alike. Presentation only: no data, no navigation.
 */

export type Tone = "good" | "bad" | "neutral";

/** A compact figure: label, value with unit, and an optional comparison line. */
export function ModuleStat({ label, value, unit, delta, tone = "neutral", children }: { label: string; value: ReactNode; unit?: string; delta?: string; tone?: Tone; children?: ReactNode }) {
  return <div className="module-stat">
    <p className="module-stat-label">{label}</p>
    <p className="module-stat-value"><bdi>{value}</bdi>{unit && <span className="module-stat-unit">{unit}</span>}</p>
    {delta && <p className="module-stat-delta" data-tone={tone}>{delta}</p>}
    {children}
  </div>;
}

/** A titled card; `action` sits on the title row (a link or a small button). */
export function ModuleCard({ title, action, children, className, highlight = false }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; highlight?: boolean }) {
  return <section className={clsx("module-card", highlight && "is-highlight", className)}>
    {(title || action) && <div className="module-card-head">{title && <h2 className="module-card-title">{title}</h2>}{action}</div>}
    {children}
  </section>;
}

/** A pill row where one option is selected; wraps on narrow screens. */
export function ModuleChips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="module-chips">
    {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className="module-chip">{option.label}</button>)}
  </div>;
}

/** Large ring for a goal: `center` is the figure inside, the rest sits beside it. */
export function ModuleRing({ value, max, label, center, size = 112 }: { value: number; max: number; label: string; center: ReactNode; size?: number }) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return <div className="module-ring" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} className="module-ring-track" />
      <circle cx={size / 2} cy={size / 2} r={radius} className="module-ring-value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
    <div className="module-ring-center">{center}</div>
  </div>;
}

/** Simple vertical bars drawn to one scale; the highlighted bar is the current period. */
export function ModuleBars({ label, bars }: { label: string; bars: { key: string; label: string; value: number; highlight?: boolean }[] }) {
  const max = Math.max(...bars.map((bar) => bar.value), 0);
  return <figure className="module-bars" aria-label={label}>
    <div className="module-bars-plot" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
      {bars.map((bar) => <span key={bar.key} className="module-bar" data-highlight={bar.highlight || undefined} style={{ height: `${max > 0 ? Math.max(4, (bar.value / max) * 100) : 4}%` }} title={`${bar.label} : ${bar.value}`} />)}
    </div>
    <figcaption className="module-bars-axis" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
      {bars.map((bar) => <span key={bar.key} data-highlight={bar.highlight || undefined}>{bar.label}</span>)}
    </figcaption>
  </figure>;
}

/** Small rounded label (a run type, a level, a "new" badge). */
export function ModulePill({ children, tone = "sport" }: { children: ReactNode; tone?: "sport" | "accent" | "neutral" | "warning" }) {
  return <span className="module-pill" data-tone={tone}>{children}</span>;
}
