"use client";

import { useTransition, type ReactNode } from "react";
import { signOut } from "@/lib/actions/auth";
import { SignatureOverlay } from "@/components/auth/signature-overlay";
import { useT } from "@/components/language-provider";

export function SignOutButton({ className, children, role }: { className?: string; children: ReactNode; role?: "menuitem" }) {
  const [pending, startTransition] = useTransition();
  const t = useT();

  return (
    <>
      <button type="button" role={role} onClick={() => startTransition(() => signOut())} className={className}>
        {children}
      </button>
      <SignatureOverlay show={pending} label={t("auth.signOutOverlayLabel")} />
    </>
  );
}
