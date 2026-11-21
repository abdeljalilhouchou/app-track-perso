import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { caloriesFromMacros, caloriesMismatch, searchKey, filterFoods, CATEGORY_KEYS } = load("src/lib/food-base.ts");

test("calories from macros use 4/4/9", () => {
  assert.equal(caloriesFromMacros({ protein: 25, carbs: 0, fat: 21 }), 289);
  assert.equal(caloriesFromMacros({ protein: 0, carbs: 0, fat: 0 }), 0);
});

test("a mismatch needs a real gap, not label rounding", () => {
  assert.equal(caloriesMismatch({ calories: 294, protein: 25, carbs: 0, fat: 21 }), false, "lamb: 289 vs 294");
  assert.equal(caloriesMismatch({ calories: 100, protein: 25, carbs: 0, fat: 21 }), true, "100 stated for 289 computed");
  assert.equal(caloriesMismatch({ calories: 30, protein: 0, carbs: 0, fat: 0 }), false, "no macros entered yet");
  assert.equal(caloriesMismatch({ calories: 40, protein: 0, carbs: 15, fat: 0 }), false, "60 vs 40 is under 25 kcal");
});

test("search ignores case and accents", () => {
  assert.equal(searchKey("Bœuf haché"), "boeuf hache");
  assert.equal(searchKey("PÂTES"), "pates");
});

const foods = [
  { id: "1", name: "Riz basmati", category: "Féculents" },
  { id: "2", name: "Bœuf haché 5% MG", category: "Viandes & volailles" },
  { id: "3", name: "Msemen maison", category: "Autres" },
  { id: "4", name: "Agneau", category: "Viandes & volailles" },
];
const base = { query: "", category: "all", customIds: new Set(["3"]), usage: new Map([["Riz basmati", 9], ["Agneau", 2]]), sort: "frequent" };

test("filters by text, category and own foods", () => {
  assert.deepEqual(filterFoods(foods, { ...base, query: "boeuf" }).map((food) => food.id), ["2"]);
  assert.deepEqual(filterFoods(foods, { ...base, category: "Viandes & volailles" }).map((food) => food.id), ["4", "2"]);
  assert.deepEqual(filterFoods(foods, { ...base, category: "mine" }).map((food) => food.id), ["3"]);
});

test("sorts by use, then by name", () => {
  assert.deepEqual(filterFoods(foods, base).map((food) => food.id), ["1", "4", "2", "3"]);
  assert.deepEqual(filterFoods(foods, { ...base, sort: "name" }).map((food) => food.name), ["Agneau", "Bœuf haché 5% MG", "Msemen maison", "Riz basmati"]);
});

test("every default category has a translation key", () => {
  assert.equal(Object.keys(CATEGORY_KEYS).length, 10);
});
