"use client";

import { useActionState, useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { signIn, type SignInState } from "@/lib/actions/auth";
import { introTexts, useAuthTransition } from "@/components/auth/auth-transition";
import { ANATOMY_ASSET } from "@/lib/anatomy/rowing";
import { LANGUAGES } from "@/lib/language";
import { setAuthLanguage, useAuthLanguage, useAuthT } from "@/lib/i18n/use-auth-t";
import { ActivityIcon, SmileIcon, SparkleIcon, UtensilsIcon } from "@/components/ui/nav-icons";

const LANGUAGE_NAMES = { fr: "FR", en: "EN", ar: "ع" } as const;

const field =
  "min-h-12 w-full rounded-xl border border-border bg-surface-muted px-4 text-base outline-none transition placeholder:text-foreground-muted/70 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 aria-[invalid=true]:border-danger";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, { error: null, email: "" });
  const t = useAuthT();
  const language = useAuthLanguage();
  const { start, cancel } = useAuthTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  // A refused sign-in stays on this page: drop the intro so the error is visible.
  useEffect(() => {
    if (!pending && state.error) cancel();
  }, [pending, state, cancel]);

  // Fetch the anatomy model while the person types, unless they asked to save data.
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const idle = window.setTimeout(() => { fetch(ANATOMY_ASSET.url, { cache: "force-cache" }).catch(() => {}); }, 1500);
    return () => window.clearTimeout(idle);
  }, []);

  const checkCaps = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  const error = state.error === "unconfirmed" ? t("auth.login.errorUnconfirmed") : state.error ? t("auth.login.errorInvalid") : null;
  const features = [
    { key: "habits", Icon: SparkleIcon },
    { key: "sport", Icon: ActivityIcon },
    { key: "meals", Icon: UtensilsIcon },
    { key: "mood", Icon: SmileIcon },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Presentation panel, from tablets in landscape up. */}
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
            <h1 className="text-3xl font-semibold tracking-tight">{t("auth.login.headline")}</h1>
            <p className="mt-2 text-foreground-muted">{t("auth.login.subtitle")}</p>
          </div>

          <form action={formAction} onSubmit={() => start("login", introTexts(t, t("auth.login.overlayLabel")))} className="space-y-5" noValidate={false}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">{t("auth.login.email")}</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={state.email}
                key={state.email}
                aria-invalid={state.error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={field}
                placeholder={t("auth.login.emailPlaceholder")}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium">{t("auth.login.password")}</label>
                <Link href="/forgot-password" className="-me-2 inline-flex min-h-11 items-center px-2 text-sm font-medium text-accent hover:underline">
                  {t("auth.login.forgotPassword")}
                </Link>
              </div>
              <div className="relative" dir="ltr">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  aria-invalid={state.error === "invalid" ? true : undefined}
                  aria-describedby={[error ? "login-error" : "", capsLock ? "login-caps" : ""].filter(Boolean).join(" ") || undefined}
                  onKeyDown={checkCaps}
                  onKeyUp={checkCaps}
                  onBlur={() => setCapsLock(false)}
                  className={`${field} pe-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                  aria-controls="password"
                  className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-xl text-foreground-muted transition hover:text-foreground"
                  data-login-reveal
                >
                  <EyeIcon open={!showPassword} />
                </button>
              </div>
              {capsLock && <p id="login-caps" className="text-xs font-medium" style={{ color: "var(--mood-text, #b45309)" }}>⇪ {t("auth.login.capsLock")}</p>}
            </div>

            {error && (
              <p id="login-error" role="alert" className="flex gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">
                <span aria-hidden>!</span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-on-accent shadow-lg shadow-accent/25 transition hover:opacity-90 disabled:opacity-60"
            >
              {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />}
              {pending ? t("auth.login.submitting") : t("auth.login.submit")}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-3 text-xs text-foreground-muted" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            {t("auth.login.noAccount")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Link href="/signup" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-base font-semibold transition hover:bg-surface-muted">
            <span className="sr-only">{t("auth.login.noAccount")} </span>
            {t("auth.login.createAccount")}
          </Link>
        </div>
      </main>
    </div>
  );
}
