"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { computeNutritionTargets, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calculator";
import { DEFAULT_DRINKS, DEFAULT_FOODS } from "@/lib/food-database";
import type { MealEntry } from "@/types/database";

const MEAL_TYPES: MealEntry["meal_type"][] = ["petit-dejeuner", "dejeuner", "diner", "collation", "autre"];

function parseMealType(raw: string): MealEntry["meal_type"] {
  return MEAL_TYPES.includes(raw as MealEntry["meal_type"]) ? (raw as MealEntry["meal_type"]) : "autre";
}

function parseUnit(raw: FormDataEntryValue | null): "g" | "ml" {
  return raw === "ml" ? "ml" : "g";
}

export async function logMeal(formData: FormData) {
  const food_name = String(formData.get("food_name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "🍽️").trim() || "🍽️";
  const meal_type = parseMealType(String(formData.get("meal_type") ?? "autre"));
  const quantity_grams = Number(formData.get("quantity_grams") ?? 0);
  const calories = Number(formData.get("calories") ?? 0);
  const protein = Number(formData.get("protein") ?? 0);
  const carbs = Number(formData.get("carbs") ?? 0);
  const fat = Number(formData.get("fat") ?? 0);
  const fiber = Number(formData.get("fiber") ?? 0);
  const sugar = Number(formData.get("sugar") ?? 0);
  const sodium = Number(formData.get("sodium") ?? 0);
  const caffeine = Number(formData.get("caffeine") ?? 0);
  const unit = parseUnit(formData.get("unit"));
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
    fiber,
    sugar,
    sodium,
    caffeine,
    unit,
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

  // Keep the weight log in sync with the calculator's current weight.
  await supabase
    .from("weight_logs")
    .upsert(
      { user_id: user.id, entry_date: format(new Date(), "yyyy-MM-dd"), weight_kg: weightKg },
      { onConflict: "user_id,entry_date" }
    );

  revalidatePath("/nutrition");
}

export async function addFood(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "🍽️").trim() || "🍽️";
  const category = String(formData.get("category") ?? "Autres").trim() || "Autres";
  const calories = Number(formData.get("calories") ?? 0);
  const protein = Number(formData.get("protein") ?? 0);
  const carbs = Number(formData.get("carbs") ?? 0);
  const fat = Number(formData.get("fat") ?? 0);
  const fiber = Number(formData.get("fiber") ?? 0);
  const sugar = Number(formData.get("sugar") ?? 0);
  const sodium = Number(formData.get("sodium") ?? 0);
  const caffeine = Number(formData.get("caffeine") ?? 0);
  const unit = parseUnit(formData.get("unit"));
  const portion_label = String(formData.get("portion_label") ?? "").trim() || null;
  const portion_grams = Number(formData.get("portion_grams") ?? 0) || null;

  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("foods").insert({
    user_id: user.id,
    name,
    icon,
    category,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    caffeine,
    unit,
    portion_label,
    portion_grams,
  });
  revalidatePath("/nutrition");
}

export async function updateFood(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "🍽️").trim() || "🍽️";
  const category = String(formData.get("category") ?? "Autres").trim() || "Autres";
  const calories = Number(formData.get("calories") ?? 0);
  const protein = Number(formData.get("protein") ?? 0);
  const carbs = Number(formData.get("carbs") ?? 0);
  const fat = Number(formData.get("fat") ?? 0);
  const fiber = Number(formData.get("fiber") ?? 0);
  const sugar = Number(formData.get("sugar") ?? 0);
  const sodium = Number(formData.get("sodium") ?? 0);
  const caffeine = Number(formData.get("caffeine") ?? 0);
  const unit = parseUnit(formData.get("unit"));
  const portion_label = String(formData.get("portion_label") ?? "").trim() || null;
  const portion_grams = Number(formData.get("portion_grams") ?? 0) || null;

  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("foods")
    .update({ name, icon, category, calories, protein, carbs, fat, fiber, sugar, sodium, caffeine, unit, portion_label, portion_grams })
    .eq("id", id);
  revalidatePath("/nutrition");
}

export async function deleteFood(id: string) {
  const supabase = await createClient();
  await supabase.from("foods").delete().eq("id", id);
  revalidatePath("/nutrition");
}

export async function seedDefaultFoods() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = [...DEFAULT_FOODS, ...DEFAULT_DRINKS].map((f) => ({ user_id: user.id, ...f }));
  await supabase.from("foods").insert(rows);
  revalidatePath("/nutrition");
}

// Adds the default drinks the user doesn't already have (matched by name).
export async function seedDefaultDrinks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase.from("foods").select("name").eq("user_id", user.id);
  const existingNames = new Set((existing ?? []).map((f) => f.name.toLowerCase()));
  const rows = DEFAULT_DRINKS.filter((d) => !existingNames.has(d.name.toLowerCase())).map((d) => ({
    user_id: user.id,
    ...d,
  }));
  if (rows.length === 0) return;

  await supabase.from("foods").insert(rows);
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

// --- Water ---

export async function addWater(amountMl: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: existing } = await supabase
    .from("water_logs")
    .select("ml")
    .eq("user_id", user.id)
    .eq("entry_date", today)
    .maybeSingle();

  const newMl = Math.max(0, (existing?.ml ?? 0) + amountMl);

  await supabase
    .from("water_logs")
    .upsert({ user_id: user.id, entry_date: today, ml: newMl }, { onConflict: "user_id,entry_date" });

  revalidatePath("/nutrition");
}

// --- Body weight ---

export async function logWeight(formData: FormData) {
  const weight_kg = Number(formData.get("weight_kg") ?? 0);
  const entry_date = String(formData.get("entry_date") ?? "").trim() || format(new Date(), "yyyy-MM-dd");
  if (!weight_kg) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("weight_logs")
    .upsert({ user_id: user.id, entry_date, weight_kg }, { onConflict: "user_id,entry_date" });

  await supabase.from("profiles").update({ weight_kg }).eq("id", user.id);

  revalidatePath("/nutrition");
}

export async function deleteWeightLog(id: string) {
  const supabase = await createClient();
  await supabase.from("weight_logs").delete().eq("id", id);
  revalidatePath("/nutrition");
}

// --- Meal templates (saved combos of foods) ---

export type TemplateItemInput = {
  food_id: string | null;
  food_name: string;
  icon: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  caffeine: number;
  unit: "g" | "ml";
};

export async function createMealTemplate(name: string, icon: string, items: TemplateItemInput[]) {
  if (!name.trim() || items.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: template } = await supabase
    .from("meal_templates")
    .insert({ user_id: user.id, name: name.trim(), icon })
    .select("id")
    .single();

  if (!template) return;

  await supabase.from("meal_template_items").insert(
    items.map((item) => ({
      template_id: template.id,
      user_id: user.id,
      ...item,
    }))
  );

  revalidatePath("/nutrition");
}

export async function deleteMealTemplate(id: string) {
  const supabase = await createClient();
  await supabase.from("meal_templates").delete().eq("id", id);
  revalidatePath("/nutrition");
}

export async function logMealTemplate(templateId: string, mealType: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: items } = await supabase
    .from("meal_template_items")
    .select("*")
    .eq("template_id", templateId);

  if (!items || items.length === 0) return;

  const entry_date = format(new Date(), "yyyy-MM-dd");
  const meal_type = parseMealType(mealType);

  await supabase.from("meal_entries").insert(
    items.map((item) => ({
      user_id: user.id,
      entry_date,
      meal_type,
      food_name: item.food_name,
      icon: item.icon,
      quantity_grams: item.quantity_grams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sugar: item.sugar,
      sodium: item.sodium,
      caffeine: item.caffeine,
      unit: item.unit,
    }))
  );

  revalidatePath("/nutrition");
  revalidatePath("/journal");
}
