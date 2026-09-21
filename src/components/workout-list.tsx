"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { deleteWorkout } from "@/lib/actions/sport";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import type { Workout } from "@/types/database";

export function WorkoutList({ workouts }: { workouts: Workout[] }) {
  const [pending, startTransition] = useTransition();

  if (workouts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-sport/40 p-8 text-center text-sm text-foreground-muted">
        Aucune séance enregistrée pour le moment.
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
              {format(new Date(w.workout_date), "EEEE d MMMM", { locale: fr })} · {w.duration_minutes} min · intensité {w.intensity}/5
              {w.notes ? ` · ${w.notes}` : ""}
            </p>
          </div>
          <ConfirmDeleteButton
            disabled={pending}
            onConfirm={() => startTransition(() => deleteWorkout(w.id))}
            title="Supprimer cette séance ?"
            message={`"${w.activity}" du ${format(new Date(w.workout_date), "d MMMM", { locale: fr })} sera définitivement supprimée.`}
            className="shrink-0 text-xs text-foreground-muted hover:text-danger disabled:opacity-60"
          >
            Supprimer
          </ConfirmDeleteButton>
        </li>
      ))}
    </ul>
  );
}
