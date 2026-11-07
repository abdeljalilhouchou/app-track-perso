import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function checkExerciseMedia({ send, evaluate, navigatePage, ready, until, pause, results, profile, requests, networkRequests, output, appPort }) {
  const result = results.exerciseMedia = { cases: [], mode: "Edge headless, local fixtures; screenshots of actual generated media, no physical phone" };
  const ids = ["strength-developpe-incline-halteres", "strength-rowing-haltere-unilateral", "strength-squat", "strength-curl-incline", "strength-tirage-horizontal-poulie"];
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const screenshot = async (name) => { const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await sharp(Buffer.from(data, "base64")).webp({ quality: 82 }).toFile(path.join(output, `${name}.webp`)); };
  const input = (selector, value) => evaluate(`(() => {const node=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,${JSON.stringify(value)});node.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const imagePath = (url) => { const parsed = new URL(url); return parsed.pathname === "/_next/image" ? parsed.searchParams.get("url") : parsed.pathname; };

  profile.language = "fr";profile.theme = "light";
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const firstRequest = networkRequests.length;
  await go("/sport/exercises");
  await until(() => evaluate("!!document.querySelector('[data-exercise-library] input')"), "media library");
  await evaluate("document.querySelector('[data-exercise-results] img').scrollIntoView({block:'center'})");
  await until(() => evaluate("Array.from(document.querySelectorAll('[data-exercise-results] img')).some(image=>image.complete&&image.naturalWidth>0)"), "visible library thumbnail decoded");
  await pause(150);
  const initialImages = networkRequests.slice(firstRequest).map(imagePath).filter((url) => url?.startsWith("/images/exercises/"));
  assert.ok(initialImages.length > 0);
  assert.ok(initialImages.every((url) => url.includes("/thumbnails/")), JSON.stringify(initialImages));
  result.initialLibraryImages = initialImages;
  assert.ok(await evaluate("document.querySelector('[data-catalog-composition]').textContent.includes('80') && document.querySelector('[data-catalog-composition]').textContent.includes('70')"));
  result.compositionFixture = { total: 80, builtin: 70, personal: 10, calisthenics: 0, actualProductionCompositionRead: false };
  await screenshot("visual-library-light");
  profile.theme = "dark";await go("/sport/exercises");
  await evaluate("document.querySelector('[data-exercise-results] img').scrollIntoView({block:'center'})");
  await until(() => evaluate("Array.from(document.querySelectorAll('[data-exercise-results] img')).some(image=>image.complete&&image.naturalWidth>0)"), "dark library thumbnail decoded");
  await screenshot("visual-library-dark");

  for (const language of ["fr", "en", "ar"]) for (const theme of ["light", "dark"]) for (const width of [320, 1440]) for (const id of ids) {
    profile.language = language;profile.theme = theme;
    await send("Emulation.setDeviceMetricsOverride", { width, height: width === 320 ? 760 : 1000, deviceScaleFactor: 1, mobile: width === 320 });
    const before = networkRequests.length;
    await go(`/sport/exercises/${id}`);
    await until(() => evaluate("Array.from(document.querySelectorAll('[data-exercise-detail] > figure img')).some(image=>image.complete&&image.naturalWidth>0)"), "hero decoded");
    assert.equal(await evaluate("document.querySelectorAll('[data-exercise-position] img').length"), 0, "Position images are not mounted before expansion");
    const pathsBefore = networkRequests.slice(before).map(imagePath);
    assert.ok(!pathsBefore.some((url) => /-start\.webp$/.test(url ?? "")), "No starting-position image requested before opening");
    assert.equal(await evaluate("document.querySelector('[data-anatomy-open]').dataset.anatomyOpen"), id);
    await click("[data-exercise-positions] summary");
    await until(() => evaluate("document.querySelectorAll('[data-exercise-position] img').length===2"), "two positions mounted");
    await evaluate("document.querySelector('[data-exercise-positions]').scrollIntoView({block:'center'})");
    await until(() => evaluate("Array.from(document.querySelectorAll('[data-exercise-position] img')).every(image=>image.complete&&image.naturalWidth>0)"), "two positions decoded");
    const sources = await evaluate("Array.from(document.querySelectorAll('[data-exercise-position] img')).map(image=>image.getAttribute('src'))");
    assert.notEqual(sources[0], sources[1]);
    assert.ok(await evaluate("Array.from(document.querySelectorAll('[data-exercise-position] img')).every(image=>image.alt.length>20&&image.loading==='lazy')"));
    const size = await evaluate("({viewport:innerWidth,content:document.documentElement.scrollWidth,rtl:document.documentElement.dir})");
    assert.ok(size.content <= size.viewport + 1, JSON.stringify({ id, language, theme, width, ...size }));
    assert.equal(size.rtl, language === "ar" ? "rtl" : "ltr");
    if (language === "fr" && width === 1440) await screenshot(`${id}-${theme}-positions`);
    if (language === "ar" && theme === "dark" && width === 320 && id === ids[0]) await screenshot("incline-press-ar-dark-mobile");
    if (language === "fr" && theme === "light" && width === 320 && id === ids[3]) await screenshot("incline-curl-fr-light-mobile");
    result.cases.push({ id, language, theme, width, distinctPositions: true, lazyPositions: true, noOverflow: true });
  }
  assert.ok(!networkRequests.some((url) => url.includes("male-mobile.glb")), "Media views do not start anatomy rendering");
  result.noAnatomyDownloadDuringPhotoBrowsing = true;

  profile.language = "fr";profile.theme = "light";
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Network.setBlockedURLs", { urls: ["https://*", "*incline-dumbbell-press-end.webp*"] });
  await go(`/sport/exercises/${ids[0]}`);
  await until(() => evaluate("!document.querySelector('[data-exercise-detail] > figure img')"), "failed hero fallback");
  assert.ok(await evaluate("document.querySelector('[data-exercise-detail] > figure .sport-media').getBoundingClientRect().height>150"));
  await screenshot("visual-photo-unavailable");result.missingMediaFallback = true;
  await send("Network.setBlockedURLs", { urls: ["https://*"] });

  await go("/sport/musculation?tab=program");
  await until(() => evaluate("!!document.querySelector('#sport-panel-program button[aria-expanded]')"), "program card ready");
  await click("#sport-panel-program button[aria-expanded]");
  await until(() => evaluate("Array.from(document.querySelectorAll('#sport-panel-program [data-exercise-thumbnail] img')).some(image=>image.complete&&image.naturalWidth>0)"), "program thumbnail decoded");
  await pause(350);
  result.programThumbnail = true;
  await screenshot("visual-program-light");
  await go("/sport/musculation?tab=session");
  if (!await evaluate("!!document.querySelector('input[aria-label=\"Nom de la séance\"]')")) {
    await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button=>button.textContent.includes('Séance libre'))"), "free session");
    await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('Séance libre')).click()");
  }
  await until(() => evaluate("!!document.querySelector('input[aria-label=\"Nom de la séance\"]')"), "draft ready");
  await input('input[aria-label="Nom de la séance"]', "QA photo pilot");
  const placeholder = await evaluate("Array.from(document.querySelectorAll('input')).find(input=>input.placeholder&&/exercice/.test(input.placeholder))?.placeholder");
  await input(`input[placeholder=${JSON.stringify(placeholder)}]`, "Rowing");
  await until(() => evaluate("Array.from(document.querySelectorAll('#sport-panel-session li')).some(li=>li.textContent.includes('Rowing haltère unilatéral'))"), "canonical row picker");
  await evaluate("Array.from(document.querySelectorAll('#sport-panel-session li')).find(li=>li.textContent.includes('Rowing haltère unilatéral')).querySelector('button').click()");
  await until(() => evaluate("!!document.querySelector('#sport-panel-session [data-exercise-thumbnail] img')"), "session thumbnail");
  await evaluate("(() => { const card=document.querySelector('#sport-panel-session [data-anatomy-open]').closest('.rounded-2xl');const inputs=card.querySelectorAll('input[type=number]');for(const [i,v] of [[0,'25'],[1,'12']]){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[i],v);inputs[i].dispatchEvent(new Event('input',{bubbles:true}));}})()");
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')||'{}').exercises?.[0]?.sets?.[0]?.reps==='12'"), "session values saved locally");
  await evaluate("document.querySelector('#sport-panel-session [data-anatomy-open]').closest('.rounded-2xl').querySelector('button[aria-pressed=false]').click()");
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')||'{}').exercises?.[0]?.sets?.[0]?.done===true"), "completed set saved locally");
  const draft = await evaluate("localStorage.getItem('strength-draft-v1')");
  const timerBefore = await evaluate("document.querySelector('p.text-2xl.tabular-nums')?.textContent");
  const timerBegan = Date.now();
  await click("#sport-panel-session .exercise-guide-button");
  await until(() => evaluate("!!document.querySelector('.exercise-guide-dialog [data-exercise-detail]')"), "session guide");
  await click(".exercise-guide-dialog [data-exercise-positions] summary");
  await until(() => evaluate("document.querySelectorAll('.exercise-guide-dialog [data-exercise-position] img').length===2"), "session positions");
  const readsBeforeAnatomy = requests.filter((request) => request.resource.startsWith("/rest/v1/")).length;
  await click(".exercise-guide-dialog [data-anatomy-open]");
  await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"), "existing 3D remains operational", 60000);
  await click("[data-anatomy-close]");
  assert.ok(await evaluate("!!document.querySelector('.exercise-guide-dialog[open]')"));
  assert.equal(requests.filter((request) => request.resource.startsWith("/rest/v1/")).length, readsBeforeAnatomy);
  await click(".exercise-guide-dialog-header button");
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), draft);
  const timerAfter = await evaluate("document.querySelector('p.text-2xl.tabular-nums')?.textContent");
  const seconds = (value) => { const match=String(value).match(/^(\d+):(\d+)$/);assert.ok(match);return Number(match[1])*60+Number(match[2]); };
  const elapsed = (Date.now()-timerBegan)/1000;
  assert.ok(Math.abs(seconds(timerAfter)-Math.max(0,seconds(timerBefore)-elapsed))<2.5, "Rest timer continues without reset");
  result.sessionDraftAndSetsPreserved = true;result.existing3DOperational = true;result.timer = { before: timerBefore, after: timerAfter, elapsedSeconds: elapsed, pausedOrReset: false };
  result.requests = { total: networkRequests.length, tableWrites: requests.filter((request) => !["GET", "HEAD"].includes(request.method)).length };
  await writeFile(path.join(output, "exercise-media-results.json"), JSON.stringify(result, null, 2));
  console.log(`Exercise media: ${result.cases.length} locale/theme/viewport cases, five real photo pairs, lazy loading, program/session/3D/draft and fallback passed.`);
}
