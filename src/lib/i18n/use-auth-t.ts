"use client";

import { useCallback, useSyncExternalStore } from "react";
import { dirOf, isLanguage, LANGUAGE_STORAGE_KEY, type Language } from "@/lib/language";
import { translate, type Vars } from "./translate";

const CHANGE_EVENT = "track-perso:auth-language";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
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

/** The language picked before signing in: kept in localStorage, applied to <html> at once. */
export function useAuthLanguage() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setAuthLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
  document.documentElement.setAttribute("lang", language);
  document.documentElement.setAttribute("dir", dirOf(language));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Standalone translator for routes rendered before authentication (login, signup, password
 * reset). These pages have no profile to read a language from and no session to persist a
 * choice to, so they read whatever `languageInitScript` or the picker wrote to localStorage.
 */
export function useAuthT() {
  const language = useAuthLanguage();
  return useCallback((path: string, vars?: Vars) => translate(language, path, vars), [language]);
}
