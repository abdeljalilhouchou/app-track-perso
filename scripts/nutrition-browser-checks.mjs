import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Meals page, Edge headless against the fixture mock: fourteen entries over ten days, three
 * of them today, and an Open Food Facts stand-in that knows one barcode. Nothing is submitted.
 */
export async function checkNutrition({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort, setFixture }) {
  const result = results.nutrition = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const shot = async (name) => {
    await pause(300);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `nutrition-${name}.webp`));
    result.screenshots.push(`nutrition-${name}.webp`);
  };
  const noOverflow = async (context) => assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), `No horizontal overflow (${context})`);
  const tab = async (id) => {
    await evaluate(`document.querySelector('[data-nutrition-tab=${id}]').click()`);
    await until(() => evaluate(`document.querySelector('[data-nutrition-tab=${id}]').getAttribute('aria-selected') === 'true'`), `${id} tab`);
  };
  const typeInto = async (selector, text) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).select?.()`);
    await send("Input.insertText", { text });
  };

  // Visual matrix of the "Aujourd'hui" tab.
  for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/nutrition");
    await until(() => evaluate("!!document.querySelector('[data-calorie-hero]') && document.querySelectorAll('[data-moment]').length === 4"), "today tab rendered");
    await noOverflow(`${language}/${theme}/${width}`);
    await shot(`today-${language}-${theme}-${width}`);
    result.cases.push({ language, theme, width });
  }

  // Today, French dark at the reference width.
  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/nutrition");
  await until(() => evaluate("!!document.querySelector('[data-calories-left]')"), "calories left");
  const left = await evaluate("Number(document.querySelector('[data-calories-left]').textContent)");
  assert.ok(left > 0 && left < 2200, `calories left against a 2200 kcal goal: ${left}`);
  assert.equal(await evaluate("document.querySelectorAll('[data-moment=\"dejeuner\"] [data-meal-entry]').length"), 2, "two lunch entries today");
  assert.ok(await evaluate("document.querySelector('[data-moment=\"diner\"]').innerText.includes('Rien pour l’instant')"), "empty dinner card says so");
  assert.equal(await evaluate("document.querySelectorAll('[data-add-food]').length"), 1, "one primary add action");

  // The add sheet, with a barcode typed by hand (the headless browser has no camera).
  await evaluate("document.querySelector('[data-add-food]').click()");
  await until(() => evaluate("!!document.querySelector('dialog[data-add-food-sheet][open]')"), "add sheet open");
  await evaluate("document.querySelector('[data-barcode-open]').click()");
  await until(() => evaluate("!!document.querySelector('dialog[data-barcode-scanner][open]')"), "scanner open");
  await typeInto("#barcode-manual", "0000000000000");
  await evaluate("document.querySelector('[data-barcode-scanner] form button[type=submit]').click()");
  try {
    await until(() => evaluate("document.querySelector('[data-barcode-scanner] [role=alert]')?.textContent.includes('introuvable')"), "unknown barcode explained", 10000);
  } catch (error) {
    const state = await evaluate("JSON.stringify({ value: document.querySelector('#barcode-manual')?.value, active: document.activeElement?.id, text: document.querySelector('[data-barcode-scanner]')?.innerText, disabled: document.querySelector('[data-barcode-scanner] form button[type=submit]')?.disabled })");
    throw new Error(`${error.message} :: ${state}`);
  }
  await shot("scanner-fr-dark-375");
  await evaluate("const i=document.querySelector('#barcode-manual'); i.focus(); i.select();");
  await send("Input.insertText", { text: "3017620422003" });
  await evaluate("document.querySelector('[data-barcode-scanner] form button[type=submit]').click()");
  await until(() => evaluate("!document.querySelector('dialog[data-barcode-scanner]')"), "scanner closes on a known product");
  assert.ok(await evaluate("document.querySelector('#meal-food').value.includes('Pâte à tartiner QA')"), "scanned product fills the food");
  assert.ok(await evaluate("document.querySelector('[data-add-food-sheet] input[type=number]').value === '15'"), "the product's serving becomes the quantity");
  assert.ok(await evaluate("document.querySelector('[data-add-food-sheet]').innerText.includes('81')"), "15 g of a 539 kcal/100 g product is 81 kcal");
  await shot("scanned-fr-dark-375");
  await evaluate("document.querySelector('[data-add-food-sheet] button[aria-label=\"Fermer\"]').click()");
  await until(() => evaluate("!document.querySelector('dialog[data-add-food-sheet]')"), "sheet closes");

  // The review tab.
  await tab("week");
  await until(() => evaluate("!!document.querySelector('[data-review-average=avgCalories]')"), "review averages");
  assert.ok(await evaluate("document.querySelector('[data-nutrition-review]').innerText.includes('6 jours notés sur 7')"), "six of the last seven days logged");
  assert.ok(await evaluate("document.querySelector('[data-review-food]').innerText.includes('Poulet')"), "chicken is the most frequent food");
  assert.equal(await evaluate("document.querySelectorAll('[data-review-moment]').length"), 4, "four meal moments");
  await noOverflow("review");
  await shot("review-fr-dark-375");
  await evaluate("document.querySelector('[data-review-period=\"30\"]').click()");
  await until(() => evaluate("document.querySelector('[data-nutrition-review]').innerText.includes('8 jours notés sur 30')"), "thirty-day review");
  await evaluate("document.querySelector('[data-review-bars]').scrollIntoView({ block: 'center' })");
  await shot("review-30-fr-dark-375");

  // No data at all.
  setFixture("empty");
  await go("/nutrition");
  await until(() => evaluate("!!document.querySelector('[data-calorie-hero]')"), "empty today");
  assert.equal(await evaluate("document.querySelectorAll('[data-meal-entry]').length"), 0, "no entries");
  await noOverflow("empty today");
  await shot("empty-fr-dark-375");
  await tab("week");
  await until(() => evaluate("!!document.querySelector('[data-review-empty]')"), "empty review explained");
  setFixture("normal");
}
