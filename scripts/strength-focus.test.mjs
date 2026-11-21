import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const focus = sourceLoader()("src/lib/strength-focus.ts");
const set = (reps, weight, done) => ({ reps, weight, done });

test("the current set is the first one not done, and the next exercise skips finished ones", () => {
  assert.equal(focus.currentSetIndex([set("10", "40", true), set("", "", false), set("", "", false)]), 1);
  assert.equal(focus.currentSetIndex([set("10", "40", true)]), -1);
  const exercises = [
    { name: "A", muscle: "Dos", sets: [set("8", "50", true)] },
    { name: "B", muscle: "Dos", sets: [set("", "", false)] },
    { name: "C", muscle: "Dos", sets: [set("8", "50", true)] },
  ];
  assert.equal(focus.nextOpenExercise(exercises, 2), 1, "wraps round to an exercise left behind");
  assert.equal(focus.nextOpenExercise(exercises, 1), -1, "nothing else to do");
});

test("steppers never go below zero and keep quarter-kilo precision", () => {
  assert.equal(focus.stepValue("42,5", 2.5), "45");
  assert.equal(focus.stepValue("1", -2.5), "0");
  assert.equal(focus.stepValue("", 1), "1");
  assert.equal(focus.stepValue("10.1", 0), "10");
});

test("today's aim adds load only when every top set reached the target", () => {
  assert.deepEqual(focus.nextTarget([{ reps: 10, weight: 40 }, { reps: 10, weight: 40 }], 10), { weight: 42.5, reps: 10, up: true });
  assert.deepEqual(focus.nextTarget([{ reps: 10, weight: 40 }, { reps: 8, weight: 40 }], 10), { weight: 40, reps: 10, up: false });
  assert.deepEqual(focus.nextTarget([{ reps: 15, weight: 8 }], 12), { weight: 9, reps: 12, up: true });
  assert.deepEqual(focus.nextTarget([{ reps: 12, weight: 0 }], null), { weight: 0, reps: 12, up: false });
  assert.equal(focus.nextTarget([], 10), null);
});

test("plates per side are exact or not offered", () => {
  assert.deepEqual(focus.platesPerSide(42.5), [10, 1.25]);
  assert.deepEqual(focus.platesPerSide(100), [25, 15]);
  assert.equal(focus.platesPerSide(20), null);
  assert.equal(focus.platesPerSide(21), null);
  assert.ok(focus.usesBarbell("Développé militaire barre", []));
  assert.ok(focus.usesBarbell("Squat", ["barbell"]));
  assert.ok(!focus.usesBarbell("Curl haltères", ["dumbbell"]));
});

test("worked muscles count only done sets with reps", () => {
  const result = focus.musclesWorked([
    { name: "A", muscle: "Pectoraux", sets: [set("8", "70", true), set("8", "70", true), set("", "", false)] },
    { name: "B", muscle: "Épaules", sets: [set("10", "40", true)] },
    { name: "C", muscle: "Pectoraux", sets: [set("0", "0", true), set("12", "15", true)] },
  ]);
  assert.deepEqual(result, [{ muscle: "Pectoraux", sets: 3 }, { muscle: "Épaules", sets: 1 }]);
});

test("program balance counts weekly sets per muscle and flags neglected main groups", () => {
  const result = focus.programBalance([
    { exercises: [{ muscle: "Pectoraux", sets: 4 }, { muscle: "Pectoraux", sets: 3 }, { muscle: "Triceps", sets: 3 }] },
    { exercises: [{ muscle: "Dos", sets: 4 }, { muscle: "Dos", sets: 4 }, { muscle: "Biceps", sets: 3 }] },
  ]);
  assert.deepEqual(result.slice(0, 2), [{ muscle: "Dos", sets: 8, low: false }, { muscle: "Pectoraux", sets: 7, low: false }]);
  assert.deepEqual(result.find((item) => item.muscle === "Quadriceps"), { muscle: "Quadriceps", sets: 0, low: true });
  assert.ok(result.find((item) => item.muscle === "Triceps").low);
});
