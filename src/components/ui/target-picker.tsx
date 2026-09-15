"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function TargetPicker({ name, defaultValue = 7 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-1 rounded-xl border border-border bg-surface-muted p-1">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className="relative flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
          >
            {value === n && (
              <motion.span
                layoutId={`target-pill-${name}`}
                className="absolute inset-0 rounded-lg bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative ${value === n ? "text-white" : "text-foreground-muted"}`}>{n}</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-foreground-muted">fois par semaine</p>
    </div>
  );
}
