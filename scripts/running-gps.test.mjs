import test from "node:test";
import assert from "node:assert/strict";
import { sourceLoader } from "./test-source-loader.mjs";

const gps = sourceLoader()("src/lib/running/gps.ts");

// About 0.000009 degrees of latitude per metre.
const north = (metres) => 48.85 + metres / 111195;
const fix = (metres, seconds, accuracy = 5) => ({ lat: north(metres), lon: 2.35, accuracy, time: seconds * 1000 });

function run(steps) {
  let tracker = gps.emptyTracker();
  for (const [metres, seconds, accuracy] of steps) tracker = gps.addFix(tracker, fix(metres, seconds, accuracy), seconds).tracker;
  return tracker;
}

test("distance between two points", () => {
  assert.ok(Math.abs(gps.haversine({ lat: north(0), lon: 2.35 }, { lat: north(1000), lon: 2.35 }) - 1000) < 1);
});

test("imprecise fixes, jumps and standing still are ignored", () => {
  const tracker = run([[0, 0], [20, 5], [500, 6], [40, 10, 80], [21, 12], [60, 15]]);
  assert.equal(Math.round(tracker.distanceM), 60);
  assert.equal(tracker.points.length, 3);
});

test("kilometre splits are interpolated where each km is crossed", () => {
  const steps = [];
  for (let s = 0; s <= 700; s += 5) steps.push([s * (s <= 360 ? 1000 / 360 : 1) + (s > 360 ? 1000 - 360 : 0), s]);
  const tracker = run(steps);
  assert.equal(tracker.kmMarks.length, 1);
  assert.ok(Math.abs(tracker.kmMarks[0] - 360) <= 1);
  assert.deepEqual(gps.splitsOf([360, 700, 1050]), [360, 340, 350]);
});

test("current pace over the last seconds", () => {
  const points = [0, 5, 10, 15, 20].map((s) => [north(s * 3), 2.35, s]);
  assert.ok(Math.abs(gps.currentPace(points, 20) - 333) < 3);
  assert.equal(gps.currentPace(points.slice(0, 2), 5), null);
});

test("best effort over 1 km anywhere in the route", () => {
  // 3 km: first km in 360 s, second in 300 s, third in 330 s.
  const route = [];
  let t = 0;
  for (const [km, pace] of [[0, 360], [1, 300], [2, 330]]) for (let m = 0; m < 1000; m += 50) { route.push([north(km * 1000 + m), 2.35, Math.round(t)]); t += pace / 20; }
  route.push([north(3000), 2.35, Math.round(t)]);
  assert.equal(gps.bestEffort(route, 1000), 300);
  assert.equal(gps.bestEffort(route, 5000), null);
});

test("the route is thinned, rounded and trimmed at both ends", () => {
  const points = Array.from({ length: 101 }, (_, i) => [north(i * 2), 2.35123456, i]);
  const thin = gps.simplifyRoute(points, 8);
  assert.ok(thin.length < 30);
  assert.equal(thin[0][1], 2.35123);
  assert.equal(thin.at(-1)[2], 100);
  const long = Array.from({ length: 101 }, (_, i) => [north(i * 10), 2.35, i]);
  const trimmed = gps.privacyTrim(long, 200);
  assert.ok(gps.haversine({ lat: long[0][0], lon: 2.35 }, { lat: trimmed[0][0], lon: 2.35 }) >= 199);
  assert.deepEqual(gps.privacyTrim(long.slice(0, 40), 200), []);
});

test("route geometry fits the box", () => {
  const shape = gps.routeGeometry([[48.85, 2.35, 0], [48.86, 2.36, 10], [48.85, 2.37, 20]], 100, 60, 10);
  assert.match(shape.path, /^M[\d.]+ [\d.]+ L/);
  for (const [x, y] of [shape.start, shape.end]) { assert.ok(x >= 9.9 && x <= 90.1); assert.ok(y >= 9.9 && y <= 50.1); }
});

test("GPS data from the client is validated", () => {
  const good = { route: [[48.85, 2.35, 0], [48.86, 2.36, 10]], splits: [300], pauseSeconds: 12 };
  assert.deepEqual(gps.validateGpsRunData(good), good);
  assert.equal(gps.validateGpsRunData({ ...good, route: [[48.85, 2.35, 10], [48.86, 2.36, 5]] }), null);
  assert.equal(gps.validateGpsRunData({ ...good, route: [[95, 2.35, 0], [48.86, 2.36, 5]] }), null);
  assert.equal(gps.validateGpsRunData({ ...good, splits: [0] }), null);
  assert.equal(gps.validateGpsRunData({ ...good, pauseSeconds: -1 }), null);
  assert.equal(gps.validateGpsRunData(null), null);
});
