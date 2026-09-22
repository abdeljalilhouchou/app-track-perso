import { createClient } from "@/lib/supabase/server";
import { isLanguage } from "@/lib/language";
import { dictionaries, type Dictionary } from "./dictionary";

/** Server-side counterpart to useLanguage()/useT(), for Server Components rendering the page shell. */
export async function getDictionary(): Promise<Dictionary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return dictionaries.fr;

  const { data: profile } = await supabase.from("profiles").select("language").eq("id", user.id).single();
  const language = isLanguage(profile?.language) ? profile.language : "fr";
  return dictionaries[language];
}
