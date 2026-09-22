"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, NOT_SIGNED_IN, ok, type ActionResult } from "@/lib/actions/result";
import { computeNutritionTargets, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition-calculator";
import { DEFAULT_DRINKS, DEFAULT_FOODS, type SeedFood } from "@/lib/food-database";
import type { MealEntry } from "@/types/database";

const MEAL_TYPES: MealEntry["meal_type"][] = ["petit-dejeuner", "dejeuner", "diner", "collation", "autre"];

function parseMealType(raw: string): MealEntry["meal_type"] {
  return MEAL_TYPES.includes(raw as MealEntry["meal_type"]) ? (raw as MealEntry["meal_type"]) : "autre";
}

function parseUnit(raw: FormDataEntryValue | null): "g" | "ml" {
  return raw === "ml" ? "ml" : "g";
}

export async function logMeal(formData: FormData): Promise<ActionResult> {
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

  if (!food_name || quantity_grams <= 0) return fail("Choisis un aliment et une quantité valide.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error } = await supabase.from("meal_entries").insert({
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
  if (error) return dbFail(error);

  revalidatePath("/nutrition");
  revalidatePath("/journal");

  return ok;
}

export async function deleteMeal(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error: error2 } = await supabase.from("meal_entries").delete().eq("id", id);
  if (error2) return dbFail(error2);
  revalidatePath("/nutrition");
  revalidatePath("/journal");

  return ok;
}

export async function saveNutritionProfile(formData: FormData): Promise<ActionResult> {
  const heightCm = Number(formData.get("height_cm"));
  const weightKg = Number(formData.get("weight_kg"));
  const age = Number(formData.get("age"));
  const sex = String(formData.get("sex") ?? "homme") as "homme" | "femme";
  const activityLevel = String(formData.get("activity_level") ?? "leger") as ActivityLevel;
  const goal = String(formData.get("nutrition_goal") ?? "maintenir") as NutritionGoal;

  if (!heightCm || !weightKg || !age) return fail("Renseigne ta taille, ton poids et ton âge.");

  const targets = computeNutritionTargets({ heightCm, weightKg, age, sex, activityLevel, goal });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error3 } = await supabase
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
  if (error3) return dbFail(error3);

  // Keep the weight log in sync with the calculator's current weight.
  const { error: error4 } = await supabase
    .from("weight_logs")
    .upsert(
      { user_id: user.id, entry_date: format(new Date(), "yyyy-MM-dd"), weight_kg: weightKg },
      { onConflict: "user_id,entry_date" }
    );
  if (error4) return dbFail(error4);

  revalidatePath("/nutrition");

  return ok;
}

export async function addFood(formData: FormData): Promise<ActionResult> {
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

  if (!name) return fail("Le nom est requis.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error5 } = await supabase.from("foods").insert({
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
  if (error5) return dbFail(error5);
  revalidatePath("/nutrition");

  return ok;
}

export async function updateFood(id: string, formData: FormData): Promise<ActionResult> {
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

  if (!name) return fail("Le nom est requis.");

  const supabase = await createClient();
  const { error: error6 } = await supabase
    .from("foods")
    .update({ name, icon, category, calories, protein, carbs, fat, fiber, sugar, sodium, caffeine, unit, portion_label, portion_grams })
    .eq("id", id);
  if (error6) return dbFail(error6);
  revalidatePath("/nutrition");

  return ok;
}

export async function deleteFood(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error: error7 } = await supabase.from("foods").delete().eq("id", id);
  if (error7) return dbFail(error7);
  revalidatePath("/nutrition");

  return ok;
}

// Every column is set explicitly: a bulk insert with heterogeneous keys makes
// PostgREST send NULL for the missing ones, which the NOT NULL columns reject.
function toFoodRow(userId: string, f: SeedFood) {
  return {
    user_id: userId,
    name: f.name,
    icon: f.icon,
    category: f.category,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber ?? 0,
    sugar: f.sugar ?? 0,
    sodium: f.sodium ?? 0,
    caffeine: f.caffeine ?? 0,
    unit: f.unit ?? "g",
    portion_label: f.portion_label ?? null,
    portion_grams: f.portion_grams ?? null,
  };
}

export type SeedResult = { added: number; error: string | null };

export async function seedDefaultFoods(): Promise<SeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { added: 0, error: "Non connecté." };

  const rows = [...DEFAULT_FOODS, ...DEFAULT_DRINKS].map((f) => toFoodRow(user.id, f));
  const { error } = await supabase.from("foods").insert(rows);
  if (error) return { added: 0, error: error.message };

  revalidatePath("/nutrition");
  return { added: rows.length, error: null };
}

// Adds the default drinks the user doesn't already have (matched by name).
export async function seedDefaultDrinks(): Promise<SeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { added: 0, error: "Non connecté." };

  const { data: existing } = await supabase.from("foods").select("name").eq("user_id", user.id);
  const existingNames = new Set((existing ?? []).map((f) => f.name.toLowerCase()));
  const rows = DEFAULT_DRINKS.filter((d) => !existingNames.has(d.name.toLowerCase())).map((d) => toFoodRow(user.id, d));
  if (rows.length === 0) return { added: 0, error: null };

  const { error } = await supabase.from("foods").insert(rows);
  if (error) return { added: 0, error: error.message };

  revalidatePath("/nutrition");
  return { added: rows.length, error: null };
}

export type ResyncResult = { updated: number; error: string | null };

/**
 * Fixes foods imported before fiber/sugar/sodium/caffeine existed in the seed data (they were
 * inserted with these at 0 and never retroactively updated). For each of the user's foods whose
 * name matches a current default food/drink AND still has all four at 0 — a strong sign it was
 * never enriched, since real zero-everything foods are rare — refreshes those fields (and the
 * portion, if unset) to the current seed values. Never touches calories/protein/carbs/fat or a
 * food the user has already edited.
 */
export async function resyncFoodDefaults(): Promise<ResyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { updated: 0, error: "Non connecté." };

  const { data: existing, error: fetchError } = await supabase
    .from("foods")
    .select("id, name, fiber, sugar, sodium, caffeine, portion_grams")
    .eq("user_id", user.id);
  if (fetchError) return { updated: 0, error: fetchError.message };

  const seedByName = new Map(
    [...DEFAULT_FOODS, ...DEFAULT_DRINKS].map((f) => [f.name.toLowerCase(), f])
  );

  const stale = (existing ?? []).filter(
    (f) => f.fiber === 0 && f.sugar === 0 && f.sodium === 0 && f.caffeine === 0 && seedByName.has(f.name.toLowerCase())
  );
  if (stale.length === 0) return { updated: 0, error: null };

  const results = await Promise.all(
    stale.map((f) => {
      const seed = seedByName.get(f.name.toLowerCase())!;
      return supabase
        .from("foods")
        .update({
          fiber: seed.fiber ?? 0,
          sugar: seed.sugar ?? 0,
          sodium: seed.sodium ?? 0,
          caffeine: seed.caffeine ?? 0,
          unit: seed.unit ?? "g",
          portion_label: f.portion_grams ? undefined : seed.portion_label ?? null,
          portion_grams: f.portion_grams ? undefined : seed.portion_grams ?? null,
        })
        .eq("id", f.id);
    })
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { updated: 0, error: failed.error.message };

  revalidatePath("/nutrition");
  return { updated: stale.length, error: null };
}

export async function updateGoalsManually(formData: FormData): Promise<ActionResult> {
  const goal_calories = Number(formData.get("goal_calories"));
  const goal_protein = Number(formData.get("goal_protein"));
  const goal_carbs = Number(formData.get("goal_carbs"));
  const goal_fat = Number(formData.get("goal_fat"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error8 } = await supabase
    .from("profiles")
    .update({ goal_calories, goal_protein, goal_carbs, goal_fat })
    .eq("id", user.id);
  if (error8) return dbFail(error8);

  revalidatePath("/nutrition");

  return ok;
}

export async function saveDailyLimits(formData: FormData): Promise<ActionResult> {
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));
  const water_goal_ml = clamp(Number(formData.get("water_goal_ml")) || 2000, 500, 10000);
  const caffeine_limit_mg = clamp(Number(formData.get("caffeine_limit_mg")) || 400, 50, 1000);
  const sugar_limit_g = clamp(Number(formData.get("sugar_limit_g")) || 50, 5, 300);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error9 } = await supabase.from("profiles").update({ water_goal_ml, caffeine_limit_mg, sugar_limit_g }).eq("id", user.id);
  if (error9) return dbFail(error9);

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");

  return ok;
}

// --- Water ---

export async function addWater(amountMl: number): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: existing } = await supabase
    .from("water_logs")
    .select("ml")
    .eq("user_id", user.id)
    .eq("entry_date", today)
    .maybeSingle();

  const newMl = Math.max(0, (existing?.ml ?? 0) + amountMl);

  const { error: error10 } = await supabase
    .from("water_logs")
    .upsert({ user_id: user.id, entry_date: today, ml: newMl }, { onConflict: "user_id,entry_date" });
  if (error10) return dbFail(error10);

  revalidatePath("/nutrition");
  revalidatePath("/dashboard");

  return ok;
}

// --- Body weight ---

export async function logWeight(formData: FormData): Promise<ActionResult> {
  const weight_kg = Number(formData.get("weight_kg") ?? 0);
  const entry_date = String(formData.get("entry_date") ?? "").trim() || format(new Date(), "yyyy-MM-dd");
  if (!weight_kg) return fail("Entre un poids valide.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { error: error11 } = await supabase
    .from("weight_logs")
    .upsert({ user_id: user.id, entry_date, weight_kg }, { onConflict: "user_id,entry_date" });
  if (error11) return dbFail(error11);

  const { error: error12 } = await supabase.from("profiles").update({ weight_kg }).eq("id", user.id);
  if (error12) return dbFail(error12);

  revalidatePath("/nutrition");

  return ok;
}

export async function deleteWeightLog(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error: error13 } = await supabase.from("weight_logs").delete().eq("id", id);
  if (error13) return dbFail(error13);
  revalidatePath("/nutrition");

  return ok;
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

export async function createMealTemplate(name: string, icon: string, items: TemplateItemInput[]): Promise<ActionResult> {
  if (!name.trim() || items.length === 0) return fail("Donne un nom à la recette et ajoute au moins un aliment.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: template } = await supabase
    .from("meal_templates")
    .insert({ user_id: user.id, name: name.trim(), icon })
    .select("id")
    .single();

  if (!template) return fail("Action impossible.");

  const { error: error14 } = await supabase.from("meal_template_items").insert(
    items.map((item) => ({
      template_id: template.id,
      user_id: user.id,
      ...item,
    }))
  );
  if (error14) return dbFail(error14);

  revalidatePath("/nutrition");

  return ok;
}

export async function updateMealTemplate(
  id: string,
  name: string,
  icon: string,
  items: TemplateItemInput[]
): Promise<{ error: string | null }> {
  if (!name.trim() || items.length === 0) return { error: "Nom et au moins un aliment requis." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." };

  const { error: updateError } = await supabase
    .from("meal_templates")
    .update({ name: name.trim(), icon })
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  // Insert the new items first, then drop the old ones, so a failed insert never loses the recipe.
  const { data: oldItems } = await supabase.from("meal_template_items").select("id").eq("template_id", id);

  const { error: insertError } = await supabase.from("meal_template_items").insert(
    items.map((item) => ({
      template_id: id,
      user_id: user.id,
      ...item,
    }))
  );
  if (insertError) return { error: insertError.message };

  const oldIds = (oldItems ?? []).map((o) => o.id);
  if (oldIds.length > 0) await supabase.from("meal_template_items").delete().in("id", oldIds);

  revalidatePath("/nutrition");
  return { error: null };
}

export async function deleteMealTemplate(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error: error15 } = await supabase.from("meal_templates").delete().eq("id", id);
  if (error15) return dbFail(error15);
  revalidatePath("/nutrition");

  return ok;
}

export async function logMealTemplate(templateId: string, mealType: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(NOT_SIGNED_IN);

  const { data: items } = await supabase
    .from("meal_template_items")
    .select("*")
    .eq("template_id", templateId);

  if (!items || items.length === 0) return fail("Cette recette ne contient aucun aliment.");

  const entry_date = format(new Date(), "yyyy-MM-dd");
  const meal_type = parseMealType(mealType);

  const { error: error16 } = await supabase.from("meal_entries").insert(
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
  if (error16) return dbFail(error16);

  revalidatePath("/nutrition");
  revalidatePath("/journal");

  return ok;
}
