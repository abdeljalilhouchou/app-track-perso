"use client";

import { useState, useTransition } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import Link from "next/link";
import { motion } from "framer-motion";
import { toggleHabitLog, deleteHabit, pauseHabit, moveHabit, updateHabit, setHabitLogNote } from "@/lib/actions/habits";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Heatmap } from "@/components/heatmap";
import { HabitForm } from "@/components/habit-form";
import { CATEGORY_META, WEEKDAYS } from "@/lib/habit-categories";
import { StreakFlame } from "@/components/ui/streak-flame";
import type { Habit } from "@/types/database";

export function HabitCard({
  habit,
  values,
  doneToday,
  streak,
  thisWeekCount,
  todayNote,
  isFirst,
  isLast,
}: {
  habit: Habit;
  values: Record<string, number>;
  doneToday: boolean;
  streak: number;
  thisWeekCount: number;
  todayNote: string | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(todayNote ?? "");
  const today = format(new Date(), "yyyy-MM-dd");
  const categoryMeta = CATEGORY_META[habit.category] ?? CATEGORY_META["Général"];

  function saveNote() {
    if (note.trim() === (todayNote ?? "").trim()) return;
    startTransition(() => setHabitLogNote(habit.id, today, note));
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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
            scheduled_days: habit.scheduled_days,
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
      className="group rounded-2xl border-[1.5px] bg-surface p-5 shadow-sm transition-shadow hover:shadow-lg"
      style={{ perspective: 600, borderColor: `color-mix(in srgb, ${habit.color} 45%, var(--border))` }}
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
              {streak > 0 && <StreakFlame streak={streak} size="sm" />}
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
        <div className="mb-1.5 flex items-center justify-between text-xs text-foreground-muted">
          <span>Cette semaine</span>
          <span>
            {thisWeekCount} / {habit.target_per_week} jours prévus
          </span>
        </div>
        <div className="flex items-center gap-1">
          {weekDays.map((date, i) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayNum = i + 1;
            const scheduled = habit.scheduled_days.includes(dayNum);
            const done = values[dateStr] === 1;
            const isToday = dateStr === today;
            const missed = scheduled && !done && dateStr < today;

            return (
              <div key={dateStr} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-foreground-muted">{WEEKDAYS[i].short}</span>
                <motion.span
                  initial={false}
                  animate={{ scale: done ? [1, 1.15, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    background: !scheduled
                      ? "transparent"
                      : done
                        ? habit.color
                        : missed
                          ? "color-mix(in srgb, var(--danger) 14%, var(--surface-muted))"
                          : "var(--surface-muted)",
                    border: scheduled && !done ? `1.5px solid ${missed ? "var(--danger)" : "var(--border)"}` : "none",
                    color: done ? "white" : missed ? "var(--danger)" : undefined,
                    boxShadow: isToday ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${habit.color}` : undefined,
                  }}
                >
                  {done ? "✓" : missed ? "✕" : ""}
                </motion.span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <Heatmap values={values} color={habit.color} />
      </div>

      {doneToday && (
        <div className="mt-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder="+ note du jour (optionnel)"
            className="w-full rounded-lg border border-transparent bg-surface-muted px-2.5 py-1.5 text-xs outline-none transition focus:border-accent"
          />
        </div>
      )}

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
            onClick={() => startTransition(() => pauseHabit(habit.id))}
            className="text-foreground-muted hover:text-foreground"
          >
            Pause
          </button>
          <ConfirmDeleteButton
            onConfirm={() => startTransition(() => deleteHabit(habit.id))}
            title={`Supprimer "${habit.name}" ?`}
            message="Tout son historique (séries, notes) sera définitivement perdu. Cette action est irréversible."
            className="text-foreground-muted hover:text-danger"
          >
            Supprimer
          </ConfirmDeleteButton>
        </div>
      </div>
    </motion.div>
  );
}
