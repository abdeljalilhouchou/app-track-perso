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

// Badge titles and descriptions are translated: see the `profile.badges.<id>` keys in
// src/lib/i18n/modules/profile.ts. This array only stores the stable structural data;
// call sites look up display text via t(`profile.badges.${badge.id}.title`) etc.
export type Badge = {
  id: string;
  icon: string;
  unlocked: (s: Stats) => boolean;
};

export const BADGES: Badge[] = [
  {
    id: "starter",
    icon: "🌱",
    unlocked: (s) => s.habitLogsCount + s.workoutsCount + s.moodEntriesCount >= 1,
  },
  {
    id: "week-streak",
    icon: "🔥",
    unlocked: (s) => s.bestStreak >= 7,
  },
  {
    id: "month-streak",
    icon: "🏔️",
    unlocked: (s) => s.bestStreak >= 30,
  },
  {
    id: "habit-collector",
    icon: "🧩",
    unlocked: (s) => s.activeHabitsCount >= 3,
  },
  {
    id: "sportif-10",
    icon: "🏃",
    unlocked: (s) => s.workoutsCount >= 10,
  },
  {
    id: "sportif-50",
    icon: "🏅",
    unlocked: (s) => s.workoutsCount >= 50,
  },
  {
    id: "mood-30",
    icon: "🧘",
    unlocked: (s) => s.moodEntriesCount >= 30,
  },
  {
    id: "century",
    icon: "💯",
    unlocked: (s) => s.habitLogsCount + s.workoutsCount + s.moodEntriesCount >= 100,
  },
  {
    id: "nutrition-starter",
    icon: "🥗",
    unlocked: (s) => s.mealEntriesCount >= 1,
  },
  {
    id: "nutrition-week",
    icon: "📒",
    unlocked: (s) => s.nutritionLoggingStreak >= 7,
  },
  {
    id: "nutrition-month",
    icon: "📚",
    unlocked: (s) => s.nutritionLoggingStreak >= 30,
  },
  {
    id: "protein-target",
    icon: "💪",
    unlocked: (s) => s.proteinGoalHitDays >= 10,
  },
  {
    id: "nutrition-100",
    icon: "🍽️",
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
