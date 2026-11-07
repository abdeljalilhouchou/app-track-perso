import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { MEDIA_EXPERIENCE_PILOTS: pilots, mediaExperienceId, isMediaExperiencePilot, mediaGalleryFrames } = load("src/lib/exercises/media-experience.ts");
const { EXERCISE_VISUAL_MEDIA: registry } = load("src/lib/exercises/media-registry.ts");
const { pilotTechnique } = load("src/lib/exercises/pilot-technique.ts");

test("V2 is restricted to five stable identities and rejects similar or incomplete session identities", () => {
  assert.equal(pilots.length, 5);
  for (const id of pilots) assert.ok(isMediaExperiencePilot(id) && registry[id]);
  assert.equal(mediaExperienceId("Curl incliné", "Biceps"), "strength-curl-incline");
  for (const [name, muscle] of [["Curl incliné maison", "Biceps"], ["Curl incliné", "Dos"], ["Curl incliné", ""], ["Curl haltères", "Biceps"], ["Développé incliné barre", "Pectoraux"]]) assert.equal(mediaExperienceId(name, muscle), null);
  assert.equal(isMediaExperiencePilot("strength-curl-halteres"), false);
});

test("gallery uses actual registered positions; null, one image and duplicate paths never create a false carousel", () => {
  assert.deepEqual(mediaGalleryFrames(null), []);
  assert.deepEqual(mediaGalleryFrames(undefined), []);
  const legacy = registry["strength-curl-halteres"];
  assert.equal(mediaGalleryFrames(legacy).length, 1);
  assert.equal(mediaGalleryFrames(legacy)[0].src, legacy.heroImage.src);
  const pair = registry[pilots[0]];
  assert.deepEqual(mediaGalleryFrames(pair).map((image) => image.src), [pair.startPositionImage.src, pair.endPositionImage.src]);
  assert.equal(mediaGalleryFrames({ ...pair, endPositionImage: pair.startPositionImage }).length, 1);
  assert.equal(mediaGalleryFrames({ ...pair, endPositionImage: undefined }).length, 1);
});

for (const id of [pilots[0], "strength-squat", "strength-curl-incline"]) test(`${id}: independent FR/EN/AR technique and corrections`, () => {
  const texts = ["fr", "en", "ar"].map((language) => pilotTechnique(id, language));
  assert.equal(new Set(texts.map((text) => text.execution)).size, 3);
  for (const text of texts) for (const [key, value] of Object.entries(text)) assert.ok(Array.isArray(value) ? value.length >= 2 && value.every((item) => item.length > 8) : value.length > 20, key);
  assert.equal(pilotTechnique("bodyweight-squat", "fr"), null);
});

test("single-frame component has no navigation", () => {
  const { ExercisePhotoGallery } = sourceLoader({
    "@/components/language-provider": { useLanguage: () => ({ language: "fr", dir: "ltr", t: (key) => key }), useT: () => (key) => key },
    "next/image": (props) => createElement("span", { "data-test-image": props.src }),
  })("src/components/sport/exercises/exercise-photo-gallery.tsx");
  const markup = renderToStaticMarkup(createElement(ExercisePhotoGallery, { media: registry["strength-curl-halteres"], guideId: "standing-dumbbell-curl", name: "Curl haltères" }));
  assert.ok(!markup.includes("data-gallery-next") && !markup.includes("data-gallery-position"));
});
