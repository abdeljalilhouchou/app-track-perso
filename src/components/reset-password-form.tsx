"use client";

import { useActionState, useState } from "react";
import { updatePasswordAfterReset } from "@/lib/actions/auth";
import { useAuthT } from "@/lib/i18n/use-auth-t";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAfterReset, { error: null });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;
  const t = useAuthT();

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">{t("auth.resetPassword.newPassword")}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          placeholder="6 caractères minimum"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">{t("auth.resetPassword.confirmPassword")}</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          placeholder="Retape le mot de passe"
        />
        {mismatch && <p className="text-xs text-danger">{t("auth.resetPassword.mismatch")}</p>}
      </div>

      {state.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || mismatch}
        className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
      </button>
    </form>
  );
}
