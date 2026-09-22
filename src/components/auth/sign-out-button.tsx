"use client";

import { useTransition, type ReactNode } from "react";
import { signOut } from "@/lib/actions/auth";
import { SignatureOverlay } from "@/components/auth/signature-overlay";
import { useT } from "@/components/language-provider";

export function SignOutButton({ className, children }: { className?: string; children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  return (
    <>
      <button type="button" onClick={() => startTransition(() => signOut())} className={className}>
        {children}
      </button>
      <SignatureOverlay show={pending} label={t("auth.signOutOverlayLabel")} />
    </>
  );
}
