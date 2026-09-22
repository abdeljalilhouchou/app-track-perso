"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { saveLanguage } from "@/lib/actions/language";
import { translate, type Vars } from "@/lib/i18n/translate";
import { dirOf, LANGUAGE_STORAGE_KEY, type Language } from "@/lib/language";

type LanguageContextValue = {
  language: Language;
  dir: "rtl" | "ltr";
  setLanguage: (language: Language) => void;
  /** Looks up a dot path (e.g. "nav.habits") and fills in {placeholders} from `vars`. */
  t: (path: string, vars?: Vars) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyDocumentLanguage(language: Language) {
  const root = document.documentElement;
  root.setAttribute("lang", language);
  root.setAttribute("dir", dirOf(language));
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // storage unavailable: the choice still applies for this session and is saved server-side
  }
}

export function LanguageProvider({ initialLanguage, children }: { initialLanguage: Language; children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    // Fire-and-forget: the UI already reflects the choice; persistence just needs to catch up.
    void saveLanguage(next);
  }, []);

  const t = useCallback((path: string, vars?: Vars) => translate(language, path, vars), [language]);

  const value = useMemo<LanguageContextValue>(() => ({ language, dir: dirOf(language), setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}

/** Convenience for components that only need translation, not the setter. */
export function useT() {
  return useLanguage().t;
}
