"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { computeNutritionTargets, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calculator";
import type { MealEntry } from "@/types/database";

const MEAL_TYPES: MealEntry["meal_type"][] = ["petit-dejeuner", "dejeuner", "diner", "collation", "autre"];

export async function logMeal(formData: FormData) {
  const food_name = String(formData.get("food_name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "🍽️").trim() || "🍽️";
  const rawMealType = String(formData.get("meal_type") ?? "autre");
  const meal_type: MealEntry["meal_type"] = MEAL_TYPES.includes(rawMealType as MealEntry["meal_type"])
    ? (rawMealType as MealEntry["meal_type"])
    : "autre";
  const quantity_grams = Number(formData.get("quantity_grams") ?? 0);
  const calories = Number(formData.get("calories") ?? 0);
  const protein = Number(formData.get("protein") ?? 0);
  const carbs = Number(formData.get("carbs") ?? 0);
  const fat = Number(formData.get("fat") ?? 0);
  const entry_date = String(formData.get("entry_date") ?? "").trim() || format(new Date(), "yyyy-MM-dd");

  if (!food_name || quantity_grams <= 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("meal_entries").insert({
    user_id: user.id,
    entry_date,
    meal_type,
    food_name,
    icon,
    quantity_grams,
    calories,
    protein,
    carbs,
    fat,
  });

  revalidatePath("/nutrition");
  revalidatePath("/journal");
}

export async function deleteMeal(id: string) {
  const supabase = await createClient();
  await supabase.from("meal_entries").delete().eq("id", id);
  revalidatePath("/nutrition");
  revalidatePath("/journal");
}

export async function saveNutritionProfile(formData: FormData) {
  const heightCm = Number(formData.get("height_cm"));
  const weightKg = Number(formData.get("weight_kg"));
  const age = Number(formData.get("age"));
  const sex = String(formData.get("sex") ?? "homme") as "homme" | "femme";
  const activityLevel = String(formData.get("activity_level") ?? "leger") as ActivityLevel;
  const goal = String(formData.get("nutrition_goal") ?? "maintenir") as NutritionGoal;

  if (!heightCm || !weightKg || !age) return;

  const targets = computeNutritionTargets({ heightCm, weightKg, age, sex, activityLevel, goal });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({
      height_cm: heightCm,
      weight_kg: weightKg,
      age,
      sex,
      activity_level: activityLevel,
      nutrition_goal: goal,
      goal_calories: targets.calories,
      goal_protein: targets.protein,
      goal_carbs: targets.carbs,
      goal_fat: targets.fat,
    })
    .eq("id", user.id);

  revalidatePath("/nutrition");
}

export async function updateGoalsManually(formData: FormData) {
  const goal_calories = Number(formData.get("goal_calories"));
  const goal_protein = Number(formData.get("goal_protein"));
  const goal_carbs = Number(formData.get("goal_carbs"));
  const goal_fat = Number(formData.get("goal_fat"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ goal_calories, goal_protein, goal_carbs, goal_fat })
    .eq("id", user.id);

  revalidatePath("/nutrition");
}
