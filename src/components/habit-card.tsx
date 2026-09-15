"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { toggleHabitLog, deleteHabit, moveHabit, updateHabit } from "@/lib/actions/habits";
import { Heatmap } from "@/components/heatmap";
import { CATEGORY_PRESETS, EMOJI_CHOICES } from "@/lib/habit-categories";
import type { Habit } from "@/types/database";

export function HabitCard({
  habit,
  values,
  doneToday,
  streak,
  thisWeekCount,
  isFirst,
  isLast,
}: {
  habit: Habit;
  values: Record<string, number>;
  doneToday: boolean;
  streak: number;
  thisWeekCount: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const progressPct = Math.min(100, Math.round((thisWeekCount / habit.target_per_week) * 100));

  if (editing) {
    return (
      <form
        action={(formData) =>
          startTransition(async () => {
            await updateHabit(habit.id, formData);
            setEditing(false);
          })
        }
        className="space-y-3 rounded-2xl border border-accent/40 bg-surface p-5 shadow-sm"
      >
        <div className="flex gap-2">
          <select
            name="icon"
            defaultValue={habit.icon}
            className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-lg"
          >
            {EMOJI_CHOICES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            name="name"
            required
            defaultValue={habit.name}
            className="flex-1 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex gap-2">
          <select
            name="category"
            defaultValue={habit.category}
            className="flex-1 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {CATEGORY_PRESETS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            name="target_per_week"
            defaultValue={habit.target_per_week}
            className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}x / semaine
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
          >
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/habits/${habit.id}`} className="flex items-center gap-3">
          <span className="text-2xl">{habit.icon}</span>
          <div>
            <p className="font-medium hover:underline">{habit.name}</p>
            <p className="text-xs text-foreground-muted">
              {habit.category} · {streak > 0 ? `🔥 ${streak} j de suite` : "Pas de série en cours"}
            </p>
          </div>
        </Link>

        <button
          disabled={pending}
          onClick={() => startTransition(() => toggleHabitLog(habit.id, today))}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 active:scale-90 disabled:opacity-60 ${
            doneToday ? "scale-105 text-white" : "border border-border text-foreground-muted hover:bg-surface-muted"
          }`}
          style={doneToday ? { background: habit.color } : undefined}
        >
          {doneToday ? "Fait ✓" : "Marquer fait"}
        </button>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-foreground-muted">
          <span>Objectif de la semaine</span>
          <span>
            {thisWeekCount} / {habit.target_per_week}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, background: habit.color }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Heatmap values={values} color={habit.color} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            disabled={isFirst || pending}
            onClick={() => startTransition(() => moveHabit(habit.id, "up"))}
            aria-label="Monter"
            className="rounded-md border border-border px-2 py-1 text-xs text-foreground-muted transition hover:bg-surface-muted disabled:opacity-30"
          >
            ▲
          </button>
          <button
            disabled={isLast || pending}
            onClick={() => startTransition(() => moveHabit(habit.id, "down"))}
            aria-label="Descendre"
            className="rounded-md border border-border px-2 py-1 text-xs text-foreground-muted transition hover:bg-surface-muted disabled:opacity-30"
          >
            ▼
          </button>
        </div>
        <div className="flex gap-3 text-xs">
          <button onClick={() => setEditing(true)} className="text-foreground-muted hover:text-foreground">
            Modifier
          </button>
          <button
            onClick={() => {
              if (confirm(`Supprimer "${habit.name}" et tout son historique ?`)) {
                startTransition(() => deleteHabit(habit.id));
              }
            }}
            className="text-foreground-muted hover:text-danger"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
