/**
 * GPS run tracking, kept pure so it can be tested: filtering raw fixes, distance,
 * kilometre splits, the best effort over a distance, and drawing the route.
 *
 * A stored route is a list of [latitude, longitude, t] where t is the moving time in
 * seconds at that point (pauses excluded), so best efforts can be found later.
 */

export type GpsFix = { lat: number; lon: number; accuracy: number; time: number };
export type RoutePoint = [number, number, number];
export type GpsRunData = { route: RoutePoint[]; splits: number[]; pauseSeconds: number };

/** Fixes less precise than this are ignored. */
export const MAX_ACCURACY_M = 35;
/** The accuracy at which the start screen says "ready". */
export const READY_ACCURACY_M = 25;
/** Faster than this between two fixes (about 1:51 per km) is a GPS jump, not running. */
const MAX_SPEED_MS = 9;
const EARTH_RADIUS_M = 6371008.8;
const MAX_ROUTE_POINTS = 6000;
const MAX_SPLITS = 1000;

const toRad = (degrees: number) => (degrees * Math.PI) / 180;

/** Distance in metres between two positions. */
export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Tracker = {
  /** Every accepted position, with the moving time at that point. */
  points: RoutePoint[];
  distanceM: number;
  /** Moving time (s) at which each kilometre was reached. */
  kmMarks: number[];
  last: { lat: number; lon: number; time: number; moving: number } | null;
};

export const emptyTracker = (): Tracker => ({ points: [], distanceM: 0, kmMarks: [], last: null });

/**
 * Adds one fix taken at `moving` seconds of moving time. Returns the tracker and how
 * many metres were added (0 when the fix was ignored or too close to count).
 */
export function addFix(tracker: Tracker, fix: GpsFix, moving: number): { tracker: Tracker; added: number } {
  if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lon) || !(fix.accuracy <= MAX_ACCURACY_M)) return { tracker, added: 0 };
  const point: RoutePoint = [fix.lat, fix.lon, moving];
  if (!tracker.last) return { tracker: { ...tracker, points: [point], last: { lat: fix.lat, lon: fix.lon, time: fix.time, moving } }, added: 0 };
  const seconds = (fix.time - tracker.last.time) / 1000;
  if (seconds <= 0) return { tracker, added: 0 };
  const metres = haversine(tracker.last, fix);
  if (metres / seconds > MAX_SPEED_MS) return { tracker, added: 0 };
  // Standing still, the position drifts by a few metres: only a real move counts.
  if (metres < Math.min(10, Math.max(3, fix.accuracy / 3))) return { tracker, added: 0 };

  const before = tracker.distanceM;
  const distanceM = before + metres;
  const kmMarks = [...tracker.kmMarks];
  const previousMoving = tracker.last.moving;
  while (distanceM >= (kmMarks.length + 1) * 1000) {
    const share = ((kmMarks.length + 1) * 1000 - before) / metres;
    kmMarks.push(previousMoving + (moving - previousMoving) * share);
  }
  return {
    tracker: { points: [...tracker.points, point], distanceM, kmMarks, last: { lat: fix.lat, lon: fix.lon, time: fix.time, moving } },
    added: metres,
  };
}

/** Seconds spent on each completed kilometre. */
export function splitsOf(kmMarks: number[]) {
  return kmMarks.map((mark, index) => Math.max(1, Math.round(mark - (kmMarks[index - 1] ?? 0))));
}

/** Pace (s/km) over the last `window` seconds of moving time, or null when too little ground was covered. */
export function currentPace(points: RoutePoint[], moving: number, window = 20) {
  if (points.length < 2) return null;
  let metres = 0, index = points.length - 1;
  while (index > 0 && moving - points[index - 1][2] <= window) {
    metres += haversine({ lat: points[index - 1][0], lon: points[index - 1][1] }, { lat: points[index][0], lon: points[index][1] });
    index -= 1;
  }
  const seconds = points[points.length - 1][2] - points[index][2];
  return metres >= 30 && seconds > 0 ? (seconds / metres) * 1000 : null;
}

function cumulative(route: RoutePoint[]) {
  const totals = [0];
  for (let i = 1; i < route.length; i++) totals.push(totals[i - 1] + haversine({ lat: route[i - 1][0], lon: route[i - 1][1] }, { lat: route[i][0], lon: route[i][1] }));
  return totals;
}

/** Fastest time (s) over `metres` anywhere in the route, or null when the route is shorter. */
export function bestEffort(route: RoutePoint[], metres: number) {
  if (route.length < 2) return null;
  const totals = cumulative(route);
  let best: number | null = null;
  let end = 1;
  for (let start = 0; start < route.length - 1; start++) {
    const target = totals[start] + metres;
    if (end <= start) end = start + 1;
    while (end < route.length && totals[end] < target) end += 1;
    if (end >= route.length) break;
    const span = totals[end] - totals[end - 1];
    const share = span > 0 ? (target - totals[end - 1]) / span : 1;
    const time = route[end - 1][2] + (route[end][2] - route[end - 1][2]) * share - route[start][2];
    if (time > 0 && (best === null || time < best)) best = time;
  }
  return best === null ? null : Math.round(best);
}

/** Thins the route for storage: a point every `minMetres`, rounded to about a metre. */
export function simplifyRoute(points: RoutePoint[], minMetres = 8): RoutePoint[] {
  const kept: RoutePoint[] = [];
  for (const [index, point] of points.entries()) {
    const previous = kept.at(-1);
    const isLast = index === points.length - 1;
    if (!previous || isLast || haversine({ lat: previous[0], lon: previous[1] }, { lat: point[0], lon: point[1] }) >= minMetres) {
      kept.push([Math.round(point[0] * 1e5) / 1e5, Math.round(point[1] * 1e5) / 1e5, Math.round(point[2])]);
    }
  }
  if (kept.length <= MAX_ROUTE_POINTS) return kept;
  const step = kept.length / MAX_ROUTE_POINTS;
  return Array.from({ length: MAX_ROUTE_POINTS }, (_, i) => kept[Math.min(kept.length - 1, Math.round(i * step))]);
}

/** The route without its first and last `metres`, so it does not show where you live. Empty when too short. */
export function privacyTrim(route: RoutePoint[], metres = 200) {
  if (route.length < 2) return [];
  const totals = cumulative(route);
  const total = totals[totals.length - 1];
  if (total <= metres * 2.5) return [];
  return route.filter((_, index) => totals[index] >= metres && totals[index] <= total - metres);
}

/** An SVG path for the route, fitted into a `width` × `height` box with `padding`. */
export function routeGeometry(route: RoutePoint[], width: number, height: number, padding = 12) {
  if (route.length < 2) return null;
  const meanLat = toRad(route.reduce((sum, point) => sum + point[0], 0) / route.length);
  const xy = route.map(([lat, lon]) => [lon * Math.cos(meanLat), -lat] as const);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1e-9, spanY = Math.max(...ys) - minY || 1e-9;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offsetX = (width - spanX * scale) / 2, offsetY = (height - spanY * scale) / 2;
  const screen = xy.map(([x, y]) => [Math.round((offsetX + (x - minX) * scale) * 10) / 10, Math.round((offsetY + (y - minY) * scale) * 10) / 10] as const);
  return { path: screen.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" "), start: screen[0], end: screen[screen.length - 1] };
}

/** Validates GPS data sent to the server; null when it is missing or malformed. */
export function validateGpsRunData(input: unknown): GpsRunData | null {
  if (!input || typeof input !== "object") return null;
  const { route, splits, pauseSeconds } = input as Record<string, unknown>;
  if (!Array.isArray(route) || route.length < 2 || route.length > MAX_ROUTE_POINTS) return null;
  if (!Array.isArray(splits) || splits.length > MAX_SPLITS) return null;
  if (!Number.isInteger(pauseSeconds) || (pauseSeconds as number) < 0 || (pauseSeconds as number) > 604800) return null;
  let previous = -1;
  for (const point of route) {
    if (!Array.isArray(point) || point.length !== 3 || !point.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
    const [lat, lon, t] = point as number[];
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || t < previous || t > 604800) return null;
    previous = t;
  }
  if (!splits.every((value) => Number.isInteger(value) && value >= 1 && value <= 86400)) return null;
  return { route: route as RoutePoint[], splits: splits as number[], pauseSeconds: pauseSeconds as number };
}
