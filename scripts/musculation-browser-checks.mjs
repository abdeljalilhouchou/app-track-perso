import assert from "node:assert/strict";
import path from "node:path";
import { writeFile } from "node:fs/promises";

/**
 * Musculation, Session tab: the before-session hero and the focus-mode session (set,
 * steppers, plates, rest, options, finish). Read-only: the session is never saved.
 */
export async function checkMusculation({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort }) {
  const result = results.musculation = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async () => { await navigatePage(`http://127.0.0.1:${appPort}/sport/musculation`); await ready("/sport/musculation"); };
  const shot = async (name) => {
    await pause(350);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    await writeFile(path.join(output, `musculation-${name}.png`), Buffer.from(data, "base64"));
    result.screenshots.push(`musculation-${name}.png`);
  };
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const draft = () => evaluate("JSON.parse(localStorage.getItem('strength-draft-v1') || 'null')");
  const noOverflow = async (context) => assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), `No horizontal overflow (${context})`);

  await evaluate("localStorage.removeItem('strength-draft-v1')");
  for (const [language, theme, width] of [["fr", "dark", 390], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1280]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go();
    await until(() => evaluate("!!document.querySelector('[data-session-hero]')"), "session hero");
    await noOverflow(`before ${language}/${theme}/${width}`);
    await shot(`before-${language}-${theme}-${width}`);
    result.cases.push({ language, theme, width });
  }

  profile.language = "fr"; profile.theme = "dark";
  await size(390); await go();
  await until(() => evaluate("!!document.querySelector('[data-session-hero]')"), "session hero");
  assert.equal(await evaluate("document.querySelectorAll('[data-program-strip] li').length"), 3, "three program sessions");
  assert.ok(await evaluate("document.querySelector('[data-session-hero]').innerText.includes('Dos & Biceps') && /Séance du jour/i.test(document.querySelector('[data-session-hero]').innerText)"), "the program's next session is shown");
  await evaluate("document.querySelectorAll('[data-program-strip] button')[0].click()");
  await until(() => evaluate("document.querySelector('#session-of-day').textContent.includes('Pectoraux')"), "pick the session done last week");
  const firstRow = await evaluate("document.querySelector('[data-hero-exercise]').innerText.replace(/\\s+/g, ' ')");
  assert.ok(firstRow.includes("60 kg") && firstRow.includes("↑ 62,5 kg"), `last load and today's aim (${firstRow})`);
  assert.ok(await evaluate("/Dernière fois/.test(document.querySelector('[data-session-hero]').innerText)"), "last time line");


  // Start: focus mode.
  await click("[data-start-session]");
  await until(() => evaluate("!!document.querySelector('[data-focus-card]')"), "focus card");
  assert.ok(await evaluate("document.querySelector('#focus-exercise').textContent.includes('Développé couché barre')"));
  assert.equal(await evaluate("document.querySelector('[data-focus-stepper=kg] input').value"), "62,5", "load prefilled with today's aim");
  assert.equal(await evaluate("document.querySelector('[data-focus-stepper=reps] input').value"), "8", "reps prefilled with the target");
  assert.ok(await evaluate("document.querySelector('[data-focus-hints]').innerText.includes('20 + 1,25')"), "plates per side for a barbell");
  assert.ok(await evaluate("document.querySelector('[data-focus-hints]').innerText.includes('60 × 8')"), "last time for this set");
  assert.equal(await evaluate("document.querySelectorAll('[data-focus-sets] li').length"), 4);
  await noOverflow("focus 390");
  await shot("focus-fr-dark-390");

  // The technique guide opens over the session and leaves the draft untouched.
  const before = await evaluate("localStorage.getItem('strength-draft-v1')");
  await evaluate("document.querySelector('.focus-quick .exercise-guide-button').click()");
  await until(() => evaluate("!!document.querySelector('dialog[open]')"), "technique guide");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await until(() => evaluate("!document.querySelector('dialog[open]')"), "guide closed");
  assert.equal(await evaluate("localStorage.getItem('strength-draft-v1')"), before, "draft unchanged by the guide");
  assert.ok(await evaluate("!!document.querySelector('[data-focus-card]')"), "still on the set");

  await evaluate("document.querySelector('[data-focus-stepper=kg] button').click()");
  await until(() => evaluate("document.querySelector('[data-focus-stepper=kg] input').value === '65'"), "+2,5 kg");
  await evaluate("document.querySelector('[data-focus-stepper=reps] button:last-of-type').click()");
  await until(() => evaluate("document.querySelector('[data-focus-stepper=reps] input').value === '7'"), "−1 rep");
  await click("[data-focus-validate]");
  await until(() => evaluate("!!document.querySelector('[data-focus-rest]')"), "rest view");
  const saved = await draft();
  assert.deepEqual(saved.exercises[0].sets[0], { weight: "65", reps: "7", done: true }, "the validated set is kept in the draft");
  assert.ok(await evaluate("document.querySelector('[data-focus-rest]').innerText.includes('Série 1 enregistrée')"));
  assert.ok(await evaluate("document.querySelector('[data-focus-topbar]').innerText.includes('1 série ·')"));
  await shot("rest-fr-dark-390");
  await click("[data-focus-ready]");
  await until(() => evaluate("!!document.querySelector('[data-focus-card]')"), "back to the set");
  assert.equal(await evaluate("document.querySelector('[data-focus-sets] [data-set-state=current]').textContent.includes('2')"), true, "set 2 is current");
  assert.equal(await evaluate("document.querySelector('[data-focus-stepper=kg] input').value"), "65", "set 2 starts from set 1");

  // Correct set 1: it becomes the current set again.
  await click("[data-focus-sets] [data-set-state=done]");
  await until(() => evaluate("document.querySelector('[data-focus-validate]').textContent.includes('1')"), "set 1 reopened");
  await click("[data-focus-validate]");
  await until(() => evaluate("!!document.querySelector('[data-focus-rest]')"), "rest again");
  await click("[data-focus-ready]");

  // Options sheet: add then remove a set.
  await click("[data-focus-options]");
  await until(() => evaluate("!!document.querySelector('[data-focus-options-sheet]')"), "options sheet");
  await click("[data-focus-add-set]");
  await until(async () => (await draft()).exercises[0].sets.length === 5, "set added");
  await click("[data-focus-remove-set]");
  await until(async () => (await draft()).exercises[0].sets.length === 4, "set removed");
  await shot("options-fr-dark-390");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
  await until(() => evaluate("!document.querySelector('[data-focus-options-sheet]')"), "options closed");

  // Next exercise from the navigation.
  await evaluate("document.querySelector('[data-focus-nav] > button:last-of-type').click()");
  await until(() => evaluate("document.querySelector('#focus-exercise').textContent.includes('incliné')"), "next exercise");
  assert.ok(await evaluate("document.querySelector('[data-focus-hints]').innerText.includes('Première fois')"), "no history for this one");

  // Finish view, then back without saving.
  await click("[data-focus-finish]");
  await until(() => evaluate("!!document.querySelector('[data-focus-finish-view]')"), "finish view");
  assert.ok(await evaluate("document.querySelector('[data-focus-finish-view]').innerText.includes('Pectoraux')"), "muscles worked");
  assert.ok(await evaluate("document.querySelectorAll('[data-focus-finish-view] [role=radio]').length === 5"), "five feelings");
  await noOverflow("finish 390");
  await shot("finish-fr-dark-390");
  await evaluate("[...document.querySelectorAll('[data-focus-finish-view] button')].at(-1).click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-card]')"), "back to the session");

  // Resume after a reload.
  await go();
  await until(() => evaluate("!!document.querySelector('[data-session-resume]')"), "resume banner");
  await evaluate("document.querySelector('[data-session-resume] button').click()");
  await until(() => evaluate("!!document.querySelector('[data-focus-card]')"), "resumed");
  assert.ok(await evaluate("document.querySelector('#focus-exercise').textContent.includes('Développé couché barre')"), "resumes on the first exercise left open");
  assert.equal(await evaluate("document.querySelectorAll('[data-focus-sets] [data-set-state=done]').length"), 1, "with its done set");
  for (const [language, theme, width] of [["ar", "dark", 390], ["en", "light", 320]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go();
    await until(() => evaluate("!!document.querySelector('[data-session-resume]')"), "resume banner");
    await evaluate("document.querySelector('[data-session-resume] button').click()");
    await until(() => evaluate("!!document.querySelector('[data-focus-card]')"), "focus card");
    await noOverflow(`focus ${language}/${width}`);
    await shot(`focus-${language}-${theme}-${width}`);
  }
  await evaluate("localStorage.removeItem('strength-draft-v1')");

  // Tabs: four, the old Stats link opens Progress.
  profile.language = "fr"; profile.theme = "dark";
  await size(390);
  await navigatePage(`http://127.0.0.1:${appPort}/sport/musculation?tab=stats`); await ready("/sport/musculation");
  assert.equal(await evaluate("document.querySelectorAll('[role=tablist] [role=tab]').length"), 4, "four tabs");
  assert.ok(await evaluate("document.querySelector('[data-strength-header] h1').textContent === 'Musculation' && getComputedStyle(document.querySelector('[data-sport-context-navigation]')).display === 'none'"), "compact header");
  await until(() => evaluate("document.getElementById('sport-tab-progress').getAttribute('aria-selected') === 'true'"), "stats opens progress");

  // Progress.
  await until(() => evaluate("!!document.querySelector('[data-progress-view]')"), "progress view");
  assert.equal(await evaluate("document.querySelectorAll('[data-progress-kpis] > div').length"), 4);
  const kpis = await evaluate("document.querySelector('[data-progress-kpis]').innerText.replace(/\\s+/g, ' ')");
  assert.ok(/Séances 3/.test(kpis) && /Records battus 1/.test(kpis), `key figures (${kpis})`);
  assert.ok(await evaluate("document.querySelector('[data-progress-curve]').innerText.includes('+2,5 kg')"), "gain over the period");
  assert.equal(await evaluate("document.querySelectorAll('[data-progress-regularity] ol > li').length"), 12, "twelve weekly bars");
  assert.ok(await evaluate("document.querySelector('[data-progress-regularity]').innerText.includes('objectif 3')"), "goal line labelled");
  assert.ok(await evaluate("document.querySelector('[data-progress-records]').innerText.includes('60 kg × 8')"), "personal record");
  await evaluate("document.querySelector('[role=radiogroup] [role=radio]').click()");
  await until(() => evaluate("document.querySelector('[role=radiogroup] [role=radio]').getAttribute('aria-checked') === 'true'"), "four weeks");
  await noOverflow("progress 390");
  await shot("progress-fr-dark-390");

  // Program.
  await evaluate("document.getElementById('sport-tab-program').click()");
  await until(() => evaluate("!!document.querySelector('[data-program-manager]')"), "program view");
  assert.equal(await evaluate("document.querySelectorAll('[data-template-card]').length"), 3);
  assert.ok(await evaluate("document.querySelector('[data-program-manager]').innerText.includes('Suivant : Dos & Biceps')"), "next session named");
  assert.ok(await evaluate("document.querySelectorAll('[data-program-balance] li').length >= 5"), "balance per muscle");
  assert.ok(await evaluate("!document.querySelector('[data-program-manager] [data-exercise-thumbnail], [data-program-manager] .exercise-guide-button')"), "plain exercise rows");
  await noOverflow("program 390");
  await shot("program-fr-dark-390");

  // History: grouped by week, searchable, opened from a date link, redo starts a draft.
  await evaluate("document.getElementById('sport-tab-history').click()");
  await until(() => evaluate("!!document.querySelector('[data-history-view]')"), "history view");
  assert.ok(await evaluate("document.querySelectorAll('[data-history-week]').length >= 3"), "weeks");
  assert.ok(await evaluate("[...document.querySelectorAll('[data-history-week] h2')].some((h) => h.textContent === 'Cette semaine')"));
  await evaluate("(() => { const input=document.querySelector('[data-history-search]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'couché'); input.dispatchEvent(new Event('input',{bubbles:true})); })()");
  await until(() => evaluate("document.querySelectorAll('[data-history-session]').length === 2"), "search by exercise");
  await noOverflow("history 390");
  await shot("history-fr-dark-390");
  const record = await evaluate("[...document.querySelectorAll('[data-history-session]')].find((a) => a.innerText.includes('record'))?.dataset.historySession");
  assert.ok(record, "a session shows its record");
  await navigatePage(`http://127.0.0.1:${appPort}/sport/musculation?date=${record}`); await ready("/sport/musculation");
  await until(() => evaluate("document.getElementById('sport-tab-history').getAttribute('aria-selected') === 'true' && !!document.querySelector('[data-history-detail]')"), "date link opens that session");
  assert.ok(await evaluate("document.querySelector('[data-history-detail]').innerText.includes('60×8')"), "sets detail");
  assert.ok(await evaluate("!document.querySelector('[data-history-detail] button.exercise-guide-button, [data-history-detail] [data-anatomy-open]')"), "no per-exercise buttons");
  await shot("history-open-fr-dark-390");
  await click("[data-history-redo]");
  await until(() => evaluate("document.getElementById('sport-tab-session').getAttribute('aria-selected') === 'true' && !!document.querySelector('[data-session-resume]')"), "redo prepares the session");
  assert.equal((await draft()).exercises[0].name, "Développé couché barre");
  await evaluate("localStorage.removeItem('strength-draft-v1')");

  for (const [language, theme, width] of [["ar", "dark", 390], ["en", "light", 320]]) {
    profile.language = language; profile.theme = theme;
    await size(width);
    for (const tab of ["program", "progress", "history"]) {
      await navigatePage(`http://127.0.0.1:${appPort}/sport/musculation?tab=${tab}`); await ready("/sport/musculation");
      await until(() => evaluate(`!!document.querySelector('#sport-panel-${tab} > *')`), `${tab} ${language}`);
      await noOverflow(`${tab} ${language}/${width}`);
      await shot(`${tab}-${language}-${theme}-${width}`);
    }
  }
  console.log("Musculation: session, program, progress and history passed.");
}
