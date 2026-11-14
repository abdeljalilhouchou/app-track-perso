/**
 * After a new deployment, a tab still running the previous build can ask for code
 * or a Server Action that no longer exists. Those failures are not bugs in the page:
 * a reload fetches the current build. These helpers recognise them and reload once.
 */
const STALE_PATTERNS = [
  /ChunkLoadError/i,
  /Loading (CSS )?chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Failed to find Server Action/i,
  /Server Action .* was not found/i,
];

export function isStaleClientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.name} ${error.message}`;
  return STALE_PATTERNS.some((pattern) => pattern.test(text));
}

const RELOAD_KEY = "track-perso:stale-reload-at";
// One automatic reload per window: if the error comes back right away, it is not
// a stale build, and reloading again would only loop.
const WINDOW_MS = 30000;

/** Reloads the page unless it already did so in the last 30 seconds. Returns whether it reloads. */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
