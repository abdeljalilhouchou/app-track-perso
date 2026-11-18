"use client";

import { useActionState, useEffect, useState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "@/lib/actions/auth";
import { AuthError, AuthLayout, AuthSwitch, authField, authPrimary, authSecondary } from "@/components/auth/auth-layout";
import { useAuthT } from "@/lib/i18n/use-auth-t";

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(requestPasswordReset, { error: null, sent: false, email: "" });
  const [editing, setEditing] = useState(false);
  // Counts each successful send, so the resend timer restarts after a resend too.
  const [sends, setSends] = useState(0);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.sent) { setSends((count) => count + 1); setEditing(false); }
  }
  const t = useAuthT();
  const error = state.error === "failed" ? t("auth.forgotPassword.errorFailed") : state.error ? t("auth.forgotPassword.errorInvalid") : null;

  if (state.sent && !editing) {
    return (
      <AuthLayout title={t("auth.forgotPassword.sentHeadline")} subtitle={t("auth.forgotPassword.sentTo", { email: state.email })}>
        <div className="space-y-4" data-reset-sent>
          <ol className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
            <li className="flex gap-3"><span aria-hidden className="text-xl">📬</span><span>{t("auth.forgotPassword.sentSteps")}</span></li>
            <li className="flex gap-3 text-foreground-muted"><span aria-hidden className="text-xl">🔎</span><span>{t("auth.forgotPassword.spamHint")}</span></li>
          </ol>
          <form action={formAction}>
            <input type="hidden" name="email" value={state.email} />
            <ResendButton key={sends} pending={pending} />
          </form>
          <button type="button" onClick={() => setEditing(true)} className="mx-auto flex min-h-11 items-center px-3 text-sm font-medium text-accent hover:underline">
            {t("auth.forgotPassword.otherEmail")}
          </button>
        </div>
        <AuthSwitch question={t("auth.forgotPassword.remembered")} href="/login" label={t("auth.forgotPassword.backToLogin")} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.forgotPassword.headline")} subtitle={t("auth.forgotPassword.tagline")}>
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">{t("auth.forgotPassword.email")}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            defaultValue={state.email}
            key={state.email}
            aria-invalid={state.error === "invalid" || undefined}
            aria-describedby={error ? "forgot-error" : undefined}
            className={authField}
            placeholder={t("auth.login.emailPlaceholder")}
            dir="ltr"
          />
        </div>

        {error && <AuthError id="forgot-error">{error}</AuthError>}

        <button type="submit" disabled={pending} className={authPrimary}>
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />}
          {pending ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
        </button>
      </form>

      <AuthSwitch question={t("auth.forgotPassword.remembered")} href="/login" label={t("auth.forgotPassword.backToLogin")} />
    </AuthLayout>
  );
}

/** Resend, held back for a minute after each send so the inbox is not flooded. */
function ResendButton({ pending }: { pending: boolean }) {
  const t = useAuthT();
  const [left, setLeft] = useState(RESEND_SECONDS);
  useEffect(() => {
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  return (
    <button type="submit" disabled={pending || left > 0} className={authSecondary + " disabled:opacity-60"} data-reset-resend>
      {left > 0 ? t("auth.forgotPassword.resendIn", { seconds: left }) : pending ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.resend")}
    </button>
  );
}
