"use client";

import { useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { MealList } from "@/components/meal-list";
import type { MealEntry } from "@/types/database";

export type JournalDay = { date: string; meals: MealEntry[] };

function dayLabel(date: string) {
  const d = parseISO(date);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return "Hier";
  return format(d, "EEEE d MMMM", { locale: fr });
}

export function NutritionJournal({ days }: { days: JournalDay[] }) {
  const [openDates, setOpenDates] = useState<Set<string>>(() => new Set(days.slice(0, 1).map((d) => d.date)));

  function toggle(date: string) {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {days.map(({ date, meals }) => {
        const open = openDates.has(date);
        const totals = meals.reduce(
          (acc, m) => ({
            calories: acc.calories + m.calories,
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fat: acc.fat + m.fat,
            caffeine: acc.caffeine + m.caffeine,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, caffeine: 0 }
        );

        return (
          <div key={date} className="rounded-2xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => toggle(date)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold capitalize">{dayLabel(date)}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {meals.length === 0
                    ? "Rien enregistré"
                    : `${Math.round(totals.calories)} kcal · ${Math.round(totals.protein)}g P · ${Math.round(totals.carbs)}g G · ${Math.round(totals.fat)}g L${
                        totals.caffeine > 0 ? ` · ☕ ${Math.round(totals.caffeine)}mg` : ""
                      }`}
                </p>
              </div>
              <span className="shrink-0 text-xs text-foreground-muted">
                {meals.length} entrée{meals.length !== 1 ? "s" : ""}
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 text-xs text-foreground-muted"
              >
                ▼
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5">
                    <MealList meals={meals} emptyLabel="Rien enregistré ce jour-là." />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
