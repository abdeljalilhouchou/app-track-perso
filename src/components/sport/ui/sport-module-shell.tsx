"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { SportIcon, type SportIconName } from "./sport-icons";

/**
 * Shared skeleton for the discipline workspaces (Running, Calisthenics):
 * one compact header, one scrollable section control, one status area.
 * It owns no data and never navigates; sections live in module state.
 */
export function SportModuleShell({ title, description, icon, summary, tabs, status, children }: {
  title: string;
  description?: string;
  icon?: SportIconName;
  /** Optional compact figures shown beside the header on wide screens. */
  summary?: ReactNode;
  tabs: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}) {
  return <div className="min-w-0 space-y-4 sm:space-y-5">
    <header className="sport-module-header">
      {icon && <span aria-hidden className="sport-icon-tile"><SportIcon name={icon} className="h-5 w-5" /></span>}
      <div className="min-w-0 flex-1">
        <h1 className="sport-module-title">{title}</h1>
        {description && <p className="sport-description mt-1">{description}</p>}
      </div>
      {summary && <div className="sport-module-summary">{summary}</div>}
    </header>
    {tabs}
    {status}
    {children}
  </div>;
}

/** Scrollable variant of the segmented control: 5+ sections stay on one row on phones. */
export function SportModuleTabs<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return <nav aria-label={label}>
    <div role="group" aria-label={label} className="sport-segmented-control is-scrollable">
      {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={clsx("sport-segment", value === option.value && "is-active")} data-module-tab={option.value}>{option.label}</button>)}
    </div>
  </nav>;
}

/** Inline confirmation or error, dismissible; replaces the ad-hoc status paragraphs. */
export function SportStatusMessage({ children, error = false, onDismiss, dismissLabel }: {
  children: ReactNode;
  error?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return <p role={error ? "alert" : "status"} className={clsx("sport-status-message", error && "is-error")} data-module-status={error ? "error" : "success"}>
    <SportIcon name={error ? "alert" : "check"} className="mt-0.5 h-4 w-4 shrink-0" />
    <span className="min-w-0 flex-1">{children}</span>
    {onDismiss && <button type="button" aria-label={dismissLabel} onClick={onDismiss} className="sport-status-dismiss"><SportIcon name="close" className="h-4 w-4" /></button>}
  </p>;
}
