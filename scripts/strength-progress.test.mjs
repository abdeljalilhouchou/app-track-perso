import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const progress = sourceLoader()("src/lib/strength-progress.ts");
// Saturday 21 November 2026.
const now = new Date(2026, 10, 21, 12);

test("records are sessions that beat every earlier top load, never the first one", () => {
  const sessions = [["2026-10-01", 60], ["2026-10-08", 60], ["2026-10-15", 62.5], ["2026-10-22", 62.5], ["2026-11-05", 65]].map(([date, topWeight]) => ({ date, topWeight, est1RM: 0 }));
  assert.deepEqual(progress.recordDates(sessions), ["2026-10-15", "2026-11-05"]);
  assert.deepEqual(progress.recordDates([{ date: "2026-11-01", topWeight: 0, est1RM: 0 }, { date: "2026-11-02", topWeight: 10, est1RM: 0 }]), [], "bodyweight then a first load is not a record");
});

test("key figures compare the period with the one before", () => {
  const workouts = [
    { date: "2026-11-20", minutes: 50, volume: 8000 },
    { date: "2026-11-01", minutes: 40, volume: 6000 },
    { date: "2026-10-20", minutes: 60, volume: 10000 },
    { date: "2026-09-01", minutes: 30, volume: null },
  ];
  const exercises = [{ key: "a", name: "A", sessions: [{ date: "2026-10-20", topWeight: 60, est1RM: 0 }, { date: "2026-11-20", topWeight: 65, est1RM: 0 }] }];
  const figures = progress.progressFigures(workouts, exercises, 28, now);
  assert.deepEqual(figures, { sessions: 2, sessionsChange: 1, volume: 14000, volumeChange: 40, averageMinutes: 45, averageChange: -15, records: 1 });
  assert.equal(progress.progressFigures([], [], 28, now).volumeChange, null);
});

test("an exercise's curve keeps loaded sessions in the period and its gain", () => {
  const exercise = { key: "a", name: "A", sessions: [["2026-08-01", 50], ["2026-10-01", 60], ["2026-11-01", 0], ["2026-11-15", 65]].map(([date, topWeight]) => ({ date, topWeight, est1RM: 0 })) };
  const curve = progress.exerciseCurve(exercise, 91, now);
  assert.deepEqual(curve.points.map((point) => point.date), ["2026-10-01", "2026-11-15"]);
  assert.equal(curve.gain, 5);
  assert.equal(progress.exerciseCurve(exercise, 28, now).gain, null);
});

test("regularity covers twelve weeks ending this week and counts goal weeks", () => {
  const result = progress.regularity(["2026-11-16", "2026-11-18", "2026-11-20", "2026-11-10", "2026-08-31"], 3, now);
  assert.equal(result.weeks.length, 12);
  assert.equal(result.weeks[11].start, "2026-11-16");
  assert.equal(result.weeks[0].start, "2026-08-31");
  assert.equal(result.total, 5);
  assert.equal(result.goalWeeks, 1);
  assert.ok(result.weeks[11].days[6].future);
});
