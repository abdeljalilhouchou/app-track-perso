"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { useAuthT } from "@/lib/i18n/use-auth-t";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    signUp,
    { error: null }
  );
  const t = useAuthT();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            track<span className="text-accent">.perso</span>
          </Link>
          <p className="mt-2 text-sm text-foreground-muted">{t("auth.signup.tagline")}</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-sm font-medium">{t("auth.signup.firstName")}</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              placeholder="Ton prenom"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">{t("auth.signup.email")}</label>
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
            <label htmlFor="password" className="text-sm font-medium">{t("auth.signup.password")}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              placeholder={t("auth.signup.passwordHint")}
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
            {pending ? t("auth.signup.submitting") : t("auth.signup.submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground-muted">
          {t("auth.signup.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            {t("auth.signup.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
