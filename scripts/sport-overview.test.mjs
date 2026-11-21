import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const { buildSportOverview, disciplineOf } = sourceLoader()("src/lib/sport-overview.ts");
// Saturday 21 November 2026, midday: the week runs from Monday 16 to Sunday 22.
const now = new Date(2026, 10, 21, 12);
const workout = (id, date, overrides = {}) => ({ id, user_id: "owner", activity: id, duration_minutes: 40, intensity: 3, notes: null, muscle_groups: [], template_id: null, discipline: null, calisthenics_program_session_id: null, created_at: `${date}T08:00:00Z`, workout_date: date, ...overrides });
const base = { workouts: [], sets: [], setWorkoutIds: new Set(), nextTemplate: null, templateExercises: [], runs: [], caliSets: [], weeklyGoal: 3 };
const build = (input) => buildSportOverview({ ...base, ...input }, now);

test("disciplines follow the hub's classification, legacy rows included", () => {
  assert.equal(disciplineOf(workout("a", "2026-11-20", { discipline: "running" }), new Set()), "running");
  assert.equal(disciplineOf(workout("b", "2026-11-20", { template_id: "t" }), new Set()), "strength");
  assert.equal(disciplineOf(workout("c", "2026-11-20"), new Set(["c"])), "strength");
  assert.equal(disciplineOf(workout("d", "2026-11-20"), new Set()), "other");
});

test("the week plan shows done days, today and the open rest of the week without inventing sessions", () => {
  const result = build({
    workouts: [workout("pull", "2026-11-16", { discipline: "strength" }), workout("run", "2026-11-18", { discipline: "running" }), workout("future", "2026-11-22", { discipline: "strength" })],
    runs: [{ workout_id: "run", distance_km: 6.2, duration_seconds: 2220 }],
  });
  assert.deepEqual(result.plan.map((day) => day.state), ["done", "rest", "done", "rest", "rest", "today", "upcoming"]);
  assert.equal(result.plan[2].discipline, "running");
  assert.equal(result.plan[2].distanceKm, 6.2);
  assert.equal(result.plan[6].discipline, null, "a future-dated row is not shown as done");
  assert.equal(result.week.sessions, 2);
  assert.equal(result.week.distanceKm, 6.2);
});

test("week figures compare with the same span of last week and keep unknown volume unknown", () => {
  const result = build({
    workouts: [workout("now", "2026-11-17", { discipline: "strength", duration_minutes: 60 }), workout("before", "2026-11-10", { discipline: "strength", duration_minutes: 45 }), workout("lastSunday", "2026-11-15", { discipline: "strength", duration_minutes: 90 })],
    sets: [{ workout_id: "now", exercise_name: "Squat", muscle_group: "Quadriceps", reps: 10, weight_kg: 110 }, { workout_id: "before", exercise_name: "Squat", muscle_group: "Quadriceps", reps: 10, weight_kg: 100 }],
    setWorkoutIds: new Set(["now", "before"]),
  });
  assert.equal(result.week.minutes, 60);
  assert.equal(result.week.minutesChange, 15, "Sunday 15 is outside Monday→Saturday of last week");
  assert.equal(result.week.volume, 1100);
  assert.equal(result.week.volumeChange, 10);
  assert.equal(build({ workouts: [workout("x", "2026-11-20", { discipline: "strength" })] }).week.volume, null);
});

test("recovery states and the suggested session's rest come from the muscles really worked", () => {
  const result = build({
    workouts: [
      workout("legs", "2026-11-01", { discipline: "strength", muscle_groups: ["Quadriceps"] }),
      workout("push", "2026-11-17", { discipline: "strength", muscle_groups: ["Pectoraux", "Épaules"] }),
      workout("pull", "2026-11-20", { discipline: "strength", muscle_groups: ["Dos"] }),
      workout("old", "2026-09-01", { discipline: "strength", muscle_groups: ["Mollets"] }),
    ],
    sets: [{ workout_id: "push", exercise_name: "Développé couché", muscle_group: "Pectoraux", reps: 8, weight_kg: 75 }, { workout_id: "push", exercise_name: "Développé couché", muscle_group: "Pectoraux", reps: 6, weight_kg: 80 }],
    setWorkoutIds: new Set(["push"]),
    nextTemplate: { id: "a", name: "Push A", muscle_groups: ["Pectoraux", "Épaules"] },
    templateExercises: [3, 1, 2, 0].map((position) => ({ template_id: "a", exercise_name: ["Développé couché", "Dips", "Militaire", "Écarté"][position], target_sets: 4, target_reps: 8, position })).concat([{ template_id: "other", exercise_name: "Curl", target_sets: 3, target_reps: 12, position: 0 }]),
  });
  assert.deepEqual(result.recovery.map((muscle) => [muscle.group, muscle.days, muscle.state]), [["Dos", 1, "recovering"], ["Pectoraux", 4, "ready"], ["Épaules", 4, "ready"], ["Quadriceps", 20, "idle"]]);
  assert.equal(result.next.restDays, 4);
  assert.equal(result.next.exerciseCount, 4);
  assert.deepEqual(result.next.exercises.map((exercise) => [exercise.name, exercise.weightKg]), [["Développé couché", 80], ["Dips", null], ["Militaire", null]]);
  const never = build({ workouts: [workout("pull", "2026-11-20", { discipline: "strength", muscle_groups: ["Dos"] })], nextTemplate: { id: "b", name: "Legs", muscle_groups: ["Quadriceps"] } });
  assert.equal(never.next.restDays, null, "no rest claim for a muscle never trained");
});

test("records keep the latest best of each discipline, dated when first reached", () => {
  const result = build({
    workouts: [workout("s1", "2026-11-02", { discipline: "strength" }), workout("s2", "2026-11-09", { discipline: "strength" }), workout("s3", "2026-11-16", { discipline: "strength" }), workout("r1", "2026-11-04", { discipline: "running" }), workout("r2", "2026-11-18", { discipline: "running" }), workout("c1", "2026-11-14", { discipline: "calisthenics" })],
    sets: [
      { workout_id: "s1", exercise_name: "Développé couché", muscle_group: "Pectoraux", reps: 5, weight_kg: 80 },
      { workout_id: "s3", exercise_name: "développé  couché", muscle_group: "Pectoraux", reps: 5, weight_kg: 80 },
      { workout_id: "s2", exercise_name: "Squat", muscle_group: "Quadriceps", reps: 5, weight_kg: 120 },
    ],
    setWorkoutIds: new Set(["s1", "s2", "s3"]),
    runs: [{ workout_id: "r1", distance_km: 5, duration_seconds: 1500 }, { workout_id: "r2", distance_km: 1, duration_seconds: 282 }, { workout_id: "missing", distance_km: 1, duration_seconds: 100 }],
    caliSets: [{ workout_id: "c1", exercise_id: null, exercise_name: "Handstand", reps: null, hold_seconds: 25 }],
  });
  assert.deepEqual(result.records, [
    { discipline: "running", paceSeconds: 282, date: "2026-11-18" },
    { discipline: "calisthenics", name: "Handstand", kind: "hold", value: 25, date: "2026-11-14" },
    { discipline: "strength", name: "Squat", weightKg: 120, date: "2026-11-09" },
  ]);
});

test("discipline trends cover eight weeks and the month's challenge follows the weekly goal", () => {
  const result = build({ workouts: [workout("a", "2026-11-20", { discipline: "running" }), workout("b", "2026-11-03", { discipline: "running" }), workout("c", "2026-09-28", { discipline: "running" }), workout("d", "2026-10-30", { discipline: "calisthenics" })] });
  const running = result.disciplines.find((item) => item.discipline === "running");
  assert.equal(running.trend.length, 8);
  assert.deepEqual(running.trend, [1, 0, 0, 0, 0, 1, 0, 1]);
  assert.equal(running.lastDate, "2026-11-20");
  assert.equal(running.thisWeek, 1);
  assert.deepEqual(result.challenge, { month: "2026-11-01", done: 2, goal: 13, daysLeft: 10, onTrack: false });
  assert.equal(build({ workouts: [] }).hasWorkouts, false);
});
