"use client";

import { useTransition } from "react";
import { addWater } from "@/lib/actions/nutrition";

const QUICK_AMOUNTS = [250, 330, 500];

export function WaterTracker({ ml, goalMl = 2000 }: { ml: number; goalMl?: number }) {
  const [pending, startTransition] = useTransition();
  const pct = Math.min(100, Math.round((ml / goalMl) * 100));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">💧 Hydratation</p>
        <span className="text-sm">
          <span className="font-semibold text-foreground">{ml}</span> / {goalMl} ml
        </span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#38bdf8" }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => addWater(amount))}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:border-accent/40 hover:text-accent disabled:opacity-60"
          >
            + {amount} ml
          </button>
        ))}
        <button
          type="button"
          disabled={pending || ml === 0}
          onClick={() => startTransition(() => addWater(-250))}
          className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:border-danger/40 hover:text-danger disabled:opacity-40"
        >
          − 250 ml
        </button>
      </div>
    </div>
  );
}
