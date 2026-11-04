import { parseISO } from "date-fns";
import type { Language } from "@/lib/language";

export function formatLocalizedDate(date: string | Date, language: Language, options: Intl.DateTimeFormatOptions) {
  const locale = language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
  return new Intl.DateTimeFormat(locale, options).format(typeof date === "string" ? parseISO(date) : date);
}
