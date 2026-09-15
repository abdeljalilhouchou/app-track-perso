"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { motion } from "framer-motion";
import { toggleHabitLog, deleteHabit, moveHabit, updateHabit } from "@/lib/actions/habits";
import { Heatmap } from "@/components/heatmap";
import { HabitForm } from "@/components/habit-form";
import { CATEGORY_META } from "@/lib/habit-categories";
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
  const categoryMeta = CATEGORY_META[habit.category] ?? CATEGORY_META["Général"];

  if (editing) {
    return (
      <motion.div
        layout
        className="rounded-2xl border p-5 shadow-sm"
        style={{ borderColor: habit.color }}
      >
        <HabitForm
          action={(formData) =>
            startTransition(async () => {
              await updateHabit(habit.id, formData);
              setEditing(false);
            })
          }
          defaultValues={{
            icon: habit.icon,
            name: habit.name,
            category: habit.category,
            target_per_week: habit.target_per_week,
          }}
          submitLabel="Enregistrer"
          onCancel={() => setEditing(false)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-lg"
      style={{ perspective: 600 }}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/habits/${habit.id}`} className="flex min-w-0 items-center gap-3">
          <motion.span
            whileHover={{ rotateY: 18, rotateX: -6, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm"
            style={{
              background: `color-mix(in srgb, ${habit.color} 18%, var(--surface))`,
              transformStyle: "preserve-3d",
            }}
          >
            {habit.icon}
          </motion.span>
          <div className="min-w-0">
            <p className="truncate font-medium group-hover:underline">{habit.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
                style={{ background: `color-mix(in srgb, ${categoryMeta.color} 16%, transparent)`, color: categoryMeta.color }}
              >
                {categoryMeta.icon} {habit.category}
              </span>
              {streak > 0 && <span>🔥 {streak} j</span>}
            </div>
          </div>
        </Link>

        <motion.button
          disabled={pending}
          onClick={() => startTransition(() => toggleHabitLog(habit.id, today))}
          animate={doneToday ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          whileTap={{ scale: 0.9 }}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            doneToday ? "text-white shadow-md" : "border border-border text-foreground-muted hover:bg-surface-muted"
          }`}
          style={doneToday ? { background: habit.color, boxShadow: `0 4px 14px -4px ${habit.color}` } : undefined}
        >
          {doneToday ? "Fait ✓" : "Marquer fait"}
        </motion.button>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-foreground-muted">
          <span>Objectif de la semaine</span>
          <span>
            {thisWeekCount} / {habit.target_per_week}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ background: habit.color }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
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
    </motion.div>
  );
}
