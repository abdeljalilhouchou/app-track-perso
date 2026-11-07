import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile, mkdtemp } from "node:fs/promises";
import path from "node:path";

// Offline application QA: all auth/data use this local fixture server. Never
// reads .env files or connects to Supabase. Requires local Microsoft Edge.
const require = createRequire(import.meta.url);
const exerciseMedia = process.argv.includes("--exercise-media");
const anatomyV3Only = process.argv.includes("--anatomy-v3-only");
const anatomyOnly = process.argv.includes("--anatomy-only") || anatomyV3Only;
const anatomy = process.argv.includes("--anatomy") || anatomyOnly;
const hub = process.argv.includes("--hub") || anatomy || exerciseMedia;
const exerciseLibrary = process.argv.includes("--exercise-library") || anatomy || exerciseMedia;
const edge = process.env.QA_EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const uid = "11111111-1111-4111-8111-111111111111";
const today = new Date().toLocaleDateString("sv-SE");
const user = { id: uid, aud: "authenticated", role: "authenticated", email: "qa@example.invalid", created_at: "2026-01-01T12:00:00Z", app_metadata: {}, user_metadata: {} };
const profile = { id: uid, display_name: "QA local", language: "fr", theme: "light", avatar_url: null, sport_weekly_goal: 3, water_goal_ml: 2000, caffeine_limit_mg: 400, sugar_limit_g: 50, goal_protein: 100, created_at: user.created_at };
const workouts = [{ id: "22222222-2222-4222-8222-222222222222", user_id: uid, workout_date: today, activity: "QA Dos & Biceps", duration_minutes: 28, intensity: 3, notes: null, muscle_groups: ["Dos"], template_id: null, discipline: "strength", created_at: `${today}T12:00:00Z` }];
const sets = [{ id: "33333333-3333-4333-8333-333333333333", user_id: uid, workout_id: workouts[0].id, exercise_name: "Rowing haltère", muscle_group: "Dos", exercise_position: 0, set_number: 1, reps: 12, weight_kg: 25, created_at: workouts[0].created_at }];
const requests = [];
const templates = hub ? [{ id: "44444444-4444-4444-8444-444444444444", user_id: uid, name: "QA Programme", muscle_groups: ["Dos"], position: 0, created_at: user.created_at }] : [];
const tables = { profiles: [profile], workouts, workout_sets: sets, workout_templates: templates, workout_template_exercises: [], exercises: [] };
if (exerciseLibrary) {
  sets[0].exercise_name = "Rowing haltère unilatéral";
  tables.exercises.push({ id: "55555555-5555-4555-8555-555555555555", user_id: uid, name: sets[0].exercise_name, muscle_group: "Dos" });
  if (templates.length) tables.workout_template_exercises.push({ id: "66666666-6666-4666-8666-666666666666", template_id: templates[0].id, user_id: uid, exercise_name: sets[0].exercise_name, muscle_group: "Dos", position: 0, target_sets: 3, target_reps: 12 });
}
if (exerciseMedia) for (let index = 0; index < 10; index++) tables.exercises.push({ id: `77777777-7777-4777-8777-${String(index).padStart(12, "0")}`, user_id: uid, name: `QA personal ${index + 1}`, muscle_group: "Biceps" });
let fixtureState = "normal";
const mock = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "*");
  if (request.method === "OPTIONS") { response.end(); return; }
  requests.push({ method: request.method, resource: url.pathname, params: Object.fromEntries(url.searchParams) });
  if (url.pathname === "/auth/v1/user") { response.end(JSON.stringify(user)); return; }
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405); response.end("{}"); return; }
  const table = url.pathname.split("/")[3];
  if (fixtureState === "failure" && table === "workouts") { response.writeHead(503); response.end(JSON.stringify({ message: "QA_LOCAL_READ_FAILURE" })); return; }
  let rows = tables[table] || [];
  if (fixtureState === "empty" && table !== "profiles") rows = [];
  if (fixtureState === "no-sets" && table === "workout_sets") rows = [];
  for (const [key, filter] of url.searchParams) {
    if (filter.startsWith("eq.")) rows = rows.filter((row) => String(row[key]) === filter.slice(3));
    if (filter.startsWith("gte.")) rows = rows.filter((row) => row[key] >= filter.slice(4));
    if (filter.startsWith("lte.")) rows = rows.filter((row) => row[key] <= filter.slice(4));
    if (filter.startsWith("in.(")) { const values = filter.slice(4, -1).split(","); rows = rows.filter((row) => values.includes(String(row[key]))); }
  }
  response.setHeader("Content-Range", `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
  response.end(JSON.stringify(request.headers.accept?.includes("application/vnd.pgrst.object+json") ? rows[0] ?? null : rows));
});
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const reservePort = async () => { const server = http.createServer(); const port = await listen(server); await new Promise((resolve) => server.close(resolve)); return port; };
const mockPort = await listen(mock);
const appPort = await reservePort();
const debugPort = await reservePort();
const output = path.resolve(".next/qa");
const designSystem = process.argv.includes("--design-system");
await mkdir(output, { recursive: true });
const browserProfile = await mkdtemp(path.join(output, "edge-"));
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-fixture-key", CALISTHENICS_SCHEMA_READY: "false", RUNNING_SCHEMA_READY: "false", NEXT_PUBLIC_PERFORMANCE_DEBUG: "true", PERFORMANCE_DEBUG: "true" };
if (designSystem) env.SPORT_UI_PREVIEW = "true";
let appLog = "";
const log = (data) => { appLog = (appLog + data).slice(-150000); };
const production = process.argv.includes("--production");
if (production) {
  // next dev generates .next/dev/types included by this repo's tsconfig. Do not
  // reuse a development output while building a fixture production bundle.
  const { rm } = await import("node:fs/promises");
  for (const file of ["routes.d.ts", "validator.ts"]) await rm(path.resolve(".next/dev/types", file), { force: true });
  console.log("Building a local fixture-only production bundle; rebuild normally after QA.");
  const build = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build"], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  build.stdout.on("data", log); build.stderr.on("data", log);
  const code = await new Promise((resolve) => build.on("exit", resolve));
  if (code !== 0) { console.error(appLog); mock.close(); process.exit(1); }
}
const app = spawn(process.execPath, [require.resolve("next/dist/bin/next"), production ? "start" : "dev", "--hostname", "127.0.0.1", "--port", String(appPort)], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
app.stdout.on("data", log); app.stderr.on("data", log);
const browser = spawn(edge, ["--headless=new", "--disable-gpu", ...(anatomy || exerciseMedia ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : []), "--disable-extensions", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${browserProfile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
let socket;
let inspectPage;
let capturePage;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, label, timeout = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeout) { try { const value = await check(); if (value) return value; } catch { /* server/DOM not ready */ } await pause(150); }
  throw new Error(`Timed out: ${label}`);
}
const results = { mode: `Edge headless + next ${production ? "start" : "dev"} + local auth/REST fixtures; not real-device or deployed-environment measurements`, viewports: [], navigation: [], consoleErrors: [], writes: [] };
const networkRequests = [];
try {
  await until(async () => (await fetch(`http://127.0.0.1:${appPort}/login`)).ok, "Next dev ready");
  const tabs = await until(async () => (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(), "Edge CDP ready");
  const target = tabs.find((tab) => tab.type === "page" && tab.url === "about:blank") ?? tabs.find((tab) => tab.type === "page" && !tab.url.startsWith("chrome-extension:"));
  assert.ok(target, "No application page target in Edge");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const task = pending.get(message.id); pending.delete(message.id);
      if (!task) return;
      if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
    } else if (message.method === "Network.requestWillBeSent") networkRequests.push(message.params.request.url);
    else if (message.method === "Runtime.exceptionThrown") results.consoleErrors.push(message.params.exceptionDetails.text);
    else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") results.consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["https://*"] });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  inspectPage = () => evaluate("({url:location.href, heading:document.querySelector('main h1')?.textContent, loading:!!document.querySelector('[data-route-loading]'), anatomy:document.querySelector('.anatomy-stage:has(canvas)')?{...document.querySelector('.anatomy-stage:has(canvas)').dataset}:null, text:document.body.innerText.slice(0,2500)})");
  capturePage = () => send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then(({ data }) => writeFile(path.join(output, "failure.png"), Buffer.from(data, "base64")));
  const tokenPart = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = `${tokenPart({ alg: "HS256", typ: "JWT" })}.${tokenPart({ sub: uid, exp: expires, aud: "authenticated", role: "authenticated" })}.fixture`;
  const session = { access_token: accessToken, refresh_token: "fixture", expires_at: expires, expires_in: 3600, token_type: "bearer", user };
  await send("Network.setCookie", { name: "sb-127-auth-token", value: `base64-${tokenPart(session)}`, url: `http://127.0.0.1:${appPort}`, path: "/", httpOnly: false, secure: false });
  const ready = (route) => until(() => evaluate(`location.pathname === ${JSON.stringify(route)} && !!document.querySelector('main h1') && !document.querySelector('[data-route-loading]')`), route, 45000);
  const navigatePage = async (url) => {
    const previousDocument = await evaluate("performance.timeOrigin");
    await send("Page.navigate", { url });
    await until(() => evaluate(`performance.timeOrigin !== ${previousDocument} && document.readyState === 'complete'`), "new page loaded", 45000);
  };
  const navigateLink = async (href) => evaluate(`(() => {
    const href = ${JSON.stringify(href)};
    const matches = Array.from(document.querySelectorAll('a')).filter(link => link.getAttribute('href') === href);
    let target = matches.find(link => link.getClientRects().length);
    if (!target && matches.length) { matches[0].closest('details')?.querySelector('summary')?.click(); target = matches.find(link => link.getClientRects().length); }
    if (!target) throw new Error('No visible destination: ' + href);
    target.click();
  })()`);
  await navigatePage(`http://127.0.0.1:${appPort}/sport`);
  await ready("/sport");
  console.log("Sport Hub loaded with local fixtures.");
  if (!anatomyOnly && !exerciseMedia) {
  assert.ok(await evaluate("document.body.innerText.includes('QA Dos & Biceps')"));
  for (const width of [320, 360, 375, 390, 430, 768, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await pause(250);
    const dimensions = await evaluate("({ viewport: innerWidth, content: document.documentElement.scrollWidth })");
    assert.ok(dimensions.content <= dimensions.viewport + 1, `Overflow at ${width}px: ${JSON.stringify(dimensions)}`);
    results.viewports.push({ width, ...dimensions });
  }
  console.log("Seven viewport widths passed.");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const route of ["/sport/musculation", "/sport/calendar", "/sport/stats", "/sport/calisthenics", "/sport/running", "/sport"]) {
    await navigateLink(route);
    await ready(route);
    results.navigation.push(route);
    console.log(`Navigation passed: ${route}`);
    if (route === "/sport/musculation") {
      await until(() => evaluate("(() => { const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Séance libre')); if (!button) return false; const key = Object.keys(button).find(key => key.startsWith('__reactProps$')); return !!key && typeof button[key].onClick === 'function'; })()"), "workout controls hydrated", 30000);
      await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Séance libre')).click()");
      await until(() => evaluate("!!document.querySelector('input[aria-label=\"Nom de la séance\"]')"), "workout input", 15000);
      await evaluate("(() => { const input = document.querySelector('input[aria-label=\"Nom de la séance\"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'QA draft'); input.dispatchEvent(new Event('input', {bubbles:true})); window.qaDraftInput = input; })()");
      await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1') || '{}').name === 'QA draft'"), "draft persisted");
      await evaluate("document.getElementById('sport-tab-program').click()");
      await evaluate("document.getElementById('sport-tab-session').click()");
      assert.ok(await evaluate("document.getElementById('sport-panel-session').hidden === false && document.getElementById('sport-panel-program').hidden === true"));
      await evaluate("document.getElementById('sport-tab-progress').click()");
      await evaluate("document.getElementById('sport-tab-session').click()");
      assert.ok(await evaluate("window.qaDraftInput === document.querySelector('input[aria-label=\"Nom de la séance\"]') && window.qaDraftInput.value === 'QA draft'"));
      results.draftPreservedAcrossTabs = true;
      if (hub) {
        await evaluate("(() => { const summary = document.querySelector('.sport-context-picker summary'); summary.click(); summary.focus(); })()");
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        assert.ok(await evaluate("!document.querySelector('.sport-context-picker').open && document.activeElement === document.querySelector('.sport-context-picker summary')"));
        await navigateLink("/sport/musculation?tab=program");
        await until(() => evaluate("document.getElementById('sport-tab-program').getAttribute('aria-selected') === 'true'"), "program query shortcut", 30000);
        await navigateLink("/sport/musculation?tab=history");
        await until(() => evaluate("document.getElementById('sport-tab-history').getAttribute('aria-selected') === 'true'"), "history query shortcut", 30000);
        await evaluate("document.getElementById('sport-tab-session').click()");
        assert.ok(await evaluate("window.qaDraftInput === document.querySelector('input[aria-label=\"Nom de la séance\"]') && window.qaDraftInput.value === 'QA draft'"));
        results.queryNavigationPreservesDraft = true;
        results.contextMenuEscape = true;
      }
    }
    if (route === "/sport/stats") {
      await evaluate("document.querySelector('[role=status]')?.scrollIntoView({block:'center'})");
      await until(() => evaluate("!!document.querySelector('.recharts-wrapper svg')"), "deferred stats chart");
      results.deferredChartRendered = true;
    }
    const dimensions = await evaluate("({ viewport: innerWidth, content: document.documentElement.scrollWidth })");
    assert.ok(dimensions.content <= dimensions.viewport + 1, `Overflow on ${route}`);
  }
  for (const [language, theme] of [["fr", "light"], ["en", "dark"], ["ar", "system"]]) {
    profile.language = language; profile.theme = theme;
    await navigatePage(`http://127.0.0.1:${appPort}/sport`);
    await ready("/sport");
    await until(() => evaluate(`document.documentElement.lang === '${language}'`), `${language} hydration`);
    assert.equal(await evaluate("document.documentElement.dir"), language === "ar" ? "rtl" : "ltr");
    await until(() => evaluate(`document.documentElement.getAttribute('data-theme') === ${JSON.stringify(theme === "system" ? null : theme)}`), `${theme} hydration`);
    results.navigation.push(`${language}/${theme}`);
  }
  if (hub) {
    results.hubCases = [];
    for (const language of ["fr", "en", "ar"]) {
      for (const theme of ["light", "dark"]) {
        profile.language = language; profile.theme = theme;
        await navigatePage(`http://127.0.0.1:${appPort}/sport`); await ready("/sport");
        await until(() => evaluate(`document.documentElement.lang === '${language}' && document.documentElement.getAttribute('data-theme') === '${theme}'`), "hub locale/theme");
        assert.ok(await evaluate("!document.querySelector('[data-sport-context-navigation]')"));
        assert.ok(await evaluate("!document.body.innerText.includes('sport.hubDashboard.')"));
        assert.ok(await evaluate("document.querySelector('.sport-hub-quick-stats .sport-stat-value').textContent.includes(new Intl.NumberFormat(document.documentElement.lang).format(300))"));
        assert.equal(await evaluate("document.querySelectorAll('.sport-hub-disciplines > a').length"), 3);
        assert.ok(await evaluate("document.getElementById('sport-next-session').textContent.includes('QA Programme')"));
        for (const width of [320, 360, 375, 390, 430, 768, 1440]) {
          await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); await pause(100);
          const dimensions = await evaluate("({ viewport: innerWidth, content: document.documentElement.scrollWidth })");
          assert.ok(dimensions.content <= dimensions.viewport + 1, `Hub overflow ${language}/${theme}/${width}`);
          results.hubCases.push({ language, theme, width, ...dimensions });
        }
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await evaluate("scrollTo(0,0)"); await pause(300);
        await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(({ data }) => writeFile(path.join(output, `hub-${language}-${theme}.png`), Buffer.from(data, "base64")));
      }
    }
    profile.theme = "system";
    results.systemThemes = [];
    for (const scheme of ["light", "dark"]) {
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
      await navigatePage(`http://127.0.0.1:${appPort}/sport`); await ready("/sport");
      await until(() => evaluate("!document.documentElement.hasAttribute('data-theme')"), "system theme");
      results.systemThemes.push({ scheme, background: await evaluate("getComputedStyle(document.body).backgroundColor") });
    }
    assert.notEqual(results.systemThemes[0].background, results.systemThemes[1].background);
    profile.language = "fr"; profile.theme = "light";
    fixtureState = "no-sets";
    await navigatePage(`http://127.0.0.1:${appPort}/sport`); await ready("/sport");
    assert.equal(await evaluate("document.querySelector('.sport-hub-quick-stats .sport-stat-value').textContent.trim()"), "—");
    fixtureState = "empty";
    await navigatePage(`http://127.0.0.1:${appPort}/sport`); await ready("/sport");
    assert.ok(await evaluate("!document.body.innerText.includes('QA Dos & Biceps') && !document.body.innerText.includes('QA Programme')"));
    assert.ok(await evaluate("!!document.querySelector('#sport-next-session .sport-empty-state')"));
    assert.equal(await evaluate("document.querySelector('.sport-hub-week-stats .sport-stat-value').textContent.trim()"), "0");
    await pause(200);
    await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(({ data }) => writeFile(path.join(output, "hub-empty.png"), Buffer.from(data, "base64")));
    results.hubEmptyState = true; results.hubUnknownVolume = true;
    fixtureState = "normal";
    await navigatePage(`http://127.0.0.1:${appPort}/sport`); await ready("/sport");
    await navigateLink("/sport/musculation?tab=program"); await ready("/sport/musculation");
    await until(() => evaluate("document.getElementById('sport-tab-program').getAttribute('aria-selected') === 'true'"), "hub programs shortcut");
    await navigateLink("/sport"); await ready("/sport");
    await navigateLink("/sport/calendar#sport-calendar-activities"); await ready("/sport/calendar");
    assert.ok(await evaluate("location.hash === '#sport-calendar-activities' && !!document.getElementById('sport-calendar-activities')"));
    await navigatePage(`http://127.0.0.1:${appPort}/sport?date=${today}`); await ready("/sport/musculation");
    await until(() => evaluate("document.getElementById('sport-tab-history').getAttribute('aria-selected') === 'true'"), "legacy sport date redirect");
    results.legacyDateRedirect = true;
    const beforeFailureErrors = results.consoleErrors.length;
    fixtureState = "failure";
    await navigatePage(`http://127.0.0.1:${appPort}/sport`);
    await until(() => evaluate("!!document.querySelector('.sport-error-state button')"), "read error state", 30000);
    await until(() => evaluate("(() => { const button=document.querySelector('.sport-error-state button'); const key=Object.keys(button).find(key=>key.startsWith('__reactProps$')); return !!key && typeof button[key].onClick === 'function'; })()"), "retry control hydrated", 30000);
    fixtureState = "normal";
    await evaluate("document.querySelector('.sport-error-state button').click()");
    await ready("/sport");
    assert.ok(await evaluate("document.body.innerText.includes('QA Dos & Biceps') && !document.querySelector('.sport-error-state')"));
    results.intentionalReadFailure = { recovered: true, reportedErrors: results.consoleErrors.splice(beforeFailureErrors) };
    console.log("Sport Hub: 42 locale/theme/width combinations, System, empty states, shortcuts, legacy redirect and read-error retry passed.");
  }
  if (designSystem) {
    results.designSystem = [];
    for (const language of ["fr", "en", "ar"]) {
      for (const theme of ["light", "dark"]) {
        profile.language = language; profile.theme = theme;
        await navigatePage(`http://127.0.0.1:${appPort}/sport/design-system`);
        await ready("/sport/design-system");
        await until(() => evaluate(`document.documentElement.lang === '${language}' && document.documentElement.getAttribute('data-theme') === '${theme}'`), "preview hydration");
        assert.ok(await evaluate("!document.body.innerText.includes('sport.ui.')"), "Missing UI translation");
        for (const width of [320, 360, 390, 430, 768, 1440]) {
          await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
          await pause(120);
          const dimensions = await evaluate("({ viewport: innerWidth, content: document.documentElement.scrollWidth })");
          assert.ok(dimensions.content <= dimensions.viewport + 1, `Preview overflow at ${language}/${theme}/${width}`);
          results.designSystem.push({ language, theme, width, ...dimensions });
        }
        const contrast = await evaluate(`(() => {
          const button = document.querySelector('[data-sport-design-preview] .sport-button-primary');
          const style = getComputedStyle(button);
          const context = document.createElement('canvas').getContext('2d');
          const luminance = color => { context.fillStyle = color; context.fillRect(0,0,1,1); const rgb = context.getImageData(0,0,1,1).data; const linear = [rgb[0],rgb[1],rgb[2]].map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value+.055)/1.055)**2.4; }); return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722; };
          const a=luminance(style.color), b=luminance(style.backgroundColor);
          return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        })()`);
        assert.ok(contrast >= 4.5, `Primary button contrast ${contrast} at ${theme}`);
        results.designSystem.at(-1).primaryButtonContrast = contrast;
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await evaluate("scrollTo(0,0)"); await pause(250);
        await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(({ data }) => writeFile(path.join(output, `design-${language}-${theme}.png`), Buffer.from(data, "base64")));
      }
    }
    await evaluate("document.querySelectorAll('.sport-segment')[1].click()");
    assert.ok(await evaluate("document.querySelectorAll('.sport-segment')[1].getAttribute('aria-pressed') === 'true'"));
    await evaluate("document.querySelector('.sport-error-state button').click()");
    assert.ok(await evaluate("!document.querySelector('.sport-error-state')"));
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.sport-spinner')).animationName"), "none");
    results.reducedMotionRespected = true;
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await evaluate("document.querySelector('.sport-button-primary').focus()");
    assert.ok(await evaluate("parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 2"));
    const targets = await evaluate("Array.from(document.querySelectorAll('[data-sport-design-preview] .sport-button, [data-sport-design-preview] .sport-segment')).map(element => ({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})).filter(size => size.width && size.height)");
    assert.ok(targets.every(size => size.width >= 44 && size.height >= 44));
    results.touchTargets44px = true;
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    await send("Network.setBlockedURLs", { urls: ["https://*", "*strength.webp*"] });
    await send("Page.reload", { ignoreCache: true }); await ready("/sport/design-system");
    await evaluate("document.querySelector('.sport-discipline-card').scrollIntoView({block:'center'})");
    await until(() => evaluate("!document.querySelector('.sport-discipline-card').querySelector('.sport-media img')"), "image error fallback", 15000);
    assert.ok(await evaluate("document.querySelector('.sport-discipline-card .sport-media').getBoundingClientRect().height > 100"));
    results.imageFallbackStable = true;
    await send("Network.setBlockedURLs", { urls: ["https://*"] });
    console.log("Design system: 36 language/theme/viewport combinations, contrast, controls, motion and image fallback passed.");
  }
  if (exerciseLibrary) {
    const { checkExerciseLibrary } = await import("./exercise-browser-checks.mjs");
    await checkExerciseLibrary({ send, evaluate, navigatePage, navigateLink, ready, until, pause, results, profile, requests, output, appPort, setFixture: (value) => { fixtureState = value; } });
  }
  }
  if (anatomy) {
    const { checkAnatomy } = anatomyV3Only ? await import("./anatomy-v3-browser-checks.mjs") : await import("./anatomy-browser-checks.mjs");
    await checkAnatomy({ send, evaluate, navigatePage, ready, until, pause, results, profile, requests, networkRequests, output, appPort });
  }
  if (exerciseMedia) {
    const { checkExerciseMedia } = await import("./exercise-media-browser-checks.mjs");
    await checkExerciseMedia({ send, evaluate, navigatePage, ready, until, pause, results, profile, requests, networkRequests, output, appPort });
  }
  results.writes = requests.filter((request) => !["GET", "HEAD"].includes(request.method));
  assert.deepEqual(results.writes, []);
  assert.ok(!requests.some((request) => /calisthenics_|running_/.test(request.resource)), "Disabled disciplines queried their schema");
  assert.deepEqual(results.consoleErrors, []);
  await pause(500);
  await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then(({ data }) => writeFile(path.join(output, "sport-ar-system.png"), Buffer.from(data, "base64")));
  results.requestCount = requests.length;
  await writeFile(path.join(output, "browser-results.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify({ ...results, designSystem: undefined, hubCases: undefined, exerciseLibraryCases: undefined, anatomy: results.anatomy ? { ...results.anatomy, cases: results.anatomy.cases.length } : undefined, ...(designSystem ? { designSystemCases: results.designSystem?.length ?? 0 } : {}), ...(hub ? { hubCases: results.hubCases?.length ?? 0 } : {}), ...(exerciseLibrary ? { exerciseLibraryCases: results.exerciseLibraryCases?.length ?? 0 } : {}) }, null, 2));
} catch (error) {
  if (inspectPage) console.error(JSON.stringify(await inspectPage().catch(() => null)));
  if (capturePage) await capturePage().catch(() => {});
  console.error(JSON.stringify({ requestCount: requests.length, recentRequests: requests.slice(-12), exceptions: results.consoleErrors }));
  await writeFile(path.join(output, "failure.log"), `${error.stack}\n${appLog}`);
  console.error(error.message);
  console.error(`Local diagnostic: ${path.join(output, "failure.log")}`);
  process.exitCode = 1;
} finally {
  socket?.close();
  browser.kill(); app.kill();
  await new Promise((resolve) => mock.close(resolve));
}
