"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useT } from "@/components/language-provider";
import { deleteWorkout } from "@/lib/actions/sport";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import type { Workout } from "@/types/database";

export function WorkoutList({ workouts }: { workouts: Workout[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();

  if (workouts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-sport/40 p-8 text-center text-sm text-foreground-muted">
        {t("sport.common.noSessionsRecorded")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-2xl border-[1.5px] border-sport/50 bg-surface">
      {workouts.map((w) => (
        <li key={w.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">{w.activity}</p>
            <p className="text-xs text-foreground-muted">
              {format(new Date(w.workout_date), "EEEE d MMMM", { locale: fr })} ·{" "}
              {t("sport.workoutList.detailsLine", { duration: w.duration_minutes, intensity: w.intensity })}
              {w.notes ? ` · ${w.notes}` : ""}
            </p>
          </div>
          <ConfirmDeleteButton
            disabled={pending}
            onConfirm={() =>
              startTransition(
                async () =>
                  void (await run(() => deleteWorkout(w.id), {
                    success: t("sport.common.sessionDeletedToast", { name: w.activity }),
                    failure: t("sport.common.deleteImpossible"),
                  }))
              )
            }
            title={t("sport.common.confirmDeleteSessionTitle")}
            message={t("sport.common.confirmDeleteMessage", {
              activity: w.activity,
              date: format(new Date(w.workout_date), "d MMMM", { locale: fr }),
            })}
            className="shrink-0 text-xs text-foreground-muted hover:text-danger disabled:opacity-60"
          >
            {t("sport.common.delete")}
          </ConfirmDeleteButton>
        </li>
      ))}
    </ul>
  );
}
