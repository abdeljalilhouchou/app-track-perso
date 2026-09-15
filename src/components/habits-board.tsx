"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HabitCard } from "@/components/habit-card";
import { CATEGORY_META } from "@/lib/habit-categories";
import type { Habit } from "@/types/database";

export type HabitCardData = {
  habit: Habit;
  values: Record<string, number>;
  doneToday: boolean;
  streak: number;
  thisWeekCount: number;
  isFirst: boolean;
  isLast: boolean;
};

export function HabitsBoard({ groups }: { groups: { category: string; habits: HabitCardData[] }[] }) {
  return (
    <div className="space-y-8">
      {groups.map(({ category, habits }) => {
        const meta = CATEGORY_META[category] ?? CATEGORY_META["Général"];
        return (
          <div key={category}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                style={{ background: `color-mix(in srgb, ${meta.color} 20%, transparent)` }}
              >
                {meta.icon}
              </span>
              <span style={{ color: meta.color }}>{category}</span>
              <span className="text-xs text-foreground-muted">· {habits.length}</span>
            </h2>
            <motion.div layout className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {habits.map((data) => (
                  <HabitCard key={data.habit.id} {...data} />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
