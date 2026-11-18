"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { signIn, type SignInState } from "@/lib/actions/auth";
import { introTexts, useAuthTransition } from "@/components/auth/auth-transition";
import { AuthError, AuthLayout, AuthSwitch, PasswordInput, authField, authPrimary } from "@/components/auth/auth-layout";
import { ANATOMY_ASSET } from "@/lib/anatomy/rowing";
import { useAuthT } from "@/lib/i18n/use-auth-t";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, { error: null, email: "" });
  const t = useAuthT();
  const { start, cancel } = useAuthTransition();

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

  const error = state.error === "unconfirmed" ? t("auth.login.errorUnconfirmed") : state.error ? t("auth.login.errorInvalid") : null;

  return (
    <AuthLayout title={t("auth.login.headline")} subtitle={t("auth.login.subtitle")}>
      <form action={formAction} onSubmit={() => start("login", introTexts(t, t("auth.login.overlayLabel")))} className="space-y-5">
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
            className={authField}
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
          <PasswordInput id="password" autoComplete="current-password" invalid={state.error === "invalid"} describedBy={error ? "login-error" : undefined} />
        </div>

        {error && <AuthError id="login-error">{error}</AuthError>}

        <button type="submit" disabled={pending} className={authPrimary}>
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />}
          {pending ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>
      </form>

      <AuthSwitch question={t("auth.login.noAccount")} href="/signup" label={t("auth.login.createAccount")} />
    </AuthLayout>
  );
}
