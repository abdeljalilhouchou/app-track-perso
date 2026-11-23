import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const sleep = sourceLoader()("src/lib/sleep.ts");

test("duration across midnight, bedtime before midnight", () => {
  assert.equal(sleep.durationMinutes("23:40", "07:05"), 445);
  assert.equal(sleep.durationMinutes("01:10", "08:00"), 410);
  assert.equal(sleep.durationMinutes("07:00", "07:00"), null);
  assert.equal(sleep.durationMinutes("25:00", "07:00"), null);
  assert.equal(sleep.beforeMidnight("23:59"), true);
  assert.equal(sleep.beforeMidnight("00:05"), false);
  assert.equal(sleep.formatSleep(445), "7 h 25");
  assert.equal(sleep.formatSleep(45), "45 min");
  assert.equal(sleep.eveningOf("2026-11-23"), "2026-11-22");
});

test("bedtimes around midnight average correctly", () => {
  const logs = ["23:30", "00:30"].map((bedtime, index) => ({ wake_date: `2026-11-2${2 + index}`, bedtime, wake_time: "07:00", duration_minutes: 420, quality: 3, tags: [] }));
  const stats = sleep.sleepStats(logs, [], "2026-11-23");
  assert.equal(stats.bedtimeMean, "00:00");
  assert.equal(stats.bedtimeSpread, 30);
  assert.deepEqual(stats.beforeMidnight, { count: 1, of: 2 });
  assert.equal(stats.week.length, 7);
  assert.equal(stats.week[6].minutes, 420);
});

test("links with mood need enough nights on both sides", () => {
  const nights = [480, 470, 450, 360, 350, 330].map((minutes, index) => ({ wake_date: `2026-11-1${index}`, bedtime: "23:00", wake_time: "07:00", duration_minutes: minutes, quality: 3, tags: index > 2 ? ["lateScreen"] : [] }));
  const moods = nights.map((night, index) => ({ entry_date: night.wake_date, mood_score: index > 2 ? 3 : 4.5, energy_level: index > 2 ? 2 : 4 }));
  const stats = sleep.sleepStats(nights, moods, "2026-11-23");
  assert.equal(stats.links.mood.enough, 4.5);
  assert.equal(stats.links.mood.short, 3);
  assert.deepEqual(stats.tagCost, { tag: "lateScreen", minutes: 120 });
  assert.equal(sleep.sleepStats(nights.slice(0, 5), moods, "2026-11-23").links, null);
});

test("sleep input is validated", () => {
  const good = { wakeDate: "2026-11-23", bedtime: "23:40", wakeTime: "7:05", quality: 4, tags: ["lateScreen"] };
  assert.deepEqual(sleep.validateSleepInput(good, "2026-11-23"), { wakeDate: "2026-11-23", bedtime: "23:40", wakeTime: "07:05", minutes: 445, quality: 4, tags: ["lateScreen"] });
  assert.equal(sleep.validateSleepInput({ ...good, wakeDate: "2026-11-24" }, "2026-11-23"), null);
  assert.equal(sleep.validateSleepInput({ ...good, quality: 6 }, "2026-11-23"), null);
  assert.equal(sleep.validateSleepInput({ ...good, tags: ["party"] }, "2026-11-23"), null);
  assert.equal(sleep.validateSleepInput({ ...good, bedtime: "12:00", wakeTime: "07:00" }, "2026-11-23"), null);
});
