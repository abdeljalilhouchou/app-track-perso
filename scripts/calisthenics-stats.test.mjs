import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { computeCalisthenicsStats } = load("src/lib/calisthenics/stats.ts");

// Monday 9 November 2026 is the start of the reference week.
const now = new Date(2026, 10, 11, 12);
const workout = (id, workout_date, overrides = {}) => ({ id, user_id: "owner", activity: id, duration_minutes: 40, intensity: 3, notes: null, muscle_groups: [], template_id: null, discipline: "calisthenics", created_at: `${workout_date}T18:00:00Z`, workout_date, ...overrides });
const set = (workout_id, overrides = {}) => ({ id: `${workout_id}-set`, user_id: "owner", workout_id, exercise_id: "push", exercise_name: "Pompes", exercise_position: 0, set_number: 1, reps: null, hold_seconds: null, assistance_kg: null, added_weight_kg: null, variation: "", notes: null, created_at: `${workout_id}-created`, ...overrides });

test("week volume counts only this week's sets and keeps reps and seconds apart", () => {
  const workouts = [workout("now", "2026-11-10"), workout("old", "2026-11-02")];
  const sets = [
    set("now", { reps: 12 }), set("now", { id: "now-hold", hold_seconds: 40 }),
    set("old", { reps: 99 }), set("old", { id: "old-hold", hold_seconds: 99 }),
  ];
  const stats = computeCalisthenicsStats(workouts, sets, now);
  assert.deepEqual(stats.weekVolume, { reps: 12, holdSeconds: 40 });
  assert.equal(stats.sessionsThisWeek, 1);
});

test("a session in each consecutive week builds the streak, and a gap ends it", () => {
  const dates = ["2026-11-10", "2026-11-03", "2026-10-27"];
  assert.equal(computeCalisthenicsStats(dates.map((date) => workout(date, date)), [], now).weekStreak, 3);
  const withGap = ["2026-11-10", "2026-10-27"];
  assert.equal(computeCalisthenicsStats(withGap.map((date) => workout(date, date)), [], now).weekStreak, 1);
});

test("a quiet current week keeps the streak earned up to last week", () => {
  const dates = ["2026-11-03", "2026-10-27"];
  const stats = computeCalisthenicsStats(dates.map((date) => workout(date, date)), [], now);
  assert.equal(stats.sessionsThisWeek, 0);
  assert.equal(stats.weekStreak, 2);
});

test("no sessions at all means no streak and no volume", () => {
  const stats = computeCalisthenicsStats([], [], now);
  assert.equal(stats.weekStreak, 0);
  assert.deepEqual(stats.weekVolume, { reps: 0, holdSeconds: 0 });
});
