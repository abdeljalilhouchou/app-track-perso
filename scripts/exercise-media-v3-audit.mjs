import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import { sourceLoader } from "./test-source-loader.mjs";

const directory="docs/exercise-visual-library-v3";
const load=sourceLoader();
const {baseCatalog}=load("src/lib/exercises/catalog.ts");
const {guides}=load("src/lib/exercises/guides.ts");
const {EXERCISE_VISUAL_MEDIA:media}=load("src/lib/exercises/media-registry.ts");
const {DEFAULT_PROGRAM}=load("src/lib/strength.ts");
const rows=[...baseCatalog("fr"),...guides.filter(g=>g.id==="bodyweight-squat").map(g=>({key:g.id,storedName:g.names.fr,primary:g.primary}))];
const generated=JSON.parse(readFileSync(`${directory}/generation.json`,"utf8"));
const files=[];
function walk(p){for(const e of readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else files.push({file:f.replaceAll("\\","/"),sha256:createHash("sha256").update(readFileSync(f)).digest("hex"),bytes:readFileSync(f).length});}}
walk("public/images/exercises");
const selected=generated.mapping.map(m=>{const r=rows.find(r=>r.key===m.id);assert.ok(r);return {...m,name:r.storedName,category:r.primary[0],programs:DEFAULT_PROGRAM.filter(p=>p.exercises.some(e=>e.name===r.storedName)).map(p=>p.name),existingGuide:guides.find(x=>x.aliases.includes(r.storedName))?.id??null};});
const inventory={referenceCommit:"4f7d9152160d0c501828d153941d0fccbd4e12b2",scope:"Versioned catalog and DEFAULT_PROGRAM only; no production account queried",references:rows.length,photos:Object.keys(media).length,withoutPhoto:rows.filter(r=>!media[r.key]).length,remainingWithoutPhoto:rows.filter(r=>!media[r.key]),selected,catalog:rows,registry:media,files};
if(process.argv.includes("--before")) {
  assert.equal(Object.keys(media).length,7,"Baseline must precede integration");
  writeFileSync(`${directory}/before-inventory.json`,JSON.stringify(inventory,null,2)+"\n");
} else {
  const before=JSON.parse(readFileSync(`${directory}/before-inventory.json`,"utf8"));
  assert.deepEqual(rows,before.catalog,"Versioned catalog changed");
  for(const [id,record] of Object.entries(before.registry))assert.deepEqual(JSON.parse(JSON.stringify(media[id])),record,`Existing media changed: ${id}`);
  for(const old of before.files)assert.equal(files.find(f=>f.file===old.file)?.sha256,old.sha256,`Existing asset changed: ${old.file}`);
  const protectedPaths=["src/lib/anatomy","src/components/sport/anatomy","public/models/anatomy","src/components/strength","src/lib/strength.ts","src/lib/strength-stats.ts","src/lib/exercises/catalog.ts","src/lib/exercises/composition.ts","src/lib/exercises/identity.ts","src/lib/exercises/guide-content.ts","src/lib/exercises/pilot-technique.ts","src/lib/actions","src/lib/supabase","supabase","src/proxy.ts","package.json","package-lock.json"];
  const status=execFileSync("git",["status","--porcelain","--untracked-files=all","--",...protectedPaths],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  assert.equal(status,"","Protected business/anatomy files changed");
  const dataFile="src/lib/exercises/data.ts";
  const originalData=execFileSync("git",["show",`${before.referenceCommit}:${dataFile}`],{encoding:"utf8",stdio:["ignore","pipe","ignore"]});
  const tree=text=>ts.createSourceFile(dataFile,text,ts.ScriptTarget.Latest,true);
  const previous=tree(originalData),current=tree(readFileSync(dataFile,"utf8"));
  for(const name of ["guideForName","attachGuide","resolveExercise","readPerformance"]){
    const find=root=>root.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).getText().replaceAll("\r\n","\n");
    assert.equal(find(current),find(previous),`Protected data function changed: ${name}`);
  }
  const catalogStatement=root=>root.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText()==="loadExerciseCatalog")).getText().replaceAll("\r\n","\n");
  assert.equal(catalogStatement(current),catalogStatement(previous),"Catalog queries/merging changed");
  inventory.preservation={catalogUnchanged:true,existingMediaRecordsAndFilesUnchanged:true,performanceReaderAndCatalogQueriesUnchanged:true,protectedPathsUnchanged:protectedPaths};
  writeFileSync(`${directory}/after-inventory.json`,JSON.stringify(inventory,null,2)+"\n");
}
console.log(JSON.stringify({references:inventory.references,photos:inventory.photos,withoutPhoto:inventory.withoutPhoto,selected:selected.length,inDefaultProgram:selected.filter(e=>e.programs.length).length}));
if(process.argv.includes("--bundles")){
  const build=JSON.parse(readFileSync(`${directory}/after-build.json`,"utf8"));
  const initial=[...new Set(Object.values(build.routes).flatMap(route=>route.files.map(file=>file.file)))];
  const markers=["/images/exercises/v3/","Exhale through the effort and inhale on return while keeping trunk control.","Keep the elbow angle consistent through the arc."];
  for(const file of initial){const code=readFileSync(path.join(".next",file),"utf8");assert.ok(!markers.some(marker=>code.includes(marker)),`Full V3 copy/photo factory entered initial JS: ${file}`);}
  writeFileSync(`${directory}/copy-bundle-audit.json`,JSON.stringify({method:"Build route manifests inspected for server-only full technique/photo factory markers. Image URLs and technique of the opened exercise are still delivered on demand.",routesChecked:Object.keys(build.routes).length,initialFilesChecked:initial.length,initialFullV3CopyAbsent:true,initialLargePhotoFactoryAbsent:true},null,2)+"\n");
}
