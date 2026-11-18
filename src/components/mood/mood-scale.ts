/** The 1–5 mood scale, shared by every mood view. Index 0 is unused so a score reads directly. */
export const MOOD_EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];
export const MOOD_COLOR = ["", "var(--danger)", "var(--nutrition)", "var(--mood)", "var(--sport)", "var(--success)"];

export function localeOf(language: string) {
  return language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
}

/** "mardi 18 novembre" in the reader's language, from a yyyy-MM-dd key. */
export function formatDay(date: string, language: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(localeOf(language), options).format(new Date(`${date}T12:00:00`));
}
