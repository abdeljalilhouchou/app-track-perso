import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const n = sourceLoader()("src/lib/notifications.ts");
const settings = (patch = {}) => ({ ...n.DEFAULT_SETTINGS, ...patch, kinds: { ...n.DEFAULT_KINDS, ...(patch.kinds ?? {}) } });
// 30 November 2026 is a Monday, 1 December a Tuesday.
const MON = "2026-11-30", TUE = "2026-12-01";

test("settings are cleaned: bad values fall back to the defaults", () => {
  const s = n.parseSettings({ enabled: false, timezone: "Mars/Olympus", kinds: { habits: { on: false, time: "25:00" }, water: { on: true, time: "16:15" }, nope: { on: true } }, quiet_from: "23:00", cap_on: "yes" });
  assert.equal(s.enabled, false);
  assert.equal(s.timezone, "Europe/Paris");
  assert.deepEqual(s.kinds.habits, { on: false, time: "20:00" });
  assert.deepEqual(s.kinds.water, { on: true, time: "16:15" });
  assert.equal("nope" in s.kinds, false);
  assert.equal(s.quietFrom, "23:00");
  assert.equal(s.capOn, true);
  assert.deepEqual(n.parseSettings(null), n.DEFAULT_SETTINGS);
});

test("quiet hours across midnight", () => {
  assert.equal(n.inQuietHours("23:00", "22:30", "07:30"), true);
  assert.equal(n.inQuietHours("03:00", "22:30", "07:30"), true);
  assert.equal(n.inQuietHours("07:30", "22:30", "07:30"), false);
  assert.equal(n.inQuietHours("12:00", "13:00", "14:00"), false);
  assert.equal(n.inQuietHours("13:30", "13:00", "14:00"), true);
  assert.equal(n.inQuietHours("13:30", "13:00", "13:00"), false);
});

test("local time in a time zone", () => {
  const at = new Date("2026-11-30T19:05:00Z");
  assert.deepEqual(n.localNow("Europe/Paris", at), { date: MON, time: "20:05" });
  assert.deepEqual(n.localNow("America/New_York", at), { date: MON, time: "14:05" });
  assert.deepEqual(n.localNow("Asia/Tokyo", at), { date: TUE, time: "04:05" });
});

test("what is due, when", () => {
  const s = settings();
  assert.deepEqual(n.dueKinds(s, TUE, "19:59", []), [], "not yet");
  assert.deepEqual(n.dueKinds(s, TUE, "20:00", []), ["habits"]);
  assert.deepEqual(n.dueKinds(s, TUE, "21:40", []), ["streak", "habits", "mood"], "most useful first");
  assert.deepEqual(n.dueKinds(s, TUE, "21:40", ["habits"]), ["streak", "mood"], "never twice a day");
  assert.deepEqual(n.dueKinds(s, TUE, "22:10", ["habits", "mood"]), ["streak"]);
  assert.deepEqual(n.dueKinds(s, TUE, "08:30", []), ["sleep"]);
  assert.deepEqual(n.dueKinds(s, TUE, "11:00", []), [], "more than two hours late");
  assert.deepEqual(n.dueKinds(s, TUE, "09:00", []), ["sleep"], "the review waits for Monday");
  assert.deepEqual(n.dueKinds(s, MON, "09:00", []), ["sleep", "review"]);
  assert.deepEqual(n.dueKinds(settings({ enabled: false }), TUE, "20:00", []), []);
  assert.deepEqual(n.dueKinds(settings({ kinds: { habits: { on: false, time: "20:00" } } }), TUE, "20:00", []), []);
});

test("quiet hours and the daily cap", () => {
  const late = settings({ kinds: { habits: { on: true, time: "23:00" } } });
  assert.deepEqual(n.dueKinds(late, TUE, "23:00", []), [], "inside quiet hours");
  assert.deepEqual(n.dueKinds(settings({ ...late, quietOn: false, kinds: late.kinds }), TUE, "23:00", []), ["streak", "habits", "mood"], "streak and mood still within their two hours");
  const s = settings();
  assert.deepEqual(n.dueKinds(s, TUE, "21:40", ["sleep", "water"]), ["streak"], "one left of three");
  assert.deepEqual(n.dueKinds(s, TUE, "21:40", ["sleep", "water", "test"]), ["streak"], "a test does not count");
  assert.deepEqual(n.dueKinds(s, TUE, "21:40", ["sleep", "water", "review"]), [], "cap reached");
  assert.deepEqual(n.dueKinds(settings({ capOn: false }), TUE, "21:40", ["sleep", "water", "review"]), ["streak", "habits", "mood"]);
});

test("messages only when there is something to do", () => {
  const t = (path, vars = {}) => `${path}${Object.keys(vars).length ? " " + JSON.stringify(vars) : ""}`;
  const num = (x) => String(Math.round(x * 10) / 10);
  assert.equal(n.messageFor("habits", { pendingHabits: [] }, t, num), null);
  assert.equal(n.messageFor("habits", { pendingHabits: ["Lire"] }, t, num).body, 'notify.messages.habits.one {"name":"Lire"}');
  assert.equal(n.messageFor("habits", { pendingHabits: ["Lire", "Méditer", "Courir"] }, t, num).body, 'notify.messages.habits.many {"count":3,"names":"Lire, Méditer…"}');
  assert.equal(n.messageFor("habits", { pendingHabits: ["Lire"] }, t, num).url, "/habits");
  assert.equal(n.messageFor("streak", { streak: { name: "Lire", days: 2 } }, t, num), null);
  assert.ok(n.messageFor("streak", { streak: { name: "Lire", days: 12 } }, t, num).body.includes('"days":12'));
  assert.equal(n.messageFor("mood", { moodLogged: true }, t, num), null);
  assert.equal(n.messageFor("mood", { moodLogged: false }, t, num).url, "/humeur#checkin");
  assert.equal(n.messageFor("sleep", { sleepLogged: true }, t, num), null);
  assert.equal(n.messageFor("water", { water: { ml: 1200, goal: 2000 } }, t, num), null);
  assert.ok(n.messageFor("water", { water: { ml: 800, goal: 2000 } }, t, num).body.includes('"done":"0.8"'));
  assert.equal(n.messageFor("review", {}, t, num).url, "/bilan?story=1");
});
