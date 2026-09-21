"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { deleteMoodEntry } from "@/lib/actions/mood";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import type { MoodEntry } from "@/types/database";

export function MoodEntryList({ entries }: { entries: MoodEntry[] }) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">{format(new Date(e.entry_date), "EEEE d MMMM", { locale: fr })}</p>
            <p className="text-xs text-foreground-muted">
              Humeur {e.mood_score}/5 · Énergie {e.energy_level}/5
              {e.notes ? ` · ${e.notes}` : ""}
            </p>
          </div>
          <ConfirmDeleteButton
            disabled={pending}
            onConfirm={() => startTransition(async () => void (await run(() => deleteMoodEntry(e.id), { success: "Humeur supprimée", failure: "Suppression impossible" })))}
            title="Supprimer cette entrée ?"
            message={`L'humeur du ${format(new Date(e.entry_date), "d MMMM", { locale: fr })} sera définitivement supprimée.`}
            className="shrink-0 text-xs text-foreground-muted hover:text-danger disabled:opacity-60"
          >
            Supprimer
          </ConfirmDeleteButton>
        </li>
      ))}
    </ul>
  );
}
