import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { parseMoodNote, composeMoodNote, tagEffects, comparePeriods } = load("src/lib/mood-tags.ts");

test("a note splits into its text and known tags", () => {
  assert.deepEqual(parseMoodNote("Bonne journée #work #sleep"), { text: "Bonne journée", tags: ["sleep", "work"] });
  assert.deepEqual(parseMoodNote("#stress"), { text: "", tags: ["stress"] });
  assert.deepEqual(parseMoodNote(null), { text: "", tags: [] });
});

test("unknown hashtags and hashtags inside words stay in the text", () => {
  assert.deepEqual(parseMoodNote("vu #marie au parc#sport"), { text: "vu #marie au parc#sport", tags: [] });
});

test("composing and parsing round-trip, empty notes become null", () => {
  const note = composeMoodNote("  Long trajet ", ["work", "stress", "nope"]);
  assert.equal(note, "Long trajet #work #stress");
  assert.deepEqual(parseMoodNote(note), { text: "Long trajet", tags: ["work", "stress"] });
  assert.equal(composeMoodNote("", []), null);
  assert.equal(composeMoodNote("", ["sleep"]), "#sleep");
});

const day = (entry_date, mood_score, notes = null, energy_level = 3) => ({ entry_date, mood_score, energy_level, notes });

test("tag effects compare each tag with the overall average", () => {
  const entries = [
    day("2026-11-01", 5, "#sport"), day("2026-11-02", 5, "#sport"), day("2026-11-03", 4, "#sport"),
    day("2026-11-04", 2, "#stress"), day("2026-11-05", 2, "#stress"),
    day("2026-11-06", 3), day("2026-11-07", 3),
  ];
  const effects = tagEffects(entries);
  assert.deepEqual(effects.map((effect) => effect.tag), ["sport"], "stress has only two days");
  assert.equal(effects[0].average, 4.7);
  assert.equal(effects[0].diff, 1.2); // 4.67 against 3.43 over the 7 days
  assert.deepEqual(tagEffects(entries, 2).map((effect) => effect.tag), ["stress", "sport"], "strongest effect first");
  assert.equal(tagEffects(entries, 2).find((effect) => effect.tag === "stress").diff, -1.4);
});

test("periods compare the last N days with the N days before", () => {
  const entries = [day("2026-11-18", 4, null, 4), day("2026-11-12", 2, null, 2), day("2026-11-11", 3), day("2026-11-04", 5)];
  const { current, previous } = comparePeriods(entries, "2026-11-18", 7);
  assert.deepEqual(current, { mood: 3, energy: 3, days: 2 });
  assert.deepEqual(previous, { mood: 3, energy: 3, days: 1 });
});
