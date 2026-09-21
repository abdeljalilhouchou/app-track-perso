"use client";

import { useCallback } from "react";
import { useToast } from "@/components/toast/toast-provider";

type Outcome = { error: string | null; notice?: string } | void | undefined;

type Messages<T> = {
  /** Shown when the action succeeds. Omit to stay silent on success. */
  success?: string | ((result: T) => string);
  /** Title shown on failure (the server's reason is used as the message). */
  failure?: string;
  /** Adds an "Annuler" button to the success toast. */
  undo?: { label?: string; run: () => Promise<unknown> | unknown };
};

/**
 * Runs a server action and turns its outcome into a toast: green on success,
 * red with the reason on failure (returned error or thrown exception).
 */
export function useActionToast() {
  const toast = useToast();

  return useCallback(
    async function run<T extends Outcome>(fn: () => Promise<T>, messages: Messages<T> = {}): Promise<T | null> {
      try {
        const result = await fn();
        const error = result && typeof result === "object" ? result.error : null;

        if (error) {
          toast.error(error, { title: messages.failure ?? "Action impossible" });
          return result;
        }

        if (messages.success) {
          const text = typeof messages.success === "function" ? messages.success(result) : messages.success;
          toast.success(text, messages.undo ? { action: { label: messages.undo.label ?? "Annuler", onClick: messages.undo.run } } : undefined);
        }

        const notice = result && typeof result === "object" ? result.notice : undefined;
        if (notice) toast.info(notice);

        return result;
      } catch (e) {
        toast.error(e instanceof Error && e.message ? e.message : "Une erreur inattendue est survenue. Réessaie.", {
          title: messages.failure ?? "Action impossible",
        });
        return null;
      }
    },
    [toast]
  );
}
