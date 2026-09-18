"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/nav-icons";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";

const ORDER: Theme[] = ["light", "dark", "system"];
const META = {
  light: { Icon: SunIcon, label: "Thème clair" },
  dark: { Icon: MoonIcon, label: "Thème sombre" },
  system: { Icon: MonitorIcon, label: "Thème du système" },
} as const;

/** Cycles light → dark → system. The icon shows the current choice. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { Icon, label } = META[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`${label} — cliquer pour passer à : ${META[next].label.toLowerCase()}`}
      aria-label={`${label}. Changer d'apparence`}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition hover:bg-surface-muted hover:text-foreground ${className}`}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}
