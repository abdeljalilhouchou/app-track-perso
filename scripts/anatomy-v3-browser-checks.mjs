import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { sourceLoader } from "./test-source-loader.mjs";

// Targeted rerun after UI/copy adjustments, with the same local fixture harness.
export async function checkAnatomy({ send, evaluate, navigatePage, ready, until, pause, results, profile, requests, output, appPort }) {
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const sceneState = () => evaluate("({...document.querySelector('.anatomy-stage:has(canvas)').dataset})");
  const open = async () => { await click("[data-anatomy-open]"); await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"), "V3 WebGL ready", 60000); await pause(100); };
  const close = async () => { await click("[data-anatomy-close]"); await until(() => evaluate("!document.querySelector('[data-muscle-dialog]')"), "V3 dialog closed"); };
  const command = async (value) => { await click(`[data-anatomy-command="${value}"]`); await pause(80); };
  const screenshot = async (name) => send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then(({ data }) => writeFile(path.join(output, `${name}.png`), Buffer.from(data, "base64")));
  await checkAnatomyV3({ send, evaluate, go, until, click, open, close, sceneState, requests, results, output, profile, screenshot, command });
}

export async function checkAnatomyV3({ send, evaluate, go, until, click, open, close, sceneState, requests, results, output, profile, screenshot, command }) {
  const { EXERCISE_ANATOMY_CONFIGS: configs } = sourceLoader()("src/lib/anatomy/configs.ts");
  results.anatomyV3 = { mappings: [], entryPoints: [], locales: [] };
  const result = results.anatomyV3;
  profile.language = "fr"; profile.theme = "light";
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  // Exercise every actual mapping against the REAL WebGL materials, then revisit
  // rowing to detect residual colors. No auth or data mutation is performed.
  const sequence = [...configs, configs.find((config) => config.id === "strength-rowing-haltere-unilateral")];
  for (const config of sequence) {
    await go(`/sport/exercises/${config.catalogKey}`);
    const readsBefore = requests.filter((request) => request.resource.startsWith("/rest/v1/")).length;
    await open();
    const state = await sceneState();
    assert.equal(state.neutralColorErrors, "0", `No residual color: ${config.id}`);
    const highlighted = JSON.parse(state.highlightedMeshes);
    const expected = config.muscles.flatMap((group) => group.keys.flatMap((key) => (config.unilateral && group.role !== "stabilizer" ? ["right"] : ["left", "right"]).map((side) => ({ id: `${key}_${side}`, role: group.role }))));
    assert.deepEqual(highlighted.map(({ id, role }) => ({ id, role })).sort((a, b) => a.id.localeCompare(b.id)), expected.sort((a, b) => a.id.localeCompare(b.id)), config.id);
    const palette = { primary: "cf2441", secondary: "07824c", stabilizer: "c36713" };
    for (const group of highlighted) assert.equal(group.color, palette[group.role], `Actual material color ${config.id}/${group.id}`);
    assert.ok(Math.abs(Math.atan2(Math.sin(Number(state.cameraAzimuth) - (config.initialView === "back" ? Math.PI : 0)), Math.cos(Number(state.cameraAzimuth) - (config.initialView === "back" ? Math.PI : 0)))) < .004);
    assert.equal(state.framing, config.framing);
    assert.equal(await evaluate("!!document.querySelector('[data-anatomy-partial]')"), config.partial);
    assert.equal(requests.filter((request) => request.resource.startsWith("/rest/v1/")).length, readsBefore);
    for (const group of config.muscles) {
      await click(`[data-anatomy-muscle="${group.id}"]`);
      assert.equal(await evaluate("document.querySelector('[data-anatomy-selection]')?.dataset.anatomySelection"), group.id);
      assert.equal(await evaluate("document.querySelector('[data-anatomy-selection]')?.dataset.anatomyRole"), group.role);
    }
    if (["strength-developpe-incline-halteres", "strength-curl-marteau", "strength-squat", "strength-mollets-assis", "strength-marche-du-fermier"].includes(config.id)) {
      await click(`[data-anatomy-muscle="${config.muscles[0].id}"]`);
      await screenshot(`v3-${config.id}`);
    }
    result.mappings.push({ id: config.id, meshes: highlighted.length, groupsSelected: config.muscles.length, initialView: config.initialView, framing: state.framing, noTableReadOnOpen: true });
    await close();
    assert.equal(await evaluate("document.querySelectorAll('[data-anatomy-viewer] canvas').length"), 0);
  }
  await writeFile(path.join(output, "anatomy-v3-mappings.json"), JSON.stringify(result.mappings, null, 2));
  console.log(`Anatomy V3: all ${result.mappings.length} material/role/selection checks passed.`);

  // Direct library access, without following the exercise link.
  await go("/sport/exercises");
  assert.ok(await evaluate("!!document.querySelector('[data-exercise-results] [data-anatomy-open]')"));
  await open(); await close(); result.entryPoints.push("library");
  await go("/sport/musculation?tab=program");
  const programButton = "document.querySelector('#sport-panel-program [data-anatomy-open]')";
  if (!await evaluate(`!!(${programButton})`)) {
    await evaluate("document.querySelector('#sport-tab-program')?.click()");
  }
  await until(() => evaluate("!!document.querySelector('#sport-panel-program button[aria-expanded]')"), "program card");
  await evaluate("document.querySelector('#sport-panel-program button[aria-expanded=false]')?.click()");
  await until(() => evaluate("!!document.querySelector('#sport-panel-program [data-anatomy-open]')"), "program anatomy access");
  await click("#sport-panel-program [data-anatomy-open]");
  await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"), "program WebGL ready");
  await close();result.entryPoints.push("program");
  await evaluate("document.querySelector('#sport-tab-history')?.click()");
  await until(() => evaluate("!!document.querySelector('#sport-panel-history')"), "history panel");
  await evaluate("document.querySelector('#sport-panel-history button[aria-expanded]')?.click()");
  await until(() => evaluate("!!document.querySelector('#sport-panel-history [data-anatomy-open]')"), "history anatomy access");
  await click("#sport-panel-history [data-anatomy-open]");
  await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"), "history WebGL ready");
  await close();result.entryPoints.push("history");

  await go("/sport/exercises/strength-pull-over-haltere");
  assert.ok(!await evaluate("!!document.querySelector('[data-anatomy-open]')"));
  assert.ok(await evaluate("!!document.querySelector('[data-anatomy-unavailable]')"));
  result.unverifiedVariantRejected = true;

  for (const language of ["fr", "en", "ar"]) for (const theme of ["light", "dark"]) for (const width of [320, 1440]) {
    profile.language = language; profile.theme = theme;
    await send("Emulation.setDeviceMetricsOverride", { width, height: width === 320 ? 568 : 1000, deviceScaleFactor: 1, mobile: width === 320 });
    await go("/sport/exercises/strength-squat");await open();
    assert.ok(await evaluate("document.querySelector('[data-muscle-dialog]').scrollWidth<=document.querySelector('[data-muscle-dialog]').clientWidth+1"));
    assert.equal(await evaluate("document.querySelector('[data-muscle-dialog]').dir"), language === "ar" ? "rtl" : "ltr");
    await command("front");await command("back");await command("zoomIn");await command("zoomOut");
    await click('[data-anatomy-muscle="glutes"]');
    assert.equal(await evaluate("document.querySelector('[data-anatomy-action]').textContent"), configs.find((config) => config.id === "strength-squat").actions.glutes[language]);
    if (language === "ar" && theme === "dark" && width === 320) await screenshot("v3-squat-ar-dark-mobile");
    if (language === "en" && theme === "light" && width === 1440) await screenshot("v3-squat-en-light-desktop");
    await close();result.locales.push({ language, theme, width });
  }
  profile.language = "fr";profile.theme = "light";
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", { source: "(() => {const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:get.call(this,kind,...args);};})()" });
  await go("/sport/exercises/strength-leg-extension");await click("[data-anatomy-open]");
  await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='fallback'"), "leg fallback");
  await click('[data-anatomy-command="front"]');await click('[data-anatomy-muscle="quadriceps"]');
  assert.ok(await evaluate("!!document.querySelector('.anatomy-fallback-svg [role=button]')"));
  await screenshot("v3-leg-extension-fallback");await close();
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier }); result.legFallback = true;
  await writeFile(path.join(output, "anatomy-v3-results.json"), JSON.stringify(result, null, 2));
  console.log(`Anatomy V3: ${result.mappings.length} real GLB configurations, ${result.locales.length} additional responsive cases, library/program/history access.`);
}
