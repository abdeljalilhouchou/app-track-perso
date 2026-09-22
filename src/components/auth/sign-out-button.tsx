"use client";

import { useTransition, type ReactNode } from "react";
import { signOut } from "@/lib/actions/auth";
import { SignatureOverlay } from "@/components/auth/signature-overlay";

export function SignOutButton({ className, children }: { className?: string; children: ReactNode }) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" onClick={() => startTransition(() => signOut())} className={className}>
        {children}
      </button>
      <SignatureOverlay show={pending} label="Déconnexion..." />
    </>
  );
}
