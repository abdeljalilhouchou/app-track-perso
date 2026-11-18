import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { reviewPeriod, periodDays, onCalorieTarget } = load("src/lib/nutrition-week.ts");

const meal = (entry_date, meal_type, food_name, calories, protein = 0) => ({ entry_date, meal_type, food_name, icon: "🍽️", calories, protein, carbs: 0, fat: 0 });
const goals = { calories: 2000, protein: 120, carbs: null, fat: null };

test("the period ends today and runs oldest first", () => {
  assert.deepEqual(periodDays("2026-11-18", 3), ["2026-11-16", "2026-11-17", "2026-11-18"]);
  assert.equal(periodDays("2026-03-02", 3)[0], "2026-02-28", "crosses a month end");
});

test("a day is on target within 10 % of the calorie goal", () => {
  assert.equal(onCalorieTarget(1800, 2000), true);
  assert.equal(onCalorieTarget(2200, 2000), true);
  assert.equal(onCalorieTarget(1799, 2000), false);
  assert.equal(onCalorieTarget(1900, null), false);
});

test("averages count only the days with meals", () => {
  const meals = [
    meal("2026-11-18", "dejeuner", "Riz", 1000, 60), meal("2026-11-18", "diner", "Poulet", 1000, 70),
    meal("2026-11-16", "petit-dejeuner", "Avoine", 1500, 40),
    meal("2026-11-01", "diner", "Hors période", 9999, 99),
  ];
  const review = reviewPeriod(meals, "2026-11-18", 7, goals);
  assert.equal(review.loggedDays, 2);
  assert.equal(review.averages.calories, 1750);
  assert.equal(review.averages.protein, 85);
  assert.equal(review.onTargetDays, 1, "2000 kcal is on target, 1500 is not");
  assert.equal(review.proteinDays, 1);
  assert.equal(review.series.length, 7);
  assert.equal(review.series.at(-1).calories, 2000);
});

test("previous period, top foods and meal moments", () => {
  const meals = [
    meal("2026-11-18", "dejeuner", "Riz", 600), meal("2026-11-17", "dejeuner", "Riz", 600), meal("2026-11-17", "collation", "Pomme", 100),
    meal("2026-11-18", "diner", "Poulet", 700),
    meal("2026-11-10", "diner", "Pâtes", 1800),
  ];
  const review = reviewPeriod(meals, "2026-11-18", 7, goals);
  assert.equal(review.previousAverages.calories, 1800);
  assert.deepEqual(review.topFoods.map((food) => [food.name, food.count]), [["Riz", 2], ["Poulet", 1], ["Pomme", 1]]);
  const lunch = review.moments.find((moment) => moment.moment === "dejeuner");
  assert.equal(lunch.calories, 1200);
  assert.equal(lunch.share, 60, "1200 of 2000 kcal");
  assert.equal(review.moments.reduce((sum, moment) => sum + moment.share, 0), 100);
});
