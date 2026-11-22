import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const focus = sourceLoader()("src/lib/calisthenics/focus.ts");

test("each category has its colour, unknown ones stay neutral", () => {
  assert.equal(focus.categoryColor("pull"), "var(--water)");
  assert.equal(focus.categoryColor("skills"), "var(--habit)");
  assert.equal(focus.categoryColor("unknown"), "var(--foreground-muted)");
});

test("the current set and the next open exercise", () => {
  assert.equal(focus.currentSetIndex([{ done: true }, {}, {}]), 1);
  assert.equal(focus.currentSetIndex([{ done: true }]), -1);
  const items = [{ sets: [{ done: true }] }, { sets: [{}] }, { sets: [{ done: true }] }];
  assert.equal(focus.nextOpenItem(items, 2), 1);
  assert.equal(focus.nextOpenItem(items, 1), -1);
});

test("today's aim adds a rep or five seconds once the target is reached", () => {
  assert.deepEqual(focus.nextAim(6, 6, "reps"), { value: 7, up: true });
  assert.deepEqual(focus.nextAim(5, 6, "reps"), { value: 6, up: false });
  assert.deepEqual(focus.nextAim(35, 30, "hold"), { value: 40, up: true });
  assert.deepEqual(focus.nextAim(null, 30, "hold"), { value: 30, up: false });
  assert.deepEqual(focus.nextAim(8, null, "reps"), { value: 9, up: true });
  assert.equal(focus.nextAim(null, null, "reps"), null);
});

test("set labels and session totals count done sets only", () => {
  const units = { reps: "reps", seconds: "s" };
  assert.equal(focus.setLabel({ reps: 7, holdSeconds: null, mode: "reps", assistanceKg: null, addedWeightKg: 5 }, units), "7 reps · +5 kg");
  assert.equal(focus.setLabel({ reps: null, holdSeconds: 30, mode: "hold", assistanceKg: 10, addedWeightKg: null }, units), "30 s · −10 kg");
  const totals = focus.sessionTotals([
    { sets: [{ reps: 7, holdSeconds: null, mode: "reps", done: true }, { reps: 6, holdSeconds: null, mode: "reps" }] },
    { sets: [{ reps: null, holdSeconds: 30, mode: "hold", done: true }, { reps: null, holdSeconds: 25, mode: "hold", done: true }] },
  ]);
  assert.deepEqual(totals, { sets: 3, reps: 7, holdSeconds: 55 });
});

test("sets add up per category", () => {
  const totals = focus.setsByCategory([{ category: "pull", sets: 4 }, { category: "pull", sets: 3 }, { category: "core", sets: 3 }, { category: undefined, sets: 9 }]);
  assert.deepEqual([...totals], [["pull", 7], ["core", 3]]);
});
