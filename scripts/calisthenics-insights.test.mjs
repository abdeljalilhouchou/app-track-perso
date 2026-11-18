import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { compareWeeks, exerciseRecords, weekBalance } = load("src/lib/calisthenics/insights.ts");

const now = new Date(2026, 10, 18, 12); // Wednesday; the week starts Monday 16 Nov
const workout = (id, workout_date, duration_minutes = 40) => ({ id, user_id: "u", workout_date, activity: id, duration_minutes, intensity: 3, notes: null, muscle_groups: [], template_id: null, discipline: "calisthenics", created_at: `${workout_date}T18:00:00Z` });
const set = (id, workout_id, exercise_id, values) => ({ id, user_id: "u", workout_id, exercise_id, exercise_name: exercise_id, exercise_position: 0, set_number: 1, reps: null, hold_seconds: null, assistance_kg: null, added_weight_kg: null, variation: "", notes: null, created_at: "x", ...values });

test("this week is compared with the whole previous week, reps and holds apart", () => {
  const workouts = [workout("a", "2026-11-17", 45), workout("b", "2026-11-12", 30), workout("c", "2026-11-03", 99)];
  const sets = [set("1", "a", "pompes", { reps: 20 }), set("2", "a", "gainage", { hold_seconds: 60 }), set("3", "b", "pompes", { reps: 15 })];
  const { current, previous } = compareWeeks(workouts, sets, now);
  assert.deepEqual(current, { sessions: 1, minutes: 45, reps: 20, holdSeconds: 60 });
  assert.deepEqual(previous, { sessions: 1, minutes: 30, reps: 15, holdSeconds: 0 });
});

test("a record is the best single set, dated by when it was first reached", () => {
  const workouts = [workout("old", "2026-10-01"), workout("tie", "2026-11-01"), workout("new", "2026-11-17")];
  const sets = [
    set("1", "old", "tractions", { reps: 10 }), set("2", "tie", "tractions", { reps: 10 }),
    set("3", "new", "gainage", { hold_seconds: 90 }), set("4", "old", "gainage", { hold_seconds: 60 }),
  ];
  const records = exerciseRecords(workouts, sets, now);
  const pull = records.find((record) => record.key === "tractions");
  assert.equal(pull.value, 10);
  assert.equal(pull.date, "2026-10-01", "an equal later result keeps the first date");
  assert.equal(pull.isNew, false);
  const plank = records.find((record) => record.key === "gainage");
  assert.deepEqual([plank.kind, plank.value, plank.isNew], ["hold", 90, true]);
  assert.equal(records[0].key, "gainage", "newest record first");
});

test("the balance counts this week's sets per category and names an untrained one", () => {
  const workouts = [workout("a", "2026-11-17"), workout("old", "2026-11-05")];
  const category = { pompes: "push", tractions: "pull", gainage: "core", squat: "legs" };
  const sets = [set("1", "a", "pompes", { reps: 10 }), set("2", "a", "pompes", { reps: 10 }), set("3", "a", "tractions", { reps: 5 }), set("4", "a", "gainage", { hold_seconds: 30 }), set("5", "old", "squat", { reps: 20 })];
  const balance = weekBalance(workouts, sets, (row) => category[row.exercise_id], now);
  assert.deepEqual(balance.counts, { push: 2, pull: 1, legs: 0, core: 1 });
  assert.deepEqual(balance.lagging, ["legs"]);
  assert.equal(balance.max, 2);
  assert.deepEqual(weekBalance([], [], () => undefined, now).lagging, [], "nothing trained, nothing flagged");
});

test("the next step is offered only after three results in a row on the current step", () => {
  const { readyForNextStep } = load("src/lib/calisthenics/insights.ts");
  const log = (logged_on, step_index) => ({ logged_on, created_at: `${logged_on}T10:00:00Z`, step_index });
  const skill = (current_step, logs) => ({ current_step, progression_steps: ["a", "b", "c"], logs });
  assert.equal(readyForNextStep(skill(1, [log("2026-11-01", 0), log("2026-11-03", 0), log("2026-11-05", 0)])), true);
  assert.equal(readyForNextStep(skill(1, [log("2026-11-03", 0), log("2026-11-05", 0)])), false, "two results are not enough");
  assert.equal(readyForNextStep(skill(1, [log("2026-11-01", 0), log("2026-11-03", 1), log("2026-11-05", 0), log("2026-11-06", 0)])), false, "the third latest is on another step");
  assert.equal(readyForNextStep(skill(1, [log("2026-11-01", 1), log("2026-11-02", 0), log("2026-11-03", 0), log("2026-11-05", 0)])), true, "older results do not count");
  assert.equal(readyForNextStep(skill(3, [log("2026-11-01", 2), log("2026-11-03", 2), log("2026-11-05", 2)])), false, "the last step has no next one");
  assert.equal(readyForNextStep(skill(0, [log("2026-11-01", 0), log("2026-11-03", 0), log("2026-11-05", 0)])), false, "a skill not started yet");
});
