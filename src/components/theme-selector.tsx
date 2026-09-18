"use client";

import { motion } from "framer-motion";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/nav-icons";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";

// Fixed swatches: each preview must show its own palette regardless of the theme currently applied.
const OPTIONS: { value: Theme; label: string; hint: string; Icon: typeof SunIcon; preview: React.CSSProperties }[] = [
  { value: "light", label: "Clair", hint: "Fond lumineux", Icon: SunIcon, preview: { background: "#f7f7fb" } },
  { value: "dark", label: "Sombre", hint: "Confortable la nuit", Icon: MoonIcon, preview: { background: "#0b0b10" } },
  {
    value: "system",
    label: "Système",
    hint: "Suit ton appareil",
    Icon: MonitorIcon,
    preview: { background: "linear-gradient(135deg, #f7f7fb 50%, #0b0b10 50%)" },
  },
];

function Mock({ dark, narrow }: { dark?: boolean; narrow?: boolean }) {
  const surface = dark ? "#16161e" : "#ffffff";
  const accent = dark ? "#818cf8" : "#6366f1";
  const line = dark ? "#2b2b37" : "#e5e5ef";
  return (
    <div
      className="flex flex-col gap-1 rounded-md p-1.5"
      style={{ background: surface, border: `1px solid ${line}`, width: narrow ? "40%" : "62%" }}
    >
      <span className="h-1 w-3/5 rounded-full" style={{ background: accent }} />
      <span className="h-1 w-full rounded-full" style={{ background: line }} />
      <span className="h-1 w-4/5 rounded-full" style={{ background: line }} />
    </div>
  );
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div role="radiogroup" aria-label="Apparence" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ value, label, hint, Icon, preview }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className="relative rounded-2xl border-[1.5px] p-3 text-left transition-colors"
            style={{
              borderColor: selected ? "var(--accent)" : "var(--border)",
              background: selected ? "var(--accent-soft)" : "var(--surface)",
            }}
          >
            {selected && (
              <motion.span
                layoutId="theme-selected"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-accent/40"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <div
              className="mb-3 flex h-16 items-center justify-center gap-1.5 rounded-lg border border-border"
              style={preview}
            >
              {value === "system" ? (
                <>
                  <Mock narrow />
                  <Mock dark narrow />
                </>
              ) : (
                <Mock dark={value === "dark"} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Icon className={`h-4.5 w-4.5 ${selected ? "text-accent" : "text-foreground-muted"}`} />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-foreground-muted">{hint}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
