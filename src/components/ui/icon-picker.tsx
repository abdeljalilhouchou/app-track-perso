"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EMOJI_CHOICES } from "@/lib/habit-categories";
import { useClickOutside } from "@/lib/use-click-outside";

export function IconPicker({
  name,
  defaultValue,
  value: controlledValue,
  onChange,
  color = "var(--accent)",
  choices = EMOJI_CHOICES,
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  color?: string;
  choices?: string[];
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? choices[0]);
  const value = controlledValue ?? internalValue;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  function select(emoji: string) {
    if (onChange) onChange(emoji);
    else setInternalValue(emoji);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <input type="hidden" name={name} value={value} />
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.92 }}
        className="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition-colors"
        style={{
          borderColor: open ? color : "var(--border)",
          background: open ? `color-mix(in srgb, ${color} 14%, var(--surface-muted))` : "var(--surface-muted)",
        }}
      >
        {value}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full z-30 mt-2 grid w-[220px] grid-cols-5 gap-1 rounded-2xl border border-border bg-surface p-2 shadow-xl"
          >
            {choices.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => select(emoji)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:scale-110 hover:bg-surface-muted ${
                  emoji === value ? "bg-accent-soft ring-2 ring-accent" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
