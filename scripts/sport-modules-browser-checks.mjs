import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Running and Calisthenics redesign campaign: Edge headless against the
 * fixture mock, with both discipline schemas enabled. Read-only: the mock
 * rejects writes and the harness asserts none happened.
 * `--shots-prefix=before|after` names the screenshots for comparison.
 */
export async function checkSportModules({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, requests, output, appPort, setFixture }) {
  const prefix = (process.argv.find((value) => value.startsWith("--shots-prefix=")) ?? "--shots-prefix=after").split("=")[1];
  const result = results.sportModules = { prefix, cases: [], screenshots: [], mode: "Actual application, Edge headless, local fixtures only" };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route); };
  const shot = async (name) => {
    await pause(300);
    const file = `modules-${prefix}-${name}.webp`;
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, file));
    result.screenshots.push(file);
  };
  const tab = async (value) => {
    await evaluate(`document.querySelector('[data-module-tab=${JSON.stringify(value)}]').click()`);
    await until(() => evaluate(`document.querySelector('[data-module-tab=${JSON.stringify(value)}]').getAttribute('aria-pressed')==='true'`), `${value} tab active`);
    await pause(150);
  };
  const noOverflow = async (context) => {
    const overflow = await evaluate("document.documentElement.scrollWidth - innerWidth");
    assert.ok(overflow <= 1, `No horizontal overflow (${context}): ${overflow}`);
  };

  // Visual matrix with data.
  for (const discipline of ["running", "calisthenics"]) {
    for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
      profile.language = language; profile.theme = theme;
      await size(width); await go(`/sport/${discipline}`);
      await until(() => evaluate("document.querySelectorAll('[data-module-tab], [data-cali-tab]').length >= 4"), "module tabs rendered");
      await noOverflow(`${discipline} ${language}/${theme}/${width}`);
      if (width < 1024 && discipline === "running") {
        const columns = await evaluate("getComputedStyle(document.querySelector('.module-stats, .sport-stat-grid')).gridTemplateColumns.split(' ').length");
        assert.equal(columns, 2, `Two stat columns on phones (${discipline} ${width}px)`);
      }
      await shot(`${discipline}-overview-${language}-${theme}-${width}`);
      result.cases.push({ discipline, language, theme, width });
    }
  }

  // Running interactions, French dark at the reference width.
  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/sport/running");
  await until(() => evaluate("document.querySelectorAll('[data-module-tab]').length === 4"), "running has 4 sections");
  assert.equal(await evaluate("document.querySelectorAll('.module-primary').length"), 1, "One primary action on the overview");
  assert.ok(await evaluate("!!document.querySelector('.module-ring')"), "weekly goal ring");
  assert.ok(await evaluate("document.body.innerText.includes('vs semaine passée')"), "week-over-week comparison");
  assert.ok(await evaluate("/Semaine [0-9]+/i.test(document.querySelector('.sport-module-eyebrow').textContent)"), "week eyebrow");
  // The log sheet opens over the overview; the tab does not change.
  await evaluate("document.querySelector('.module-primary').click()");
  await until(() => evaluate("!!document.querySelector('dialog.run-sheet[open]')"), "run sheet open");
  await evaluate("document.querySelector('[data-run-distance]').focus()");
  await send("Input.insertText", { text: "5,2" });
  await evaluate("document.querySelector('[data-run-duration]').focus()");
  await send("Input.insertText", { text: "26:00" });
  await until(() => evaluate("!!document.querySelector('[data-run-metrics]')"), "pace preview appears");
  assert.ok(await evaluate("document.querySelector('[data-run-metrics]').innerText.includes('5:00')"), "5,2 km in 26:00 is 5:00 per km");
  await shot("running-form-fr-dark-375");
  await evaluate("document.querySelector('.run-sheet-close').click()");
  await until(() => evaluate("!document.querySelector('dialog.run-sheet[open]')"), "sheet closes");
  await tab("sessions");
  await until(() => evaluate("document.querySelectorAll('[data-run-row]').length >= 3"), "history rows");
  assert.ok(await evaluate("document.body.innerText.toLowerCase().includes('cette semaine')"), "runs grouped by week");
  await evaluate("document.querySelector('[data-run-row] .run-row-main').click()");
  await until(() => evaluate("[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Modifier la course')"), "run details open");
  await shot("running-sessions-fr-dark-375");
  await tab("progress");
  await until(() => evaluate("!!document.querySelector('[data-run-record=\"1k\"]')"), "1 km record visible");
  assert.ok(await evaluate("document.body.innerText.toLowerCase().includes(\"calendrier d'activité\")"), "running activity calendar");
  await shot("running-progress-fr-dark-375");
  await tab("goals");
  assert.equal(await evaluate("[...document.querySelectorAll('form label')].filter((l) => /Minutes|Secondes/.test(l.textContent)).length"), 4, "mm:ss fields for both targets");
  await shot("running-goals-fr-dark-375");

  // Calisthenics: four tabs, the session of the day, the focus session, program, progress and history.
  await evaluate("localStorage.removeItem('track-perso:calisthenics-session-v1')");
  await go("/sport/calisthenics");
  await until(() => evaluate("document.querySelectorAll('[data-cali-tab]').length === 4"), "calisthenics has 4 tabs");
  assert.ok(await evaluate("document.querySelector('[data-strength-header]').innerText.includes('cette semaine')"), "week count in the header");
  await until(() => evaluate("!!document.querySelector('[data-cali-hero]')"), "session of the day");
  assert.ok(await evaluate("/Séance [AB]/.test(document.querySelector('[data-cali-hero]').innerText)"), "suggested session named");
  assert.ok(await evaluate("!!document.querySelector('[data-cali-skill]')"), "skill in progress");
  await noOverflow("calisthenics before");
  await shot("calisthenics-before-fr-dark-375");
  await evaluate("document.querySelector('[data-cali-start]').click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-card]')"), "focus session");
  if (await evaluate("!!document.querySelector('[data-focus-manual]')")) await evaluate("document.querySelector('[data-focus-manual]').click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-validate]')"), "a set to validate");
  await evaluate("document.querySelector('[data-focus-stepper] button').click()");
  await noOverflow("calisthenics focus");
  await shot("calisthenics-focus-fr-dark-375");
  await evaluate("document.querySelector('[data-focus-validate]').click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-rest]')"), "rest after a set");
  await shot("calisthenics-rest-fr-dark-375");
  await evaluate("document.querySelector('[data-focus-ready]').click()");
  await until(() => evaluate("document.querySelectorAll('[data-focus-sets] [data-set-state=done]').length === 1 || document.querySelectorAll('[data-focus-nav] button[aria-current]').length === 1"), "set kept as done");
  assert.ok(await evaluate("JSON.parse(localStorage.getItem('track-perso:calisthenics-session-v1')).items.some((item) => item.sets.some((set) => set.done))"), "the done set is in the draft");
  await evaluate("document.querySelector('[data-focus-options]').click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-options-sheet]')"), "options sheet");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
  await until(() => evaluate("!document.querySelector('[data-focus-options-sheet]')"), "options closed");
  await evaluate("document.querySelector('[data-focus-finish]').click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-finish-view]')"), "finish view");
  await shot("calisthenics-finish-fr-dark-375");
  await evaluate("[...document.querySelectorAll('[data-focus-finish-view] button')].at(-1).click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-card]')"), "back to the session");
  await evaluate("document.querySelector('[data-cali-exercises-link]').click()");
  await until(() => evaluate("document.querySelectorAll('[data-cali-exercise] .cali-lib-add').length >= 2"), "each exercise can be added");
  await noOverflow("calisthenics exercises");
  await shot("calisthenics-exercises-fr-dark-375");
  await evaluate("document.querySelector('[data-cali-tab=program]').click()");
  await until(() => evaluate("!!document.querySelector('[data-cali-program-card]')"), "program sessions");
  assert.ok(await evaluate("!!document.querySelector('[data-cali-program-balance]')"), "program balance");
  await noOverflow("calisthenics program");
  await shot("calisthenics-program-fr-dark-375");
  await evaluate("document.querySelector('[data-cali-tab=progress]').click()");
  await until(() => evaluate("!!document.querySelector('[data-cali-ladder]')"), "skill ladder");
  assert.ok(await evaluate("document.querySelector('[data-cali-ladder] [data-state=\"current\"]') !== null"), "current step highlighted");
  assert.ok(await evaluate("!!document.querySelector('[data-cali-advance] .module-primary')"), "next step offered after three results on the current one");
  assert.equal(await evaluate("document.querySelectorAll('[data-cali-kpis] .grid > div').length"), 4, "four key figures");
  assert.ok(await evaluate("!!document.querySelector('[data-cali-week-balance]')"), "week balance");
  await noOverflow("calisthenics progress");
  await shot("calisthenics-progress-fr-dark-375");
  await evaluate("document.querySelector('[data-cali-tab=history]').click()");
  await until(() => evaluate("document.querySelectorAll('[data-cali-history-session]').length >= 1"), "history sessions");
  await evaluate("document.querySelector('[data-cali-history-session] button').click()");
  await until(() => evaluate("!!document.querySelector('[data-cali-history-detail]') && !!document.querySelector('[data-cali-redo]')"), "history detail");
  await noOverflow("calisthenics history");
  await shot("calisthenics-history-fr-dark-375");
  // Leave no draft behind for the next checks.
  await evaluate("localStorage.removeItem('track-perso:calisthenics-session-v1')");

  // Both modules without any data.
  setFixture("empty");
  await go("/sport/running");
  await until(() => evaluate("document.body.innerText.includes('Aucune course enregistrée')"), "running empty state");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Enregistrer une course').length"), 1, "Single CTA in the empty state");
  await noOverflow("running empty");
  assert.ok(await evaluate("!!document.querySelector('.sport-empty-state')"), "running uses the shared empty state");
  await shot("running-empty-fr-dark-375");
  await go("/sport/calisthenics");
  await until(() => evaluate("document.body.innerText.includes('Commence ta pratique')"), "calisthenics empty state");
  assert.equal(await evaluate("document.querySelectorAll('[data-cali-free]').length"), 1, "one free session action");
  await noOverflow("calisthenics empty");
  await shot("calisthenics-empty-fr-dark-375");
  setFixture("normal");
  assert.ok(!requests.some((request) => !["GET", "HEAD"].includes(request.method)), "No writes during module checks");
}
