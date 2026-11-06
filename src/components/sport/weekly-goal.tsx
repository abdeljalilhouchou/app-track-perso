"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { useLanguage, useT } from "@/components/language-provider";
import { saveSportGoal } from "@/lib/actions/sport";
import { SportButton, SportCard } from "@/components/sport/ui/sport-primitives";
import { SportProgressBar } from "@/components/sport/ui/sport-progress";

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
  const { language } = useLanguage();
  const number = new Intl.NumberFormat(language);
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
    <SportCard className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="sport-eyebrow">{t("sport.weeklyGoal.title")}</p>
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <SportButton
            type="button"
            disabled={pending || value <= 1}
            onClick={() => change(value - 1)}
            aria-label={t("sport.weeklyGoal.decreaseAria")}
            variant="secondary"
            className="px-2.5"
            icon="minus"
          >
          </SportButton>
          <span className="min-w-14 text-center">
            <bdi>{number.format(value)}</bdi> {t(value > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne")}
          </span>
          <SportButton
            type="button"
            disabled={pending || value >= 14}
            onClick={() => change(value + 1)}
            aria-label={t("sport.weeklyGoal.increaseAria")}
            variant="secondary"
            className="px-2.5"
            icon="plus"
          >
          </SportButton>
        </div>
      </div>

      <p className="mb-3 text-2xl font-semibold tabular-nums" style={{ color: "var(--sport-ink)" }}>
        <bdi>{number.format(sessions)} <span className="text-base font-normal text-foreground-muted">/ {number.format(value)}</span></bdi>
      </p>
      <SportProgressBar label={t("sport.weeklyGoal.title")} value={pct} valueText={`${number.format(sessions)} / ${number.format(value)}`} />
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
    </SportCard>
  );
}
