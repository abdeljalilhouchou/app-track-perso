type MealLike = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
  caffeine: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Sums a day's meals and rounds for display (avoids 58.49999999999999-style float noise). */
export function sumMeals(meals: MealLike[]) {
  const t = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      sugar: acc.sugar + m.sugar,
      fiber: acc.fiber + m.fiber,
      caffeine: acc.caffeine + m.caffeine,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, caffeine: 0 }
  );
  return {
    calories: Math.round(t.calories),
    protein: round1(t.protein),
    carbs: round1(t.carbs),
    fat: round1(t.fat),
    sugar: round1(t.sugar),
    fiber: round1(t.fiber),
    caffeine: Math.round(t.caffeine),
  };
}

type Goals = { goal_calories: number | null; goal_protein: number | null; goal_carbs: number | null; goal_fat: number | null };

export function buildRings(totals: ReturnType<typeof sumMeals>, goals: Goals | null) {
  return [
    { label: "Calories", value: totals.calories, goal: goals?.goal_calories ?? null, unit: "kcal", color: "var(--nutrition)" },
    { label: "Protéines", value: totals.protein, goal: goals?.goal_protein ?? null, unit: "g", color: "var(--habit)" },
    { label: "Glucides", value: totals.carbs, goal: goals?.goal_carbs ?? null, unit: "g", color: "var(--mood)" },
    { label: "Lipides", value: totals.fat, goal: goals?.goal_fat ?? null, unit: "g", color: "var(--accent)" },
  ];
}
