export const ACTIVITY_LEVELS = [
  { value: "sedentaire", label: "Sédentaire", hint: "Peu ou pas d'exercice", multiplier: 1.2 },
  { value: "leger", label: "Légèrement actif", hint: "Exercice léger 1-3 j/semaine", multiplier: 1.375 },
  { value: "modere", label: "Modérément actif", hint: "Exercice modéré 3-5 j/semaine", multiplier: 1.55 },
  { value: "actif", label: "Actif", hint: "Exercice intense 6-7 j/semaine", multiplier: 1.725 },
  { value: "tres_actif", label: "Très actif", hint: "Exercice très intense, travail physique", multiplier: 1.9 },
] as const;

export const NUTRITION_GOALS = [
  { value: "perdre", label: "Perdre du poids", adjustment: -450 },
  { value: "maintenir", label: "Maintenir mon poids", adjustment: 0 },
  { value: "prendre", label: "Prendre du poids", adjustment: 400 },
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]["value"];
export type NutritionGoal = (typeof NUTRITION_GOALS)[number]["value"];

export type CalculatorInput = {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: "homme" | "femme";
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
};

export type CalculatorResult = {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Mifflin-St Jeor equation for basal metabolic rate. */
export function computeNutritionTargets(input: CalculatorInput): CalculatorResult {
  const { heightCm, weightKg, age, sex, activityLevel, goal } = input;

  const bmr =
    sex === "homme"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const activityMultiplier = ACTIVITY_LEVELS.find((a) => a.value === activityLevel)?.multiplier ?? 1.375;
  const tdee = bmr * activityMultiplier;

  const goalAdjustment = NUTRITION_GOALS.find((g) => g.value === goal)?.adjustment ?? 0;
  const calories = Math.max(1200, Math.round(tdee + goalAdjustment));

  // 2g protein / kg bodyweight, 25% of calories from fat, remainder from carbs.
  const protein = Math.round(weightKg * 2);
  const proteinKcal = protein * 4;
  const fatKcal = calories * 0.25;
  const fat = Math.round(fatKcal / 9);
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbs = Math.round(carbsKcal / 4);

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat };
}
