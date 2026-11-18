import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { parseDuration, computeRunningStats } = load("src/lib/running/stats.ts");

test("durations are read as h:mm:ss, mm:ss or plain minutes", () => {
  assert.equal(parseDuration("37:12"), 37 * 60 + 12);
  assert.equal(parseDuration("1:05:00"), 3900);
  assert.equal(parseDuration(" 0:37:12 "), 2232);
  assert.equal(parseDuration("45"), 2700);
  assert.equal(parseDuration("90:00"), 5400, "minutes may exceed 59 without hours");
});

test("invalid durations are refused", () => {
  for (const text of ["", "abc", "12:75", "1:61:00", "0:00", "1:2:3:4", "-5", "5.5"]) assert.equal(parseDuration(text), null, text);
});

test("the week streak counts consecutive weeks with a run, a quiet current week included", () => {
  const now = new Date(2026, 10, 18, 12); // Wednesday, week starting Monday 16 Nov
  const run = (date) => ({ workout_id: date, user_id: "u", workout_date: date, activity: "run", duration_minutes: 30, intensity: 3, workout_notes: null, name: "", run_type: "easy", distance_km: 5, duration_seconds: 1800, elevation_gain_m: null, average_heart_rate: null, cadence_spm: null, created_at: `${date}T08:00:00Z` });
  assert.equal(computeRunningStats([run("2026-11-17"), run("2026-11-10"), run("2026-11-03")], null, now).weekStreak, 3);
  assert.equal(computeRunningStats([run("2026-11-10"), run("2026-11-03")], null, now).weekStreak, 2);
  assert.equal(computeRunningStats([run("2026-11-17"), run("2026-10-27")], null, now).weekStreak, 1);
  assert.equal(computeRunningStats([], null, now).weekStreak, 0);
});
