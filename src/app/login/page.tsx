"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { introTexts, useAuthTransition } from "@/components/auth/auth-transition";
import { ANATOMY_ASSET } from "@/lib/anatomy/rowing";
import { useAuthT } from "@/lib/i18n/use-auth-t";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    signIn,
    { error: null }
  );
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            track<span className="text-accent">.perso</span>
          </Link>
          <p className="mt-2 text-sm text-foreground-muted">{t("auth.login.welcomeBack")}</p>
        </div>

        <form action={formAction} onSubmit={() => start("login", introTexts(t, t("auth.login.overlayLabel")))} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">{t("auth.login.email")}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              placeholder="toi@exemple.com"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">{t("auth.login.password")}</label>
              <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
                {t("auth.login.forgotPassword")}
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              placeholder="••••••••"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground-muted">
          {t("auth.login.noAccount")}{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            {t("auth.login.signUp")}
          </Link>
        </p>
      </div>

    </div>
  );
}
