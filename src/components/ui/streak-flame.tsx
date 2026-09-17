"use client";

import { motion } from "framer-motion";

/** An animated flame whose size/glow intensity scales with the streak length. */
export function StreakFlame({ streak, size = "md" }: { streak: number; size?: "sm" | "md" | "lg" }) {
  if (streak <= 0) return null;

  const intensity = Math.min(1, streak / 30);
  const dims = size === "lg" ? 28 : size === "md" ? 18 : 13;
  const labelClass = size === "lg" ? "text-2xl font-semibold" : size === "md" ? "text-sm font-semibold" : "text-xs font-medium";

  return (
    <span className="inline-flex items-center gap-1">
      <motion.span
        className="inline-block"
        style={{
          fontSize: dims,
          filter: `drop-shadow(0 0 ${4 + intensity * 10}px color-mix(in srgb, var(--nutrition) ${40 + intensity * 50}%, transparent))`,
        }}
        animate={{ scale: [1, 1.12, 0.96, 1.08, 1], rotate: [0, -3, 2, -2, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        🔥
      </motion.span>
      <span className={labelClass}>{streak}</span>
    </span>
  );
}
