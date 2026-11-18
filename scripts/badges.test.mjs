import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { BADGES, BADGE_CATEGORIES } = load("src/lib/gamification.ts");

const empty = { habitLogsCount: 0, workoutsCount: 0, moodEntriesCount: 0, activeHabitsCount: 0, bestStreak: 0, mealEntriesCount: 0, nutritionLoggingStreak: 0, proteinGoalHitDays: 0, moodBestStreak: 0, weightLogsCount: 0, runsCount: 0, runningKm: 0, longestRunKm: 0, calisthenicsCount: 0, skillsSteppedUp: 0 };
const byId = (id) => BADGES.find((badge) => badge.id === id);

test("every badge has a unique id, a known category and a positive goal", () => {
  assert.equal(new Set(BADGES.map((badge) => badge.id)).size, BADGES.length);
  for (const badge of BADGES) {
    assert.ok(BADGE_CATEGORIES.includes(badge.category), badge.id);
    assert.ok(badge.goal > 0, badge.id);
  }
});

test("a new account has no badge and no progress", () => {
  for (const badge of BADGES) {
    assert.equal(badge.unlocked(empty), false, badge.id);
    assert.equal(badge.progress(empty), byId("level-5") === badge || byId("level-10") === badge ? 1 : 0, badge.id);
  }
});

test("a badge unlocks exactly at its goal", () => {
  assert.equal(byId("run-10k").unlocked({ ...empty, longestRunKm: 9.9 }), false);
  assert.equal(byId("run-10k").unlocked({ ...empty, longestRunKm: 10 }), true);
  assert.equal(byId("half-marathon").unlocked({ ...empty, longestRunKm: 21 }), false);
  assert.equal(byId("sportif-100").progress({ ...empty, workoutsCount: 42 }), 42);
});

test("all-rounder counts strength, calisthenics and running once each", () => {
  const badge = byId("all-rounder");
  assert.equal(badge.progress({ ...empty, workoutsCount: 5, runsCount: 5 }), 1, "only runs");
  assert.equal(badge.progress({ ...empty, workoutsCount: 8, runsCount: 5, calisthenicsCount: 2 }), 3);
  assert.equal(badge.unlocked({ ...empty, workoutsCount: 7, runsCount: 5, calisthenicsCount: 2 }), false, "no strength session left");
});

test("level badges follow the points", () => {
  // 150 points per level: 60 habit checks at 10 points reach level 5.
  assert.equal(byId("level-5").unlocked({ ...empty, habitLogsCount: 60 }), true);
  assert.equal(byId("level-5").unlocked({ ...empty, habitLogsCount: 59 }), false);
});
