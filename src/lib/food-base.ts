/** Searching, sorting and checking the food base. Values are per 100 g or 100 ml. */

/** Stored category names (French, kept as is in the database) and their translation keys. */
export const CATEGORY_KEYS: Record<string, string> = {
  "Viandes & volailles": "meat",
  "Poissons & fruits de mer": "fish",
  "Œufs & laitiers": "dairy",
  "Féculents": "starches",
  "Légumineuses": "legumes",
  "Légumes": "vegetables",
  "Fruits": "fruits",
  "Matières grasses & oléagineux": "fats",
  "Boissons": "drinks",
  "Autres": "other",
};

/** Calories from the macros: 4 kcal per gram of protein or carbohydrate, 9 per gram of fat. */
export function caloriesFromMacros({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  return Math.round(4 * protein + 4 * carbs + 9 * fat);
}

/**
 * True when the stated calories are far from what the macros give. Labels round values and
 * fibre or alcohol shift the total, so only a gap of more than 20 % and 25 kcal counts.
 */
export function caloriesMismatch(food: { calories: number; protein: number; carbs: number; fat: number }) {
  const computed = caloriesFromMacros(food);
  const gap = Math.abs(computed - food.calories);
  return (food.protein > 0 || food.carbs > 0 || food.fat > 0) && gap > 25 && gap > 0.2 * Math.max(computed, food.calories);
}

/** Lower case without accents, so "boeuf" finds "Bœuf" and "pates" finds "Pâtes". */
export function searchKey(value: string) {
  return value.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

type Listed = { id: string; name: string; category: string };

export function filterFoods<T extends Listed>(foods: T[], options: { query: string; category: string | "all" | "mine"; customIds: ReadonlySet<string>; usage: ReadonlyMap<string, number>; sort: "frequent" | "name" }) {
  const query = searchKey(options.query);
  const rows = foods.filter((food) =>
    (!query || searchKey(food.name).includes(query)) &&
    (options.category === "all" || (options.category === "mine" ? options.customIds.has(food.id) : food.category === options.category)));
  return rows.sort((a, b) =>
    options.sort === "frequent"
      ? (options.usage.get(b.name) ?? 0) - (options.usage.get(a.name) ?? 0) || a.name.localeCompare(b.name, "fr")
      : a.name.localeCompare(b.name, "fr"));
}
