import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const categories = sourceLoader()("src/lib/exercises/categories.ts");

test("each main muscle belongs to one colour family, unknown ones to Other", () => {
  assert.equal(categories.categoryOfMuscle("Pectoraux").id, "chest");
  assert.equal(categories.categoryOfMuscle("Triceps").id, "arms");
  assert.equal(categories.categoryOfMuscle("Mollets").id, "legs");
  assert.equal(categories.categoryOfMuscle("Abdominaux").id, "core");
  assert.equal(categories.categoryOfMuscle("Cardio").id, "other");
  assert.equal(categories.categoryOfMuscle(undefined).id, "other");
});

test("grouping keeps the families' order and leaves empty ones out", () => {
  const groups = categories.groupByCategory([{ primary: ["Dos"] }, { primary: ["Pectoraux"] }, { primary: ["Biceps"] }, { primary: ["Dos"] }]);
  assert.deepEqual(groups.map((group) => [group.category.id, group.items.length]), [["chest", 1], ["back", 2], ["arms", 1]]);
});

test("initials come from the first two words", () => {
  assert.equal(categories.exerciseInitials("Tirage élastique"), "TÉ");
  assert.equal(categories.exerciseInitials("face pull corde"), "FP");
  assert.equal(categories.exerciseInitials("Dips"), "DI");
  assert.equal(categories.exerciseInitials("Curl d’araignée"), "CD");
});
