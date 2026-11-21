import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const H = load("src/lib/habits-v2.ts");

const TODAY = "2026-11-23"; // a Monday
const habit = (over = {}) => ({ id: "h", name: "Lire", kind: "check", goal_value: null, scheduled_days: [1, 2, 3, 4, 5, 6, 7], created_at: "2026-10-01T08:00:00Z", joker_enabled: true, ...over });
const log = (log_date, over = {}) => ({ habit_id: "h", log_date, value: null, is_joker: false, ...over });
const idx = (logs) => H.indexLogs(logs).get("h");

test("dates: weekday and week start", () => {
  assert.equal(H.isoWeekday(TODAY), 1);
  assert.equal(H.isoWeekday("2026-11-22"), 7);
  assert.equal(H.weekStart("2026-11-22"), "2026-11-16");
});

test("check habit: done, missed, pending today, off before creation or unscheduled", () => {
  const h = habit({ scheduled_days: [1, 3, 5] });
  assert.equal(H.dayState(h, log("2026-11-18"), "2026-11-18", TODAY), "done");
  assert.equal(H.dayState(h, undefined, "2026-11-20", TODAY), "missed");
  assert.equal(H.dayState(h, undefined, TODAY, TODAY), "pending");
  assert.equal(H.dayState(h, undefined, "2026-11-19", TODAY), "off", "Thursday is not scheduled");
  assert.equal(H.dayState(h, undefined, "2026-09-30", TODAY), "off", "before the habit existed");
});

test("count habit: partial below the goal, done at the goal, legacy log without value is done", () => {
  const h = habit({ kind: "count", goal_value: 8 });
  assert.equal(H.dayState(h, log("2026-11-20", { value: 5 }), "2026-11-20", TODAY), "partial");
  assert.equal(H.dayState(h, log(TODAY, { value: 5 }), TODAY, TODAY), "pending");
  assert.equal(H.dayState(h, log("2026-11-20", { value: 8 }), "2026-11-20", TODAY), "done");
  assert.equal(H.dayState(h, log("2026-11-20"), "2026-11-20", TODAY), "done");
  assert.equal(H.logCountsAsDone(h, log("x", { value: 3 })), false);
});

test("avoid habit: a log is a slip, every other due day a success, streak since the last slip", () => {
  const h = habit({ kind: "avoid" });
  assert.equal(H.dayState(h, log("2026-11-20"), "2026-11-20", TODAY), "slip");
  assert.equal(H.dayState(h, undefined, "2026-11-21", TODAY), "done");
  assert.equal(H.currentStreak(h, idx([log("2026-11-20")]), TODAY), 3, "21, 22 and today");
  assert.equal(H.logCountsAsDone(h, log("2026-11-20")), false);
});

test("streak skips unscheduled days, waits for today, and a joker keeps it", () => {
  const h = habit();
  const logs = idx([log("2026-11-20"), log("2026-11-21", { is_joker: true }), log("2026-11-22")]);
  assert.equal(H.currentStreak(h, logs, TODAY), 3, "today still open does not break it");
  const weekdays = habit({ scheduled_days: [1, 2, 3, 4, 5] });
  assert.equal(H.currentStreak(weekdays, idx([log("2026-11-19"), log("2026-11-20")]), TODAY), 2, "the weekend is skipped");
  assert.equal(H.longestStreak(h, idx([log("2026-11-10"), log("2026-11-11"), log("2026-11-12"), log("2026-11-20")]), TODAY), 3);
});

test("a joker covers one missed day per week, within the last 7 days", () => {
  const h = habit();
  const logs = idx([log("2026-11-17", { is_joker: true })]);
  assert.equal(H.canUseJoker(h, logs, "2026-11-19", TODAY), false, "one already used that week");
  assert.equal(H.canUseJoker(h, idx([]), "2026-11-19", TODAY), true);
  assert.equal(H.canUseJoker(h, idx([]), "2026-11-10", TODAY), false, "too old");
  assert.equal(H.canUseJoker(habit({ joker_enabled: false }), idx([]), "2026-11-19", TODAY), false);
  assert.equal(H.canUseJoker(h, idx([log("2026-11-19")]), "2026-11-19", TODAY), false, "not missed");
  assert.equal(H.jokerLeftThisWeek(h, idx([]), TODAY), true);
});

test("tally leaves joker days and today out", () => {
  const h = habit();
  const logs = idx([log("2026-11-20"), log("2026-11-21", { is_joker: true })]);
  assert.deepEqual(H.tally(h, logs, "2026-11-19", TODAY, TODAY), { done: 1, expected: 3 }, "19 missed, 20 done, 22 missed; 21 joker and today not counted");
});

test("weekly review compares the last full week with the one before", () => {
  const a = habit({ id: "a", name: "Lire" });
  const b = habit({ id: "b", name: "Méditer" });
  const logs = [];
  for (const d of ["16", "17", "18", "19", "20", "21", "22"]) logs.push({ habit_id: "a", log_date: `2026-11-${d}`, value: null, is_joker: false });
  for (const d of ["16", "17"]) logs.push({ habit_id: "b", log_date: `2026-11-${d}`, value: null, is_joker: false });
  for (const d of ["09", "10", "11"]) logs.push({ habit_id: "a", log_date: `2026-11-${d}`, value: null, is_joker: false });
  const review = H.weeklyReview([a, b], H.indexLogs(logs), TODAY);
  assert.equal(review.start, "2026-11-16");
  assert.equal(review.rate, 64, "9 of 14");
  assert.equal(review.delta, 64 - 21, "3 of 14 the week before");
  assert.equal(review.best.name, "Lire");
  assert.equal(review.weakest.name, "Méditer");
});

test("badges and mood effects", () => {
  const h = habit();
  const logs = [];
  for (let i = 1; i <= 8; i++) logs.push(log(H.addDays(TODAY, -i)));
  const badges = H.habitBadges([h], H.indexLogs(logs), TODAY);
  assert.equal(badges.find((b) => b.id === "streak7").earned, true);
  assert.equal(badges.find((b) => b.id === "streak30").earned, false);
  const moods = ["2026-11-20", "2026-11-19", "2026-11-18", "2026-11-12", "2026-11-11", "2026-11-10"].map((entry_date, i) => ({ entry_date, mood_score: i < 3 ? 4 : 2 }));
  const effects = H.moodEffects([h], H.indexLogs([log("2026-11-20"), log("2026-11-19"), log("2026-11-18")]), moods, TODAY);
  assert.deepEqual(effects.map((e) => [e.withHabit, e.without, e.diff]), [[4, 2, 2]]);
});

test("a flexible habit is judged per week: no missed days, streak in weeks", () => {
  const h = habit({ target_per_week: 3 });
  assert.equal(H.isFlexible(h), true);
  assert.equal(H.dayState(h, undefined, "2026-11-20", TODAY), "off", "an empty day is not a miss");
  const logs = idx([log("2026-11-16"), log("2026-11-18"), log("2026-11-20"), log("2026-11-10"), log("2026-11-12"), log("2026-11-14")]);
  assert.equal(H.currentStreak(h, logs, TODAY), 2, "two full weeks at 3");
  assert.deepEqual(H.tally(h, idx([log("2026-11-16")]), "2026-11-16", "2026-11-22", TODAY), { done: 1, expected: 3 }, "a finished week short of its target");
});

test("kept dates follow each kind", () => {
  const avoid = habit({ kind: "avoid", created_at: "2026-11-20T08:00:00Z" });
  assert.deepEqual([...H.keptDates(avoid, [log("2026-11-21")], "2026-11-01", TODAY, TODAY)], ["2026-11-20", "2026-11-22", TODAY]);
  const count = habit({ kind: "count", goal_value: 8 });
  assert.deepEqual([...H.keptDates(count, [log("2026-11-21", { value: 8 }), log("2026-11-22", { value: 3 })], "2026-11-20", TODAY, TODAY)], ["2026-11-21"]);
});
