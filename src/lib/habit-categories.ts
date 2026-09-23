export const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Général": { icon: "⭐", color: "#6366f1" },
  "Santé": { icon: "❤️", color: "#ef4444" },
  "Sport": { icon: "🏃", color: "#10b981" },
  "Travail": { icon: "💼", color: "#f59e0b" },
  "Bien-être": { icon: "🧘", color: "#8b5cf6" },
};

export const CATEGORY_PRESETS = Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[];

// Maps the French category value stored in the DB to a stable, language-independent slug used
// to look up its translated label (e.g. `t(`habits.categories.${categorySlug(category)}`)`).
export const CATEGORY_SLUGS: Record<string, string> = {
  "Général": "general",
  "Santé": "health",
  "Sport": "sport",
  "Travail": "work",
  "Bien-être": "wellbeing",
};

export function categorySlug(category: string): string {
  return CATEGORY_SLUGS[category] ?? "general";
}

// ISO weekday numbers: 1 = Lundi ... 7 = Dimanche
export const WEEKDAYS = [
  { value: 1, short: "L", label: "Lundi" },
  { value: 2, short: "M", label: "Mardi" },
  { value: 3, short: "M", label: "Mercredi" },
  { value: 4, short: "J", label: "Jeudi" },
  { value: 5, short: "V", label: "Vendredi" },
  { value: 6, short: "S", label: "Samedi" },
  { value: 7, short: "D", label: "Dimanche" },
] as const;

// Stable, language-independent slugs for each ISO weekday (1 = Monday ... 7 = Sunday), used to
// look up translated weekday labels (e.g. `t(`habits.weekdaysLong.${WEEKDAY_SLUGS[value - 1]}`)`).
export const WEEKDAY_SLUGS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export function weekdaySlug(value: number): string {
  return WEEKDAY_SLUGS[value - 1] ?? WEEKDAY_SLUGS[0];
}

export const EMOJI_CHOICES = [
  "✨", "📚", "💧", "🧘", "🥗", "🛏️", "🚭", "✍️", "💊", "🎯",
  "🏃", "🏋️", "🚴", "🎨", "🎸", "🧠", "🌱", "💻", "📵", "☀️",
];

export const MOMENT_EMOJI_CHOICES = [
  "⚡", "☕", "🛍️", "🚶", "🎬", "🍽️", "🎉", "👥", "🚗", "💬",
  "🎧", "🌳", "📸", "🛒", "🧹", "🐶", "🎮", "🍕", "🛌", "✨",
];

export const SUGGESTED_HABITS: {
  /** Stable, language-independent slug used to look up the translated suggestion name. */
  key: string;
  icon: string;
  name: string;
  category: string;
  scheduledDays: number[];
}[] = [
  { key: "water", icon: "💧", name: "Boire de l'eau", category: "Santé", scheduledDays: [1, 2, 3, 4, 5, 6, 7] },
  { key: "meditate", icon: "🧘", name: "Méditer", category: "Bien-être", scheduledDays: [1, 2, 3, 4, 5, 6, 7] },
  { key: "read10", icon: "📚", name: "Lire 10 minutes", category: "Général", scheduledDays: [1, 2, 3, 4, 5, 6, 7] },
  { key: "sport", icon: "🏃", name: "Faire du sport", category: "Sport", scheduledDays: [1, 3, 5] },
  { key: "sleep", icon: "🛏️", name: "Dormir avant minuit", category: "Santé", scheduledDays: [1, 2, 3, 4, 5, 6, 7] },
  { key: "journal", icon: "✍️", name: "Écrire son journal", category: "Bien-être", scheduledDays: [1, 2, 3, 4, 5, 6, 7] },
  { key: "lessScreen", icon: "📵", name: "Moins d'écran le soir", category: "Bien-être", scheduledDays: [1, 2, 3, 4, 5, 6, 7] },
  { key: "balanced", icon: "🥗", name: "Manger équilibré", category: "Santé", scheduledDays: [1, 2, 3, 4, 5] },
];
