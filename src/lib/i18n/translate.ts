import { dictionaries, type Dictionary } from "./dictionary";
import type { Language } from "@/lib/language";

export type Vars = Record<string, string | number>;

function resolve(dict: Dictionary, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) return (node as Record<string, unknown>)[key];
    return undefined;
  }, dict);
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/** Looks up a dot path (e.g. "nav.habits") in the given locale and fills in {placeholders}. */
export function translate(language: Language, path: string, vars?: Vars): string {
  const value = resolve(dictionaries[language], path) ?? resolve(dictionaries.fr, path);
  return typeof value === "string" ? interpolate(value, vars) : path;
}
