"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { deleteHabit, resumeHabit } from "@/lib/actions/habits";
import { CATEGORY_META } from "@/lib/habit-categories";
import type { Habit } from "@/types/database";

export function PausedHabits({ habits }: { habits: Habit[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (habits.length === 0) return null;

  return (
    <div className="rounded-2xl border border-dashed border-border p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground-muted"
      >
        <span>⏸️ Habitudes en pause ({habits.length})</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-2">
              {habits.map((habit) => {
                const meta = CATEGORY_META[habit.category] ?? CATEGORY_META["Général"];
                return (
                  <li
                    key={habit.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span>{habit.icon}</span>
                      {habit.name}
                      <span className="text-xs" style={{ color: meta.color }}>
                        {meta.icon} {habit.category}
                      </span>
                    </span>
                    <div className="flex gap-3 text-xs">
                      <button
                        disabled={pending}
                        onClick={() => startTransition(() => resumeHabit(habit.id))}
                        className="font-medium text-accent hover:underline disabled:opacity-50"
                      >
                        Reprendre
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Supprimer définitivement "${habit.name}" et son historique ?`)) {
                            startTransition(() => deleteHabit(habit.id));
                          }
                        }}
                        className="text-foreground-muted hover:text-danger disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
