"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

export function MoodPicker({ defaultValue = 3 }: { defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex gap-2">
      {MOODS.map((m) => {
        const selected = m.value === value;
        return (
          <label key={m.value} className="cursor-pointer">
            <input
              type="radio"
              name="mood_score"
              value={m.value}
              checked={selected}
              onChange={() => setValue(m.value)}
              className="peer sr-only"
            />
            <motion.span
              animate={selected ? { scale: [1, 1.3, 1.1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition-colors"
              style={{
                borderColor: selected ? "var(--mood)" : "var(--border)",
                background: selected ? "var(--mood-soft)" : "transparent",
              }}
            >
              {m.emoji}
            </motion.span>
          </label>
        );
      })}
    </div>
  );
}
