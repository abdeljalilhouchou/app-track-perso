import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sourceLoader } from "./test-source-loader.mjs";
import { checkExerciseMedia as checkOriginalPilots } from "./exercise-media-v2-browser-checks.mjs";

export async function checkExerciseMedia(context) {
  // Reuse the existing draft/timer/keyboard/3D and five-pilot regression campaign.
  if(!process.argv.includes("--skip-pilot-checks"))await checkOriginalPilots(context);
  const {send,evaluate,navigatePage,ready,pause,results,profile,requests,networkRequests,output,appPort}=context;
  const until=(check,label,timeout=15000)=>context.until(check,label,timeout);
  const load=sourceLoader();
  const {EXERCISE_V3_IDS:ids}=load("src/lib/exercises/media-v3-index.ts");
  const {EXERCISE_VISUAL_MEDIA:media}=load("src/lib/exercises/media-registry.ts");
  const {mediaGalleryFrames}=load("src/lib/exercises/media-experience.ts");
  const {baseCatalog}=load("src/lib/exercises/catalog.ts");
  const catalog=baseCatalog("fr");
  const result=results.exerciseMediaV3={cases:[],mode:"Actual application in Edge headless, local auth/REST fixtures; no production data or physical phone"};
  const go=async(route)=>{await navigatePage(`http://127.0.0.1:${appPort}${route}`);await ready(route.split("?")[0]);};
  const click=(selector)=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const size=(width,height=width<768?844:1000)=>send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<768});
  const photoReady=()=>until(()=>evaluate("!!document.querySelector('[data-gallery-main] img')?.naturalWidth"),"V3 photograph decoded",20000);
  const screenshot=async(name)=>{await pause(220);const {data}=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await sharp(Buffer.from(data,"base64")).webp({quality:84}).toFile(path.join(output,`v3-${name}.webp`));};
  const imagePath=(url)=>{const p=new URL(url);return p.pathname==="/_next/image"?p.searchParams.get("url"):p.pathname;};
  const input=(selector,value)=>evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,${JSON.stringify(value)});n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await send("Network.setCacheDisabled",{cacheDisabled:false});
  await send("Emulation.setEmulatedMedia",{features:[]});
  profile.language="fr";profile.theme="light";await size(390);
  const libraryBegin=networkRequests.length;
  await go("/sport/exercises");
  await until(()=>evaluate("!!document.querySelector('[data-exercise-results]')"),"catalog results");
  for(let page=0;page<3;page++){await evaluate("document.querySelector('[data-exercise-library] > button')?.click()");await pause(60);}
  await until(()=>evaluate("document.querySelectorAll('[data-exercise-results] img').length===22"),"22 actual catalog thumbnails");
  await until(()=>evaluate("Array.from(document.querySelectorAll('[data-exercise-results] img')).some(i=>i.complete&&i.naturalWidth>0)"),"visible catalog thumbnails");
  assert.ok(await evaluate("document.querySelector('[data-catalog-composition]').textContent.includes('80')&&document.querySelector('[data-catalog-composition]').textContent.includes('70')"));
  assert.ok(await evaluate("Array.from(document.querySelectorAll('[data-exercise-results] img')).every(i=>decodeURIComponent(i.getAttribute('src')).includes('/thumbnails/'))"));
  const libraryImages=networkRequests.slice(libraryBegin).map(imagePath).filter(p=>p?.startsWith("/images/exercises/"));
  assert.ok(libraryImages.every(p=>p.includes("/thumbnails/")),JSON.stringify(libraryImages));
  result.library={fixtureTotal:80,versioned:70,photos:22,personal:10,actualProductionCompositionRead:false,largeImagesRequested:false};
  await screenshot("library-light");
  await go("/sport/musculation?tab=program");
  await until(()=>evaluate("!!document.querySelector('#sport-panel-program button[aria-expanded]')"),"versioned program fixture");
  await click("#sport-panel-program button[aria-expanded]");
  await until(()=>evaluate("!!document.querySelector('#sport-panel-program [data-exercise-thumbnail-trigger=\"strength-developpe-couche-barre\"] img')?.naturalWidth"),"new program thumbnail");
  await screenshot("program-light");
  await click('#sport-panel-program [data-exercise-thumbnail-trigger="strength-developpe-couche-barre"]');
  await until(()=>evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-photo-gallery]')"),"program thumbnail opens existing sheet");await photoReady();await click("[data-guide-close]");
  assert.ok(await evaluate("document.querySelector('#sport-panel-program button[aria-expanded]').getAttribute('aria-expanded')==='true'"));
  result.programThumbnailAndExpansionPreserved=true;

  const seed={name:"Séance — Lot visuel V3",templateId:null,muscleGroups:["Pectoraux","Dos","Épaules","Biceps","Triceps","Quadriceps","Ischio-jambiers","Mollets","Abdominaux"],startedAt:Date.now()-306000,exercises:ids.map((id,index)=>{const item=catalog.find(x=>x.key===id);return {id:`v3-${index}`,name:item.storedName,muscle:item.primary[0],targetReps:12,sets:[{weight:"20",reps:"12",done:false},{weight:"",reps:"",done:false}]};})};
  await evaluate(`localStorage.setItem('strength-draft-v1',${JSON.stringify(JSON.stringify(seed))})`);
  await go("/sport/musculation?tab=session");await until(()=>evaluate("!!document.querySelector('#sport-panel-session .bg-mood-soft button')"),"resume new local draft");await click("#sport-panel-session .bg-mood-soft button");
  await until(()=>evaluate("document.querySelectorAll('#sport-panel-session [data-exercise-thumbnail-trigger]').length===15"),"15 actual new session thumbnails");
  const firstCard="document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').closest('.rounded-2xl')";
  await input('#sport-panel-session .exercise-session-overview + div + div input[type="number"]',"32.5");
  await evaluate(`(()=>{const n=${firstCard}.querySelectorAll('input[type=number]')[1];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'9');n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`${firstCard}.querySelector('button[aria-pressed=false]').click()`);
  await until(()=>evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')).exercises[0].sets[0].done"),"new session values saved");
  const draft=await evaluate("localStorage.getItem('strength-draft-v1')");
  const restBefore=await evaluate("document.querySelector('p.text-2xl.tabular-nums').textContent"),began=Date.now();
  await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').focus({preventScroll:true})");
  const scrollBefore=await evaluate("scrollY");
  await screenshot("session-thumbnails-light");
  const openStart=networkRequests.length;
  await click("#sport-panel-session [data-exercise-thumbnail-trigger]");
  await until(()=>evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-photo-gallery]')"),"new exercise shared sheet");await photoReady();
  assert.ok(!networkRequests.slice(openStart).some(url=>url.includes(".glb")),"No 3D request from photo browsing");
  await click('[data-gallery-position="0"]');await photoReady();await click("[data-gallery-next]");await photoReady();
  for(const tab of ["technique","advice","muscles"])await click(`[data-premium-tab="${tab}"]`);
  assert.equal(await evaluate("document.querySelector('[data-exercise-guide-dialog] [data-anatomy-open]').dataset.anatomyOpen"),ids[0]);
  const before3D=requests.filter(r=>r.resource.startsWith("/rest/v1/")).length;
  await click("[data-exercise-guide-dialog] [data-anatomy-open]");await until(()=>evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"),"new media existing anatomy",60000);
  await click("[data-anatomy-close]");assert.ok(await evaluate("!!document.querySelector('[data-exercise-guide-dialog][open]')"));
  assert.equal(requests.filter(r=>r.resource.startsWith("/rest/v1/")).length,before3D);
  await click("[data-guide-close]");await until(()=>evaluate("!document.querySelector('[data-exercise-guide-dialog]')"),"sheet closing animation complete");
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"),draft);
  assert.ok(Math.abs(await evaluate("scrollY")-scrollBefore)<=1);
  assert.equal(await evaluate("document.activeElement?.dataset.exerciseThumbnailTrigger"),ids[0]);
  const restAfter=await evaluate("document.querySelector('p.text-2xl.tabular-nums').textContent"),elapsed=(Date.now()-began)/1000;
  const seconds=v=>String(v).split(":").map(Number).reduce((s,n)=>s*60+n,0);
  assert.ok(Math.abs(seconds(restAfter)-Math.max(0,seconds(restBefore)-elapsed))<2.5);
  result.session={exactDraftPreserved:true,enteredWeight:"32.5",enteredReps:"9",validatedSetPreserved:true,all15Thumbnails:true,restBefore,restAfter,elapsedSeconds:elapsed,scrollRestored:true,focusRestored:true,existing3D:true,no3DWrites:true};
  // Tall desktop viewport makes the underlying live session and the actual modal visible together.
  await size(1440,1600);await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-160)");
  await click("#sport-panel-session [data-exercise-thumbnail-trigger]");await until(()=>evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-photo-gallery]')"),"live session/gallery screenshot");await photoReady();await screenshot("session-gallery-light");await click("[data-guide-close]");

  async function detailCase(id,language,theme,width){
    profile.language=language;profile.theme=theme;await size(width);await go(`/sport/exercises/${id}`);await photoReady();
    const frame=await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc");assert.equal(frame,mediaGalleryFrames(media[id])[0].src);
    const isStatic=id==="strength-gainage-planche";
    assert.equal(await evaluate("document.querySelectorAll('[data-gallery-position]').length"),isStatic?0:2);
    if(!isStatic){await click("[data-gallery-next]");await until(()=>evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex==='1'"),"arrival selected");await photoReady();assert.notEqual(await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc"),frame);await click("[data-gallery-previous]");await until(()=>evaluate("document.querySelector('[data-photo-gallery]').dataset.galleryIndex==='0'"),"departure selected");await photoReady();assert.equal(await evaluate("document.querySelector('[data-photo-gallery]').dataset.gallerySrc"),frame);}
    assert.equal(await evaluate("document.querySelectorAll('[data-gallery-main] img').length"),1);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-gallery-main] img')).objectFit"),"contain");
    for(const tab of ["technique","advice","muscles"]){await click(`[data-premium-tab="${tab}"]`);assert.equal(await evaluate(`document.querySelector('[data-premium-tab="${tab}"]').getAttribute('aria-selected')`),"true");}
    assert.equal(await evaluate("document.querySelector('[data-anatomy-open]').dataset.anatomyOpen"),id);
    assert.ok(await evaluate("document.querySelectorAll('.exercise-steps li').length===4&&document.querySelectorAll('.exercise-prose-list li').length>=4&&document.querySelectorAll('.exercise-premium-muscles li').length>0"));
    await click('[data-premium-tab="demonstration"]');
    const layout=await evaluate("({width:innerWidth,content:document.documentElement.scrollWidth,dir:document.documentElement.dir,small:Array.from(document.querySelectorAll('.exercise-premium-tabs button,.exercise-gallery-controls button')).some(n=>n.getBoundingClientRect().height<44)})");
    assert.ok(layout.content<=layout.width+1,JSON.stringify({id,language,theme,...layout}));assert.equal(layout.small,false);assert.equal(layout.dir,language==="ar"?"rtl":"ltr");
    if(language==="fr"&&width===1440){await evaluate("document.querySelector('[data-photo-gallery]').scrollIntoView({block:'center',behavior:'instant'})");await screenshot(`${id}-${theme}-desktop`);}
    if(width===320&&[ids[0],ids[6],ids[8],ids[14]].includes(id)&&((language==="fr"&&theme==="light")||(language==="ar"&&theme==="dark"))){await evaluate("document.querySelector('[data-photo-gallery]').scrollIntoView({block:'center',behavior:'instant'})");await screenshot(`${id}-${language}-${theme}-320`);}
    result.cases.push({id,language,theme,width,frames:isStatic?1:2,noOverflow:true,correctAnatomy:true,completeSections:true,touchTargets:true});
  }
  for(const language of ["fr","en","ar"])for(const theme of ["light","dark"])for(const width of [320,1440])for(const id of ids)await detailCase(id,language,theme,width);
  for(const id of ids)await detailCase(id,"ar","dark",768);
  for(const [index,id] of [ids[0],ids[3],ids[6],ids[8],ids[14]].entries())await detailCase(id,index%2?"en":"fr",index%2?"light":"dark",index%2?390:430);
  console.log(`Media V3: ${result.cases.length} new locale/theme/viewport layouts passed.`);

  profile.theme="dark";profile.language="fr";await size(390);await go("/sport/musculation?tab=session");await until(()=>evaluate("!!document.querySelector('#sport-panel-session .bg-mood-soft button')"),"resume dark local draft");await click("#sport-panel-session .bg-mood-soft button");
  await until(()=>evaluate("document.querySelectorAll('#sport-panel-session [data-exercise-thumbnail-trigger]').length===15"),"dark live session");await screenshot("session-thumbnails-dark");
  await size(1440,1600);await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-160)");
  await click("#sport-panel-session [data-exercise-thumbnail-trigger]");await until(()=>evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-photo-gallery]')"),"dark live gallery");await photoReady();await screenshot("session-gallery-dark");await click("[data-guide-close]");
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"),draft);
  await size(390);await send("Network.setCacheDisabled",{cacheDisabled:true});await send("Network.setBlockedURLs",{urls:["https://*","*strength-curl-marteau-end.webp*"]});
  await go("/sport/exercises/strength-curl-marteau");await click('[data-gallery-position="1"]');await until(()=>evaluate("!!document.querySelector('[data-gallery-main] .sport-media[role=img]')"),"missing new photo fallback");await screenshot("missing-photo-dark");
  await click('[data-gallery-position="0"]');await photoReady();await send("Network.setBlockedURLs",{urls:["https://*"]});result.missingPhotoFallbackAndRecovery=true;
  profile.language="ar";profile.theme="system";const colors=[];
  for(const scheme of ["light","dark"]){await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:scheme}]});await go("/sport/exercises/strength-gainage-planche");await photoReady();colors.push(await evaluate("getComputedStyle(document.body).backgroundColor"));await screenshot(`static-plank-system-${scheme}-ar`);}
  assert.notEqual(colors[0],colors[1]);result.systemThemeAndStaticPhoto=true;
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.exercise-gallery-image')).animationName"),"none");result.reducedMotion=true;
  result.tableWrites=requests.filter(r=>!["GET","HEAD"].includes(r.method)).length;assert.equal(result.tableWrites,0);
  await writeFile(path.join(output,"exercise-media-v3-results.json"),JSON.stringify(result,null,2)+"\n");
  console.log("Media V3: library/program/session, draft, timers, 3D, missing media and system theme passed.");
}
