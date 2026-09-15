"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { toggleHabitLog, archiveHabit } from "@/lib/actions/habits";
import { Heatmap } from "@/components/heatmap";
import type { Habit } from "@/types/database";

export function HabitCard({
  habit,
  values,
  doneToday,
  streak,
}: {
  habit: Habit;
  values: Record<string, number>;
  doneToday: boolean;
  streak: number;
}) {
  const [pending, startTransition] = useTransition();
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{habit.icon}</span>
          <div>
            <p className="font-medium">{habit.name}</p>
            <p className="text-xs text-foreground-muted">
              {streak > 0 ? `🔥 ${streak} jour${streak > 1 ? "s" : ""} de suite` : "Pas de série en cours"}
            </p>
          </div>
        </div>

        <button
          disabled={pending}
          onClick={() => startTransition(() => toggleHabitLog(habit.id, today))}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
            doneToday
              ? "text-white"
              : "border border-border text-foreground-muted hover:bg-surface-muted"
          }`}
          style={doneToday ? { background: habit.color } : undefined}
        >
          {doneToday ? "Fait ✓" : "Marquer fait"}
        </button>
      </div>

      <div className="mt-4">
        <Heatmap values={values} color={habit.color} />
      </div>

      <button
        onClick={() => startTransition(() => archiveHabit(habit.id))}
        className="mt-3 text-xs text-foreground-muted hover:text-danger"
      >
        Archiver
      </button>
    </div>
  );
}
