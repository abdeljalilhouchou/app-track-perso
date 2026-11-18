export type Stats = {
  habitLogsCount: number;
  workoutsCount: number;
  moodEntriesCount: number;
  activeHabitsCount: number;
  bestStreak: number;
  mealEntriesCount: number;
  nutritionLoggingStreak: number;
  proteinGoalHitDays: number;
  /** Longest run of consecutive days with a mood entry. */
  moodBestStreak: number;
  weightLogsCount: number;
  /** Running and Calisthenics figures stay at 0 while their schema gate is off. */
  runsCount: number;
  runningKm: number;
  longestRunKm: number;
  calisthenicsCount: number;
  /** Calisthenics skills that reached at least their second step. */
  skillsSteppedUp: number;
};

export type BadgeCategory = "start" | "habits" | "sport" | "mood" | "nutrition";
export const BADGE_CATEGORIES: BadgeCategory[] = ["start", "habits", "sport", "mood", "nutrition"];

// Badge titles and descriptions are translated: see the `profile.badges.<id>` keys in
// src/lib/i18n/modules/profile.ts. This array only stores the stable structural data.
export type Badge = {
  id: string;
  icon: string;
  category: BadgeCategory;
  /** The value to reach; `progress` measures where the user stands against it. */
  goal: number;
  unit?: "km";
  progress: (s: Stats) => number;
  unlocked: (s: Stats) => boolean;
};

function badge(id: string, icon: string, category: BadgeCategory, goal: number, progress: (s: Stats) => number, unit?: "km"): Badge {
  return { id, icon, category, goal, unit, progress, unlocked: (s) => progress(s) >= goal };
}

const entries = (s: Stats) => s.habitLogsCount + s.workoutsCount + s.moodEntriesCount;
const level = (s: Stats) => computeLevel(computePoints(s)).level;
/** Strength, Calisthenics and Running each count once they have a session. */
const disciplines = (s: Stats) =>
  Number(s.workoutsCount - s.calisthenicsCount - s.runsCount > 0) + Number(s.calisthenicsCount > 0) + Number(s.runsCount > 0);

export const BADGES: Badge[] = [
  badge("starter", "🌱", "start", 1, entries),
  badge("century", "💯", "start", 100, entries),
  badge("level-5", "⭐", "start", 5, level),
  badge("level-10", "🌟", "start", 10, level),

  badge("habit-collector", "🧩", "habits", 3, (s) => s.activeHabitsCount),
  badge("week-streak", "🔥", "habits", 7, (s) => s.bestStreak),
  badge("month-streak", "🏔️", "habits", 30, (s) => s.bestStreak),
  badge("streak-100", "💎", "habits", 100, (s) => s.bestStreak),
  badge("habit-logs-500", "✅", "habits", 500, (s) => s.habitLogsCount),

  badge("sportif-10", "🏃", "sport", 10, (s) => s.workoutsCount),
  badge("sportif-50", "🏅", "sport", 50, (s) => s.workoutsCount),
  badge("sportif-100", "🏆", "sport", 100, (s) => s.workoutsCount),
  badge("first-run", "👟", "sport", 1, (s) => s.runsCount),
  badge("run-10k", "🛣️", "sport", 10, (s) => s.longestRunKm, "km"),
  badge("half-marathon", "🎽", "sport", 21.1, (s) => s.longestRunKm, "km"),
  badge("run-100km", "🗺️", "sport", 100, (s) => s.runningKm, "km"),
  badge("cali-10", "🤸", "sport", 10, (s) => s.calisthenicsCount),
  badge("skill-step", "🪜", "sport", 1, (s) => s.skillsSteppedUp),
  badge("all-rounder", "🎯", "sport", 3, disciplines),

  badge("mood-30", "🧘", "mood", 30, (s) => s.moodEntriesCount),
  badge("mood-streak-7", "🌤️", "mood", 7, (s) => s.moodBestStreak),
  badge("mood-100", "📔", "mood", 100, (s) => s.moodEntriesCount),

  badge("nutrition-starter", "🥗", "nutrition", 1, (s) => s.mealEntriesCount),
  badge("nutrition-week", "📒", "nutrition", 7, (s) => s.nutritionLoggingStreak),
  badge("nutrition-month", "📚", "nutrition", 30, (s) => s.nutritionLoggingStreak),
  badge("protein-target", "💪", "nutrition", 10, (s) => s.proteinGoalHitDays),
  badge("nutrition-100", "🍽️", "nutrition", 100, (s) => s.mealEntriesCount),
  badge("weight-10", "⚖️", "nutrition", 10, (s) => s.weightLogsCount),
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
