import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { dayProgress, nextActions, momentOf } = load("src/lib/home.ts");

test("the day counts habits, mood, water and the goals that are set", () => {
  const base = { habitsDone: 3, habitsTotal: 6, moodLogged: false, waterMl: 1200, waterGoal: 2000, kcal: 1118, kcalGoal: 2200, protein: 77, proteinGoal: 100 };
  assert.deepEqual(dayProgress(base), { done: 3, total: 10, pct: 30 });
  assert.deepEqual(dayProgress({ ...base, kcalGoal: null, proteinGoal: null }), { done: 3, total: 8, pct: 38 });
  assert.deepEqual(dayProgress({ ...base, moodLogged: true, waterMl: 2000, kcal: 1980, protein: 100, habitsDone: 6 }), { done: 10, total: 10, pct: 100 });
});

test("moments follow the hour", () => {
  assert.equal(momentOf(8), "morning");
  assert.equal(momentOf(14), "afternoon");
  assert.equal(momentOf(21), "evening");
});

const habit = (id, moment, streak = 0, kind = "check") => ({ id, name: id, icon: "x", color: "#000", kind, moment, streak });
const base = { hour: 20, isoWeekday: 3, habits: [], moodLogged: true, waterMl: 2000, waterGoal: 2000, mealsLogged: 2, sportDone: 2, sportGoal: 3 };

test("habits of the current moment come first, habits to avoid never", () => {
  const actions = nextActions({ ...base, habits: [habit("m", "morning"), habit("e", "evening"), habit("a", "any", 5), habit("x", "evening", 0, "avoid")] });
  assert.deepEqual(actions.map((a) => a.habit.id), ["e", "a", "m"]);
});

test("mood, water past 10h, meals past 13h, and sport only when the week gets tight", () => {
  const actions = nextActions({ ...base, hour: 9, moodLogged: false, waterMl: 500, mealsLogged: 0 });
  assert.deepEqual(actions.map((a) => a.type), ["mood"], "too early for water and meals");
  const later = nextActions({ ...base, hour: 14, moodLogged: false, waterMl: 500, mealsLogged: 0 });
  assert.deepEqual(later.map((a) => a.type), ["mood", "water", "meals"]);
  assert.equal(later[1].missingMl, 1500);
  assert.deepEqual(nextActions({ ...base, isoWeekday: 6, sportDone: 1 }).map((a) => a.type), ["sport"], "2 sessions left, 2 days left");
  assert.deepEqual(nextActions({ ...base, isoWeekday: 2, sportDone: 1 }), [], "plenty of days left");
});

test("at most four actions", () => {
  const actions = nextActions({ ...base, hour: 15, moodLogged: false, waterMl: 0, mealsLogged: 0, habits: [habit("a", "afternoon"), habit("b", "afternoon"), habit("c", "afternoon")] });
  assert.equal(actions.length, 4);
  assert.deepEqual(actions.map((a) => a.type), ["habit", "habit", "mood", "water"]);
});
