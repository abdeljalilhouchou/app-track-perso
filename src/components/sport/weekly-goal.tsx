"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { saveSportGoal } from "@/lib/actions/sport";

export function WeeklyGoal({
  sessions,
  goal,
  goalWeeks,
}: {
  sessions: number;
  goal: number;
  goalWeeks: number;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(goal);
  const pct = Math.min(100, Math.round((sessions / value) * 100));
  const reached = sessions >= value;

  function change(next: number) {
    const clamped = Math.min(14, Math.max(1, next));
    setValue(clamped);
    startTransition(async () => {
      await saveSportGoal(clamped);
    });
  }

  return (
    <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">🎯 Objectif de la semaine</p>
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <button
            type="button"
            disabled={pending || value <= 1}
            onClick={() => change(value - 1)}
            aria-label="Diminuer l'objectif"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-sport/40 transition hover:bg-surface-muted disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-14 text-center">{value} séance{value > 1 ? "s" : ""}</span>
          <button
            type="button"
            disabled={pending || value >= 14}
            onClick={() => change(value + 1)}
            aria-label="Augmenter l'objectif"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-sport/40 transition hover:bg-surface-muted disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <p className="mb-2 text-2xl font-semibold" style={{ color: "var(--sport)" }}>
        {sessions} <span className="text-base font-normal text-foreground-muted">/ {value}</span>
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--sport)" }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        {reached ? "Objectif atteint, bravo ! 🎉" : `Encore ${value - sessions} séance${value - sessions > 1 ? "s" : ""} cette semaine.`}
        {goalWeeks > 0 && ` · 🔥 ${goalWeeks} semaine${goalWeeks > 1 ? "s" : ""} d'affilée`}
      </p>
    </div>
  );
}
