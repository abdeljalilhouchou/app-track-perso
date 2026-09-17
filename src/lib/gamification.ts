export type Stats = {
  habitLogsCount: number;
  workoutsCount: number;
  moodEntriesCount: number;
  activeHabitsCount: number;
  bestStreak: number;
  mealEntriesCount: number;
  nutritionLoggingStreak: number;
  proteinGoalHitDays: number;
};

export type Badge = {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: (s: Stats) => boolean;
};

export const BADGES: Badge[] = [
  {
    id: "starter",
    icon: "🌱",
    title: "Premier pas",
    description: "Enregistre ton tout premier suivi.",
    unlocked: (s) => s.habitLogsCount + s.workoutsCount + s.moodEntriesCount >= 1,
  },
  {
    id: "week-streak",
    icon: "🔥",
    title: "Une semaine de constance",
    description: "Atteins une série de 7 jours sur une habitude.",
    unlocked: (s) => s.bestStreak >= 7,
  },
  {
    id: "month-streak",
    icon: "🏔️",
    title: "Un mois de fer",
    description: "Atteins une série de 30 jours sur une habitude.",
    unlocked: (s) => s.bestStreak >= 30,
  },
  {
    id: "habit-collector",
    icon: "🧩",
    title: "Collectionneur",
    description: "Suis au moins 3 habitudes actives en parallèle.",
    unlocked: (s) => s.activeHabitsCount >= 3,
  },
  {
    id: "sportif-10",
    icon: "🏃",
    title: "Sportif confirmé",
    description: "Enregistre 10 séances de sport.",
    unlocked: (s) => s.workoutsCount >= 10,
  },
  {
    id: "sportif-50",
    icon: "🏅",
    title: "Athlète",
    description: "Enregistre 50 séances de sport.",
    unlocked: (s) => s.workoutsCount >= 50,
  },
  {
    id: "mood-30",
    icon: "🧘",
    title: "Introspectif",
    description: "Note ton humeur 30 fois.",
    unlocked: (s) => s.moodEntriesCount >= 30,
  },
  {
    id: "century",
    icon: "💯",
    title: "Centurion",
    description: "Atteins 100 entrées au total, toutes catégories confondues.",
    unlocked: (s) => s.habitLogsCount + s.workoutsCount + s.moodEntriesCount >= 100,
  },
  {
    id: "nutrition-starter",
    icon: "🥗",
    title: "Journal alimentaire",
    description: "Enregistre ton premier repas.",
    unlocked: (s) => s.mealEntriesCount >= 1,
  },
  {
    id: "nutrition-week",
    icon: "📒",
    title: "Semaine bien nourrie",
    description: "Note tes repas 7 jours d'affilée.",
    unlocked: (s) => s.nutritionLoggingStreak >= 7,
  },
  {
    id: "nutrition-month",
    icon: "📚",
    title: "Rigueur alimentaire",
    description: "Note tes repas 30 jours d'affilée.",
    unlocked: (s) => s.nutritionLoggingStreak >= 30,
  },
  {
    id: "protein-target",
    icon: "💪",
    title: "Objectif protéines",
    description: "Atteins ton objectif de protéines 10 jours.",
    unlocked: (s) => s.proteinGoalHitDays >= 10,
  },
  {
    id: "nutrition-100",
    icon: "🍽️",
    title: "Gourmet assidu",
    description: "Enregistre 100 repas dans ton journal.",
    unlocked: (s) => s.mealEntriesCount >= 100,
  },
];

const POINTS_PER_HABIT_LOG = 10;
const POINTS_PER_WORKOUT = 15;
const POINTS_PER_MOOD_ENTRY = 5;
const POINTS_PER_MEAL_LOG = 3;
const POINTS_PER_LEVEL = 150;

export function computePoints(s: Stats): number {
  return (
    s.habitLogsCount * POINTS_PER_HABIT_LOG +
    s.workoutsCount * POINTS_PER_WORKOUT +
    s.moodEntriesCount * POINTS_PER_MOOD_ENTRY +
    s.mealEntriesCount * POINTS_PER_MEAL_LOG
  );
}

export function computeLevel(points: number) {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const pointsIntoLevel = points % POINTS_PER_LEVEL;
  return {
    level,
    pointsIntoLevel,
    pointsForNextLevel: POINTS_PER_LEVEL,
    progressPct: Math.round((pointsIntoLevel / POINTS_PER_LEVEL) * 100),
  };
}
