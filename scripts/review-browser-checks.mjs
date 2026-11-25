import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

/**
 * Weekly review, Edge headless against the fixture mock: habits, meals, mood, ten nights and
 * three runs last week, plus last week's goal (three sessions). Read-only: no goal is picked.
 */
export async function checkReview({ send, evaluate, navigatePage, ready, until: waitUntil, pause, results, profile, output, appPort }) {
  const result = results.review = { cases: [], screenshots: [] };
  const until = (check, label, timeout = 20000) => waitUntil(check, label, timeout);
  const size = (width, height = width < 768 ? 844 : 1000) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const go = async (route) => { await navigatePage(`http://127.0.0.1:${appPort}${route}`); await ready(route.split("?")[0]); };
  const shot = async (name) => {
    await pause(900);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await sharp(Buffer.from(data, "base64")).webp({ quality: 86 }).toFile(path.join(output, `review-${name}.webp`));
    result.screenshots.push(`review-${name}.webp`);
  };
  const noOverflow = async (context) => assert.ok(await evaluate("document.documentElement.scrollWidth - innerWidth <= 1"), `No horizontal overflow (${context})`);
  const monday = globalThis.qaReviewMonday;

  for (const [language, theme, width] of [["fr", "dark", 375], ["fr", "light", 320], ["ar", "dark", 390], ["en", "light", 1440]]) {
    profile.language = language; profile.theme = theme;
    await size(width); await go("/bilan");
    await until(() => evaluate("!!document.querySelector('[data-review-score]') && document.querySelectorAll('[data-review-day]').length === 7"), "review rendered");
    await noOverflow(`${language}/${theme}/${width}`);
    assert.equal(await evaluate("document.querySelectorAll('[data-review-stat]').length"), 6, "six figures");
    await shot(`${language}-${theme}-${width}`);
    result.cases.push({ language, theme, width });
  }

  profile.language = "fr"; profile.theme = "dark";
  await size(375); await go("/bilan");
  await until(() => evaluate("!!document.querySelector('[data-review-score]')"), "review rendered");
  const score = await evaluate("document.querySelector('[data-review-score]').innerText");
  assert.ok(/\d+\s*sur 100/.test(score), `a score out of 100 (${score})`);
  assert.ok(await evaluate("document.querySelector('[data-review-stat=sport]').innerText.includes('séance(s) · 19,7 km')"), "three sessions last week");
  assert.equal(await evaluate("document.querySelector('[data-review-stat=sport] .text-2xl').textContent"), "3", "three sessions");
  assert.ok(await evaluate("document.querySelector('[data-review-stat=sleep]').innerText.includes(' h ')"), "an average night");
  // Last week's goal, three sessions, was kept.
  assert.ok(await evaluate("document.querySelector('[data-review-goal-check]').innerText.includes('Tenu')"), "last week's goal checked");
  assert.equal(await evaluate("document.querySelectorAll('[data-review-goal]').length"), 3, "three goals for this week");
  assert.ok(await evaluate("document.querySelector('[data-review-goals] h2').innerText.includes('cette semaine')"), "the goal is for the week under way");
  assert.ok(await evaluate("document.querySelectorAll('[data-review-insight]').length >= 1"), "at least one fact");
  await evaluate("document.querySelector('[data-review-insights]').scrollIntoView({ block: 'center' })");
  await shot("insights-fr-dark-375");
  await evaluate("document.querySelector('[data-review-goals]').scrollIntoView({ block: 'center' })");
  await shot("goals-fr-dark-375");

  // The story, screen by screen, then closed with Escape.
  await evaluate("document.querySelector('[data-review-story-open]').click()");
  await until(() => evaluate("document.querySelector('[data-review-story]')?.dataset.reviewStory === 'score'"), "story opens on the score");
  assert.equal(await evaluate("document.activeElement === document.querySelector('[data-review-story-close]')"), true, "focus on close");
  await shot("story-score");
  const seen = ["score"];
  for (let step = 0; step < 8 && await evaluate("!!document.querySelector('[data-review-story-next]')"); step++) {
    await evaluate("document.querySelector('[data-review-story-next]').click()");
    await pause(150);
    const slide = await evaluate("document.querySelector('[data-review-story]').dataset.reviewStory");
    seen.push(slide);
    await noOverflow(`story ${slide}`);
    if (["sport", "rest", "goal"].includes(slide)) await shot(`story-${slide}`);
  }
  assert.deepEqual(seen, ["score", "habits", "sport", "rest", "noticed", "goal"], "every screen in order");
  assert.equal(await evaluate("document.querySelectorAll('[data-review-story-goal]').length"), 3, "the goals in the story");
  await evaluate("document.querySelector('[data-review-story]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
  await until(() => evaluate("!document.querySelector('[data-review-story]')"), "Escape closes the story");

  // ?story=1 opens it straight away; the arrows walk the weeks.
  await go("/bilan?story=1");
  await until(() => evaluate("!!document.querySelector('[data-review-story]')"), "story from the address");
  await go(`/bilan?semaine=${monday}`);
  await until(() => evaluate("!!document.querySelector('[data-review-next]')"), "a later week to go to");
  await evaluate("document.querySelector('[data-review-next]').click()");
  await until(() => evaluate("document.querySelector('[data-review]')?.innerText.toLowerCase().includes('semaine en cours')"), "this week, in progress");
  assert.equal(await evaluate("!!document.querySelector('[data-review-next]')"), false, "no week after this one");
  await shot("current-fr-dark-375");

  // A wrong address falls back to last week; the home page links to the review.
  await go("/bilan?semaine=2026-13-45");
  await until(() => evaluate("!!document.querySelector('[data-review-score]')"), "fallback week");
  await go("/dashboard");
  await until(() => evaluate("!!document.querySelector('[data-home-review]')"), "home card");
  assert.ok((await evaluate("document.querySelector('[data-home-review]').getAttribute('href')")).startsWith("/bilan"), "home card opens the review");

  // Desktop: the side menu has the review, the floating menu is hidden.
  await size(1440); await go("/bilan");
  await until(() => evaluate("!!document.querySelector('[data-review-score]')"), "desktop review");
  assert.ok(await evaluate("[...document.querySelectorAll('a[href=\"/bilan\"]')].some((a) => a.getClientRects().length)"), "review in the side menu");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-bottom-nav')).display"), "none", "no floating menu on desktop");
  await evaluate("document.querySelector('[data-review-story-open]').click()");
  await until(() => evaluate("!!document.querySelector('[data-review-story]')"), "desktop story");
  await shot("story-en-desktop");
}
