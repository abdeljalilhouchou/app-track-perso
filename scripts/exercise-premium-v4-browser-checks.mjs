import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Visual and parity campaign for the v4 session card and exercise sheet.
 * Same harness as the v3 checks: Edge headless, local auth/REST fixtures only.
 * `--shots-prefix=before|after` names the screenshots so both states can be compared.
 * `--width=390` restricts the matrix to one width for fast interaction debugging.
 * `--shots-only` skips the v4-specific interactions (used to capture the previous UI).
 */
export async function checkExercisePremiumV4({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, requests, output, appPort }) {
  const prefix = (process.argv.find((value) => value.startsWith("--shots-prefix=")) ?? "--shots-prefix=after").split("=")[1];
  const result = results.exercisePremiumV4 = { prefix, cases: [], screenshots: [], mode: "Actual application, Edge headless, local fixtures only" };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const shot = async (name) => {
    await pause(320);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = `v4-${prefix}-${name}.webp`;
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, file));
    result.screenshots.push(file);
  };
  const seed = { name: "Séance de démonstration", templateId: null, muscleGroups: ["Biceps"], startedAt: Date.now() - 193000, exercises: [
    { id: "v4-curl", name: "Curl incliné", muscle: "Biceps", targetReps: 12, sets: [{ weight: "12.5", reps: "12", done: true }, { weight: "12.5", reps: "12", done: true }, { weight: "12.5", reps: "", done: false }] },
    { id: "v4-plank", name: "Gainage (planche)", muscle: "Abdominaux", targetReps: 30, sets: [{ weight: "", reps: "", done: false }] },
  ] };
  await send("Network.setBlockedURLs", { urls: ["https://*"] });
  await send("Emulation.setEmulatedMedia", { features: [] });
  await evaluate(`localStorage.setItem('strength-draft-v1',${JSON.stringify(JSON.stringify(seed))})`);
  const onlyWidth = Number((process.argv.find((value) => value.startsWith("--width=")) ?? "").split("=")[1]) || 0;
  for (const [language, theme] of [["fr", "dark"], ["fr", "light"], ["ar", "dark"], ["en", "light"]]) for (const width of onlyWidth ? [onlyWidth] : [320, 390, 430, 1440]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/sport/musculation?tab=session");
    await until(() => evaluate("!!document.querySelector('#sport-panel-session .bg-mood-soft button')"), "resume fixture session");
    await click("#sport-panel-session .bg-mood-soft button");
    await until(() => evaluate("document.querySelectorAll('#sport-panel-session [data-exercise-thumbnail-trigger]').length===2"), "session thumbnails");
    await until(() => evaluate("[...document.querySelectorAll('#sport-panel-session img')].every(i=>i.complete)"), "thumbnails decoded");
    await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-70)");
    const overflow = await evaluate("document.documentElement.scrollWidth - innerWidth");
    assert.ok(overflow <= 1, `No horizontal overflow at ${language}/${theme}/${width}: ${overflow}`);
    const draftBefore = await evaluate("localStorage.getItem('strength-draft-v1')");
    await shot(`card-${language}-${theme}-${width}`);
    // Card -> sheet (photos), preserving the draft exactly.
    await evaluate("document.querySelector('#sport-panel-session [data-exercise-thumbnail-trigger]').click()");
    await until(() => evaluate("!!document.querySelector('[data-exercise-guide-dialog] [data-premium-exercise]')"), "premium sheet fetched");
    await until(() => evaluate("!!document.querySelector('[data-gallery-main] img')?.naturalWidth"), "main photograph decoded");
    await shot(`sheet-photos-${language}-${theme}-${width}`);
    if (width === 390 || width === 1440) {
      for (const tab of ["technique", "muscles", "advice"]) {
        await click(`[data-premium-tab="${tab}"]`);
        await shot(`sheet-${tab}-${language}-${theme}-${width}`);
      }
    }
    await click("[data-guide-close]");
    await until(() => evaluate("!document.querySelector('[data-exercise-guide-dialog]')"), "sheet closed");
    assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), draftBefore, "Draft unchanged after sheet");
    if (width === 390 && language === "fr" && theme === "dark" && !process.argv.includes("--shots-only")) {
      // Technique shortcut opens the sheet directly on the Technique tab.
      await evaluate("document.querySelector('#sport-panel-session .exercise-guide-action').click()");
      await until(() => evaluate("document.querySelector('[data-premium-tab=technique]')?.getAttribute('aria-selected')==='true'"), "Technique shortcut opens the Technique tab");
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.exercise-premium-tab-indicator')).transform !== 'none'"), true, "Sliding indicator positioned");
      await click("[data-guide-close]");
      await until(() => evaluate("!document.querySelector('[data-exercise-guide-dialog]')"), "sheet closed");
      // 3D shortcut -> nested viewer -> Escape -> back to the session, draft untouched.
      // Run with --production: in next dev, StrictMode replays the dialog effect and its native close event closes it.
      await evaluate("document.querySelector('#sport-panel-session .exercise-session-quick-actions .anatomy-open-button').click()");
      await until(() => evaluate("!!document.querySelector('[data-muscle-dialog][open]')"), "3D dialog opened", 60000);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await until(() => evaluate("!document.querySelector('[data-muscle-dialog]')"), "3D dialog closed");
      assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), draftBefore, "Draft unchanged after 3D");
      // Validating a set only flips its own done flag in the draft.
      await evaluate("document.querySelectorAll('#sport-panel-session .exercise-session-set')[2].querySelector('[aria-pressed]').click()");
      await pause(300);
      const after = JSON.parse(await evaluate("localStorage.getItem('strength-draft-v1')"));
      assert.equal(after.exercises[0].sets[2].done, true, "Third set validated");
      assert.equal(after.exercises[0].sets[0].weight, "12.5");
      await shot("card-validated-fr-dark-390");
      // Compact menu opens above the card.
      await evaluate("document.querySelector('#sport-panel-session .exercise-session-menu > summary').click()");
      await shot("menu-open-fr-dark-390");
      result.parity = { techniqueTab: true, indicator: true, nested3d: true, validation: true };
    }
    result.cases.push({ language, theme, width, overflow });
  }
  assert.ok(!requests.some((request) => !["GET", "HEAD"].includes(request.method)), "No writes during v4 checks");
}
