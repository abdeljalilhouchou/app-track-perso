import test from "node:test";
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import path from "node:path";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { sportCalendarRange } = load("src/lib/sport-calendar.ts");
const { fetchAllRows } = load("src/lib/paging.ts");

test("calendar keeps old months accessible, handles leap years, excludes future days", () => {
  const now = new Date(2026, 10, 6, 12);
  assert.deepEqual(sportCalendarRange("2024-02", now), { today: "2026-11-06", currentMonthKey: "2026-11", selectedMonthKey: "2024-02", from: "2024-02-01", to: "2024-02-29" });
  for (const invalid of [undefined, "2027-01", "2026-13", "0000-01", "garbage", []]) {
    const range = sportCalendarRange(invalid, now);
    assert.equal(range.from, "2026-11-01");
    assert.equal(range.to, "2026-11-06");
  }
  assert.equal(sportCalendarRange(["2025-01", "2026-11"], now).selectedMonthKey, "2025-01");
});

test("pagination preserves every row beyond PostgREST's 1000-row limit", async () => {
  const rows = Array.from({ length: 2507 }, (_, id) => ({ id }));
  const requested = [];
  const result = await fetchAllRows(async (from, to) => {
    requested.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  });
  assert.deepEqual(result, rows);
  assert.deepEqual(requested, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("pagination fails explicitly on errors and the safety limit instead of truncating", async () => {
  await assert.rejects(fetchAllRows(async () => ({ data: null, error: { message: "offline" } })), /offline/);
  await assert.rejects(fetchAllRows(async () => ({ data: [1, 2], error: null }), 2, 1), /limite/);
});

test("calendar query is owner-scoped, month-bounded, paginated, and read-only", async () => {
  const calls = [];
  const rows = [{ id: "one" }];
  const query = {};
  for (const method of ["select", "eq", "gte", "lte", "order"]) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.range = async (from, to) => { calls.push(["range", from, to]); return { data: rows, error: null }; };
  const read = sourceLoader({
    "@/lib/supabase/server": { createClient: async () => ({ from: (table) => { assert.equal(table, "workouts"); return query; } }) },
    "@/lib/supabase/read-context": { getCurrentUser: async () => ({ id: "owner" }), getProfilePreferences: async () => ({ data: { language: "ar" }, error: null }) },
  })("src/lib/sport-calendar-data.ts");
  const result = await read.loadSportCalendarData(sportCalendarRange("2024-02", new Date(2026, 10, 6)));
  assert.deepEqual(result, { workouts: rows, language: "ar" });
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["eq", "user_id", "owner"])));
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["gte", "workout_date", "2024-02-01"])));
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["lte", "workout_date", "2024-02-29"])));
});

test("unauthenticated calendar never reads database tables", async () => {
  const read = sourceLoader({
    "@/lib/supabase/server": { createClient: () => assert.fail("No database access expected") },
    "@/lib/supabase/read-context": { getCurrentUser: async () => null },
  })("src/lib/sport-calendar-data.ts");
  assert.equal(await read.loadSportCalendarData(sportCalendarRange(undefined)), null);
});

test("real React server cache deduplicates reads and isolates concurrent request scopes", async () => {
  const require = createRequire(import.meta.url);
  const react = require(path.resolve("node_modules/react/cjs/react.react-server.development.js"));
  // Test adapter only: React's renderer normally supplies this per-request cache
  // dispatcher. Use the installed React cache implementation with independent ALS
  // stores, never a fake cache or a live Supabase session.
  const internal = react.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous = internal.A;
  const requests = new AsyncLocalStorage();
  internal.A = { getCacheForType(factory) {
    const store = requests.getStore();
    if (!store.cache.has(factory)) store.cache.set(factory, factory());
    return store.cache.get(factory);
  } };
  const context = sourceLoader({
    react,
    "./server": { createClient: async () => {
      const request = requests.getStore();
      return { auth: { getUser: async () => { request.auth++; return { data: { user: { id: request.id } } }; } }, from: () => ({ select: () => ({ eq: (_, id) => ({ maybeSingle: async () => { request.profile++; return { data: { display_name: id }, error: null }; } }) }) }) };
    } },
  })("src/lib/supabase/read-context.ts");
  try {
    await Promise.all(["alice", "bob"].map((id) => requests.run({ id, cache: new Map(), auth: 0, profile: 0 }, async () => {
      const [user, profile, sameProfile, sameUser] = await Promise.all([context.getCurrentUser(), context.getProfilePreferences(), context.getProfilePreferences(), context.getCurrentUser()]);
      assert.equal(user.id, id);
      assert.equal(sameUser, user);
      assert.equal(profile.data.display_name, id);
      assert.equal(profile, sameProfile);
      assert.equal(requests.getStore().auth, 1);
      assert.equal(requests.getStore().profile, 1);
    })));
  } finally { internal.A = previous; }
});

test("disabled Calisthenics loader does not create a database client", async () => {
  const read = sourceLoader({
    "@/lib/calisthenics/config": { isCalisthenicsSchemaReady: () => false },
    "@/lib/supabase/server": { createClient: () => assert.fail("Disabled schema must not be queried") },
    "@/lib/supabase/read-context": {},
  })("src/lib/calisthenics/data.ts");
  assert.equal(await read.loadCalisthenicsData(), null);
});

test("Supabase diagnostic preserves responses and redacts credentials and query parameters", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const logs = [];
  const response = new Response("private payload", { status: 200 });
  globalThis.fetch = async () => response;
  console.info = (...args) => logs.push(args);
  try {
    const { traceSupabaseFetch } = load("src/lib/performance/supabase-fetch.ts");
    const result = await traceSupabaseFetch("https://example.invalid/rest/v1/workouts?user_id=eq.secret-owner", { headers: { Authorization: "Bearer secret-token" } });
    assert.equal(result, response);
    assert.equal(await result.text(), "private payload");
    assert.equal(logs[0][1].resource, "workouts");
    assert.ok(!JSON.stringify(logs).includes("secret"));
    assert.ok(!JSON.stringify(logs).includes("private"));
    assert.ok(!JSON.stringify(logs).includes("example.invalid"));
  } finally { globalThis.fetch = originalFetch; console.info = originalInfo; }
});

test("navigation instrumentation stays inert when disabled", () => {
  const previous = process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG;
  process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG = "false";
  try {
    const navigation = sourceLoader()("src/lib/performance/navigation.ts");
    assert.doesNotThrow(() => navigation.startRouteMeasurement("/sport?private=value"));
    assert.equal(navigation.currentRouteMeasurement(), null);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG;
    else process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG = previous;
  }
});
