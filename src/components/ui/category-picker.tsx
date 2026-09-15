"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORY_META, CATEGORY_PRESETS } from "@/lib/habit-categories";
import { useClickOutside } from "@/lib/use-click-outside";

export function CategoryPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const meta = CATEGORY_META[value] ?? CATEGORY_META["Général"];

  return (
    <div ref={ref} className="relative flex-1">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm transition hover:border-accent/50"
      >
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
          {meta.icon} {value}
        </span>
        <span className={`text-xs text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            {CATEGORY_PRESETS.map((cat) => {
              const catMeta = CATEGORY_META[cat];
              const active = cat === value;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setValue(cat);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface-muted ${
                    active ? "bg-accent-soft text-accent" : ""
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: catMeta.color }} />
                  {catMeta.icon} {cat}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
