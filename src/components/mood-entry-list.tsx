"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { deleteMoodEntry } from "@/lib/actions/mood";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useT } from "@/components/language-provider";
import type { MoodEntry } from "@/types/database";

export function MoodEntryList({ entries }: { entries: MoodEntry[] }) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const t = useT();

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">{format(new Date(e.entry_date), "EEEE d MMMM", { locale: fr })}</p>
            <p className="text-xs text-foreground-muted">
              {t("mood.entryList.moodEnergy", { mood: e.mood_score, energy: e.energy_level })}
              {e.notes ? ` · ${e.notes}` : ""}
            </p>
          </div>
          <ConfirmDeleteButton
            disabled={pending}
            onConfirm={() =>
              startTransition(
                async () =>
                  void (await run(() => deleteMoodEntry(e.id), {
                    success: t("mood.entryList.deleteSuccess"),
                    failure: t("mood.entryList.deleteFailure"),
                  }))
              )
            }
            title={t("mood.entryList.deleteConfirmTitle")}
            message={t("mood.entryList.deleteConfirmMessage", {
              date: format(new Date(e.entry_date), "d MMMM", { locale: fr }),
            })}
            className="shrink-0 text-xs text-foreground-muted hover:text-danger disabled:opacity-60"
          >
            {t("mood.entryList.deleteButton")}
          </ConfirmDeleteButton>
        </li>
      ))}
    </ul>
  );
}
