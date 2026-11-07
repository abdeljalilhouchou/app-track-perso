import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { EXERCISE_VISUAL_MEDIA: registry, visualMediaFor } = load("src/lib/exercises/media-registry.ts");
const { EXERCISE_THUMBNAILS, exerciseThumbnail } = load("src/lib/exercises/media-thumbnails.ts");
const { baseCatalog } = load("src/lib/exercises/catalog.ts");
const { exerciseCatalogComposition } = load("src/lib/exercises/composition.ts");
const local = (src) => `public${src}`;

test("only the five requested pilot exercises get new position pairs", () => {
  const pairs = Object.values(registry).filter((item) => item.startPositionImage && item.endPositionImage);
  assert.deepEqual(pairs.map((item) => item.exerciseId).sort(), ["strength-developpe-incline-halteres", "strength-rowing-haltere-unilateral", "strength-squat", "strength-curl-incline", "strength-tirage-horizontal-poulie"].sort());
  assert.equal(Object.keys(registry).length, 7);
  assert.deepEqual(Object.keys(registry).sort(), Object.keys(EXERCISE_THUMBNAILS).sort());
  for (const pair of pairs) {
    assert.notEqual(pair.startPositionImage.src, pair.endPositionImage.src);
    assert.notDeepEqual(readFileSync(local(pair.startPositionImage.src)), readFileSync(local(pair.endPositionImage.src)));
    assert.equal(pair.userApproval, "pending-pilot-validation");
  }
});

for (const media of Object.values(registry)) test(`${media.exerciseId}: real optimized assets, review and translations`, async () => {
  assert.ok(baseCatalog("fr").some((item) => item.key === media.exerciseId));
  assert.equal(media.reviewStatus, "technical-reviewed");
  assert.equal(media.source, "image_gen");
  assert.equal(media.license, "generated-for-project-no-third-party-license-asserted");
  for (const [kind, image] of Object.entries({ hero: media.heroImage, thumbnail: media.thumbnail, start: media.startPositionImage, end: media.endPositionImage })) {
    if (!image) continue;
    assert.ok(image.src.startsWith("/images/exercises/") && !image.src.includes(".."));
    const bytes = readFileSync(local(image.src)), metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, image.width);
    assert.equal(metadata.height, image.height);
    assert.ok(bytes.length < (kind === "thumbnail" ? 25000 : 110000));
    for (const language of ["fr", "en", "ar"]) {
      assert.ok(image.alt[language].length > 20);
      if (image.caption) assert.ok(image.caption[language].length > 20);
    }
  }
});

test("existing correct photographs retain their original hashes", () => {
  const old = JSON.parse(readFileSync("docs/exercise-library/media-registry.json", "utf8"));
  for (const image of old.generatedMedia) assert.equal(createHash("sha256").update(readFileSync(image.path)).digest("hex"), image.sha256);
});

test("stable variants and personal rows never acquire a similar movement's photo", () => {
  for (const name of ["Développé incliné haltères", "Curl incliné", "Squat"]) assert.equal(exerciseThumbnail({ name }, "fr"), undefined);
  assert.equal(exerciseThumbnail({ name: "Curl incliné", muscle: "Biceps" }, "fr").src, registry["strength-curl-incline"].thumbnail.src);
  assert.equal(exerciseThumbnail({ name: "Curl haltères", muscle: "Biceps" }, "fr").src, registry["strength-curl-halteres"].thumbnail.src);
  assert.equal(exerciseThumbnail({ name: "Développé incliné barre", muscle: "Pectoraux" }, "fr"), undefined);
  assert.equal(visualMediaFor({ key: "strength-curl-incline", origin: "personal", discipline: "musculation" }), null);
  assert.equal(visualMediaFor({ key: "strength-curl-incline", origin: "builtin", discipline: "calisthenics" }), null);
  assert.equal(exerciseThumbnail({ name: "Curl incliné maison", muscle: "Biceps" }, "fr"), undefined);
});

test("70 vs 80 is explained by actual composition, never a hard-coded displayed count", () => {
  const builtin = [...baseCatalog("fr"), { key: "bodyweight-squat", discipline: "musculation", origin: "builtin" }];
  const ten = Array.from({ length: 10 }, (_, i) => ({ key: `personal-${i}`, discipline: "musculation", origin: "personal" }));
  assert.deepEqual(exerciseCatalogComposition([...builtin, ...ten]), { total: 80, builtin: 70, personal: 10, calisthenics: 0, photos: 0, strength: 80 });
  const cal = ten.map((item) => ({ ...item, discipline: "calisthenics", origin: "calisthenics" }));
  assert.deepEqual(exerciseCatalogComposition([...builtin, ...cal]), { total: 80, builtin: 70, personal: 0, calisthenics: 10, photos: 0, strength: 70 });
});
