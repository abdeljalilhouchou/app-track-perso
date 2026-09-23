"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useT } from "@/components/language-provider";
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
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [value, setValue] = useState(goal);
  const pct = Math.min(100, Math.round((sessions / value) * 100));
  const reached = sessions >= value;

  function change(next: number) {
    const clamped = Math.min(14, Math.max(1, next));
    setValue(clamped);
    startTransition(async () => {
      await run(() => saveSportGoal(clamped), {
        success: t("sport.weeklyGoal.goalToast", { count: clamped, unit: t(clamped > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne") }),
        failure: t("sport.weeklyGoal.goalNotSaved"),
      });
    });
  }

  return (
    <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.weeklyGoal.title")}</p>
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <button
            type="button"
            disabled={pending || value <= 1}
            onClick={() => change(value - 1)}
            aria-label={t("sport.weeklyGoal.decreaseAria")}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-sport/40 transition hover:bg-surface-muted disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-14 text-center">
            {value} {t(value > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne")}
          </span>
          <button
            type="button"
            disabled={pending || value >= 14}
            onClick={() => change(value + 1)}
            aria-label={t("sport.weeklyGoal.increaseAria")}
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
        {reached
          ? t("sport.weeklyGoal.reachedMessage")
          : t("sport.weeklyGoal.remainingMessage", {
              count: value - sessions,
              unit: t(value - sessions > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne"),
            })}
        {goalWeeks > 0 &&
          t("sport.weeklyGoal.streakSuffix", { count: goalWeeks, unit: t(goalWeeks > 1 ? "sport.common.weekOther" : "sport.common.weekOne") })}
      </p>
    </div>
  );
}
