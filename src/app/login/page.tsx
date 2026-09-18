"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    signIn,
    { error: null }
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            track<span className="text-accent">.perso</span>
          </Link>
          <p className="mt-2 text-sm text-foreground-muted">
            Content de te revoir. Connecte-toi pour continuer.
          </p>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
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
            <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
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
            {pending ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground-muted">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Inscris-toi
          </Link>
        </p>
      </div>
    </div>
  );
}
