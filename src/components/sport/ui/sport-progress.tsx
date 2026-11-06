import type { CSSProperties } from "react";
import clsx from "clsx";
import { SportIcon } from "./sport-icons";

// Presentation bounds only; never changes totals, records or goal calculations.
export function progressPresentation(value: number | null, max: number) {
  if (value === null || !Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return null;
  const current = Math.min(max, Math.max(0, value));
  return { current, max, percent: current / max * 100 };
}

type ProgressProps = { label: string; value: number | null; max?: number; valueText?: string; className?: string };

export function SportProgressBar({ label, value, max = 100, valueText, className }: ProgressProps) {
  const progress = progressPresentation(value, max);
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={progress?.max ?? 100} aria-valuenow={progress?.current} aria-valuetext={valueText} className={clsx("sport-progress-track", className)}>
    <div className="sport-progress-fill" style={{ width: `${progress?.percent ?? 0}%` }} />
  </div>;
}

export function SportProgressRing({ label, value, max = 100, valueText, className }: ProgressProps & { valueText: string }) {
  const progress = progressPresentation(value, max);
  const circumference = 2 * Math.PI * 20;
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={progress?.max ?? 100} aria-valuenow={progress?.current} aria-valuetext={valueText} className={clsx("sport-progress-ring", className)} style={{ "--sport-ring-offset": circumference * (1 - (progress?.percent ?? 0) / 100) } as CSSProperties}>
    <svg aria-hidden="true" viewBox="0 0 48 48"><circle className="sport-ring-track" cx="24" cy="24" r="20" /><circle className="sport-ring-value" cx="24" cy="24" r="20" strokeDasharray={circumference} /></svg>
    <span aria-hidden="true" className="sport-ring-label"><bdi>{valueText}</bdi></span>
  </div>;
}

export function PersonalRecordBadge({ label, value, description }: { label: string; value: string; description?: string }) {
  return <div className="sport-record-badge"><span className="sport-icon-tile"><SportIcon name="trophy" /></span><div className="min-w-0 flex-1"><p className="sport-eyebrow">{label}</p><p className="mt-1 break-words text-lg font-semibold tabular-nums"><bdi>{value}</bdi></p>{description && <p className="sport-description mt-1">{description}</p>}</div></div>;
}
