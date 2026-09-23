import { createClient } from "@/lib/supabase/server";
import { isLanguage, type Language } from "@/lib/language";
import { dictionaries, type Dictionary } from "./dictionary";
import { translate, type Vars } from "./translate";

async function resolveLanguage(): Promise<Language> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "fr";

  const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).single();
  return isLanguage(profile?.language) ? profile.language : "fr";
}

/** Server-side counterpart to useLanguage(), for Server Components rendering the page shell. */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await resolveLanguage()];
}

/**
 * Server-side counterpart to useT(): a loose dot-path translator, for Server Components that
 * need keys not yet merged into the strongly-typed `Dictionary` (e.g. while a module's
 * translations are being added incrementally).
 */
export async function getT() {
  const language = await resolveLanguage();
  return (path: string, vars?: Vars) => translate(language, path, vars);
}
