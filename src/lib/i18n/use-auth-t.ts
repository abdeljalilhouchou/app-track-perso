"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isLanguage, LANGUAGE_STORAGE_KEY, type Language } from "@/lib/language";
import { translate, type Vars } from "./translate";

function subscribe() {
  return () => {};
}

function getSnapshot(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // storage unavailable: fall back to French below
  }
  return "fr";
}

function getServerSnapshot(): Language {
  return "fr";
}

/**
 * Standalone translator for routes rendered before authentication (login, signup, password
 * reset). These pages have no profile to read a language from and no session to persist a
 * choice to, so they just read whatever `languageInitScript` already wrote to localStorage.
 */
export function useAuthT() {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useCallback((path: string, vars?: Vars) => translate(language, path, vars), [language]);
}
