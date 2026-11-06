type RouteMeasurement = { target: string; route: string; started: number };
let pending: RouteMeasurement | null = null;

// Only fixed route labels may reach logs; discard IDs and all query parameters.
function routeLabel(pathname: string) {
  if (/^\/habits\/[^/]+$/.test(pathname)) return "/habits/[id]";
  return /^\/(dashboard|habits|nutrition|humeur|profil|sport(?:\/(musculation|calisthenics|running|calendar|stats))?)$/.test(pathname) ? pathname : "other";
}

export function startRouteMeasurement(url: string) {
  if (process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG !== "true") return;
  const target = new URL(url, window.location.href);
  pending = { target: `${target.pathname}${target.search}`, route: routeLabel(target.pathname), started: performance.now() };
  window.dispatchEvent(new Event("track-perso:navigation"));
}

export function currentRouteMeasurement() { return pending; }

export function finishRouteMeasurement(measurement: RouteMeasurement) {
  if (pending !== measurement) return;
  const duration = performance.now() - measurement.started;
  performance.measure(`track-perso:route-content:${measurement.route}`, { start: measurement.started, duration });
  console.info("[track-perso:navigation]", { route: measurement.route, durationMs: Math.round(duration * 10) / 10 });
  pending = null;
}
