"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WEEKDAYS } from "@/lib/habit-categories";

export function DayPicker({
  name,
  defaultValue,
  color = "var(--accent)",
}: {
  name: string;
  defaultValue?: number[];
  color?: string;
}) {
  const [selected, setSelected] = useState<number[]>(
    defaultValue && defaultValue.length > 0 ? defaultValue : [1, 2, 3, 4, 5, 6, 7]
  );

  function toggle(day: number) {
    setSelected((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // keep at least one day
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(",")} />
      <div className="flex gap-1.5">
        {WEEKDAYS.map((day) => {
          const active = selected.includes(day.value);
          return (
            <motion.button
              key={day.value}
              type="button"
              title={day.label}
              onClick={() => toggle(day.value)}
              whileTap={{ scale: 0.88 }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors"
              style={{
                background: active ? color : "var(--surface-muted)",
                color: active ? "white" : "var(--foreground-muted)",
              }}
            >
              {day.short}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
