"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { saveDailyLimits } from "@/lib/actions/nutrition";

export function DailyLimits({
  waterGoalMl,
  caffeineLimitMg,
  sugarLimitG,
}: {
  waterGoalMl: number;
  caffeineLimitMg: number;
  sugarLimitG: number;
}) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const r = await run(() => saveDailyLimits(formData), { success: "Limites personnelles enregistrées", failure: "Limites non enregistrées" });
          if (!r || r.error) return;
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        })
      }
      className="mt-4 border-t border-nutrition/30 pt-4"
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
        Mes limites personnelles
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-foreground-muted">💧 Objectif d&apos;eau (ml/jour)</span>
          <input
            name="water_goal_ml"
            type="number"
            min={500}
            max={10000}
            step={50}
            defaultValue={waterGoalMl}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-foreground-muted">☕ Limite de caféine (mg/jour)</span>
          <input
            name="caffeine_limit_mg"
            type="number"
            min={50}
            max={1000}
            step={10}
            defaultValue={caffeineLimitMg}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-foreground-muted">🍬 Limite de sucres (g/jour)</span>
          <input
            name="sugar_limit_g"
            type="number"
            min={5}
            max={300}
            step={1}
            defaultValue={sugarLimitG}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl border-[1.5px] border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : saved ? "Enregistré ✓" : "Enregistrer mes limites"}
      </button>
    </form>
  );
}
