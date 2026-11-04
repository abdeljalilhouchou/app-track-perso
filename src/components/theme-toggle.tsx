"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/nav-icons";
import { useTheme } from "@/components/theme-provider";
import { useT } from "@/components/language-provider";
import type { Theme } from "@/lib/theme";

const ORDER: Theme[] = ["light", "dark", "system"];

/** Cycles light → dark → system. The icon shows the current choice. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const meta = {
    light: { Icon: SunIcon, label: t("profile.themeLight") },
    dark: { Icon: MoonIcon, label: t("profile.themeDark") },
    system: { Icon: MonitorIcon, label: t("profile.themeSystem") },
  };
  const { Icon, label } = meta[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`${label} · ${t("profile.changeTheme")}: ${meta[next].label.toLowerCase()}`}
      aria-label={`${label}. ${t("profile.changeTheme")}`}
      className={`flex h-11 w-11 items-center justify-center rounded-xl text-foreground-muted transition hover:bg-surface-muted hover:text-foreground ${className}`}
    >
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}
