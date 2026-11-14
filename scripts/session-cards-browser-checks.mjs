import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Session cards: one layout for every exercise (illustrated, catalogue without a
 * photo, custom), and drag-to-reorder by the handle. Edge headless, local fixtures.
 */
export async function checkSessionCards({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, requests, output, appPort }) {
  const result = results.sessionCards = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const shot = async (name) => {
    await pause(250);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `session-cards-${name}.webp`));
    result.screenshots.push(`session-cards-${name}.webp`);
  };
  const draft = () => evaluate("localStorage.getItem('strength-draft-v1')").then((value) => JSON.parse(value));
  const seed = { name: "Séance de démonstration", templateId: null, muscleGroups: ["Pectoraux"], startedAt: Date.now() - 120000, exercises: [
    { id: "card-curl", name: "Curl incliné", muscle: "Biceps", targetReps: 12, sets: [{ weight: "12.5", reps: "12", done: true }, { weight: "12.5", reps: "", done: false }] },
    { id: "card-pec", name: "Pec deck (butterfly)", muscle: "Pectoraux", targetReps: 10, sets: [{ weight: "73", reps: "12", done: false }] },
    { id: "card-custom", name: "Mon exercice maison", muscle: "Dos", targetReps: null, sets: [{ weight: "", reps: "", done: false }] },
  ] };
  await send("Network.setBlockedURLs", { urls: ["https://*"] });
  await evaluate(`localStorage.setItem('strength-draft-v1',${JSON.stringify(JSON.stringify(seed))})`);

  for (const [theme, width] of [["dark", 390], ["light", 390], ["dark", 320]]) {
    profile.language = "fr"; profile.theme = theme;
    await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigatePage(`http://127.0.0.1:${appPort}/sport/musculation?tab=session`); await ready("/sport/musculation");
    await until(() => evaluate("!!document.querySelector('#sport-panel-session .bg-mood-soft button')"), "resume fixture session");
    await evaluate("document.querySelector('#sport-panel-session .bg-mood-soft button').click()");
    await until(() => evaluate("document.querySelectorAll('[data-exercise-card]').length === 3"), "three cards");
    // Same header, handle and set layout on every card, whatever the exercise.
    assert.equal(await evaluate("document.querySelectorAll('[data-exercise-card] [data-exercise-session-head]').length"), 3, "every card uses the new header");
    assert.equal(await evaluate("document.querySelectorAll('[data-exercise-card] [data-exercise-drag]').length"), 3, "every card has a drag handle");
    assert.equal(await evaluate("document.querySelectorAll('[data-exercise-card] .exercise-session-add-set').length"), 3, "every card has the full add-set button");
    assert.ok(await evaluate("!!document.querySelector('[data-exercise-card=\"card-custom\"] [data-exercise-placeholder]')"), "custom exercise gets the illustration");
    const targets = await evaluate("[...document.querySelectorAll('.exercise-session-target')].map((n) => n.textContent)");
    assert.ok(targets.length && targets.every((text) => !text.trim().startsWith("·")), `target text without a leading dot: ${JSON.stringify(targets)}`);
    const overflow = await evaluate("document.documentElement.scrollWidth - innerWidth");
    assert.ok(overflow <= 1, `no horizontal overflow at ${theme}/${width}: ${overflow}`);
    await evaluate("document.querySelector('[data-exercise-card=\"card-pec\"]').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-70)");
    await shot(`pec-${theme}-${width}`);
    await evaluate("document.querySelector('[data-exercise-card=\"card-custom\"]').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-70)");
    await shot(`custom-${theme}-${width}`);
    result.cases.push({ theme, width, targets });
  }

  // Drag the first card below the second by its handle, with real pointer moves.
  const before = await draft();
  await evaluate("document.querySelector('[data-exercise-card]').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-70)");
  const handle = JSON.parse(await evaluate("JSON.stringify(document.querySelector('[data-exercise-card=\"card-curl\"] [data-exercise-drag]').getBoundingClientRect())"));
  const second = JSON.parse(await evaluate("JSON.stringify(document.querySelector('[data-exercise-card=\"card-pec\"]').getBoundingClientRect())"));
  const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
  const targetY = Math.min(830, second.y + second.height * 0.7);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 14; step++) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y: y + (targetY - y) * step / 14, button: "left", buttons: 1 });
    await pause(30);
  }
  await shot("dragging");
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y: targetY, button: "left", buttons: 0, clickCount: 1 });
  await until(async () => (await draft()).exercises[0].id !== "card-curl", "drag reorders the draft", 5000);
  const after = await draft();
  assert.deepEqual(after.exercises.map((exercise) => exercise.id).sort(), before.exercises.map((exercise) => exercise.id).sort(), "no exercise lost");
  assert.deepEqual(after.exercises.find((exercise) => exercise.id === "card-curl").sets, before.exercises.find((exercise) => exercise.id === "card-curl").sets, "sets travel with their card");
  await shot("after-drag");
  result.cases.push({ case: "drag", order: after.exercises.map((exercise) => exercise.id) });
  assert.ok(!requests.some((request) => !["GET", "HEAD"].includes(request.method)), "no writes");
}
