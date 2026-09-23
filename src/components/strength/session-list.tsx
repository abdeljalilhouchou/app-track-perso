"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useT } from "@/components/language-provider";
import { deleteWorkout } from "@/lib/actions/sport";
import { formatWeight, muscleColor, muscleGroupI18nPath } from "@/lib/strength";
import type { WorkoutDetail } from "@/lib/strength-stats";

export type SessionItem = {
  id: string;
  date: string;
  activity: string;
  duration: number;
  intensity: number;
  notes: string | null;
  muscleGroups: string[];
};

export function SessionList({
  sessions,
  details,
  emptyLabel,
  showDate = true,
}: {
  sessions: SessionItem[];
  details: Record<string, WorkoutDetail>;
  emptyLabel: string;
  showDate?: boolean;
}) {
  const t = useT();
  const muscleLabel = (group: string) => {
    const path = muscleGroupI18nPath(group);
    return path ? t(path) : group;
  };
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [openId, setOpenId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-sport/40 p-6 text-center text-sm text-foreground-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {sessions.map((s) => {
        const detail = details[s.id];
        const open = openId === s.id;
        return (
          <li key={s.id} className="rounded-2xl border-[1.5px] border-sport/50 bg-surface">
            <button
              type="button"
              onClick={() => detail && setOpenId(open ? null : s.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.activity}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
                  {s.muscleGroups.map((g) => (
                    <span key={g} style={{ color: muscleColor(g) }}>
                      {muscleLabel(g)}
                    </span>
                  ))}
                  <span className="text-foreground-muted">
                    {showDate && `${format(parseISO(s.date), "EEE d MMM", { locale: fr })} · `}
                    {t("sport.sessionList.durationIntensity", { duration: s.duration, intensity: s.intensity })}
                    {detail && ` · ${t("sport.sessionList.detailSummary", { sets: detail.totalSets, volume: detail.volume.toLocaleString("fr-FR") })}`}
                  </span>
                </p>
              </div>
              {detail && (
                <motion.span animate={{ rotate: open ? 180 : 0 }} className="shrink-0 text-xs text-foreground-muted">
                  ▼
                </motion.span>
              )}
            </button>

            <AnimatePresence initial={false}>
              {open && detail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 px-5 pb-5">
                    {detail.exercises.map((ex) => (
                      <div key={ex.name} className="rounded-xl bg-surface-muted px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{ex.name}</p>
                          <span className="shrink-0 text-[11px]" style={{ color: muscleColor(ex.muscle) }}>
                            {muscleLabel(ex.muscle)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-foreground-muted">
                          {ex.sets
                            .map((x) => (x.weight > 0 ? `${formatWeight(x.weight)} kg × ${x.reps}` : t("sport.common.repsValue", { reps: x.reps })))
                            .join("  ·  ")}
                        </p>
                      </div>
                    ))}
                    {s.notes && <p className="text-xs text-foreground-muted">📝 {s.notes}</p>}
                    <ConfirmDeleteButton
                      disabled={pending}
                      onConfirm={() =>
                        startTransition(
                          async () =>
                            void (await run(() => deleteWorkout(s.id), {
                              success: t("sport.common.sessionDeletedToast", { name: s.activity }),
                              failure: t("sport.common.deleteImpossible"),
                            }))
                        )
                      }
                      title={t("sport.common.confirmDeleteSessionTitle")}
                      message={t("sport.sessionList.confirmDeleteWithSets", {
                        activity: s.activity,
                        date: format(parseISO(s.date), "d MMMM", { locale: fr }),
                      })}
                      className="text-xs text-foreground-muted transition hover:text-danger"
                    >
                      {t("sport.sessionList.deleteSessionButton")}
                    </ConfirmDeleteButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!detail && (
              <div className="flex items-center justify-between px-5 pb-4">
                <p className="text-xs text-foreground-muted">{s.notes ?? ""}</p>
                <ConfirmDeleteButton
                  disabled={pending}
                  onConfirm={() =>
                    startTransition(
                      async () =>
                        void (await run(() => deleteWorkout(s.id), {
                          success: t("sport.common.sessionDeletedToast", { name: s.activity }),
                          failure: t("sport.common.deleteImpossible"),
                        }))
                    )
                  }
                  title={t("sport.common.confirmDeleteSessionTitle")}
                  message={t("sport.common.confirmDeleteMessage", {
                    activity: s.activity,
                    date: format(parseISO(s.date), "d MMMM", { locale: fr }),
                  })}
                  className="text-xs text-foreground-muted transition hover:text-danger"
                >
                  {t("sport.common.delete")}
                </ConfirmDeleteButton>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
