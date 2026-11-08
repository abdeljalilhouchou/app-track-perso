import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { sourceLoader } from "./test-source-loader.mjs";

const load=sourceLoader();
const {EXERCISE_VISUAL_MEDIA:media,visualMediaFor}=load("src/lib/exercises/media-registry.ts");
const {EXERCISE_V3_IDS:ids}=load("src/lib/exercises/media-v3-index.ts");
const {EXERCISE_V3_COPY:copy,v3Technique}=load("src/lib/exercises/media-v3-content.ts");
const {MEDIA_EXPERIENCE_IDS,mediaExperienceId,mediaGalleryFrames}=load("src/lib/exercises/media-experience.ts");
const {baseCatalog}=load("src/lib/exercises/catalog.ts");
const baseline=JSON.parse(readFileSync("docs/exercise-visual-library-v3/before-inventory.json","utf8"));
const generation=JSON.parse(readFileSync("docs/exercise-visual-library-v3/generation.json","utf8"));

test("V3 adds exactly 15 unphotographed catalog identities, 14 from the versioned program, without changing catalog composition",()=>{
  assert.equal(ids.length,15);assert.equal(new Set(ids).size,15);
  assert.equal(Object.keys(media).length,baseline.photos+15);
  assert.equal(MEDIA_EXPERIENCE_IDS.length,20);
  assert.equal(baseline.selected.filter(item=>item.programs.length).length,14);
  for(const id of ids){assert.ok(baseCatalog("fr").some(item=>item.key===id));assert.equal(baseline.registry[id],undefined);}
  for(const [id,record] of Object.entries(baseline.registry))assert.deepEqual(JSON.parse(JSON.stringify(media[id])),record);
});

test("original photographs and all five pilot position files retain exact bytes",()=>{
  for(const {file,sha256} of baseline.files)assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"),sha256,file);
});

test("reviewed originals are traceable, rejected proposals cannot enter the active registry",()=>{
  assert.equal(generation.generated,generation.records.length);
  assert.equal(generation.accepted,29);assert.equal(generation.rejected,5);
  const accepted=generation.records.filter(item=>item.status==="visually-reviewed"),rejected=generation.records.filter(item=>item.status==="rejected");
  assert.equal(accepted.length,29);assert.equal(rejected.length,5);
  const used=new Set(generation.mapping.flatMap(item=>[item.start,item.end]).filter(Boolean));
  for(const record of accepted){assert.ok(used.has(record.asset));assert.ok(record.prompt&&record.original&&record.reference&&record.review);}
  for(const record of rejected)assert.ok(!used.has(record.asset));
});

for(const id of ids)test(`${id}: real phase count, exact identity, translations and technical copy`,()=>{
  const item=media[id],frames=mediaGalleryFrames(item),expected=id==="strength-gainage-planche"?1:2;
  assert.equal(item.userApproval,"pending-batch-validation");assert.equal(frames.length,expected);
  assert.equal(new Set(frames.map(frame=>frame.src)).size,expected);
  const canonical=baseCatalog("fr").find(item=>item.key===id);
  for(const language of ["fr","en","ar"]){
    assert.equal(mediaExperienceId(canonical.searchNames[["fr","en","ar"].indexOf(language)],canonical.primary[0]),id);
    const text=v3Technique(id,language);assert.ok(text);
    for(const [key,value] of Object.entries(text))assert.ok(Array.isArray(value)?value.length>=2&&value.every(Boolean):value.length>8,`${language}/${key}`);
    assert.ok(copy[id].variant[language]&&copy[id].start[language]);
  }
  assert.equal(visualMediaFor({key:id,origin:"personal",discipline:"musculation"}),null);
  assert.equal(visualMediaFor({key:id,origin:"builtin",discipline:"calisthenics"}),null);
  assert.equal(mediaExperienceId(canonical.storedName+" maison",canonical.primary[0]),null);
  assert.equal(mediaExperienceId(canonical.storedName,""),null);
});

test("the static plank has no fabricated start/end pair and movement fallbacks stay explicit",()=>{
  const plank=media["strength-gainage-planche"];
  assert.equal(plank.startPositionImage,undefined);assert.equal(plank.endPositionImage,undefined);
  assert.equal(plank.staticPositionImage.label.fr,"Maintien statique");
  assert.notEqual(plank.staticPositionImage.label.fr,plank.staticPositionImage.caption.fr);
  assert.equal(mediaGalleryFrames(plank).length,1);assert.ok(plank.heroImage.src.endsWith("-hold.webp"));
  assert.equal(v3Technique("unlisted","fr"),null);
  assert.equal(mediaExperienceId("Développé incliné barre","Pectoraux"),null);
  assert.equal(visualMediaFor({key:"bodyweight-squat",origin:"builtin",discipline:"musculation"}),null);
});
