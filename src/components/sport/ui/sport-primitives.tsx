import Link from "next/link";
import clsx from "clsx";
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, ReactNode } from "react";
import { SportIcon, type SportIconName } from "./sport-icons";

export function SportCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("sport-card", className)} {...props} />;
}

export function SportPageHeader({ title, description, eyebrow, icon, actions }: { title: string; description?: string; eyebrow?: string; icon?: SportIconName; actions?: ReactNode }) {
  return <header className="sport-page-header">
    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
      {icon && <span className="sport-icon-tile sport-icon-tile-lg"><SportIcon name={icon} className="h-6 w-6" /></span>}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="sport-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="sport-page-title">{title}</h1>
        {description && <p className="sport-description mt-2 max-w-2xl">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
  </header>;
}

export function SportSectionHeading({ title, description, action, id }: { title: string; description?: string; action?: ReactNode; id?: string }) {
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
    <div className="min-w-0"><h2 id={id} className="sport-section-title">{title}</h2>{description && <p className="sport-description mt-1">{description}</p>}</div>
    {action}
  </div>;
}

export function SportBadge({ children, tone = "sport", className }: { children: ReactNode; tone?: "sport" | "accent" | "neutral"; className?: string }) {
  return <span className={clsx("sport-badge", `sport-badge-${tone}`, className)}>{children}</span>;
}

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: SportIconName; busy?: boolean };

export function SportButton({ children, className, variant = "primary", icon, busy = false, disabled, type = "button", ...props }: ButtonProps) {
  return <button type={type} disabled={disabled || busy} aria-busy={busy || undefined} className={clsx("sport-button", `sport-button-${variant}`, className)} {...props}>
    {busy ? <span aria-hidden className="sport-spinner" /> : icon ? <SportIcon name={icon} className="h-4.5 w-4.5" /> : null}
    {children}
  </button>;
}

export function SportLink({ children, className, variant = "secondary", icon, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; icon?: SportIconName }) {
  return <Link className={clsx("sport-button", `sport-button-${variant}`, className)} {...props}>{icon && <SportIcon name={icon} className="h-4.5 w-4.5" />}{children}</Link>;
}

export function SportEmptyState({ title, description, icon = "activity", action }: { title: string; description?: string; icon?: SportIconName; action?: ReactNode }) {
  return <div className="sport-empty-state">
    <span className="sport-icon-tile mx-auto"><SportIcon name={icon} /></span>
    <p className="mt-3 font-semibold">{title}</p>
    {description && <p className="sport-description mx-auto mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
  </div>;
}

export function SportErrorState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div role="alert" className="sport-error-state"><SportIcon name="alert" /><div className="min-w-0 flex-1"><p className="font-semibold">{title}</p>{description && <p className="sport-description mt-1">{description}</p>}{action && <div className="mt-3">{action}</div>}</div></div>;
}
