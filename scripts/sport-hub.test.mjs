import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { classifySportWorkouts, summarizeHubTraining, sportWorkoutHref } = load("src/lib/sport-hub.ts");
const { sportTabFromQuery } = load("src/lib/sport-navigation.ts");
const workout = (id, overrides = {}) => ({ id, user_id: "owner", activity: id, duration_minutes: 28, intensity: 3, notes: null, muscle_groups: [], template_id: null, discipline: null, created_at: "2026-11-06T12:00:00Z", workout_date: "2026-11-06", ...overrides });

test("classification keeps legacy strength identification without double-counting disciplines", () => {
  const rows = [workout("strength", { discipline: "strength" }), workout("legacy", { discipline: undefined }), workout("template", { template_id: "program" }), workout("cal", { discipline: "calisthenics", template_id: "program" }), workout("run", { discipline: "running" }), workout("general")];
  const result = classifySportWorkouts(rows, new Set(["legacy", "cal", "run"]));
  assert.deepEqual(result, { strength: 3, calisthenics: 1, running: 1, unclassified: 1 });
  assert.equal(Object.values(result).reduce((sum, count) => sum + count, 0), rows.length);
});

test("weekly volume uses recorded strength sets, excluding older, future and other-discipline rows", () => {
  const rows = [workout("strength"), workout("old", { workout_date: "2026-11-01" }), workout("future", { workout_date: "2026-11-07" }), workout("cal", { discipline: "calisthenics" }), workout("run", { discipline: "running" })];
  const sets = rows.map((row) => ({ id: row.id, workout_id: row.id, reps: 12, weight_kg: 25 }));
  const result = summarizeHubTraining(rows, sets, [], new Date(2026, 10, 6, 12));
  assert.equal(result.weeklyStrengthVolume, 300);
  assert.equal(result.recordedStrengthSets, 1);
  assert.ok(!result.recent.some((row) => row.id === "future"));
  assert.equal(result.nextTemplate, null);
});

test("missing volume stays unknown while recorded zero-load sets legitimately show zero", () => {
  const rows = [workout("one")];
  const now = new Date(2026, 10, 6, 12);
  assert.equal(summarizeHubTraining(rows, [], [], now).weeklyStrengthVolume, null);
  assert.equal(summarizeHubTraining(rows, [{ id: "set", workout_id: "one", reps: 12, weight_kg: 0 }], [], now).weeklyStrengthVolume, 0);
});

test("next-session suggestions reference existing templates and do not fabricate a planned date", () => {
  const today = new Date().toLocaleDateString("sv-SE");
  const templates = [{ id: "a", name: "A", muscle_groups: ["Dos"] }, { id: "b", name: "B", muscle_groups: ["Jambes"] }];
  const result = summarizeHubTraining([workout("logged", { template_id: "a", workout_date: today })], [], templates);
  assert.equal(result.nextTemplate, templates[1]);
  assert.ok(!Object.hasOwn(result.nextTemplate, "workout_date"));
  assert.equal(summarizeHubTraining([], [], []).nextTemplate, null);
});

test("query shortcuts select real workspace panels and preserve legacy date behavior", () => {
  assert.equal(sportTabFromQuery("program"), "program");
  assert.equal(sportTabFromQuery(["history", "session"]), "history");
  assert.equal(sportTabFromQuery("invalid", "2026-11-06"), "history");
  assert.equal(sportTabFromQuery(undefined), "session");
  assert.equal(sportTabFromQuery("session", "2026-11-06"), "session");
});

test("recent activity links keep discipline-specific details and encode user identifiers", () => {
  assert.equal(sportWorkoutHref(workout("run/a", { discipline: "running" })), "/sport/running?session=run%2Fa");
  assert.equal(sportWorkoutHref(workout("cal", { discipline: "calisthenics" })), "/sport/calisthenics?session=cal");
  assert.equal(sportWorkoutHref(workout("legacy")), "/sport/musculation?date=2026-11-06");
});

test("dashboard reads are owner-scoped and never query gated discipline tables", async () => {
  const calls = [];
  const rows = { workouts: [workout("one")], workout_sets: [{ id: "set", workout_id: "one", reps: 12, weight_kg: 25 }], workout_templates: [{ id: "program", name: "Real program", muscle_groups: [] }] };
  const reader = sourceLoader({
    "@/lib/supabase/server": { createClient: async () => ({ from(table) {
      assert.ok(Object.hasOwn(rows, table), `Unexpected table ${table}`);
      const query = {};
      for (const method of ["select", "eq", "order"]) query[method] = (...args) => { calls.push([table, method, ...args]); return query; };
      query.range = async () => ({ data: rows[table], error: null });
      return query;
    } }) },
    "@/lib/supabase/read-context": { getCurrentUser: async () => ({ id: "owner" }), getProfilePreferences: async () => ({ data: { sport_weekly_goal: 3, language: "fr" }, error: null }) },
  })("src/lib/sport-hub-data.ts");
  const result = await reader.loadSportHubData({ dashboard: true });
  assert.equal(result.stats.totalSessions, 1);
  assert.equal(result.training.nextTemplate.id, "program");
  for (const table of Object.keys(rows)) assert.ok(calls.some((call) => call[0] === table && call[1] === "eq" && call[2] === "user_id" && call[3] === "owner"));
  calls.length = 0;
  await reader.loadSportHubData();
  assert.ok(!calls.some((call) => call[0] !== "workouts"), "Existing stats pages must not load dashboard-only tables");
});

test("new dashboard labels have explicit translations in all three languages", () => {
  const { sportHubFr, sportHubEn, sportHubAr } = load("src/lib/i18n/modules/sport-hub.ts");
  const { translate } = load("src/lib/i18n/translate.ts");
  for (const [language, dictionary] of [["fr", sportHubFr], ["en", sportHubEn], ["ar", sportHubAr]]) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(sportHubFr).sort());
    for (const [key, value] of Object.entries(dictionary)) assert.equal(translate(language, `sport.hubDashboard.${key}`), value);
  }
});
