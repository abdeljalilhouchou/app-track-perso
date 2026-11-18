import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Mood page, Edge headless against the fixture mock: twelve check-ins over two weeks and
 * none today. Read-only: nothing is submitted, the harness asserts no writes happened.
 */
export async function checkMood({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort, setFixture }) {
  const result = results.mood = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const shot = async (name) => {
    await pause(300);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `mood-${name}.webp`));
    result.screenshots.push(`mood-${name}.webp`);
  };
  const noOverflow = async (context) => assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), `No horizontal overflow (${context})`);

  // Visual matrix.
  for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/humeur");
    await until(() => evaluate("!!document.querySelector('[data-mood-checkin]') && !!document.querySelector('[data-mood-journal]')"), "mood page rendered");
    await noOverflow(`${language}/${theme}/${width}`);
    if (width < 768) assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-mood-stat]').parentElement).gridTemplateColumns.split(' ').length"), 2, "two stat columns on phones");
    await shot(`${language}-${theme}-${width}`);
    result.cases.push({ language, theme, width });
  }

  // Interactions, French dark at the reference width.
  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/humeur");
  await until(() => evaluate("document.querySelectorAll('[data-mood-level]').length === 5"), "five mood levels");
  assert.ok(await evaluate("document.querySelector('[data-mood-save]').disabled"), "save waits for a mood");
  await evaluate("document.querySelector('[data-mood-level=\"4\"]').click()");
  await until(() => evaluate("!document.querySelector('[data-mood-save]').disabled"), "save enabled once a mood is picked");
  assert.equal(await evaluate("document.querySelector('[data-mood-level=\"4\"]').getAttribute('aria-checked')"), "true", "mood selected");
  await evaluate("document.querySelector('[data-mood-tag=sleep]').click()");
  assert.equal(await evaluate("document.querySelector('[data-mood-tag=sleep]').getAttribute('aria-pressed')"), "true", "factor toggled");
  await evaluate("document.querySelector('[data-energy-level=\"5\"]').click()");
  assert.ok(await evaluate("document.querySelector('[data-mood-checkin] legend').parentElement && document.body.innerText.includes('À fond')"), "energy level named");
  await shot("checkin-fr-dark-375");
  // Yesterday is logged: it shows as a summary with its factors.
  await evaluate("[...document.querySelectorAll('[data-mood-checkin] [role=radio]')].find((b) => b.textContent.trim() === 'Hier').click()");
  await until(() => evaluate("!!document.querySelector('[data-mood-summary]')"), "yesterday summary");
  assert.ok(await evaluate("document.querySelector('[data-mood-summary]').innerText.includes('Sport')"), "summary lists the factors, translated");
  assert.ok(!(await evaluate("document.querySelector('[data-mood-summary]').innerText.includes('#sport')")), "raw tags never shown");

  assert.equal(await evaluate("document.querySelectorAll('[data-mood-stat]').length"), 4, "four figures");
  await until(() => evaluate("!!document.querySelector('[data-mood-factor=sport]') && !!document.querySelector('[data-mood-factor=stress]')"), "sport and stress effects");
  assert.ok(await evaluate("document.querySelector('[data-mood-factor=sport]').innerText.includes('+')"), "sport lifts the mood");
  assert.ok(await evaluate("document.querySelector('[data-mood-factor=stress]').innerText.includes('−')"), "stress lowers it");
  await evaluate("document.querySelector('[data-mood-factors]').scrollIntoView({ block: 'center' })");
  await shot("factors-fr-dark-375");
  await evaluate("document.querySelector('[data-mood-trend]').scrollIntoView({ block: 'center' })");
  await until(() => evaluate("document.querySelectorAll('[data-mood-trend] .recharts-area-curve').length === 2"), "mood and energy lines drawn");
  await pause(1800);
  await shot("trend-fr-dark-375");
  await evaluate("[...document.querySelectorAll('[data-mood-trend] button')].find((b) => b.textContent.trim() === '7 j').click()");
  assert.equal(await evaluate("[...document.querySelectorAll('[data-mood-trend] button')].find((b) => b.textContent.trim() === '7 j').getAttribute('aria-pressed')"), "true", "trend period switches");

  assert.equal(await evaluate("document.querySelectorAll('[data-mood-entry]').length"), 10, "journal shows ten days first");
  await evaluate("[...document.querySelectorAll('[data-mood-journal] > button')].pop().click()");
  await until(() => evaluate("document.querySelectorAll('[data-mood-entry]').length === 12"), "show more reveals the rest");
  assert.ok(!(await evaluate("document.querySelector('[data-mood-journal]').innerText.includes('#')")), "journal shows no raw hashtag");
  await evaluate("document.querySelector('[data-mood-journal]').scrollIntoView({ block: 'start' })");
  await shot("journal-fr-dark-375");

  // A past day opens in the check-in from the journal.
  const third = await evaluate("document.querySelectorAll('[data-mood-entry]')[2].dataset.moodEntry");
  await go(`/humeur?date=${third}`);
  await until(() => evaluate("document.querySelector('#checkin-title').textContent.startsWith('Tu modifies le')"), "editing a past day");
  assert.equal(await evaluate("document.querySelector('[data-mood-level=\"2\"]').getAttribute('aria-checked')"), "true", "the day's mood is loaded");
  assert.equal(await evaluate("document.querySelector('[data-mood-tag=stress]').getAttribute('aria-pressed')"), "true", "and its factors");
  assert.ok(await evaluate("document.querySelector('#mood-note').value === 'Journée chargée'"), "and its note without tags");
  await shot("edit-fr-dark-375");

  // No data at all.
  setFixture("empty");
  await go("/humeur");
  await until(() => evaluate("!!document.querySelector('[data-mood-empty]')"), "empty state");
  assert.ok(await evaluate("!!document.querySelector('[data-mood-checkin] [data-mood-save]')"), "check-in offered on an empty journal");
  assert.ok(!(await evaluate("!!document.querySelector('[data-mood-journal]')")), "no empty journal list");
  await noOverflow("empty");
  await shot("empty-fr-dark-375");
  setFixture("normal");
}
