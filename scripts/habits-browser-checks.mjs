import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Habits page, Edge headless against the fixture mock: one habit of each kind, a flexible
 * one, a paused one and three weeks of history. Read-only: nothing is saved, the harness
 * asserts no writes happened.
 */
export async function checkHabits({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort, setFixture }) {
  const result = results.habits = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route); };
  const shot = async (name) => {
    await pause(300);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `habits-${name}.webp`));
    result.screenshots.push(`habits-${name}.webp`);
  };
  const noOverflow = async (context) => assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), `No horizontal overflow (${context})`);
  const tab = async (id) => {
    await evaluate(`document.querySelector('[data-habits-tab=${id}]').click()`);
    await until(() => evaluate(`document.querySelector('[data-habits-tab=${id}]').getAttribute('aria-selected') === 'true'`), `${id} tab`);
  };
  // Escaped for use inside single-quoted strings evaluated in the page.
  const card = (name) => `[data-habit-card=${JSON.stringify(name)}]`.replace(/'/g, "\\'");

  // Visual matrix of the Today tab.
  for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/habits");
    await until(() => evaluate("!!document.querySelector('[data-habits-summary]') && document.querySelectorAll('[data-habit-card]').length >= 3"), "habits rendered");
    await noOverflow(`${language}/${theme}/${width}`);
    await shot(`today-${language}-${theme}-${width}`);
    result.cases.push({ language, theme, width });
  }

  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/habits");
  await until(() => evaluate("!!document.querySelector('[data-habits-summary]')"), "today tab");
  assert.ok(!(await evaluate("document.body.innerText.includes('Moments du jour')")), "the day moments block is gone");
  assert.ok(await evaluate("!!document.querySelector('[data-habits-moment=morning]')"), "habits grouped by moment");
  assert.ok(await evaluate("!!document.querySelector('[data-habits-review]')"), "last week's review");

  // One card per kind.
  assert.ok(await evaluate(`document.querySelector('${card("Méditer 10 min")}').innerText.includes('07:00')`), "reminder time on the card");
  assert.ok(await evaluate(`!!document.querySelector('${card("Méditer 10 min")} [data-habit-toggle]')`), "a yes/no habit has its button");
  assert.ok(await evaluate(`document.querySelector('${card("Boire de l'eau")}').innerText.includes('5') && !!document.querySelector('${card("Boire de l'eau")} [data-habit-counter]')`), "the counted habit shows 5 of 8");
  assert.ok(await evaluate(`document.querySelector('${card("Boire de l'eau")}').innerText.includes('Auto · Repas')`), "water is checked from Meals");
  assert.ok(await evaluate(`document.querySelector('${card("Pas de cigarette")} [data-habit-avoid]').innerText.includes('jours sans')`), "the habit to avoid counts days without");
  assert.ok(await evaluate(`!!document.querySelector('${card("Pas de cigarette")} [data-habit-streak]')`), "streak on the card");
  assert.ok(!(await evaluate(`!!document.querySelector('${card("Méditer 10 min")} [data-habit-streak]')`)), "a missed yesterday breaks the streak");
  await shot("cards-fr-dark-375");

  // Catching up yesterday, with the week's joker offered (only when yesterday is in this week's row).
  const yesterday = await evaluate("(() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()");
  const inRow = await evaluate(`!!document.querySelector('${card("Méditer 10 min")} button[data-habit-day="${yesterday}"]')`);
  if (inRow) {
    assert.equal(await evaluate(`document.querySelector('${card("Méditer 10 min")} [data-habit-day="${yesterday}"]').dataset.state`), "missed", "yesterday is missed");
    await evaluate(`document.querySelector('${card("Méditer 10 min")} button[data-habit-day="${yesterday}"]').scrollIntoView({ block: 'center' })`);
    await evaluate(`document.querySelector('${card("Méditer 10 min")} button[data-habit-day="${yesterday}"]').click()`);
    await until(() => evaluate(`!!document.querySelector('${card("Méditer 10 min")} [data-habit-popover] [data-habit-catch-up]')`), "catch-up offered");
    assert.ok(await evaluate(`!!document.querySelector('${card("Méditer 10 min")} [data-habit-joker]')`), "joker offered");
    await shot("catch-up-fr-dark-375");
    result.catchUpChecked = true;
  }

  // The sheet: new habit from an idea, and editing an existing one. Nothing is submitted.
  await evaluate("window.scrollTo(0, 0); document.querySelector('[data-habit-new]').click()");
  await until(() => evaluate("!!document.querySelector('[data-habit-sheet]')"), "new habit sheet");
  await evaluate("document.querySelector('[data-habit-idea=noSmoking]').click()");
  await until(() => evaluate("document.querySelector('[data-habit-sheet] [data-habit-kind=avoid]').getAttribute('aria-checked') === 'true' && document.querySelector('[data-habit-name]').value === 'Pas de cigarette'"), "an idea fills the sheet");
  await evaluate("document.querySelector('[data-habit-sheet] [data-habit-kind=count]').click()");
  await until(() => evaluate("!!document.querySelector('[data-habit-goal]') && document.querySelector('[data-habit-preview]').innerText.includes('/')"), "counted type shows its goal");
  await noOverflow("sheet");
  await shot("sheet-new-fr-dark-375");
  await evaluate("document.querySelector('[data-habit-sheet] button[aria-label=Fermer]').click()");
  await until(() => evaluate("!document.querySelector('[data-habit-sheet]')"), "sheet closes");
  await evaluate(`document.querySelector('${card("Méditer 10 min")} [data-habit-edit]').click()`);
  await until(() => evaluate("document.querySelector('[data-habit-name]')?.value === 'Méditer 10 min'"), "edit sheet prefilled");
  assert.equal(await evaluate("document.querySelector('[data-habit-sheet] [data-habit-kind=check]').getAttribute('aria-checked')"), "true");
  await shot("sheet-edit-fr-dark-375");
  await evaluate("document.querySelector('[data-habit-sheet] button[aria-label=Fermer]').click()");
  await until(() => evaluate("!document.querySelector('[data-habit-sheet]')"), "edit sheet closes");

  // Progress.
  await tab("progress");
  await until(() => evaluate("!!document.querySelector('[data-habits-progress] [data-habits-month]')"), "progress tab");
  assert.ok(await evaluate("!!document.querySelector('[data-habit-badge=streak7][data-earned]')"), "7-day badge earned");
  assert.equal(await evaluate("document.querySelectorAll('[data-habits-row]').length"), 5, "a bar per active habit");
  await evaluate("document.querySelector('[data-habits-period=\"7\"]').click()");
  assert.equal(await evaluate("document.querySelector('[data-habits-period=\"7\"]').getAttribute('aria-pressed')"), "true", "period switches");
  await noOverflow("progress");
  await shot("progress-fr-dark-375");
  await evaluate("document.querySelector('[data-habits-mood]').scrollIntoView({ block: 'center' })");
  await shot("progress-badges-fr-dark-375");

  // Manage.
  await tab("manage");
  await until(() => evaluate("!!document.querySelector('[data-habits-manage]')"), "manage tab");
  assert.ok(await evaluate("document.querySelector('[data-habit-paused=\"Douche froide\"]').innerText.includes('En pause depuis 9 j')"), "paused habit with its date");
  assert.ok(!(await evaluate("!!document.querySelector('[data-habit-idea-card=water]')")), "ideas already in use are hidden");
  await noOverflow("manage");
  await shot("manage-fr-dark-375");

  // No habit at all.
  setFixture("empty");
  await go("/habits");
  await until(() => evaluate("!!document.querySelector('[data-habits-empty]')"), "empty state");
  await noOverflow("empty");
  await shot("empty-fr-dark-375");
  setFixture("normal");
}
