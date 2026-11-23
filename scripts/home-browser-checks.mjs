import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Home page, Edge headless against the habits and meals fixtures (plus the base workout).
 * Read-only: no action is pressed that would save something.
 */
export async function checkHome({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort, setFixture }) {
  const result = results.home = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route); };
  const shot = async (name) => {
    await pause(300);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `home-${name}.webp`));
    result.screenshots.push(`home-${name}.webp`);
  };
  const noOverflow = async (context) => assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), `No horizontal overflow (${context})`);

  for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/dashboard");
    await until(() => evaluate("!!document.querySelector('[data-home-day]') && !!document.querySelector('[data-home-tiles]')"), "home rendered");
    await noOverflow(`${language}/${theme}/${width}`);
    if (language === "en") assert.ok(await evaluate("/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i.test(document.querySelector('[data-home] header').innerText)"), "the date follows the language");
    await shot(`${language}-${theme}-${width}`);
    result.cases.push({ language, theme, width });
  }

  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/dashboard");
  await until(() => evaluate("!!document.querySelector('[data-home-pct]')"), "day ring");
  assert.ok(await evaluate("/\\d+ %/.test(document.querySelector('[data-home-pct]').textContent)"), "a day percentage");
  assert.ok(await evaluate("document.querySelectorAll('[data-home-action]').length >= 1 && document.querySelectorAll('[data-home-action]').length <= 4"), "one to four next actions");
  assert.equal(await evaluate("document.querySelectorAll('[data-home-quick] a, [data-home-quick] button').length"), 4, "four quick actions");
  assert.equal(await evaluate("document.querySelectorAll('[data-home-tile]').length"), 4, "four module tiles");
  assert.ok(await evaluate("document.querySelector('[data-home-tile=meals]').innerText.includes('kcal')"), "meals tile shows calories");
  assert.ok(await evaluate("/\\d+ \\/ \\d+/.test(document.querySelector('[data-home-tile=habits]').innerText.replace(/\\s+/g, ' '))"), "habits tile shows done of due");
  assert.ok(await evaluate("!!document.querySelector('[data-home-level]')"), "level strip");
  assert.ok(!(await evaluate("!!document.querySelector('.recharts-wrapper')")), "no big charts on home any more");
  await shot("top-fr-dark-375");
  // Floating menu: the "+" opens the quick add, Escape closes it.
  await evaluate("document.querySelector('[data-quick-add]').click()");
  await until(() => evaluate("!!document.querySelector('[data-quick-add-panel]')"), "quick add opens");
  assert.equal(await evaluate("document.querySelectorAll('[data-quick-add-panel] a, [data-quick-add-panel] button').length"), 4, "meal, mood, workout and water");
  await shot("quick-add-fr-dark-375");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))");
  await until(() => evaluate("!document.querySelector('[data-quick-add-panel]')"), "quick add closes");
  await evaluate("document.querySelector('[data-home-tiles]').scrollIntoView({ block: 'start' })");
  await shot("tiles-fr-dark-375");

  // A brand new account.
  setFixture("empty");
  await go("/dashboard");
  await until(() => evaluate("!!document.querySelector('[data-home-start]')"), "getting started");
  assert.ok(!(await evaluate("!!document.querySelector('[data-home-day]')")), "no day ring before any data");
  assert.equal(await evaluate("document.querySelectorAll('[data-home-tile]').length"), 4, "empty tiles still lead somewhere");
  await noOverflow("new account");
  await shot("new-fr-dark-375");
  setFixture("normal");
}
