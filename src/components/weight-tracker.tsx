"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { logWeight, deleteWeightLog } from "@/lib/actions/nutrition";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { WeeklyLineChart } from "@/components/charts/weekly-line-chart";
import type { WeightLog } from "@/types/database";

export function WeightTracker({ logs }: { logs: WeightLog[] }) {
  const [pending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);

  const sorted = [...logs].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const chartData = sorted.slice(-20).map((l) => ({
    label: format(new Date(l.entry_date), "d MMM", { locale: fr }),
    value: l.weight_kg,
  }));
  const latest = sorted[sorted.length - 1] ?? null;
  const previous = sorted[sorted.length - 2] ?? null;
  const diff = latest && previous ? Math.round((latest.weight_kg - previous.weight_kg) * 10) / 10 : null;

  return (
    <div className="rounded-2xl border-[1.5px] border-weight/50 bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">⚖️ Poids corporel</p>
        {latest && (
          <span className="text-sm">
            <strong>{latest.weight_kg} kg</strong>
            <AnimatePresence>
              {diff !== null && diff !== 0 && (
                <motion.span
                  key={latest.id}
                  initial={{ opacity: 0, scale: 0.8, x: -4 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="ml-1.5 inline-block"
                  style={{ color: diff > 0 ? "var(--danger)" : "#16a34a" }}
                >
                  {diff > 0 ? "+" : ""}
                  {diff} kg
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        )}
      </div>

      {chartData.length >= 2 ? (
        <WeeklyLineChart data={chartData} color="var(--weight)" unit="kg" />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-foreground-muted">
          Note ton poids régulièrement pour voir la tendance.
        </p>
      )}

      <form
        key={resetKey}
        action={(formData) =>
          startTransition(async () => {
            await logWeight(formData);
            setResetKey((k) => k + 1);
          })
        }
        className="mt-4 flex items-center gap-2"
      >
        <input
          name="weight_kg"
          type="number"
          min={20}
          max={400}
          step="0.1"
          required
          placeholder="Poids aujourd'hui (kg)"
          className="flex-1 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none focus:border-weight"
        />
        <motion.button
          type="submit"
          disabled={pending}
          whileTap={{ scale: 0.96 }}
          className="rounded-xl border-[1.5px] border-weight px-4 py-2.5 text-sm font-semibold text-weight transition-colors hover:bg-weight hover:text-white disabled:opacity-40"
        >
          Noter
        </motion.button>
      </form>

      {sorted.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {sorted
            .slice(-6)
            .reverse()
            .map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] text-foreground-muted"
              >
                {format(new Date(l.entry_date), "d MMM", { locale: fr })} · {l.weight_kg}kg
                <ConfirmDeleteButton
                  disabled={pending}
                  onConfirm={() => startTransition(() => deleteWeightLog(l.id))}
                  title="Supprimer cette pesée ?"
                  message={`La pesée du ${format(new Date(l.entry_date), "d MMMM", { locale: fr })} sera supprimée.`}
                  className="text-foreground-muted hover:text-danger"
                >
                  ✕
                </ConfirmDeleteButton>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
