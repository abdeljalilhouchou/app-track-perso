import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function checkExerciseExperience({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, requests, networkRequests, output, appPort }) {
  const result = results.exerciseExperienceV3 = { cases: [], screenshots: [], mode: "Actual application, Edge headless, local fixtures only" };
  const until = (check, label, timeout = 15000) => waitUntil(check, label, timeout);
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const key = async (value) => {
    const windowsVirtualKeyCode = { Escape: 27, ArrowRight: 39, ArrowLeft: 37, Tab: 9 }[value];
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code: value, windowsVirtualKeyCode });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code: value, windowsVirtualKeyCode });
  };
  const shot = async (name) => {
    await pause(230);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 88 }).toFile(path.join(output, `experience-${name}.webp`));
    result.screenshots.push(`experience-${name}.webp`);
  };
  const photoReady = () => until(() => evaluate("!!document.querySelector('[data-gallery-main] img')?.naturalWidth"), "main photograph decoded");
  const open = async () => {
    await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').focus({preventScroll:true});document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').click()");
    await until(() => evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-premium-exercise]')"), "premium sheet fetched");
    await photoReady();
    await pause(200);
  };
  const close = async () => { await click("[data-guide-close]"); await until(() => evaluate("!document.querySelector('[data-exercise-guide-dialog]')"), "sheet closed after animation"); };
  const seed = { name: "Séance de démonstration", templateId: null, muscleGroups: ["Biceps"], startedAt: Date.now() - 193000, exercises: [
    { id: "experience-curl", name: "Curl incliné", muscle: "Biceps", targetReps: 12, sets: [{ weight: "12.5", reps: "12", done: true }, { weight: "12.5", reps: "12", done: true }, { weight: "12.5", reps: "12", done: false }] },
    { id: "experience-plank", name: "Gainage (planche)", muscle: "Abdominaux", targetReps: 30, sets: [{ weight: "", reps: "", done: false }] },
  ] };
  await send("Network.setBlockedURLs", { urls: ["https://*"] });
  await send("Network.setCacheDisabled", { cacheDisabled: false });
  await send("Emulation.setEmulatedMedia", { features: [] });
  await evaluate(`localStorage.setItem('strength-draft-v1',${JSON.stringify(JSON.stringify(seed))})`);
  async function session(language, theme, width) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/sport/musculation?tab=session");
    await until(() => evaluate("!!document.querySelector('#sport-panel-session .bg-mood-soft button')"), "resume fixture session");
    await click("#sport-panel-session .bg-mood-soft button");
    await until(() => evaluate("document.querySelectorAll('#sport-panel-session [data-exercise-thumbnail-trigger]').length===2"), "session thumbnails");
    await evaluate("window.__experienceFocusLog=[];document.addEventListener('focusin',event=>window.__experienceFocusLog.push({tag:event.target.tagName,trigger:event.target.dataset.exerciseThumbnailTrigger,guide:!!event.target.closest('[data-exercise-guide-dialog]'),time:performance.now()}))");
    await pause(200);
    const controls = await evaluate("[...document.querySelectorAll('.exercise-session-set > button')].map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,cssWidth:getComputedStyle(n).width,cssHeight:getComputedStyle(n).height}})");
    // FLIP transforms and fractional CSS pixels can differ by a few millionths.
    assert.ok(controls.every((r) => r.width >= 43.5 && r.height >= 43.5), `44px set controls: ${JSON.stringify(controls)}`);
    await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').scrollIntoView({block:'center',behavior:'instant'})");
  }
  // All four panels in the real modal, in addition to the library and pilot regressions.
  for (const language of (process.argv.includes("--experience-interactions-only") ? [] : ["fr", "en", "ar"])) for (const theme of ["light", "dark"]) for (const width of [320, 390, 430, 768, 1440]) {
    await session(language, theme, width);
    const draft = await evaluate("localStorage.getItem('strength-draft-v1')");
    const scroll = await evaluate("scrollY");
    await open();
    assert.equal(await evaluate("document.querySelectorAll('.exercise-sheet-thumbnail img').length"), 1);
    assert.equal(await evaluate("document.querySelectorAll('[data-gallery-position] img').length"), 2);
    assert.equal(await evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex"), "0");
    for (const tab of ["demonstration", "technique", "muscles", "advice"]) {
      await click(`[data-premium-tab="${tab}"]`);
      const layout = await evaluate(`(() => {
        const d=document.querySelector('[data-exercise-guide-dialog]'),b=d.querySelector('.exercise-guide-dialog-body'),p=d.querySelector('[role=tabpanel]:not([hidden])');
        return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,dialogWidth:d.scrollWidth,dialogClient:d.clientWidth,bodyWidth:b.scrollWidth,bodyClient:b.clientWidth,dir:d.dir,
          panelHeight:p.getBoundingClientRect().height,visiblePanels:d.querySelectorAll('[role=tabpanel]:not([hidden])').length,
          small:[...d.querySelectorAll('.exercise-premium-tabs button,[data-guide-close],[data-guide-expand]')].some(n=>n.getBoundingClientRect().height<44),
          closeVisible:d.querySelector('[data-guide-close]').getBoundingClientRect().bottom<innerHeight+1};
      })()`);
      assert.ok(layout.pageWidth <= width + 1 && layout.dialogWidth <= layout.dialogClient + 1 && layout.bodyWidth <= layout.bodyClient + 1, JSON.stringify({ language, theme, width, tab, ...layout }));
      assert.equal(layout.dir, language === "ar" ? "rtl" : "ltr");
      assert.equal(layout.visiblePanels, 1); assert.ok(layout.panelHeight > 50 && layout.closeVisible && !layout.small);
      if (language === "fr" && width === 390) await shot(`${theme}-${tab}-390`);
      if (language === "ar" && theme === "dark" && width === 320 && tab === "demonstration") await shot("ar-dark-photos-320");
      if (language === "fr" && theme === "dark" && width === 1440 && tab === "demonstration") await shot("desktop-dark-photos");
      result.cases.push({ language, theme, width, tab, overflow: false, closeVisible: true, targets44: true });
    }
    await close();
    await until(() => evaluate("document.activeElement?.dataset.exerciseThumbnailTrigger==='strength-curl-incline'"), "trigger focus restored after native dialog cleanup", 2500);
    assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), draft);
    assert.ok(Math.abs(await evaluate("scrollY") - scroll) <= 1);
    assert.equal(await evaluate("document.activeElement.dataset.exerciseThumbnailTrigger"), "strength-curl-incline");
  }
  console.log(`Experience V3: ${result.cases.length} sheet panel layouts passed.`);
  await writeFile(path.join(output, "exercise-experience-v3-results.json"), `${JSON.stringify(result, null, 2)}\n`);
  await session("fr", "dark", 390);
  const draft = await evaluate("localStorage.getItem('strength-draft-v1')");
  const card = "document.querySelector('[data-exercise-thumbnail-trigger=\"strength-curl-incline\"]').closest('.exercise-session-card')";
  await evaluate(`${card}.querySelector('.exercise-session-menu summary').click();${card}.querySelectorAll('.exercise-session-menu button')[1].click()`);
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[1].id==='experience-curl'"), "reorder from compact menu");
  await evaluate(`${card}.querySelector('.exercise-session-menu button').click()`);
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].id==='experience-curl'"), "return exercise to original position");
  await evaluate(`${card}.querySelector('.exercise-session-menu summary').click();${card}.querySelector('.exercise-session-add-set').click()`);
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets.length===4"), "add a set in compact card");
  await evaluate(`${card}.querySelector('button[aria-label="Supprimer la série 4"]').click()`);
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets.length===3"), "remove empty fourth set");
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), draft); result.compactCardActions = true;
  await shot("session-dark-before");
  await open();
  await click('[data-gallery-position="1"]'); await photoReady();
  const inlinePhotoWidth = await evaluate("document.querySelector('[data-gallery-main]').getBoundingClientRect().width");
  await evaluate("document.querySelector('[data-gallery-enlarge]').focus({preventScroll:true})");
  await click("[data-gallery-enlarge]");
  await until(() => evaluate("!!document.querySelector('[data-photo-dialog][open] img')?.naturalWidth"), "enlarged photograph loaded");
  assert.equal(await evaluate("document.querySelectorAll('dialog[open]').length"), 2);
  const enlargedPhotoWidth = await evaluate("document.querySelector('[data-photo-dialog] .exercise-photo-full').getBoundingClientRect().width");
  assert.ok(enlargedPhotoWidth > inlinePhotoWidth, JSON.stringify({ inlinePhotoWidth, enlargedPhotoWidth }));
  result.photoWidths = { inlinePhotoWidth, enlargedPhotoWidth };
  await shot("photo-enlarged-dark");
  await key("ArrowLeft");
  assert.equal(await evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex"), "0", "one arrow advances exactly once");
  await key("Escape");
  await until(() => evaluate("!document.querySelector('[data-photo-dialog]')&&!!document.querySelector('[data-exercise-guide-dialog][open]')"), "Escape closes photograph only");
  await until(() => evaluate("document.activeElement.hasAttribute('data-gallery-enlarge')"), "photo trigger focus restored", 2500);
  assert.equal(await evaluate("document.body.style.overflow"), "hidden");
  result.photoEnlargementAndFocus = true;
  // Real pointer movement on the handle; the rest of the sheet keeps native vertical scrolling.
  const drag = async (delta) => {
    const p = await evaluate("(()=>{const r=document.querySelector('[data-guide-expand]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: Math.max(1, p.y + delta), button: "left", buttons: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: Math.max(1, p.y + delta), button: "left", clickCount: 1 });
  };
  await drag(-55);
  await until(() => evaluate("document.querySelector('[data-guide-expand]').getAttribute('aria-expanded')==='true'"), "handle expands sheet");
  await drag(65);
  await until(() => evaluate("document.querySelector('[data-guide-expand]').getAttribute('aria-expanded')==='false'"), "handle collapses sheet");
  result.handleDrag = true;
  await click('[data-premium-tab="muscles"]');
  assert.ok(await evaluate("document.querySelectorAll('[data-muscle-role] li p').length>0"), "roles come from existing anatomy actions");
  const readsBefore3D = requests.length;
  await evaluate("for(const type of ['cancel','close','keydown','keyup'])document.addEventListener(type,event=>{if(type==='keydown'||type==='keyup'){if(event.key!=='Escape')return;}window.__experienceFocusLog.push({type,target:event.target.tagName,guide:event.target.hasAttribute?.('data-exercise-guide-dialog'),muscle:event.target.hasAttribute?.('data-muscle-dialog'),time:performance.now()});},true)");
  await click("[data-exercise-guide-dialog] [data-anatomy-open]");
  await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"), "existing shared 3D", 60000);
  await shot("3d-dark"); await key("Escape");
  await until(() => evaluate("!document.querySelector('[data-muscle-dialog]')"), "nested viewer closed");
  await until(() => evaluate("!!document.querySelector('[data-exercise-guide-dialog][open]')&&document.activeElement.hasAttribute('data-anatomy-open')"), "3D trigger focus restored", 2500);
  assert.equal(requests.length, readsBefore3D);
  await shot("return-from-3d-dark");
  result.shared3DAndReturn = true;
  await key("Escape"); await until(() => evaluate("!document.querySelector('[data-exercise-guide-dialog]')"), "return to session");
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), draft);
  await shot("session-dark-return"); result.exactSessionPreserved = true;
  // Single static photograph: enlargement works without invented positions or controls.
  await go("/sport/exercises/strength-gainage-planche"); await photoReady();
  assert.equal(await evaluate("document.querySelectorAll('[data-gallery-position],[data-gallery-next],[data-gallery-previous]').length"), 0);
  await click("[data-gallery-enlarge]"); await until(() => evaluate("!!document.querySelector('[data-photo-dialog][open]')"), "single hold photograph enlarged");
  assert.equal(await evaluate("document.querySelectorAll('[data-photo-dialog] footer button').length"), 0);
  await key("Escape"); result.staticHold = true;
  // System follows both OS choices; reduce disables every new animation/transition.
  const colors = [];
  for (const scheme of ["light", "dark"]) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: "reduce" }] });
    await session("ar", "system", 430); await open();
    colors.push(await evaluate("getComputedStyle(document.querySelector('[data-exercise-guide-dialog]')).backgroundColor"));
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-exercise-guide-dialog]')).animationName"), "none");
    const reducedDuration = await evaluate("getComputedStyle(document.querySelector('[data-premium-tab]')).transitionDuration");
    assert.ok(parseFloat(reducedDuration) <= 0.001, `reduced motion duration: ${reducedDuration}`);
    await shot(`ar-system-${scheme}-430`); await close();
  }
  assert.notEqual(colors[0], colors[1]); result.systemAndReducedMotion = true;
  result.writes = requests.filter((r) => !["GET", "HEAD"].includes(r.method)); assert.deepEqual(result.writes, []);
  result.loadedPhotoUrls = [...new Set(networkRequests.filter((url) => url.includes("/images/exercises/") || url.includes("%2Fimages%2Fexercises%2F")))];
  result.completed = true;
  await writeFile(path.join(output, "exercise-experience-v3-results.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log("Experience V3: photo enlargement, handle, 3D, exact draft, System and reduced motion passed.");
}
