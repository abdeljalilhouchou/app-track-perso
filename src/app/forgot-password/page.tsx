"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, { error: null, sent: false });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            track<span className="text-accent">.perso</span>
          </Link>
          <p className="mt-2 text-sm text-foreground-muted">
            Indique ton e-mail, on t&apos;envoie un lien pour choisir un nouveau mot de passe.
          </p>
        </div>

        {state.sent ? (
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
            <span className="text-3xl">📬</span>
            <p className="text-sm">
              Si un compte existe avec cette adresse, un e-mail vient de partir avec un lien de réinitialisation. Vérifie
              aussi tes spams.
            </p>
            <Link href="/login" className="inline-block text-sm font-medium text-accent hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                placeholder="toi@exemple.com"
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
              {pending ? "Envoi..." : "Envoyer le lien"}
            </button>

            <p className="text-center text-sm text-foreground-muted">
              <Link href="/login" className="font-medium text-accent hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
