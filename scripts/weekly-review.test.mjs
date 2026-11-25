import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const review = sourceLoader()("src/lib/weekly-review.ts");

// Week under review: Monday 16 to Sunday 22 November 2026, seen on Wednesday 25.
const start = "2026-11-16";
const today = "2026-11-25";
const day = (offset) => { const d = new Date(`${start}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const habit = { id: "h1", name: "Lire", kind: "check", scheduled_days: [1, 2, 3, 4, 5, 6, 7], target_per_week: 7, created_at: "2026-10-01T08:00:00Z", joker_enabled: true };

function input(overrides = {}) {
  return {
    start, today,
    habits: [habit],
    // Five of seven days this week, three the week before.
    habitLogs: [0, 1, 2, 3, 5, -7, -5, -3].map((o) => ({ habit_id: "h1", log_date: day(o), value: null, is_joker: false })),
    workouts: [
      { id: "w1", workout_date: day(1), duration_minutes: 40, discipline: "running" },
      { id: "w2", workout_date: day(3), duration_minutes: 50, discipline: "strength" },
      { id: "w3", workout_date: day(-4), duration_minutes: 30, discipline: "running" },
    ],
    runs: [{ workout_id: "w1", distance_km: "6.25" }, { workout_id: "w3", distance_km: 5 }],
    moods: [[0, 2], [1, 4], [2, 3], [3, 5], [4, 3], [5, 4], [6, 3], [-6, 2], [-4, 4], [-2, 3]].map(([o, s]) => ({ entry_date: day(o), mood_score: s })),
    meals: [[0, 2000, 120], [1, 2200, 110], [2, 2100, 105], [5, 1900, 60], [6, 2000, 70], [-1, 1800, 65], [-2, 1900, 60]].map(([o, calories, protein]) => ({ entry_date: day(o), calories, protein })),
    sleep: [[0, "01:00:00", 340], [1, "23:30:00", 460], [2, "23:10:00", 470], [3, "00:40:00", 380], [4, "23:20:00", 330], [5, "00:50:00", 360], [6, "23:40:00", 450]].map(([o, bedtime, duration_minutes]) => ({ wake_date: day(o), bedtime, duration_minutes })),
    goals: { calories: 2300, protein: 100, sportWeekly: 3 },
    ...overrides,
  };
}

test("week bounds: the last finished week, and only Mondays up to this week", () => {
  assert.equal(review.lastWeekStart(today), "2026-11-16");
  assert.equal(review.lastWeekStart("2026-11-23"), "2026-11-16");
  assert.equal(review.parseWeekStart("2026-11-09", today), "2026-11-09");
  assert.equal(review.parseWeekStart("2026-11-23", today), "2026-11-23");
  assert.equal(review.parseWeekStart("2026-11-30", today), null, "a future week");
  assert.equal(review.parseWeekStart("2026-11-10", today), null, "not a Monday");
  assert.equal(review.parseWeekStart("nope", today), null);
  assert.equal(review.parseWeekStart(undefined, today), null);
});

test("figures for the week and the one before", () => {
  const r = review.buildWeeklyReview(input());
  assert.equal(r.week.start, start);
  assert.equal(r.week.end, "2026-11-22");
  assert.equal(r.finished, true);
  assert.deepEqual([r.week.habits.done, r.week.habits.expected, r.week.habits.rate, r.week.habits.perfectDays], [5, 7, 71, 5]);
  assert.deepEqual([r.week.sport.sessions, r.week.sport.minutes, r.week.sport.km], [2, 90, 6.3]);
  assert.deepEqual(r.week.sport.byDiscipline, { running: 1, strength: 1 });
  assert.equal(r.week.nutrition.days, 5);
  assert.equal(r.week.nutrition.proteinDays, 3);
  assert.equal(r.week.sleep.nights, 7);
  assert.equal(r.week.sleep.beforeMidnight, 4);
  assert.deepEqual(r.week.sleep.shortest, { date: day(4), minutes: 330 });
  assert.equal(r.week.mood.avg, 3.4);
  assert.equal(r.week.days.length, 7);
  assert.equal(r.week.days[1].km, 6.3);
  assert.equal(r.previous.sport.sessions, 1);
  assert.equal(typeof r.week.score, "number");
  assert.ok(r.week.score > 0 && r.week.score <= 100);
  assert.equal(r.delta, r.week.score - r.previous.score);
});

test("best and hardest day", () => {
  const r = review.buildWeeklyReview(input());
  assert.equal(r.best.date, day(3), "sport, all habits, mood 5");
  assert.equal(r.hardest.date, day(4), "no habit, short of sleep");
});

test("facts from the last four weeks", () => {
  const r = review.buildWeeklyReview(input());
  const keys = r.insights.map((i) => i.key);
  assert.ok(keys.includes("bedtime"), "before midnight sleeps longer");
  const bed = r.insights.find((i) => i.key === "bedtime");
  assert.ok(bed.minutes >= 60);
  assert.ok(keys.includes("sportMood"), "sport days are better days");
  assert.ok(keys.length <= 3);
});

test("no data: no score, no facts, still three goals", () => {
  const r = review.buildWeeklyReview(input({ habits: [], habitLogs: [], workouts: [], runs: [], moods: [], meals: [], sleep: [] }));
  assert.equal(r.week.score, null);
  assert.equal(r.delta, null);
  assert.deepEqual(r.insights, []);
  assert.equal(r.best, null);
  assert.equal(r.suggestions.length, 3);
});

test("goals: suggestions, checks and validation", () => {
  const r = review.buildWeeklyReview(input());
  assert.equal(r.suggestions.length, 3);
  for (const goal of r.suggestions) assert.ok(review.isGoal(goal), `${goal.key} is valid`);
  assert.deepEqual(review.evaluateGoal({ key: "bedtime", target: 5 }, r.week), { key: "bedtime", target: 5, value: 4, done: false });
  assert.deepEqual(review.evaluateGoal({ key: "sport", target: 2 }, r.week), { key: "sport", target: 2, value: 2, done: true });
  assert.equal(review.evaluateGoal({ key: "sleep7", target: 420 }, r.week).value, r.week.sleep.avgMinutes);
  assert.equal(review.isGoal({ key: "nap", target: 3 }), false);
  assert.equal(review.isGoal({ key: "sport", target: 0 }), false);
  assert.equal(review.isGoal({ key: "sport", target: 2.5 }), false);
});

test("the week in progress is not finished and counts only the days so far", () => {
  const r = review.buildWeeklyReview(input({ start: "2026-11-23" }));
  assert.equal(r.finished, false);
  assert.ok(r.week.days.filter((d) => d.date > today).every((d) => d.habitsDone === 0));
});
