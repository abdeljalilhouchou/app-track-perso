import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sourceLoader } from "./test-source-loader.mjs";

export async function checkExerciseMedia({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, requests, networkRequests, output, appPort }) {
  const until = (check, label, timeout = 15000) => waitUntil(check, label, timeout);
  const result = results.exerciseMediaV2 = { cases: [], mode: "Edge headless + local auth/REST fixtures; no real account data or physical phone" };
  const load = sourceLoader();
  const { MEDIA_EXPERIENCE_PILOTS: ids } = load("src/lib/exercises/media-experience.ts");
  const { baseCatalog } = load("src/lib/exercises/catalog.ts");
  const catalog = baseCatalog("fr");
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const shot = async (name) => { const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await sharp(Buffer.from(data, "base64")).webp({ quality: 84 }).toFile(path.join(output, `${name}.webp`)); };
  const input = (selector, value) => evaluate(`(() => {const node=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,${JSON.stringify(value)});node.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const viewport = (width) => send("Emulation.setDeviceMetricsOverride", { width, height: width <= 430 ? 844 : 1000, deviceScaleFactor: 1, mobile: width <= 430 });
  const imagePath = (url) => { const parsed = new URL(url); return parsed.pathname === "/_next/image" ? parsed.searchParams.get("url") : parsed.pathname; };
  const key = async (value, code = value) => { const windowsVirtualKeyCode = ({Escape:27,ArrowLeft:37,ArrowRight:39,Home:36,End:35,Tab:9})[value];await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code, windowsVirtualKeyCode }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code, windowsVirtualKeyCode }); };
  const galleryReady = async () => { await until(() => evaluate("Array.from(document.querySelectorAll('[data-gallery-main] img')).some(image=>image.complete&&image.naturalWidth>0)"), "selected photo decoded", 20000); await pause(200); };
  async function swipe() {
    await evaluate("document.querySelector('.exercise-gallery-image').scrollIntoView({block:'center'})");
    const point = await evaluate("(() => {const r=document.querySelector('.exercise-gallery-image').getBoundingClientRect();return {x:r.x+r.width*.75,y:Math.max(r.y+30,Math.min(innerHeight-60,r.y+r.height*.5))}})()");
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point.x, y: point.y }] });
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x - 90, y: point.y }] });
    await pause(70);
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  profile.language = "fr"; profile.theme = "light";
  await viewport(390);
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  // An existing local draft with five real pilot identities. Values are then edited through React inputs.
  const seed = { name: "QA Media V2", templateId: null, muscleGroups: ["Dos", "Pectoraux", "Quadriceps", "Biceps"], startedAt: Date.now() - 183000, exercises: ids.map((id, index) => { const item = catalog.find((entry) => entry.key === id); return { id: `qa-${index}`, name: item.storedName, muscle: item.primary[0], targetReps: 12, sets: [{ weight: "", reps: "", done: false }, { weight: "20", reps: "10", done: false }] }; }) };
  await evaluate(`localStorage.setItem('strength-draft-v1',${JSON.stringify(JSON.stringify(seed))})`);
  const beforeSession = networkRequests.length;
  await go("/sport/musculation?tab=session");
  await until(() => evaluate("Array.from(document.querySelectorAll('#sport-panel-session button')).some(button=>button.textContent.includes('Reprendre'))"), "resume local fixture draft");
  await evaluate("Array.from(document.querySelectorAll('#sport-panel-session button')).find(button=>button.textContent.includes('Reprendre')).click()");
  console.log("Media V2: resumed fixture draft.");
  await until(() => evaluate("document.querySelectorAll('#sport-panel-session [data-exercise-thumbnail-trigger]').length===5"), "five pilot thumbnails");
  await until(() => evaluate("Array.from(document.querySelectorAll('#sport-panel-session [data-exercise-thumbnail-trigger] img')).some(image=>image.complete&&image.naturalWidth>0)"), "session thumbnails decoded");
  const initialImages = networkRequests.slice(beforeSession).map(imagePath).filter((url) => url?.startsWith("/images/exercises/"));
  assert.ok(initialImages.length && initialImages.every((url) => url.includes("/thumbnails/")), JSON.stringify(initialImages));
  assert.ok(!networkRequests.some((url) => url.includes(".glb")));
  result.sessionInitialImages = initialImages;
  await input('#sport-panel-session .exercise-session-overview + div + div input[type="number"]', "27.5");
  await evaluate("(() => {const row=document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').closest('.rounded-2xl').querySelectorAll('input[type=number]')[1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(row,'13');row.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets[0].reps==='13'"), "weights and reps persisted");
  await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').closest('.rounded-2xl').querySelector('button[aria-pressed=false]').click()");
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets[0].done===true"), "validated set persisted");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets[0].weight"), "27.5");
  await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').scrollIntoView({block:'center'});document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').focus({preventScroll:true})");
  await pause(200);
  const draftBefore = await evaluate("localStorage.getItem('strength-draft-v1')");
  const scrollBefore = await evaluate("window.scrollY");
  const restBefore = await evaluate("document.querySelector('p.text-2xl.tabular-nums').textContent");
  const durationBefore = await evaluate("document.querySelector('#sport-panel-session p.text-xl.tabular-nums').textContent");
  const began = Date.now();
  await shot("session-fr-light-mobile");
  await click("#sport-panel-session [data-exercise-thumbnail-trigger]");
  await until(() => evaluate("!!document.querySelector('[data-exercise-guide-dialog][open] [data-premium-exercise]')"), "thumbnail opens shared premium sheet");
  await galleryReady();
  const firstSrc = await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc");
  await click('[data-gallery-position="0"]'); await galleryReady();
  const startSrc = await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc");
  await click("[data-gallery-next]"); await galleryReady();
  assert.notEqual(await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc"), startSrc);
  assert.equal(await evaluate("document.querySelectorAll('[data-gallery-main] img').length"), 1);
  await swipe();
  await until(() => evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex==='0'"), "real touch swipe changes photograph", 3000);
  result.touchSwipe = true;
  await click("[data-guide-expand]");
  assert.ok(await evaluate("document.querySelector('[data-exercise-guide-dialog]').classList.contains('is-expanded')"));
  await shot("sheet-fr-light-expanded");
  await click('[data-premium-tab="technique"]');
  assert.equal(await evaluate("document.querySelector('[data-premium-tab=technique]').getAttribute('aria-selected')"), "true");
  assert.equal(await evaluate("document.querySelector('[data-premium-tab=technique]').getAttribute('aria-controls')===document.querySelector('.exercise-steps').closest('[role=tabpanel]').id"), true);
  await shot("technique-fr-light-mobile");
  await click('[data-premium-tab="advice"]'); await shot("advice-fr-light-mobile");
  await click('[data-premium-tab="muscles"]');
  assert.ok(!networkRequests.some((url) => url.includes(".glb")), "3D not downloaded by photo, technique or muscle summary");
  result.no3DBeforeExplicitOpening = true;
  const readsBefore3D = requests.filter((request) => request.resource.startsWith('/rest/v1/')).length;
  await click("[data-exercise-guide-dialog] [data-anatomy-open]");
  await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"), "shared 3D operational", 60000);
  assert.ok(await evaluate("!!document.querySelector('[data-muscle-dialog] canvas')"));
  await shot("nested-3d-fr-light-mobile");
  await key("Escape");
  await until(() => evaluate("!document.querySelector('[data-muscle-dialog]')&&!!document.querySelector('[data-exercise-guide-dialog][open]')"), "Escape closes only nested 3D");
  assert.equal(requests.filter((request) => request.resource.startsWith('/rest/v1/')).length, readsBefore3D, "No extra Supabase read/write for 3D");
  await key("Escape");
  await until(() => evaluate("!document.querySelector('[data-exercise-guide-dialog]')"), "Escape closes sheet");
  await pause(200);
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), draftBefore);
  const scrollAfter=await evaluate("window.scrollY");
  assert.ok(Math.abs(scrollAfter - scrollBefore) <= 1,JSON.stringify({scrollBefore,scrollAfter,active:await evaluate("document.activeElement?.dataset.exerciseThumbnailTrigger")}));
  assert.equal(await evaluate("document.activeElement?.dataset.exerciseThumbnailTrigger"), ids[0]);
  const seconds = (value) => { const parts=String(value).split(":").map(Number); assert.ok(parts.every(Number.isFinite), String(value));return parts.reduce((sum, value) => sum*60+value,0); };
  const elapsed = (Date.now()-began)/1000;
  const restAfter = await evaluate("document.querySelector('p.text-2xl.tabular-nums').textContent");
  const durationAfter = await evaluate("document.querySelector('#sport-panel-session p.text-xl.tabular-nums').textContent");
  assert.ok(Math.abs(seconds(restAfter)-Math.max(0,seconds(restBefore)-elapsed))<2.5);
  assert.ok(Math.abs(seconds(durationAfter)-seconds(durationBefore)-elapsed)<2.5);
  result.sessionPreservation = { exactDraftAndCompletedSets: true, focusRestored: true, scrollBefore, restBefore, restAfter, durationBefore, durationAfter, elapsedSeconds: elapsed, resetOrPaused: false, firstPhoto: firstSrc, shared3D: true };
  for (let i=0;i<3;i++) { await click("#sport-panel-session [data-exercise-thumbnail-trigger]");await until(()=>evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-premium-exercise]')"),"reopen sheet");await click("[data-guide-close]");await until(()=>evaluate("!document.querySelector('[data-exercise-guide-dialog]')"),"close sheet");assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"),draftBefore); }
  // Information icon and photograph deliberately share the same component and stable request key.
  await click("#sport-panel-session .exercise-session-name-row .exercise-guide-button:not([data-exercise-thumbnail-trigger])");
  await until(()=>evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-premium-exercise]')"),"information button same guide");
  assert.equal(await evaluate("document.querySelector('[data-premium-exercise]').dataset.premiumExercise"),ids[0]);
  await click("[data-guide-close]");
  result.repeatedOpeningAndInfoButton = true;
  // Reordering and adding/removing an empty set must keep the entered data intact.
  const firstCard = "document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').closest('.rounded-2xl')";
  await evaluate(`Array.from(${firstCard}.querySelectorAll('button')).find(button=>button.textContent.includes('+ Série')).click()`);
  await until(()=>evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets.length===3"),"add set");
  await evaluate(`${firstCard}.querySelector('button[aria-label="Supprimer la série 3"]').click()`);
  await until(()=>evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets.length===2"),"remove empty set");
  await evaluate(`${firstCard}.querySelector('.exercise-session-actions summary').click();${firstCard}.querySelectorAll('.exercise-session-actions button')[1].click()`);
  await until(()=>evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[1].id==='qa-0'"),"move exercise down");
  await evaluate("document.querySelector('[data-exercise-thumbnail-trigger=\""+ids[0]+"\"]').closest('.rounded-2xl').querySelector('.exercise-session-actions button').click()");
  await until(()=>evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].id==='qa-0'"),"move exercise back");
  await evaluate(`${firstCard}.querySelector('.exercise-session-actions summary').click()`);
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"),draftBefore);
  result.existingSetAndReorderControls=true;
  console.log("Media V2: session, gallery, nested 3D, timers and draft passed.");

  async function detailCase(id, language, theme, width) {
    profile.language=language;profile.theme=theme;await viewport(width);
    await go(`/sport/exercises/${id}`);await galleryReady();
    const before=await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc");
    await click("[data-gallery-next]");await galleryReady();
    assert.notEqual(await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc"),before);
    await click("[data-gallery-previous]");await galleryReady();
    assert.equal(await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc"),before);
    for (const tab of ["technique","muscles","advice"]) { await click(`[data-premium-tab="${tab}"]`);assert.ok(await evaluate(`!!document.querySelector('[data-premium-tab="${tab}"][aria-selected=true]')`)); }
    assert.ok(await evaluate("document.querySelectorAll('.exercise-steps li').length===4&&document.querySelectorAll('.exercise-prose-list li').length>=4&&document.querySelectorAll('.exercise-premium-muscles li').length>0"));
    await click('[data-premium-tab="demonstration"]');
    const sizes=await evaluate("({viewport:innerWidth,content:document.documentElement.scrollWidth,dir:document.documentElement.dir,tooSmall:Array.from(document.querySelectorAll('.exercise-premium-tabs button,.exercise-gallery-controls button')).some(n=>n.getBoundingClientRect().height<44)})");
    assert.ok(sizes.content<=sizes.viewport+1,JSON.stringify({id,language,theme,width,...sizes}));assert.equal(sizes.tooSmall,false);assert.equal(sizes.dir,language==="ar"?"rtl":"ltr");
    if(language==="fr"&&width===1440) { await evaluate("document.querySelector('[data-photo-gallery]').scrollIntoView({block:'center'})");await shot(`${id}-${theme}-desktop`); }
    if(width===320&&id===ids[0]&&((language==="ar"&&theme==="dark")||(language==="fr"&&theme==="light"))) { await evaluate("document.querySelector('[data-photo-gallery]').scrollIntoView({block:'center'})");await shot(`photos-${language}-${theme}-320`); }
    result.cases.push({id,language,theme,width,positions:true,sections:true,rtl:sizes.dir,touchTargets:true,noOverflow:true});
  }
  for (const language of ["fr","en","ar"]) for (const theme of ["light","dark"]) for (const width of [320,1440]) for (const id of ids) await detailCase(id,language,theme,width);
  for (const width of [390,430,768]) for (const id of ids) await detailCase(id,"ar","dark",width);
  console.log("Media V2: 75 detail layout cases passed.");
  result.sheetCases=[];
  for(const language of ["fr","en","ar"]) for(const theme of ["light","dark"]) for(const width of [320,430,768,1440]) {
    profile.language=language;profile.theme=theme;await viewport(width);await go("/sport/musculation?tab=session");
    await until(()=>evaluate("!!document.querySelector('#sport-panel-session .bg-mood-soft button')"),"resume draft for sheet layout");await click("#sport-panel-session .bg-mood-soft button");
    await until(()=>evaluate("!!document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]')"),"session header");
    assert.ok(await evaluate("!document.querySelector('.exercise-session-name-row p').classList.contains('truncate')"));
    await click("#sport-panel-session [data-exercise-thumbnail-trigger]");await until(()=>evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-premium-exercise]')"),"sheet layout");await galleryReady();
    const layout=await evaluate("(() => {const d=document.querySelector('[data-exercise-guide-dialog]'),r=d.getBoundingClientRect(),c=d.querySelector('[data-guide-close]').getBoundingClientRect();return {width:innerWidth,dialogWidth:r.width,content:d.scrollWidth,client:d.clientWidth,close:{x:c.x,y:c.y,right:c.right,bottom:c.bottom,width:c.width,height:c.height},dir:d.dir}})()");
    assert.ok(layout.content<=layout.client+1,JSON.stringify(layout));assert.equal(layout.dir,language==="ar"?"rtl":"ltr");
    assert.ok(layout.close.x>=0&&layout.close.right<=width+1&&layout.close.y>=0&&layout.close.bottom<=1000&&layout.close.width>=44&&layout.close.height>=44,JSON.stringify(layout));
    await click("[data-guide-expand]");
    if(width<=430) assert.ok(await evaluate("Math.abs(document.querySelector('[data-exercise-guide-dialog]').getBoundingClientRect().height-innerHeight)<2"));
    if(width===320&&language==="fr") await shot(`sheet-fr-${theme}-320`);
    if(width===430&&language==="ar"&&theme==="dark") await shot("sheet-ar-dark-430");
    await click("[data-guide-close]");await until(()=>evaluate("!document.querySelector('[data-exercise-guide-dialog]')"),"close sheet layout");
    assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"),draftBefore);
    result.sheetCases.push({language,theme,width,noOverflow:true,fullScreen:true,closeVisible:true,exactDraftPreserved:true});
  }
  console.log("Media V2: 24 session sheet layout cases passed.");

  // Keyboard tabs/gallery and actual RTL touch, rather than synthetic component state changes.
  profile.language="ar";profile.theme="dark";
  await viewport(390);await go(`/sport/exercises/${ids[0]}`);await galleryReady();
  await evaluate("document.querySelector('[data-gallery-position=\"0\"]').focus()");await key("End");
  assert.equal(await evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex"),"1");
  await key("Home");assert.equal(await evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex"),"0");
  await swipe();await until(()=>evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex==='1'"),"RTL touch swipe",3000);
  await evaluate("document.querySelector('[data-premium-tab=demonstration]').focus()");await key("ArrowLeft");
  assert.equal(await evaluate("document.activeElement?.dataset.premiumTab"),"technique");
  await key("End");assert.equal(await evaluate("document.activeElement?.dataset.premiumTab"),"advice");
  result.keyboardAndRTLTouch=true;
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});await click('[data-premium-tab="demonstration"]');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.exercise-gallery-image')).animationName"),"none");result.reducedMotion=true;
  profile.theme="system";
  const systemColors=[];
  for(const scheme of ["light","dark"]) { await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:scheme}]});await go(`/sport/exercises/${ids[3]}`);await galleryReady();systemColors.push(await evaluate("getComputedStyle(document.body).backgroundColor"));await evaluate("document.querySelector('[data-photo-gallery]').scrollIntoView({block:'center'})");await shot(`system-${scheme}-ar-mobile`); }
  assert.notEqual(systemColors[0],systemColors[1]);result.systemFollowsOS=true;

  profile.theme="dark";profile.language="fr";
  await send("Network.setCacheDisabled",{cacheDisabled:true});
  await send("Network.setBlockedURLs",{urls:["https://*","*incline-dumbbell-press-end.webp*"]});
  await go(`/sport/exercises/${ids[0]}`);
  await click('[data-gallery-position="1"]');
  await until(()=>evaluate("!!document.querySelector('[data-photo-gallery] .sport-media[role=img]')"),"missing photograph fallback");
  assert.ok(await evaluate("document.querySelector('[data-photo-gallery] .sport-media').getBoundingClientRect().height>150"));
  await evaluate("document.querySelector('[data-photo-gallery]').scrollIntoView({block:'center'})");await shot("missing-photo-dark-mobile");
  await click('[data-gallery-position="0"]');await galleryReady();result.missingMediaFallbackAndRecovery=true;
  await send("Network.setBlockedURLs",{urls:["https://*"]});
  await go("/sport/exercises/strength-curl-halteres");
  assert.ok(await evaluate("!!document.querySelector('[data-exercise-detail] > figure')&&!document.querySelector('[data-photo-gallery]')&&!document.querySelector('[data-exercise-positions]')"));
  await go("/sport/exercises/bodyweight-squat");
  assert.ok(await evaluate("!!document.querySelector('[data-exercise-detail] > figure svg')&&!document.querySelector('[data-photo-gallery]')"));
  result.nonPilotsUnchanged=true;
  result.tableWrites=requests.filter((request)=>!["GET","HEAD"].includes(request.method)).length;
  assert.equal(result.tableWrites,0);
  await writeFile(path.join(output,"exercise-media-v2-results.json"),JSON.stringify(result,null,2));
  console.log(`Exercise media V2: ${result.cases.length} locale/theme/viewport cases; real touch, keyboard, draft, timers, nested 3D, fallback, system theme passed.`);
}
