export type Language = "fr" | "en" | "ar";

export const LANGUAGES: Language[] = ["fr", "en", "ar"];
export const LANGUAGE_STORAGE_KEY = "language";

export function isLanguage(value: unknown): value is Language {
  return value === "fr" || value === "en" || value === "ar";
}

export function dirOf(language: Language): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}

// Runs before first paint (inline in <head>) so an explicit choice never flashes the wrong
// language/direction — same technique as themeInitScript.
export const languageInitScript = `(function(){try{var l=localStorage.getItem('${LANGUAGE_STORAGE_KEY}');if(l==='fr'||l==='en'||l==='ar'){document.documentElement.setAttribute('lang',l);document.documentElement.setAttribute('dir',l==='ar'?'rtl':'ltr');}}catch(e){}})();`;
