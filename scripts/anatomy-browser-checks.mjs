import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Box3, Group, Mesh, PerspectiveCamera, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { sourceLoader } from "./test-source-loader.mjs";

const source = sourceLoader();
const { ROWING_MUSCLES, CAMERA_LIMITS } = source("src/lib/anatomy/rowing.ts");
const { anatomyCopy } = source("src/lib/anatomy/copy.ts");

// Geometry-based candidate screen points, independently clicked in the real browser.
async function latPoints(aspect, state) {
  const bytes = await readFile("public/models/anatomy/male-mobile.glb");
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  const root = new Group(); root.add(gltf.scene);
  root.scale.setScalar(2 / new Box3().setFromObject(root).getSize(new Vector3()).y);
  root.position.sub(new Box3().setFromObject(root).getCenter(new Vector3()));
  root.updateMatrixWorld(true);
  const camera = new PerspectiveCamera(Number(state.cameraFov), aspect, .05, 40);
  const target = new Vector3(0, Number(state.cameraTargetY), 0);
  const angle = Number(state.cameraAzimuth), polar = Number(state.cameraPolar), distance = Number(state.cameraDistance);
  camera.position.set(Math.sin(angle)*Math.sin(polar)*distance, Math.cos(polar)*distance, Math.cos(angle)*Math.sin(polar)*distance).add(target);
  camera.lookAt(target); camera.updateMatrixWorld(true);
  const points = [];
  root.traverse(object => {
    if (!(object instanceof Mesh) || object.userData.key !== "latissimus_dorsi" || object.userData.side !== "right") return;
    const positions = object.geometry.getAttribute("position"), indices = object.geometry.index;
    const count = indices?.count ?? positions.count;
    const step = Math.max(3, Math.floor(count / 60 / 3) * 3);
    for (let index = 0; index + 2 < count; index += step) {
      const point = new Vector3();
      for (let corner = 0; corner < 3; corner++) point.add(new Vector3().fromBufferAttribute(positions, indices ? indices.getX(index + corner) : index + corner));
      object.localToWorld(point.multiplyScalar(1 / 3)); point.project(camera);
      if (Math.abs(point.x) < .9 && Math.abs(point.y) < .9) points.push({ x: point.x, y: point.y });
    }
  });
  root.traverse(object => { if (object instanceof Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
  return points;
}

export async function checkAnatomy({ send, evaluate, navigatePage, ready, until, pause, results, profile, requests, networkRequests, output, appPort }) {
  profile.language = "fr"; profile.theme = "light";
  const result = results.anatomy = { mode: "Real WebGL2 in Edge with software GPU; local Auth/REST fixtures, not a physical phone", cases: [] };
  const go = async route => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const screenshot = async name => send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then(({ data }) => writeFile(path.join(output, `${name}.png`), Buffer.from(data, "base64")));
  const setInput = (selector, value) => evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const stage = ".anatomy-stage:has(canvas)";
  const azimuth = () => evaluate(`Number(document.querySelector('${stage}')?.dataset.cameraAzimuth)`);
  const distance = () => evaluate(`Number(document.querySelector('${stage}')?.dataset.cameraDistance)`);
  const sceneState = () => evaluate(`({...document.querySelector('${stage}').dataset})`);
  const settle = async () => {
    await until(async ()=>(await sceneState()).transitioning!=="true","Finite camera transition ends",20000);
    // Camera diagnostics and the image are written on the following draw RAF.
    await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))");
  };
  const command = async name => {
    const previous = await azimuth();
    await click(`[data-anatomy-command="${name}"]`);
    const target = name === "front" ? 0 : name === "back" || name === "reset" ? Math.PI : name === "left" ? previous + Math.PI/8 : name === "right" ? previous - Math.PI/8 : null;
    if(target!==null) await until(async()=>{const actual=await azimuth();return Math.abs(Math.atan2(Math.sin(actual-target),Math.cos(actual-target)))<.004;}, `camera command ${name}`,15000);
    await settle();
  };
  const open = async () => { await click("[data-anatomy-open]"); await until(() => evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='ready'"), "real 3D anatomy ready", 60000); await pause(350); };
  const close = async () => { await click("[data-anatomy-close]"); await until(() => evaluate("!document.querySelector('[data-muscle-dialog]')"), "muscle dialog removed"); };
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const route of ["/dashboard", "/nutrition", "/sport/musculation"]) { await go(route); assert.ok(!await evaluate("!!document.querySelector('[data-anatomy-viewer] canvas')")); }
  assert.ok(!networkRequests.some(url=>url.includes("/models/anatomy/") && url.includes(".glb")), "No GLB requested on ordinary pages");
  result.noModelBeforeOpening = true;
  await until(() => evaluate("(() => { if(document.querySelector('input[aria-label=\"Nom de la séance\"]'))return true;const button=Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('Séance libre')); const key=button && Object.keys(button).find(key=>key.startsWith('__reactProps$')); return key && typeof button[key].onClick==='function'; })()"), "free session hydration");
  if(!await evaluate("!!document.querySelector('input[aria-label=\"Nom de la séance\"]')")) await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('Séance libre')).click()");
  await until(() => evaluate("!!document.querySelector('input[aria-label=\"Nom de la séance\"]')"), "session draft");
  await setInput('input[aria-label="Nom de la séance"]', "QA anatomy session");
  const placeholder = await evaluate("Array.from(document.querySelectorAll('input')).find(input=>input.placeholder && /exercice/.test(input.placeholder))?.placeholder");
  await setInput(`input[placeholder=${JSON.stringify(placeholder)}]`, "Rowing");
  await until(() => evaluate("Array.from(document.querySelectorAll('#sport-panel-session li')).some(li=>li.textContent.includes('Rowing haltère unilatéral'))"), "exact exercise pick");
  await evaluate("Array.from(document.querySelectorAll('#sport-panel-session li')).find(li=>li.textContent.includes('Rowing haltère unilatéral')).querySelector('button').click()");
  await until(() => evaluate("!!document.querySelector('[data-anatomy-open]')"), "pilot access");
  assert.equal(await evaluate("document.querySelectorAll('[data-anatomy-open]').length"), 1);
  await evaluate("(() => { const card=document.querySelector('[data-anatomy-open]').closest('.rounded-2xl'); const inputs=card.querySelectorAll('input[type=number]'); for(const [index,value] of [[0,'22.5'],[1,'12']]) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[index],value); inputs[index].dispatchEvent(new Event('input',{bubbles:true})); } })()");
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')||'{}').exercises?.[0]?.sets?.[0]?.reps==='12'"), "set values persisted");
  await evaluate("document.querySelector('[data-anatomy-open]').closest('.rounded-2xl').querySelector('button[aria-pressed=false]').click()");
  await until(() => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1')||'{}').exercises?.[0]?.sets?.[0]?.done===true"), "validated series draft");
  const draft = await evaluate("localStorage.getItem('strength-draft-v1')");
  await evaluate("(() => { window.qaAnatomyInput=document.querySelector('input[aria-label=\"Nom de la séance\"]'); window.qaAnatomyTrigger=document.querySelector('[data-anatomy-open]'); window.qaRest=document.querySelector('p.text-2xl.tabular-nums'); window.qaRestBefore=window.qaRest?.textContent; })()");
  const readsBefore = requests.filter(request=>request.resource.startsWith("/rest/v1/")).length;
  const timerBegan = Date.now();
  await send("HeapProfiler.collectGarbage");
  const heap = async () => (await send("Runtime.getHeapUsage")).usedSize;
  const heapBefore = await heap();
  await open();
  assert.equal(await evaluate(`document.querySelector('${stage}').dataset.meshCount`), "221");
  assert.ok(networkRequests.some(url=>url.includes("male-mobile.glb")));
  await pause(1400);
  assert.ok(await evaluate("window.qaRest?.isConnected && window.qaRest.textContent!==window.qaRestBefore"), "Rest timer continues under the modal");
  result.timerContinues = true;
  assert.equal(requests.filter(request=>request.resource.startsWith("/rest/v1/")).length, readsBefore, "Opening anatomy must not query or write Supabase tables");
  result.noSupabaseReadOrWriteOnOpen = true;
  result.initialScene = await sceneState();
  result.defaultBack = Math.cos(await azimuth()) < -.99;
  assert.ok(result.defaultBack, "Rowing opens in back view");
  assert.equal(result.initialScene.framing, "upperBody");
  const initialDistance = await distance();
  const framingSize = await evaluate(`(() => {const r=document.querySelector('${stage}').getBoundingClientRect();return {width:r.width,height:r.height};})()`);
  const oldPoints = await latPoints(framingSize.width/390,{cameraFov:36,cameraAzimuth:Math.PI,cameraPolar:Math.PI/2,cameraDistance:3.7,cameraTargetY:0});
  const newPoints = await latPoints(framingSize.width/framingSize.height,result.initialScene);
  const extent = points => (Math.max(...points.map(point=>point.x))-Math.min(...points.map(point=>point.x)))*.5*framingSize.width;
  result.framingComparison = { method:"Same actual right-lat triangle centroids projected with old 390px full-body stage/camera and V2 focused stage/camera, at same stage width; not a body deformation",oldLatWidthPx:extent(oldPoints),newLatWidthPx:extent(newPoints) };
  assert.ok(result.framingComparison.newLatWidthPx>result.framingComparison.oldLatWidthPx*1.2,"Focused lat region must be visibly larger than V1");
  await command("fullBody");
  assert.equal((await sceneState()).framing,"fullBody");
  assert.ok((await distance()) > initialDistance, "Whole body framing pulls camera back");
  await command("reset");
  assert.equal((await sceneState()).framing,"upperBody");
  assert.ok(Math.abs((await distance()) - initialDistance) < .01);
  result.focusAndFullBody = true;
  const idleFrames = await evaluate(`document.querySelector('${stage}').dataset.renderFrames`); await pause(750);
  assert.equal(await evaluate(`document.querySelector('${stage}').dataset.renderFrames`), idleFrames, "No continuous idle rendering"); result.idleRenderingStopped = true;
  const initial = await azimuth(); await command("left"); assert.ok(Math.abs((await azimuth())-initial)>.1); await command("right");
  await command("front"); assert.ok(Math.abs(Math.sin(await azimuth()))<.01 && Math.cos(await azimuth())>.99);
  await command("back"); assert.ok(Math.abs(Math.sin(await azimuth()))<.01 && Math.cos(await azimuth())<-.99);
  result.viewButtons = true;
  await evaluate(`document.querySelector('${stage}').scrollIntoView({block:'center'})`); await pause(200);
  let rect = await evaluate(`(() => { const r=document.querySelector('${stage} canvas').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()`);
  let before = await azimuth();
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x+rect.width*.5, y: rect.y+rect.height*.5, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x+rect.width*.7, y: rect.y+rect.height*.5, button: "left", buttons: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x+rect.width*.7, y: rect.y+rect.height*.5, button: "left", buttons: 0, clickCount: 1 }); await pause(150);
  assert.ok(Math.abs((await azimuth())-before)>.05); result.mouseRotation = true;
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 }); before = await azimuth();
  const center = { x: rect.x+rect.width*.5, y: rect.y+rect.height*.55 };
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...center, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: center.x-50, y: center.y, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await pause(150);
  assert.ok(Math.abs((await azimuth())-before)>.05); result.touchRotation = true;
  await command("reset");
  let beforeDistance = await distance();
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x:center.x-30,y:center.y,id:1 }, { x:center.x+30,y:center.y,id:2 }] });
  await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x:center.x-65,y:center.y,id:1 }, { x:center.x+65,y:center.y,id:2 }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await pause(150);
  assert.ok((await distance())<beforeDistance-.05); result.pinchZoom = true;
  for(let index=0;index<15;index++) { await command("zoomIn"); }
  assert.ok((await distance())>=CAMERA_LIMITS.minDistance-.01);
  assert.ok(Math.abs((await distance())-CAMERA_LIMITS.minDistance)<.02, "Zoom in reaches near bound");
  for(let index=0;index<15;index++) { await command("zoomOut"); }
  assert.ok((await distance())<=CAMERA_LIMITS.maxDistance+.01);
  assert.ok(Math.abs((await distance())-CAMERA_LIMITS.maxDistance)<.02, "Zoom out reaches far bound");
  await command("reset"); assert.ok(Math.abs((await distance())-initialDistance)<.01); result.zoomBoundsAndReset = true;
  // Change away from the default selection, then raycast a real projected lat mesh.
  await click('[data-anatomy-muscle="biceps"]');
  rect = await evaluate(`(() => { const r=document.querySelector('${stage} canvas').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()`);
  let meshPicked=false;
  for (const point of await latPoints(rect.width/rect.height, await sceneState())) {
    const x=rect.x+(point.x+1)*.5*rect.width, y=rect.y+(1-point.y)*.5*rect.height;
    await send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1});
    await send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1}); await pause(40);
    if(await evaluate("document.querySelector('[data-anatomy-selection]')?.dataset.anatomySelection==='lats'")){meshPicked=true;break;}
  }
  assert.ok(meshPicked,"Clicking an actual lat mesh must select its documented muscle"); result.actualMeshSelection=true;
  result.selectionDetails = [];
  for (const group of ROWING_MUSCLES) {
    await click(`[data-anatomy-muscle="${group.id}"]`);
    const actual = await evaluate("(() => {const panel=document.querySelector('[data-anatomy-selection]');return {id:panel.dataset.anatomySelection,name:panel.querySelector('h3').textContent,description:panel.querySelector('[data-anatomy-description]').textContent,category:panel.dataset.anatomyRole,action:panel.querySelector('[data-anatomy-action]').textContent};})()");
    const expected = anatomyCopy("fr").muscles[group.id];
    assert.deepEqual(actual, { id: group.id, name: expected.name, description: expected.description, category:group.role, action:anatomyCopy("fr").actions[group.id] });
    result.selectionDetails.push({ ...actual, role: group.role });
  }
  await click('[data-anatomy-muscle="rhomboids"]');
  assert.ok(await evaluate("document.querySelector('[data-anatomy-selection]').textContent.includes('Rhomboïdes')"));
  await screenshot("anatomy-rhomboids");
  await click('[data-anatomy-muscle="lats"]');
  await click('[data-anatomy-side="left"]'); assert.ok(await evaluate("document.querySelector('[data-anatomy-side=left]').getAttribute('aria-pressed')==='true'"));
  await click('[data-anatomy-colors]'); assert.ok(await evaluate("!document.querySelector('[data-anatomy-colors]').checked"));
  await click('[data-anatomy-colors]'); await click('[data-anatomy-side="right"]'); result.sideAndColorControls=true;
  const previousHeight=await evaluate("document.querySelector('[data-muscle-dialog]').getBoundingClientRect().height"); await click('[data-anatomy-expand]'); await pause(100);
  assert.ok(await evaluate(`document.querySelector('[data-muscle-dialog]').getBoundingClientRect().height>${previousHeight}+40`)); result.expandableSheet=true;
  await click('[data-anatomy-tab="technique"]'); await pause(150);
  const paused=await evaluate(`document.querySelector('${stage}').dataset.renderFrames`); await pause(400); assert.equal(await evaluate(`document.querySelector('${stage}').dataset.renderFrames`),paused);
  await click('[data-anatomy-tab="mistakes"]'); await click('[data-anatomy-tab="tips"]'); await click('[data-anatomy-tab="muscles"]');
  await evaluate(`(() => {window.qaAnatomyContext=document.querySelector('${stage} canvas').getContext('webgl2');})()`);
  await close(); await pause(100);
  const timer = await evaluate("({before:window.qaRestBefore,after:window.qaRest?.textContent})");
  const seconds = value => { const match=String(value).match(/^(\d+):(\d+)$/);return match?Number(match[1])*60+Number(match[2]):0; };
  const elapsed = (Date.now()-timerBegan)/1000;
  assert.ok(Math.abs(seconds(timer.after)-Math.max(0,seconds(timer.before)-elapsed))<2.5, JSON.stringify({timer,elapsed}));
  result.timerBeforeAfter = { ...timer, elapsedSeconds: elapsed, pausedOrReset: false };
  assert.ok(await evaluate("document.activeElement===window.qaAnatomyTrigger && document.querySelector('input[aria-label=\"Nom de la séance\"]')===window.qaAnatomyInput"));
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"),draft);
  assert.ok(!await evaluate("!!document.querySelector('[data-anatomy-viewer] canvas')")); result.draftSeriesFocusAndDisposal=true;
  await until(()=>evaluate("window.qaAnatomyContext.isContextLost()"),"WebGL resources released after closing");
  await send("HeapProfiler.collectGarbage");
  result.memory = { method: "Edge CDP JavaScript heap after forced GC; software GPU, excludes GPU allocations and is not a phone measurement", beforeOpen: heapBefore, afterFirstClose: await heap(), cycles: [] };
  for (let index=0;index<3;index++) {
    await open();
    const scene = await sceneState();
    const resources = await evaluate(`(() => {const canvas=document.querySelector('${stage} canvas');window.qaAnatomyContext=canvas.getContext('webgl2');return {canvases:document.querySelectorAll('[data-anatomy-viewer] canvas').length};})()`);
    assert.equal(resources.canvases,1);
    await close();
    await until(()=>evaluate("window.qaAnatomyContext.isContextLost()"),"Repeated close releases context");
    await send("HeapProfiler.collectGarbage");
    result.memory.cycles.push({ index:index+1, heapAfterClose:await heap(), scene });
    assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"),draft);
  }
  result.repeatedOpenClose = true;
  // Language/theme/mobile layout matrix on the stable guide page.
  for(const language of ["fr","en","ar"]) for(const theme of ["light","dark"]){
    profile.language=language;profile.theme=theme;
    await go("/sport/exercises/strength-rowing-haltere-unilateral"); await open();
    const copy = anatomyCopy(language);
    const credit = await evaluate("document.querySelector('.anatomy-credit').textContent");
    assert.ok(credit.includes(copy.ui.credit) && credit.includes(copy.ui.adaptation) && credit.includes('CC BY-SA 4.0'));
    assert.ok(await evaluate("!!document.querySelector('.anatomy-credit a[href=\"/models/anatomy/SOURCE.json\"]')"));
    for (const group of ROWING_MUSCLES) {
      await click(`[data-anatomy-muscle="${group.id}"]`);
      assert.equal(await evaluate("document.querySelector('[data-anatomy-selection] h3').textContent"), copy.muscles[group.id].name);
      assert.equal(await evaluate("document.querySelector('[data-anatomy-description]').textContent"), copy.muscles[group.id].description);
      assert.equal(await evaluate("document.querySelector('[data-anatomy-selection]').dataset.anatomyRole"),group.role);
      assert.equal(await evaluate("document.querySelector('[data-anatomy-action]').textContent"),copy.actions[group.id]);
    }
    await click('[data-anatomy-muscle="lats"]');
    for(const width of [320,390,430,1440]){
      await send("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<768});await pause(130);
      const size=await evaluate("(() => {const d=document.querySelector('[data-muscle-dialog]');return {viewport:innerWidth,content:document.documentElement.scrollWidth,dialog:d.clientWidth,scroll:d.scrollWidth};})()");
      assert.ok(size.content<=size.viewport+1 && size.scroll<=size.dialog+1,JSON.stringify({language,theme,width,...size}));
      await command("reset");
      const scene = await sceneState();
      assert.equal(scene.framing,"upperBody");
      assert.ok(Number(scene.pixelRatio)<=2, "GPU pixel ratio is capped");
      assert.ok(Number(scene.drawingWidth)*Number(scene.drawingHeight)<=CAMERA_LIMITS.maxRenderPixels+1,"Drawing buffer stays within pixel budget");
      assert.ok(Number(scene.renderCalls)<=221,"No added shadow or postprocess draw passes");
      result.cases.push({language,theme,width,...size,scene});
      if(width===390&&(language==="fr"||language==="ar"))await screenshot(`anatomy-${language}-${theme}`);
      if(width===390&&language==="fr") {
        await command("front");await screenshot(`anatomy-front-${theme}`);
        await command("fullBody");await screenshot(`anatomy-full-body-${theme}`);
        await command("reset");
        await evaluate("document.querySelector('[data-anatomy-selection]').scrollIntoView({block:'center'})");await pause(150);await screenshot(`anatomy-information-${theme}`);
        await evaluate("document.querySelector('[data-muscle-dialog]').scrollTop=0");await pause(200);
      }
      if(width===1440&&language==="fr")await screenshot(`anatomy-desktop-${theme}`);
    }
    for (const {width,height} of [{width:320,height:568},{width:568,height:320}]) {
      await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:true});
      await pause(150);
      await command("reset");
      const layout = await evaluate("(() => {const d=document.querySelector('[data-muscle-dialog]'),c=d.querySelector('[data-anatomy-close]').getBoundingClientRect();return {viewport:innerWidth,content:document.documentElement.scrollWidth,dialog:d.clientWidth,scroll:d.scrollWidth,closeTop:c.top,closeBottom:c.bottom};})()");
      assert.ok(layout.content<=layout.viewport+1 && layout.scroll<=layout.dialog+1,JSON.stringify({language,theme,width,height,...layout}));
      assert.ok(layout.closeTop>=0 && layout.closeBottom<=height+1,"Closing control stays accessible in short/landscape sheet");
      result.cases.push({language,theme,width,height,...layout,scene:await sceneState()});
    }
    await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});await pause(150);
    if(language==="fr") {await evaluate("document.querySelector('.anatomy-credit').scrollIntoView({block:'end'})");await pause(100);await screenshot(`anatomy-credits-${theme}`);}
    assert.equal(await evaluate("document.documentElement.dir"),language==="ar"?"rtl":"ltr");
    await close();
  }
  profile.language="fr";profile.theme="system";await go("/sport/exercises/strength-rowing-haltere-unilateral");await open();
  const notices=await evaluate("Promise.all(['/models/anatomy/LICENSE-CC-BY-SA-4.0.txt','/models/anatomy/ATTRIBUTION-UPSTREAM.txt','/models/anatomy/SOURCE.json'].map(async url=>{const response=await fetch(url);return {url,status:response.status,body:await response.text()};}))");
  assert.ok(notices.every(notice=>notice.status===200));
  assert.ok(notices[0].body.startsWith('Attribution-ShareAlike 4.0 International'));
  assert.ok(notices[1].body.includes('Kousaku Okubo')&&notices[1].body.includes('CHANGES MADE'));
  assert.equal(JSON.parse(notices[2].body).sha256,'d80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54');
  result.creditsLicenseAndAdaptation=true;
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await pause(200);await command("reset");
  result.highResolutionScene=await sceneState();
  assert.ok(Number(result.highResolutionScene.pixelRatio)<=2 && Number(result.highResolutionScene.pixelRatio)>1,"High DPI stays sharp within capped GPU budget");
  for(const scheme of ["light","dark"]) {await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:scheme},{name:"prefers-reduced-motion",value:"reduce"}]});await pause(150);}
  assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-muscle-dialog]')).animationName"),"none");result.systemAndReducedMotion=true;
  // A real lost WebGL context is converted to an explicit, usable 2D fallback.
  await evaluate(`document.querySelector('${stage} canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`);
  await until(()=>evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='fallback'"),"lost context fallback");
  assert.ok(!await evaluate("!!document.querySelector('[data-anatomy-viewer] canvas')"));result.contextLossFallback=true;await close();
  const {identifier}=await send("Page.addScriptToEvaluateOnNewDocument",{source:"(() => {const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl'||kind==='webgl2')return null;return original.call(this,kind,...args);};})()"});
  await go("/sport/exercises/strength-rowing-haltere-unilateral");await click("[data-anatomy-open]");
  await until(()=>evaluate("document.querySelector('[data-anatomy-status]')?.dataset.anatomyStatus==='fallback'"),"no WebGL fallback");
  assert.ok(await evaluate("document.querySelector('[data-muscle-dialog]').innerText.includes('2D') && !document.querySelector('[data-anatomy-command=left]')"));
  await click('[data-anatomy-command="front"]');await click('[data-anatomy-muscle="biceps"]');assert.equal(await evaluate("document.querySelector('[data-anatomy-selection]').dataset.anatomySelection"),"biceps");
  await screenshot("anatomy-fallback");result.noWebGLFallback=true;await close();await send("Page.removeScriptToEvaluateOnNewDocument",{identifier});
  await go("/sport/exercises/strength-curl-halteres");assert.ok(!await evaluate("!!document.querySelector('[data-anatomy-open]')"));result.pilotOnly=true;
  console.log(`Anatomy: real meshes, mouse/touch/pinch, timer and draft, fallback and ${result.cases.length} locale/theme/width cases passed.`);
}
