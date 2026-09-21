"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { saveTheme } from "@/lib/actions/theme";
import { useToast } from "@/components/toast/toast-provider";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the choice still applies for this session and is saved server-side.
  }

  // Keep the mobile browser chrome in tune with the palette.
  const color = getComputedStyle(root).getPropertyValue("--background").trim();
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    startTransition(async () => {
      await saveTheme(next);
    });
    toast.success(`Apparence : ${next === "light" ? "clair ☀️" : next === "dark" ? "sombre 🌙" : "automatique (selon ton appareil)"}`);
  }, [toast]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
