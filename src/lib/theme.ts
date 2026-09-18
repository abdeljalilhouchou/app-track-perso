export type Theme = "light" | "dark" | "system";

export const THEMES: Theme[] = ["light", "dark", "system"];
export const THEME_STORAGE_KEY = "theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

// Runs before first paint (inline in <head>) so an explicit choice never flashes the wrong palette.
// "system" stores no attribute: the prefers-color-scheme media query in globals.css takes over.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
