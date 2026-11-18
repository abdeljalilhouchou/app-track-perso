import type { Language } from "@/lib/language";

export const localeOf = (language: Language) => language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";

/** Kilometres with up to `digits` decimals, in the person's locale (6,2 / 6.2). */
export function formatKm(value: number, language: Language, digits = 1) {
  return new Intl.NumberFormat(localeOf(language), { maximumFractionDigits: digits }).format(value);
}

/** h:mm:ss under an hour drops the hours: 37:12, 1:05:00. */
export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "hier", "il y a 3 jours", or a date beyond a week. */
export function formatWhen(dateKey: string, language: Language, now = new Date()) {
  const day = new Date(`${dateKey}T12:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const days = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (days >= 0 && days < 7) return new Intl.RelativeTimeFormat(localeOf(language), { numeric: "auto" }).format(-days, "day");
  return new Intl.DateTimeFormat(localeOf(language), { day: "numeric", month: "long" }).format(day);
}
