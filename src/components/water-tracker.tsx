"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addWater } from "@/lib/actions/nutrition";

const QUICK_AMOUNTS = [250, 330, 500];

export function WaterTracker({ ml, drinksMl = 0, goalMl = 2000 }: { ml: number; drinksMl?: number; goalMl?: number }) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const totalMl = ml + drinksMl;
  const pct = Math.min(100, Math.round((totalMl / goalMl) * 100));

  return (
    <div className="rounded-2xl border-[1.5px] border-water/50 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">💧 Hydratation</p>
        <span className="text-sm">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={totalMl}
              initial={{ opacity: 0, y: -6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="inline-block font-semibold text-foreground"
            >
              {totalMl}
            </motion.span>
          </AnimatePresence>
          {" "}/ {goalMl} ml
        </span>
      </div>
      {drinksMl > 0 && (
        <p className="-mt-1.5 mb-3 text-[11px] text-foreground-muted">
          dont {drinksMl} ml de boissons du journal (café, thé, jus…)
        </p>
      )}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--water)" }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <motion.button
            key={amount}
            type="button"
            disabled={pending}
            whileTap={{ scale: 0.92 }}
            onClick={() =>
              startTransition(async () =>
                void (await run(() => addWater(amount), {
                  success: `+${amount} ml d'eau 💧`,
                  failure: "Eau non enregistrée",
                  undo: { run: () => addWater(-amount) },
                }))
              )
            }
            className="rounded-full border border-water/40 px-3 py-1.5 text-xs font-medium transition-colors hover:border-water/50 hover:text-water disabled:opacity-60"
          >
            + {amount} ml
          </motion.button>
        ))}
        <motion.button
          type="button"
          disabled={pending || ml === 0}
          whileTap={{ scale: 0.92 }}
          onClick={() => startTransition(async () => void (await run(() => addWater(-250), { success: "−250 ml retirés", failure: "Modification impossible" })))}
          className="rounded-full border border-dashed border-water/40 px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-40"
        >
          − 250 ml
        </motion.button>
      </div>
    </div>
  );
}
