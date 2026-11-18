"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { LANGUAGES } from "@/lib/language";
import { setAuthLanguage, useAuthLanguage, useAuthT } from "@/lib/i18n/use-auth-t";
import { ActivityIcon, SmileIcon, SparkleIcon, UtensilsIcon } from "@/components/ui/nav-icons";

const LANGUAGE_NAMES = { fr: "FR", en: "EN", ar: "ع" } as const;

/** Text field style shared by the sign-in and sign-up forms. */
export const authField =
  "min-h-12 w-full rounded-xl border border-border bg-surface-muted px-4 text-base outline-none transition placeholder:text-foreground-muted/70 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 aria-[invalid=true]:border-danger";

export const authPrimary =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-on-accent shadow-lg shadow-accent/25 transition hover:opacity-90 disabled:opacity-60";

export const authSecondary =
  "flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-base font-semibold transition hover:bg-surface-muted";

/**
 * Frame of the pages shown before signing in: a presentation panel on wide screens, the brand
 * and a language picker on top, and the form centred below a title.
 */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const t = useAuthT();
  const language = useAuthLanguage();
  const features = [
    { key: "habits", Icon: SparkleIcon },
    { key: "sport", Icon: ActivityIcon },
    { key: "meals", Icon: UtensilsIcon },
    { key: "mood", Icon: SmileIcon },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-accent p-12 text-on-accent lg:flex lg:flex-col lg:justify-between" aria-hidden>
        <div className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -start-16 h-96 w-96 rounded-full bg-black/10 blur-3xl" />
        <p className="relative text-2xl font-semibold tracking-tight" dir="ltr">track<span className="opacity-70">.perso</span></p>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">{t("auth.login.panelTitle")}</h2>
          <p className="mt-4 text-lg opacity-85">{t("auth.login.panelText")}</p>
          <ul className="mt-10 grid grid-cols-2 gap-3">
            {features.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-3 rounded-2xl bg-white/12 p-4 text-sm font-medium backdrop-blur">
                <Icon className="h-5 w-5 shrink-0" />
                {t(`auth.login.features.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <span />
      </aside>

      <main className="relative flex flex-col px-4 pb-8 pt-4 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-accent/15 to-transparent lg:hidden" aria-hidden />

        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex min-h-11 items-center text-lg font-semibold tracking-tight lg:invisible">
            <span dir="ltr">track<span className="text-accent">.perso</span></span>
          </Link>
          <div role="radiogroup" aria-label={t("auth.login.languageLabel")} className="flex gap-1 rounded-full border border-border bg-surface p-1" data-login-language>
            {LANGUAGES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={language === value}
                lang={value}
                onClick={() => setAuthLanguage(value)}
                className={`min-h-9 min-w-11 rounded-full px-2 text-sm font-semibold transition-colors ${language === value ? "bg-accent text-on-accent" : "text-foreground-muted hover:text-foreground"}`}
              >
                {LANGUAGE_NAMES[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-on-accent shadow-lg shadow-accent/30" aria-hidden>
              <ActivityIcon className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-foreground-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

/** Password input with a show/hide button and a Caps Lock warning. */
export function PasswordInput({ id, autoComplete, minLength, placeholder = "••••••••", invalid, describedBy, onValueChange }: {
  id: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  onValueChange?: (value: string) => void;
}) {
  const t = useAuthT();
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const checkCaps = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  const capsId = `${id}-caps`;

  return (
    <>
      <div className="relative" dir="ltr">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy ?? "", capsLock ? capsId : ""].filter(Boolean).join(" ") || undefined}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCapsLock(false)}
          onChange={(event) => onValueChange?.(event.target.value)}
          className={`${authField} pe-12`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((value) => !value)}
          aria-pressed={show}
          aria-label={show ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
          aria-controls={id}
          className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-xl text-foreground-muted transition hover:text-foreground"
          data-login-reveal
        >
          <EyeIcon open={!show} />
        </button>
      </div>
      {capsLock && <p id={capsId} className="text-xs font-medium" style={{ color: "var(--mood-text, #b45309)" }}>⇪ {t("auth.login.capsLock")}</p>}
    </>
  );
}

export function AuthError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">
      <span aria-hidden>!</span>
      {children}
    </p>
  );
}

/** "No account yet?" style divider above the page's secondary action. */
export function AuthSwitch({ question, href, label }: { question: string; href: string; label: string }) {
  return (
    <>
      <div className="mt-8 flex items-center gap-3 text-xs text-foreground-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        {question}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Link href={href} className={`mt-4 ${authSecondary}`}>
        <span className="sr-only">{question} </span>
        {label}
      </Link>
    </>
  );
}
