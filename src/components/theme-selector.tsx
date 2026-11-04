"use client";

import { motion } from "framer-motion";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/nav-icons";
import { useTheme } from "@/components/theme-provider";
import { useT } from "@/components/language-provider";
import type { Theme } from "@/lib/theme";

// Fixed swatches: each preview must show its own palette regardless of the theme currently applied.
const OPTIONS: { value: Theme; labelKey: string; hintKey: string; Icon: typeof SunIcon; preview: React.CSSProperties }[] = [
  { value: "light", labelKey: "profile.themeLight", hintKey: "profile.themeLightHint", Icon: SunIcon, preview: { background: "#f7f7fb" } },
  { value: "dark", labelKey: "profile.themeDark", hintKey: "profile.themeDarkHint", Icon: MoonIcon, preview: { background: "#0b0b10" } },
  {
    value: "system",
    labelKey: "profile.themeSystem",
    hintKey: "profile.themeSystemHint",
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
  const t = useT();

  return (
    <div role="radiogroup" aria-label={t("profile.appearanceHeading")} className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ value, labelKey, hintKey, Icon, preview }) => {
        const selected = theme === value;
        const label = t(labelKey);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className="relative min-h-11 rounded-2xl border-[1.5px] p-3 text-start transition-colors"
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
                <p className="text-xs text-foreground-muted">{t(hintKey)}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
