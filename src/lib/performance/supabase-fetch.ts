// Opt-in local diagnostics. Never log URLs, query strings, headers, or payloads.
export const traceSupabaseFetch: typeof fetch = async (input, init) => {
  const started = performance.now();
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const resource = url.pathname.startsWith("/rest/v1/")
    ? url.pathname.split("/")[3] : url.pathname.startsWith("/auth/v1/") ? "auth" : "other";
  try {
    const response = await fetch(input, init);
    console.info("[track-perso:supabase]", { resource, method: init?.method ?? "GET", status: response.status, durationMs: Math.round((performance.now() - started) * 10) / 10 });
    return response;
  } catch (error) {
    console.info("[track-perso:supabase]", { resource, failed: true, durationMs: Math.round((performance.now() - started) * 10) / 10 });
    throw error;
  }
};
