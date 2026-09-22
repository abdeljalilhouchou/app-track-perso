import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dict = await getDictionary();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            track<span className="text-accent">.perso</span>
          </Link>
          <p className="mt-2 text-sm text-foreground-muted">
            {user ? dict.auth.resetPassword.tagline : dict.auth.resetPassword.invalidTagline}
          </p>
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-foreground-muted">{dict.auth.resetPassword.expiredMessage}</p>
            <Link
              href="/forgot-password"
              className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition hover:opacity-90"
            >
              {dict.auth.resetPassword.requestNew}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
