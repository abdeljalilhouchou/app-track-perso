import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function checkExerciseLibrary({ send, evaluate, navigatePage, navigateLink, ready, until, pause, results, profile, requests, output, appPort, setFixture }) {
  const library = "/sport/exercises";
  const detail = "/sport/exercises/strength-rowing-haltere-unilateral";
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const input = async (selector, value) => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const select = async (index, value) => { await evaluate(`(() => { const element = document.querySelectorAll('[data-exercise-library] select')[${index}]; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('change',{bubbles:true})); })()`); await pause(100); };
  const hydrated = () => until(() => evaluate("(() => { const input = document.querySelector('[data-exercise-library] input'); const key = input && Object.keys(input).find(key=>key.startsWith('__reactProps$')); return !!key && typeof input[key].onChange === 'function'; })()"), "library hydration");
  const screenshot = async (file) => send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(({ data }) => writeFile(path.join(output, file), Buffer.from(data, "base64")));
  results.exerciseLibraryCases = [];
  for (const language of ["fr", "en", "ar"]) {
    for (const theme of ["light", "dark"]) {
      profile.language = language; profile.theme = theme;
      for (const route of [library, detail]) {
        await go(route);
        await until(() => evaluate(`document.documentElement.lang === '${language}' && document.documentElement.getAttribute('data-theme') === '${theme}'`), "library language/theme");
        assert.equal(await evaluate("document.documentElement.dir"), language === "ar" ? "rtl" : "ltr");
        assert.ok(await evaluate("!document.body.innerText.includes('sport.library.')"));
        assert.ok(await evaluate("!document.querySelector('video, iframe, [data-no-exercise-video] button')"), "No false video controls");
        for (const width of [320, 390, 430, 1440]) {
          await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width < 768 }); await pause(120);
          const size = await evaluate("({viewport:innerWidth,content:document.documentElement.scrollWidth})");
          assert.ok(size.content <= size.viewport + 1, `Exercise overflow ${language}/${theme}/${width}/${route}: ${JSON.stringify(size)}`);
          assert.ok(await evaluate("Array.from(document.querySelectorAll('[data-exercise-library] input,[data-exercise-library] select,.exercise-section-links a')).filter(el=>el.getClientRects().length).every(el=>el.getBoundingClientRect().height>=44)"));
          results.exerciseLibraryCases.push({ route, language, theme, width, ...size });
          if (width === 390 && (language === "fr" || language === "ar")) await screenshot(`exercise-${route === library ? "library" : "detail"}-${language}-${theme}.png`);
        }
      }
    }
  }
  profile.language = "fr"; profile.theme = "system";
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const beforeLibrary = requests.length;
  await go(library); await hydrated(); await pause(300);
  assert.ok(!requests.slice(beforeLibrary).some(request=>request.resource.endsWith('/workout_sets')), "Library must not prefetch performance reads for its cards");
  results.exerciseNoPerformancePrefetch = true;
  const backgrounds = [];
  for (const scheme of ["light", "dark"]) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: "reduce" }] }); await pause(120);
    backgrounds.push(await evaluate("getComputedStyle(document.body).backgroundColor"));
  }
  assert.notEqual(backgrounds[0], backgrounds[1]); results.exerciseSystemTheme = true;
  await input('[data-exercise-library] input', "rowing haltere unilateral");
  await until(() => evaluate("document.querySelectorAll('[data-exercise-results] article').length===1"), "accent-insensitive search");
  await navigateLink(detail); await ready(detail);
  await until(() => evaluate("Array.from(document.querySelectorAll('[data-exercise-detail] img')).some(img=>img.complete&&img.naturalWidth>0)"), "exercise image decoded");
  assert.ok(await evaluate("document.body.innerText.includes('25 kg') && document.body.innerText.includes('300')"), "Real fixture records rendered");
  results.exerciseImageLoaded = true;
  const alt = await evaluate("document.querySelector('[data-exercise-detail] img').alt"); assert.ok(alt.length > 20);
  await go(library); await hydrated();
  await evaluate("document.querySelector('.exercise-filters').open=true");
  await select(1, "Biceps"); await select(2, "dumbbell"); await select(3, "beginner");
  await until(() => evaluate("document.querySelectorAll('[data-exercise-results] article').length===1"), "combined filters");
  assert.ok(await evaluate("document.querySelector('[data-exercise-results]').innerText.includes('Curl haltères')"));
  await evaluate("Array.from(document.querySelectorAll('[data-exercise-library] button')).find(button=>button.textContent.includes('Réinitialiser')).click()"); await pause(150);
  await select(4, "desc");
  assert.ok(await evaluate("(() => { const names=Array.from(document.querySelectorAll('[data-exercise-results] h3')).map(el=>el.textContent); return names.every((name,i)=>!i||names[i-1].localeCompare(name,'fr')>=0); })()"));
  await input('[data-exercise-library] input', "zzzz-no-result");
  await until(() => evaluate("!document.querySelector('[data-exercise-results]')"), "empty search");
  await screenshot("exercise-empty.png");
  await input('[data-exercise-library] input', ""); await select(0, "running");
  assert.ok(await evaluate("document.body.innerText.includes('Aucun catalogue d’exercices Running')"));
  assert.ok(await evaluate("document.querySelector('option[value=calisthenics]').disabled"));
  results.exerciseFilters = { search: true, combined: true, reverseSort: true, empty: true, runningEmpty: true, calisthenicsGated: true };
  await send("Network.setBlockedURLs", { urls: ["https://*", "*one-arm-dumbbell-row.webp*"] });
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await go(detail);
  await until(() => evaluate("!document.querySelector('[data-exercise-detail] img')"), "missing exercise image fallback");
  assert.ok(await evaluate("document.querySelector('[data-exercise-detail] .sport-media').getBoundingClientRect().height>150"));
  await screenshot("exercise-image-fallback.png"); results.exerciseImageFallback = true;
  await send("Network.setBlockedURLs", { urls: ["https://*"] });
  await go("/sport/exercises/strength-squat");
  assert.ok(await evaluate("document.body.innerText.includes('reste à documenter') && !document.querySelector('.muscle-zone-primary')"));
  results.exerciseAmbiguousVariant = true;
  // Open the guide from the live session while retaining the same draft DOM.
  profile.theme = "light";
  await go("/sport/musculation");
  await until(() => evaluate("document.getElementById('sport-tab-session')?.getAttribute('aria-selected')==='true'"), "session tab");
  if (!await evaluate("!!document.querySelector('input[aria-label=\"Nom de la séance\"]')")) {
    await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button=>button.textContent.includes('Séance libre'))"), "free session button");
    await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('Séance libre')).click()");
  }
  await until(() => evaluate("!!document.querySelector('input[aria-label=\"Nom de la séance\"]')"), "draft input");
  await input('input[aria-label="Nom de la séance"]', "QA library draft");
  await evaluate("(() => { window.qaLibraryDraft=document.querySelector('input[aria-label=\"Nom de la séance\"]'); })()");
  // Existing picker selects an actual catalog exercise; no write action is submitted.
  const pickerSelector = await evaluate("Array.from(document.querySelectorAll('input')).find(input=>input.placeholder && /exercice/.test(input.placeholder))?.placeholder");
  assert.ok(pickerSelector, "Exercise picker input exists");
  await input(`input[placeholder=${JSON.stringify(pickerSelector)}]`, "Rowing");
  await until(() => evaluate("!!document.querySelector('#sport-panel-session .exercise-guide-button')"), "guide opener");
  const before = requests.length;
  await evaluate("(() => { const button=document.querySelector('#sport-panel-session .exercise-guide-button'); button.focus(); window.qaGuideTrigger=button; button.click(); })()");
  await until(() => evaluate("!!document.querySelector('dialog[open] [data-exercise-detail]')"), "guide loaded on demand");
  assert.ok(requests.length > before);
  assert.equal(await evaluate("location.pathname"), "/sport/musculation");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.ok(await evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('dialog[open]')).animationName"), "none");
  await screenshot("exercise-dialog.png");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await until(() => evaluate("!document.querySelector('dialog[open]')"), "guide closed");
  await until(() => evaluate("document.activeElement===window.qaGuideTrigger"), "guide focus restored", 5000);
  const draftState = await evaluate("({sameInput:window.qaLibraryDraft===document.querySelector('input[aria-label=\"Nom de la séance\"]'), value:window.qaLibraryDraft.value})");
  assert.ok(draftState.sameInput && draftState.value === "QA library draft", JSON.stringify(draftState));
  results.exerciseDialogDraftAndFocus = true;
  // Rejected local read is visible and retryable, not a fabricated empty record.
  setFixture("failure");
  await evaluate("window.qaGuideTrigger.click()");
  await until(() => evaluate("!!document.querySelector('dialog[open] [role=alert]')"), "guide request failure");
  setFixture("normal");
  await evaluate("document.querySelector('dialog[open] [role=alert] button').click()");
  await until(() => evaluate("!!document.querySelector('dialog[open] [data-exercise-detail]')"), "guide retry success");
  results.exerciseDialogRetry = true;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await go(library);
  console.log("Exercise library: 48 locale/theme/viewport cases, filters, real records, media fallback and draft-preserving dialog passed.");
}
