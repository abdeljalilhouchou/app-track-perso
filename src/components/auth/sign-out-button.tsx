"use client";

import { useTransition, type ReactNode } from "react";
import { signOut } from "@/lib/actions/auth";
import { introTexts, useAuthTransition } from "@/components/auth/auth-transition";
import { useT } from "@/components/language-provider";

export function SignOutButton({ className, children, role }: { className?: string; children: ReactNode; role?: "menuitem" }) {
  const [, startTransition] = useTransition();
  const t = useT();
  const { start } = useAuthTransition();

  return (
    <button
      type="button"
      role={role}
      onClick={() => {
        start("logout", introTexts(t, t("auth.signOutOverlayLabel")));
        startTransition(() => signOut());
      }}
      className={className}
    >
      {children}
    </button>
  );
}
