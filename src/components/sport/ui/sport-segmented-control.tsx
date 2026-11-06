"use client";

import clsx from "clsx";

export function SportSegmentedControl<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string; disabled?: boolean }[]; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="sport-segmented-control">{options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} disabled={option.disabled} onClick={() => onChange(option.value)} className={clsx("sport-segment", value === option.value && "is-active")}>{option.label}</button>)}</div>;
}
