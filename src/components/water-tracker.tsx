"use client";

import { useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addWater } from "@/lib/actions/nutrition";

const QUICK_AMOUNTS = [250, 330, 500];

export function WaterTracker({ ml, goalMl = 2000 }: { ml: number; goalMl?: number }) {
  const [pending, startTransition] = useTransition();
  const pct = Math.min(100, Math.round((ml / goalMl) * 100));

  return (
    <div className="rounded-2xl border-[1.5px] border-water/50 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">💧 Hydratation</p>
        <span className="text-sm">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={ml}
              initial={{ opacity: 0, y: -6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="inline-block font-semibold text-foreground"
            >
              {ml}
            </motion.span>
          </AnimatePresence>
          {" "}/ {goalMl} ml
        </span>
      </div>
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
            onClick={() => startTransition(() => addWater(amount))}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-water/50 hover:text-water disabled:opacity-60"
          >
            + {amount} ml
          </motion.button>
        ))}
        <motion.button
          type="button"
          disabled={pending || ml === 0}
          whileTap={{ scale: 0.92 }}
          onClick={() => startTransition(() => addWater(-250))}
          className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-40"
        >
          − 250 ml
        </motion.button>
      </div>
    </div>
  );
}
