"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updatePasswordAfterReset, type ResetPasswordState } from "@/lib/actions/auth";
import { introTexts, useAuthTransition } from "@/components/auth/auth-transition";
import { AuthError, AuthLayout, AuthSwitch, PasswordInput, authPrimary } from "@/components/auth/auth-layout";
import { useAuthT } from "@/lib/i18n/use-auth-t";

const MIN_PASSWORD = 6;

function Check({ ok, okText, waitText, id }: { ok: boolean; okText: string; waitText: string; id: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs" style={{ color: ok ? "var(--success)" : "var(--foreground-muted)" }} aria-live="polite">
      <span aria-hidden>{ok ? "✓" : "•"}</span>
      {ok ? okText : waitText}
    </p>
  );
}

/** The page reached from the reset email: a new password, or a way to ask again when the link is spent. */
export function ResetPasswordScreen({ valid }: { valid: boolean }) {
  const t = useAuthT();
  if (!valid) {
    return (
      <AuthLayout title={t("auth.resetPassword.expiredHeadline")} subtitle={t("auth.resetPassword.expiredMessage")}>
        <Link href="/forgot-password" className={authPrimary} data-reset-request-new>{t("auth.resetPassword.requestNew")}</Link>
        <AuthSwitch question={t("auth.forgotPassword.remembered")} href="/login" label={t("auth.forgotPassword.backToLogin")} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t("auth.resetPassword.headline")} subtitle={t("auth.resetPassword.tagline")}>
      <ResetPasswordForm />
    </AuthLayout>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(updatePasswordAfterReset, { error: null });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const t = useAuthT();
  const { start, cancel } = useAuthTransition();
  const longEnough = password.length >= MIN_PASSWORD;
  const matches = confirm.length > 0 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;
  const errors = { length: "errorLength", mismatch: "errorMismatch", expired: "errorExpired", failed: "errorFailed" } as const;
  const error = state.error ? t(`auth.resetPassword.${errors[state.error]}`) : null;
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.error) cancel();
  }

  return (
    <form action={formAction} onSubmit={() => start("login", introTexts(t, t("auth.resetPassword.overlayLabel")))} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">{t("auth.resetPassword.newPassword")}</label>
        <PasswordInput id="password" autoComplete="new-password" minLength={MIN_PASSWORD} placeholder={t("auth.signup.passwordHint")} invalid={state.error === "length"} describedBy="reset-length" onValueChange={setPassword} />
        <Check id="reset-length" ok={longEnough} okText={t("auth.signup.passwordOk")} waitText={t("auth.signup.passwordHint")} />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm" className="text-sm font-medium">{t("auth.resetPassword.confirmPassword")}</label>
        <PasswordInput id="confirm" autoComplete="new-password" minLength={MIN_PASSWORD} placeholder={t("auth.resetPassword.retypePlaceholder")} invalid={mismatch || state.error === "mismatch"} describedBy="reset-match" onValueChange={setConfirm} />
        {confirm.length > 0 && <Check id="reset-match" ok={matches} okText={t("auth.resetPassword.passwordsMatch")} waitText={t("auth.resetPassword.mismatch")} />}
      </div>

      {error && (
        <AuthError id="reset-error">
          {error}
          {(state.error === "expired" || state.error === "failed") && <> <Link href="/forgot-password" className="font-semibold underline">{t("auth.resetPassword.requestNew")}</Link></>}
        </AuthError>
      )}

      <button type="submit" disabled={pending || !longEnough || !matches} className={authPrimary} data-reset-submit>
        {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />}
        {pending ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
      </button>
    </form>
  );
}
