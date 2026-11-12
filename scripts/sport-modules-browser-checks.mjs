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
  for (const module of ["running", "calisthenics"]) {
    for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
      profile.language = language; profile.theme = theme;
      await size(width); await go(`/sport/${module}`);
      await until(() => evaluate("document.querySelectorAll('[data-module-tab]').length >= 4"), "module tabs rendered");
      await noOverflow(`${module} ${language}/${theme}/${width}`);
      if (width < 1024) {
        const columns = await evaluate("getComputedStyle(document.querySelector('.sport-stat-grid')).gridTemplateColumns.split(' ').length");
        assert.equal(columns, 2, `Two stat columns on phones (${module} ${width}px)`);
      }
      await shot(`${module}-overview-${language}-${theme}-${width}`);
      result.cases.push({ module, language, theme, width });
    }
  }

  // Running interactions, French dark at the reference width.
  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/sport/running");
  await until(() => evaluate("document.querySelectorAll('[data-module-tab]').length === 4"), "running has 4 sections");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Enregistrer une course').length"), 1, "One primary CTA on the overview");
  await evaluate("[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Enregistrer une course').click()");
  await until(() => evaluate("document.querySelector('[data-module-tab=sessions]').getAttribute('aria-pressed')==='true'"), "CTA lands on the sessions tab");
  await until(() => evaluate("!!document.querySelector('form input[type=date]')"), "run form open");
  await evaluate("const d=document.querySelector('form input[inputmode=decimal]');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(d,'5');d.dispatchEvent(new Event('input',{bubbles:true}))");
  await until(() => evaluate("document.body.innerText.includes('Allure')"), "pace preview appears");
  await shot("running-form-fr-dark-375");
  await evaluate("[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Fermer le formulaire').click()");
  await until(() => evaluate("!document.querySelector('form input[type=date]')"), "form closes");
  await until(() => evaluate("document.querySelectorAll('[aria-expanded]').length >= 1"), "history visible");
  await shot("running-sessions-fr-dark-375");
  await tab("progress");
  await until(() => evaluate("document.body.innerText.includes('1 km')"), "1 km record visible");
  await shot("running-progress-fr-dark-375");
  await tab("goals");
  assert.equal(await evaluate("[...document.querySelectorAll('form label')].filter((l) => /Minutes|Secondes/.test(l.textContent)).length"), 4, "mm:ss fields for both targets");
  await shot("running-goals-fr-dark-375");
  await tab("overview");
  await until(() => evaluate("document.querySelectorAll('[role=progressbar]').length >= 2"), "weekly goal rings");
  assert.ok(await evaluate("document.body.innerText.includes('vs semaine passée')"), "week-over-week deltas shown");

  // Calisthenics interactions.
  await go("/sport/calisthenics");
  await until(() => evaluate("document.querySelectorAll('[data-module-tab]').length >= 6"), "calisthenics tabs rendered");
  await tab("session");
  await shot("calisthenics-session-fr-dark-375");
  await tab("exercises");
  await shot("calisthenics-exercises-fr-dark-375");

  // Both modules without any data.
  setFixture("empty");
  await go("/sport/running");
  await until(() => evaluate("document.body.innerText.includes('Aucune course enregistrée')"), "running empty state");
  assert.equal(await evaluate("[...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Enregistrer une course').length"), 1, "Single CTA in the empty state");
  await noOverflow("running empty");
  await shot("running-empty-fr-dark-375");
  await go("/sport/calisthenics");
  await until(() => evaluate("!!document.querySelector('.sport-empty-state')"), "calisthenics empty state");
  assert.ok(await evaluate("!!document.querySelector('.sport-empty-state button')"), "empty state has a create action");
  await noOverflow("calisthenics empty");
  await shot("calisthenics-empty-fr-dark-375");
  setFixture("normal");
  assert.ok(!requests.some((request) => !["GET", "HEAD"].includes(request.method)), "No writes during module checks");
}
