"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HabitCard } from "@/components/habit-card";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { useT } from "@/components/language-provider";
import { CATEGORY_META, categorySlug } from "@/lib/habit-categories";
import type { Habit } from "@/types/database";

export type HabitCardData = {
  habit: Habit;
  values: Record<string, number>;
  doneToday: boolean;
  streak: number;
  thisWeekCount: number;
  todayNote: string | null;
  isFirst: boolean;
  isLast: boolean;
};

export function HabitsBoard({ groups }: { groups: { category: string; habits: HabitCardData[] }[] }) {
  const t = useT();
  const [burst, setBurst] = useState(0);
  const wasAllDone = useRef<boolean | null>(null);

  const jsDay = new Date().getDay();
  const todayDayNum = jsDay === 0 ? 7 : jsDay;
  const allHabits = groups.flatMap((g) => g.habits);
  const scheduledToday = allHabits.filter((h) => h.habit.scheduled_days.includes(todayDayNum));
  const allDone = scheduledToday.length > 0 && scheduledToday.every((h) => h.doneToday);

  useEffect(() => {
    if (wasAllDone.current === null) {
      wasAllDone.current = allDone;
      return;
    }
    if (allDone && !wasAllDone.current) {
      setBurst((b) => b + 1);
    }
    wasAllDone.current = allDone;
  }, [allDone]);

  return (
    <div className="space-y-8">
      <ConfettiBurst trigger={burst} />
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
              <span style={{ color: meta.color }}>{t(`habits.categories.${categorySlug(category)}`)}</span>
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
