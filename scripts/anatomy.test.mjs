import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { resolveAnatomyPilot, ROWING_PILOT_ID } = load("src/lib/anatomy/pilots.ts");
const { ROWING_MUSCLES, rowingMuscleFromMetadata, ANATOMY_ASSET } = load("src/lib/anatomy/rowing.ts");

test("pilot uses the stable guide identity and only explicit precise multilingual aliases", () => {
  for (const name of ["Rowing haltère unilatéral", "  ROWING  HALTÈRE UNILATÉRAL ", "One-arm dumbbell row", "تجديف دمبل بذراع واحدة"]) assert.equal(resolveAnatomyPilot({ name }), ROWING_PILOT_ID);
  assert.equal(resolveAnatomyPilot({ guideId: ROWING_PILOT_ID, name: "stored personal title" }), ROWING_PILOT_ID);
  for (const name of ["Rowing haltère", "Rowing haltère unilatéral incliné", "Rowing barre", "Tractions", "", "Seated cable row"]) assert.equal(resolveAnatomyPilot({ name }), null);
  assert.equal(resolveAnatomyPilot({ guideId: "seated-cable-row", name: "Rowing haltère unilatéral" }), null);
  assert.equal(resolveAnatomyPilot({ name: "Rowing haltère unilatéral", muscle: "Pectoraux" }), null);
});

test("every highlighted structure has an actual named mesh in the pinned male GLB", () => {
  const bytes = readFileSync("public/models/anatomy/male-mobile.glb");
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.length, ANATOMY_ASSET.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), ANATOMY_ASSET.sha256);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
  const map = JSON.parse(readFileSync("public/models/anatomy/muscle-map.json", "utf8"));
  assert.equal(map.sex, "male");
  assert.equal(gltf.meshes.length, 221);
  assert.ok(!gltf.images?.length && !gltf.textures?.length);
  assert.ok(gltf.meshes.every(mesh=>mesh.primitives.length===1));
  const ids = new Set(gltf.nodes.filter(node=>node.mesh !== undefined).map(node=>node.extras?.muscleId));
  const keys = new Set();
  for (const group of ROWING_MUSCLES) for (const key of group.keys) {
    assert.ok(!keys.has(key), `Duplicate role assignment: ${key}`); keys.add(key);
    for (const side of ["left", "right"]) {
      const record = map.muscles.find(muscle=>muscle.key===key && muscle.side===side);
      assert.ok(record, `${key}/${side} missing from source map`);
      assert.ok(ids.has(record.id), `${record.id} missing from the actual model`);
    }
  }
  assert.equal(map.assets[0].triangles, 128917);
  assert.ok(bytes.length<3*1024*1024);
});

test("side mapping colors working-side movers, bilateral stabilizers and no undocumented anatomy", () => {
  assert.equal(rowingMuscleFromMetadata({ key: "latissimus_dorsi", side: "right" }, "right").role, "primary");
  assert.equal(rowingMuscleFromMetadata({ key: "latissimus_dorsi", side: "left" }, "right"), null);
  for (const side of ["left", "right"]) assert.equal(rowingMuscleFromMetadata({ key: "external_oblique", side }, "right").role, "stabilizer");
  for (const key of ["trapezius_upper", "deltoid_anterior", "unknown", "quadriceps"]) assert.equal(rowingMuscleFromMetadata({ key, side: "right" }, "right"), null);
  assert.equal(rowingMuscleFromMetadata({ key: "latissimus_dorsi", side: "unknown" }, "right"), null);
});

test("lazy anatomy UI and muscle descriptions are complete in FR EN AR", () => {
  const { anatomyCopy } = load("src/lib/anatomy/copy.ts");
  const french = anatomyCopy("fr");
  for (const language of ["fr", "en", "ar"]) {
    const copy = anatomyCopy(language);
    assert.deepEqual(Object.keys(copy.ui).sort(), Object.keys(french.ui).sort());
    assert.ok(Object.values(copy.ui).every(value=>typeof value === "string" && value.trim()));
    for (const group of ROWING_MUSCLES) { assert.ok(copy.muscles[group.id].name.length>2); assert.ok(copy.muscles[group.id].description.length>20); assert.ok(copy.actions[group.id].length>5); }
  }
});

test("model redistribution includes actual upstream licenses, attribution and a pinned source", () => {
  const source=JSON.parse(readFileSync("public/models/anatomy/SOURCE.json","utf8"));
  assert.match(source.commit,/^[a-f0-9]{40}$/);
  assert.equal(source.sha256,ANATOMY_ASSET.sha256);
  assert.ok(readFileSync("public/models/anatomy/LICENSE-CC-BY-SA-4.0.txt","utf8").startsWith("Attribution-ShareAlike 4.0 International"));
  assert.ok(readFileSync("public/models/anatomy/ATTRIBUTION-UPSTREAM.txt","utf8").includes("Kousaku Okubo"));
  assert.ok(readFileSync("public/models/anatomy/Z-Anatomy-LICENSE.txt","utf8").includes("Z-Anatomy"));
});

test("the real Next matcher excludes public atlas files while keeping app authentication in place", () => {
  // This installed 16.3.5 package still exports the earlier utility name.
  const { unstable_doesMiddlewareMatch: doesMatch } = createRequire(import.meta.url)("next/experimental/testing/server");
  const { config } = sourceLoader({ "@/lib/supabase/middleware": { updateSession: () => assert.fail("Matcher test must not refresh sessions") } })("src/proxy.ts");
  for (const url of ["/models/anatomy/male-mobile.glb?v=hash", "/models/anatomy/LICENSE-CC-BY-SA-4.0.txt", "/models/anatomy/SOURCE.json"]) assert.equal(doesMatch({ config, nextConfig: {}, url }), false);
  for (const url of ["/sport/musculation", "/dashboard", "/nutrition", "/models/anatomy-private"]) assert.equal(doesMatch({ config, nextConfig: {}, url }), true);
});
