/** Weekly (or monthly) review of the food diary: averages against goals, consistency, habits. */

export type ReviewMeal = {
  entry_date: string;
  meal_type: string;
  food_name: string;
  icon: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ReviewGoals = { calories: number | null; protein: number | null; carbs: number | null; fat: number | null };

export const MEAL_MOMENTS = ["petit-dejeuner", "dejeuner", "diner", "collation"] as const;

const round1 = (value: number) => Math.round(value * 10) / 10;

function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The yyyy-MM-dd keys of the `days` days ending on `today`, oldest first. */
export function periodDays(today: string, days: number) {
  return Array.from({ length: days }, (_, index) => shift(today, index - days + 1));
}

function dailyTotals(meals: ReviewMeal[], days: string[]) {
  const byDay = new Map(days.map((day) => [day, { calories: 0, protein: 0, carbs: 0, fat: 0, logged: false }]));
  for (const meal of meals) {
    const day = byDay.get(meal.entry_date);
    if (!day) continue;
    day.calories += meal.calories;
    day.protein += meal.protein;
    day.carbs += meal.carbs;
    day.fat += meal.fat;
    day.logged = true;
  }
  return days.map((date) => ({ date, ...byDay.get(date)! }));
}

/** A day is on target when its calories land within 10 % of the goal. */
export function onCalorieTarget(calories: number, goal: number | null) {
  return !!goal && calories >= goal * 0.9 && calories <= goal * 1.1;
}

export function reviewPeriod(meals: ReviewMeal[], today: string, days: number, goals: ReviewGoals) {
  const range = periodDays(today, days);
  const previousRange = periodDays(shift(today, -days), days);
  const series = dailyTotals(meals, range);
  const logged = series.filter((day) => day.logged);
  const previousLogged = dailyTotals(meals, previousRange).filter((day) => day.logged);
  const mean = (rows: typeof logged, key: "calories" | "protein" | "carbs" | "fat") =>
    rows.length ? round1(rows.reduce((sum, row) => sum + row[key], 0) / rows.length) : null;

  const inRange = meals.filter((meal) => meal.entry_date >= range[0] && meal.entry_date <= today);
  const foodCounts = new Map<string, { name: string; icon: string; count: number; calories: number }>();
  for (const meal of inRange) {
    const current = foodCounts.get(meal.food_name) ?? { name: meal.food_name, icon: meal.icon, count: 0, calories: 0 };
    current.count += 1;
    current.calories += meal.calories;
    foodCounts.set(meal.food_name, current);
  }
  const totalCalories = inRange.reduce((sum, meal) => sum + meal.calories, 0);
  const moments = MEAL_MOMENTS.map((moment) => {
    const calories = inRange.filter((meal) => meal.meal_type === moment).reduce((sum, meal) => sum + meal.calories, 0);
    return { moment, calories: Math.round(calories), share: totalCalories ? Math.round((calories / totalCalories) * 100) : 0 };
  });

  return {
    days: range.length,
    loggedDays: logged.length,
    averages: { calories: mean(logged, "calories"), protein: mean(logged, "protein"), carbs: mean(logged, "carbs"), fat: mean(logged, "fat") },
    previousAverages: { calories: mean(previousLogged, "calories"), protein: mean(previousLogged, "protein") },
    onTargetDays: logged.filter((day) => onCalorieTarget(day.calories, goals.calories)).length,
    proteinDays: goals.protein ? logged.filter((day) => day.protein >= goals.protein!).length : 0,
    series: series.map((day) => ({ date: day.date, calories: Math.round(day.calories), protein: round1(day.protein), logged: day.logged })),
    topFoods: [...foodCounts.values()].sort((a, b) => b.count - a.count || b.calories - a.calories).slice(0, 5).map((food) => ({ ...food, calories: Math.round(food.calories) })),
    moments,
  };
}
