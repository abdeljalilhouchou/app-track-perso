"use client";

import { useActionState, useState } from "react";
import { signUp, type SignUpState } from "@/lib/actions/auth";
import { AuthError, AuthLayout, AuthSwitch, PasswordInput, authField, authPrimary } from "@/components/auth/auth-layout";
import { useAuthT } from "@/lib/i18n/use-auth-t";

const MIN_PASSWORD = 6;

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUp, { error: null, email: "", displayName: "" });
  const t = useAuthT();
  const error = state.error === "failed" ? t("auth.signup.errorFailed") : state.error ? t("auth.signup.errorInvalid") : null;

  return (
    <AuthLayout title={t("auth.signup.headline")} subtitle={t("auth.signup.subtitle")}>
      {/* Remounted after each refusal so the kept values fill the fields again. */}
      <form key={`${state.email}|${state.displayName}|${state.error}`} action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium">{t("auth.signup.firstName")}</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            maxLength={40}
            autoComplete="given-name"
            defaultValue={state.displayName}
            className={authField}
            placeholder={t("auth.signup.namePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">{t("auth.signup.email")}</label>
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
            aria-invalid={state.error ? true : undefined}
            aria-describedby={error ? "signup-error" : undefined}
            className={authField}
            placeholder={t("auth.login.emailPlaceholder")}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">{t("auth.signup.password")}</label>
          <PasswordWithHint invalid={state.error === "invalid"} errorId={error ? "signup-error" : null} />
        </div>

        {error && <AuthError id="signup-error">{error}</AuthError>}

        <button type="submit" disabled={pending} className={authPrimary}>
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />}
          {pending ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </button>
      </form>

      <AuthSwitch question={t("auth.signup.hasAccount")} href="/login" label={t("auth.signup.logInCta")} />
    </AuthLayout>
  );
}

/** The password field and its live length check; remounts with the form, so both reset together. */
function PasswordWithHint({ invalid, errorId }: { invalid: boolean; errorId: string | null }) {
  const t = useAuthT();
  const [length, setLength] = useState(0);
  const longEnough = length >= MIN_PASSWORD;
  return (
    <>
      <PasswordInput
        id="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        placeholder={t("auth.signup.passwordHint")}
        invalid={invalid}
        describedBy={["signup-password-hint", errorId ?? ""].filter(Boolean).join(" ")}
        onValueChange={(value) => setLength(value.length)}
      />
      <p id="signup-password-hint" className="flex items-center gap-1.5 text-xs" style={{ color: longEnough ? "var(--success)" : "var(--foreground-muted)" }} aria-live="polite" data-signup-password-hint>
        <span aria-hidden>{longEnough ? "✓" : "•"}</span>
        {longEnough ? t("auth.signup.passwordOk") : t("auth.signup.passwordHint")}
      </p>
    </>
  );
}
