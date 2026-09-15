export const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Général": { icon: "⭐", color: "#6366f1" },
  "Santé": { icon: "❤️", color: "#ef4444" },
  "Sport": { icon: "🏃", color: "#10b981" },
  "Travail": { icon: "💼", color: "#f59e0b" },
  "Bien-être": { icon: "🧘", color: "#8b5cf6" },
};

export const CATEGORY_PRESETS = Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[];

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

export const EMOJI_CHOICES = [
  "✨", "📚", "💧", "🧘", "🥗", "🛏️", "🚭", "✍️", "💊", "🎯",
  "🏃", "🏋️", "🚴", "🎨", "🎸", "🧠", "🌱", "💻", "📵", "☀️",
];
