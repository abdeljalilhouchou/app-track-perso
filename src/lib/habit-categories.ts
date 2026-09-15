export const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Général": { icon: "⭐", color: "#6366f1" },
  "Santé": { icon: "❤️", color: "#ef4444" },
  "Sport": { icon: "🏃", color: "#10b981" },
  "Travail": { icon: "💼", color: "#f59e0b" },
  "Bien-être": { icon: "🧘", color: "#8b5cf6" },
};

export const CATEGORY_PRESETS = Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[];

export const EMOJI_CHOICES = [
  "✨", "📚", "💧", "🧘", "🥗", "🛏️", "🚭", "✍️", "💊", "🎯",
  "🏃", "🏋️", "🚴", "🎨", "🎸", "🧠", "🌱", "💻", "📵", "☀️",
];
