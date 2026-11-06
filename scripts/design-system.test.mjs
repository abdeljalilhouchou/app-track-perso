import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { progressPresentation, SportProgressBar, SportProgressRing } = load("src/components/sport/ui/sport-progress.tsx");

test("unknown or invalid progress is not presented as a fabricated zero percent", () => {
  for (const value of [null, NaN, Infinity]) assert.equal(progressPresentation(value, 10), null);
  for (const max of [0, -1, NaN, Infinity]) assert.equal(progressPresentation(5, max), null);
  const markup = renderToStaticMarkup(createElement(SportProgressBar, { label: "Unknown", value: null }));
  assert.ok(markup.includes('role="progressbar"'));
  assert.ok(!markup.includes("aria-valuenow"));
});

test("visual progress handles completed and over-completed goals without modifying inputs", () => {
  assert.deepEqual(progressPresentation(2, 4), { current: 2, max: 4, percent: 50 });
  assert.deepEqual(progressPresentation(6, 4), { current: 4, max: 4, percent: 100 });
  assert.deepEqual(progressPresentation(-1, 4), { current: 0, max: 4, percent: 0 });
  const markup = renderToStaticMarkup(createElement(SportProgressRing, { label: "Weekly goal", value: 6, max: 4, valueText: "6 / 4" }));
  assert.ok(markup.includes('aria-valuemax="4"'));
  assert.ok(markup.includes('aria-valuenow="4"'));
  assert.ok(markup.includes('aria-valuetext="6 / 4"'));
});

test("each new UI label has explicit FR, EN and AR text", () => {
  const { sportUiFr, sportUiEn, sportUiAr } = load("src/lib/i18n/modules/sport-ui.ts");
  const { translate } = load("src/lib/i18n/translate.ts");
  for (const dictionary of [sportUiFr, sportUiEn, sportUiAr]) assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(sportUiFr).sort());
  for (const [language, dictionary] of [["fr", sportUiFr], ["en", sportUiEn], ["ar", sportUiAr]]) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.ok(value.trim().length > 0);
      assert.equal(translate(language, `sport.ui.${key}`), value);
    }
  }
});

test("registered media exists locally as WebP and stays below the 150 KiB combined budget", () => {
  const { sportMedia } = load("src/lib/sport-media.ts");
  let bytes = 0;
  for (const image of Object.values(sportMedia)) {
    const file = `public${image.src}`;
    const buffer = readFileSync(file);
    assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
    assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
    bytes += statSync(file).size;
  }
  assert.ok(bytes < 150 * 1024, `${bytes} bytes exceeds the media budget`);
});

test("preview is closed by default and performs no sport reads when disabled", async () => {
  const previous = process.env.SPORT_UI_PREVIEW;
  delete process.env.SPORT_UI_PREVIEW;
  const preview = sourceLoader({
    "next/navigation": { notFound: () => { throw new Error("PREVIEW_NOT_FOUND"); } },
    "@/components/sport/ui/sport-design-preview": { SportDesignPreview: () => null },
    "@/lib/sport-hub-data": { loadSportHubData: () => assert.fail("Closed preview must not read data") },
  })("src/app/(app)/sport/design-system/page.tsx");
  try { await assert.rejects(preview.default(), /PREVIEW_NOT_FOUND/); }
  finally { if (previous !== undefined) process.env.SPORT_UI_PREVIEW = previous; }
});
