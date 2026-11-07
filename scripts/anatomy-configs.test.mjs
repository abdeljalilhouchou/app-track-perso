import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { EXERCISE_ANATOMY_CONFIGS: configs, getExerciseAnatomy } = load("src/lib/anatomy/configs.ts");
const { ATLAS_MUSCLES } = load("src/lib/anatomy/atlas.ts");
const { resolveExerciseAnatomy, ANATOMY_CATALOG_KEYS, ANATOMY_PARTIAL_KEYS, anatomyCoverage } = load("src/lib/anatomy/identity.ts");
const { muscleFromMetadata } = load("src/lib/anatomy/highlights.ts");
const { baseCatalog } = load("src/lib/exercises/catalog.ts");
const bytes = readFileSync("public/models/anatomy/male-mobile.glb");
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
const meshes = gltf.nodes.filter((node) => node.mesh !== undefined);

test("registry and configurations cover only the actual 69 seeds plus existing editorial squat", () => {
  const catalog = [...baseCatalog("fr").map((item) => item.key), "bodyweight-squat"];
  assert.equal(catalog.length, 70);
  assert.equal(new Set(configs.map((item) => item.id)).size, configs.length);
  assert.deepEqual([...ANATOMY_CATALOG_KEYS].sort(), configs.map((item) => item.id).sort());
  assert.deepEqual([...ANATOMY_PARTIAL_KEYS].sort(), configs.filter((item) => item.partial).map((item) => item.id).sort());
  for (const config of configs) assert.ok(catalog.includes(config.catalogKey));
  assert.deepEqual(catalog.filter((key) => !getExerciseAnatomy(key)), ["strength-pull-over-haltere"]);
});

test("runtime coverage includes personal rows without assigning anatomy from their title", () => {
  const items = [...baseCatalog("fr"), { key: "bodyweight-squat", name: "Squat au poids du corps", discipline: "musculation", origin: "builtin" }, { key: "personal-123", name: "Curl haltères", discipline: "musculation", origin: "personal" }, { key: "calisthenics-123", name: "Pompes", discipline: "calisthenics", origin: "calisthenics" }];
  assert.deepEqual(anatomyCoverage(items), { total: 71, mapped: 69, partial: 3, unsupported: 2 });
});

for (const config of configs) test(`${config.names.en}: roles, real bilateral GLB identities and FR/EN/AR`, () => {
  assert.ok(config.muscles.some((muscle) => muscle.role === "primary"));
  const keys = new Set();
  for (const group of config.muscles) {
    assert.equal(group.unavailable ?? false, group.keys.length === 0);
    for (const key of group.keys) {
      assert.ok(!keys.has(key), `Multiple roles for ${key}`); keys.add(key);
      for (const side of ["left", "right"]) {
        const node = meshes.find((mesh) => mesh.extras?.key === key && mesh.extras.side === side);
        assert.ok(node, `Missing GLB mesh: ${key}/${side}`);
        assert.equal(node.extras.muscleId, `${key}_${side}`);
      }
    }
    for (const language of ["fr", "en", "ar"]) {
      assert.ok(ATLAS_MUSCLES[group.id].name[language].trim());
      assert.ok(ATLAS_MUSCLES[group.id].action[language].length > 15);
      assert.ok(config.actions[group.id][language].length > 15);
    }
  }
  for (const language of ["fr", "en", "ar"]) {
    assert.ok(config.names[language].trim());
    assert.ok(config.limitations.every((note) => note[language].length > 15));
  }
  if (config.muscles.some((group) => group.unavailable)) assert.ok(config.partial);
});

test("stable identities distinguish variants and reject personal/fuzzy/conflicting records", () => {
  for (const language of ["fr", "en", "ar"]) for (const exercise of baseCatalog(language)) {
    const expected = getExerciseAnatomy(exercise.key) ? exercise.key : null;
    assert.equal(resolveExerciseAnatomy({ name: exercise.name, exerciseKey: exercise.key, origin: "builtin" }), expected);
    assert.equal(resolveExerciseAnatomy({ name: exercise.name, muscle: exercise.primary[0] }), expected);
    assert.equal(resolveExerciseAnatomy({ name: exercise.name, origin: "personal", guideId: "dumbbell-curl" }), null);
  }
  for (const name of ["Curl maison", "Rowing haltère", "Curl haltères incliné", "Bench press", "Squat personnalisé"]) assert.equal(resolveExerciseAnatomy({ name, muscle: "Biceps" }), null);
  assert.equal(resolveExerciseAnatomy({ name: "Curl haltères", muscle: "Dos" }), null);
  assert.equal(resolveExerciseAnatomy({ name: "Curl haltères" }), null);
  assert.equal(resolveExerciseAnatomy({ name: "Curl haltères", muscle: "Biceps", guideId: "unverified-guide" }), null);
  assert.equal(resolveExerciseAnatomy({ name: "Personal", origin: "personal", validatedAnatomyId: "strength-curl-halteres" }), "strength-curl-halteres");
  assert.equal(resolveExerciseAnatomy({ name: "Personal", validatedAnatomyId: "invented" }), null);
  assert.equal(resolveExerciseAnatomy({ name: "Pompes", exerciseKey: "strength-pompes", discipline: "calisthenics" }), null);
});

test("changing exercise cannot retain any role from the previous configuration", () => {
  const sequence = ["strength-rowing-haltere-unilateral", "strength-developpe-incline-halteres", "strength-curl-marteau", "strength-squat", "strength-mollets-assis", "strength-rowing-haltere-unilateral"].map(getExerciseAnatomy);
  for (const config of sequence) for (const mesh of meshes) {
    const result = muscleFromMetadata(config, mesh.extras, "right");
    const expected = config.muscles.find((group) => group.keys.includes(mesh.extras.key));
    assert.equal(result?.role ?? null, expected && (!config.unilateral || expected.role === "stabilizer" || mesh.extras.side === "right") ? expected.role : null);
  }
  assert.equal(muscleFromMetadata(sequence[0], { key: "latissimus_dorsi", side: "right", muscleId: "invented" }, "right"), null);
});

test("movement-dependent roles and actions do not conflate incline, hammer, knee or hip work", () => {
  const role = (key, id) => getExerciseAnatomy(key).muscles.find((group) => group.id === id)?.role;
  assert.equal(role("strength-developpe-incline-halteres", "upperChest"), "primary");
  assert.equal(role("strength-developpe-incline-halteres", "chest"), "secondary");
  assert.equal(role("strength-curl-marteau", "elbowFlexors"), "primary");
  assert.equal(role("strength-curl-halteres", "biceps"), "primary");
  assert.equal(role("strength-mollets-assis", "soleus"), "primary");
  assert.equal(role("strength-mollets-assis", "gastrocnemius"), "secondary");
  assert.ok(!getExerciseAnatomy("strength-souleve-de-terre-jambes-tendues").muscles.flatMap((group) => group.keys).includes("biceps_femoris_short"));
  assert.ok(getExerciseAnatomy("strength-leg-curl-assis").muscles.flatMap((group) => group.keys).includes("biceps_femoris_short"));
  assert.notEqual(getExerciseAnatomy("strength-tirage-vertical-poulie").actions.lats.fr, getExerciseAnatomy("strength-rowing-barre").actions.lats.fr);
  assert.equal(getExerciseAnatomy("strength-marche-du-fermier").muscles.find((group) => group.id === "handIntrinsics").keys.length, 0);
});

test("general UI and unavailable states have identical nonempty translation keys", () => {
  const { generalAnatomyCopy } = load("src/lib/anatomy/general-copy.ts");
  const copies = ["fr", "en", "ar"].map(generalAnatomyCopy);
  for (const copy of copies) {
    assert.deepEqual(Object.keys(copy), Object.keys(copies[0]));
    assert.ok(Object.values(copy).every((value) => value.trim()));
  }
});
