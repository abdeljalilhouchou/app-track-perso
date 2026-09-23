"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useTransition } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { deleteMeal } from "@/lib/actions/nutrition";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useT } from "@/components/language-provider";
import type { MealEntry } from "@/types/database";

export function MealList({ meals, emptyLabel }: { meals: MealEntry[]; emptyLabel?: string }) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const t = useT();

  const MEAL_LABELS: Record<string, string> = {
    "petit-dejeuner": `🌅 ${t("nutrition.mealTypes.petitDejeuner")}`,
    dejeuner: `☀️ ${t("nutrition.mealTypes.dejeuner")}`,
    diner: `🌙 ${t("nutrition.mealTypes.diner")}`,
    collation: `🍎 ${t("nutrition.mealTypes.collation")}`,
    autre: `🍽️ ${t("nutrition.mealTypes.autre")}`,
  };

  if (meals.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-nutrition/40 p-6 text-center text-sm text-foreground-muted">
        {emptyLabel ?? t("nutrition.mealList.emptyToday")}
      </p>
    );
  }

  const groups = new Map<string, MealEntry[]>();
  for (const m of meals) {
    if (!groups.has(m.meal_type)) groups.set(m.meal_type, []);
    groups.get(m.meal_type)!.push(m);
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([type, entries]) => (
        <div key={type}>
          <p className="mb-1.5 text-xs font-medium text-foreground-muted">{MEAL_LABELS[type] ?? type}</p>
          <ul className="space-y-1.5">
            {entries.map((m, i) => (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: "easeOut" }}
                className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface text-sm">
                  {m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.food_name}</p>
                  <p className="text-xs text-foreground-muted">
                    {m.quantity_grams}{m.unit} · {m.calories} kcal · {m.protein}g {t("nutrition.common.proteinAbbrev")} ·{" "}
                    {m.carbs}g {t("nutrition.common.carbsAbbrev")} · {m.fat}g {t("nutrition.common.fatAbbrev")}
                  </p>
                  {(m.fiber > 0 || m.sugar > 0 || m.sodium > 0 || m.caffeine > 0) && (
                    <p className="text-[10px] text-foreground-muted/70">
                      {m.fiber}g {t("nutrition.common.fiberWord")} · {m.sugar}g {t("nutrition.common.sugarWord")} ·{" "}
                      {m.sodium}mg {t("nutrition.common.sodiumWord")}
                      {m.caffeine > 0 ? ` · ☕ ${m.caffeine}mg ${t("nutrition.common.caffeineWord")}` : ""}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-foreground-muted">
                  {format(new Date(m.occurred_at), "HH:mm")}
                </span>
                <ConfirmDeleteButton
                  disabled={pending}
                  onConfirm={() =>
                    startTransition(async () =>
                      void (await run(() => deleteMeal(m.id), {
                        success: t("nutrition.mealList.deleteSuccess", { name: m.food_name }),
                        failure: t("nutrition.common.deleteFailure"),
                      }))
                    )
                  }
                  title={t("nutrition.mealList.deleteTitle")}
                  message={t("nutrition.mealList.deleteMessage", { name: m.food_name })}
                  className="shrink-0 text-foreground-muted hover:text-danger"
                >
                  ✕
                </ConfirmDeleteButton>
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
