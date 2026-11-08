import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Derivatives of actually inspected, generated originals only. Never replace an older media file.
const root="docs/exercise-visual-library-v3";
const generation=JSON.parse(await readFile(`${root}/generation.json`,"utf8"));
const records=new Map(generation.records.map(r=>[r.asset,r]));
await mkdir("public/images/exercises/v3",{recursive:true});
await mkdir("public/images/exercises/thumbnails",{recursive:true});
const assets=[];
async function save(original,destination,kind) {
  try {await access(destination);throw new Error(`Refusing to overwrite ${destination}`);} catch(error){if(error.code!=="ENOENT")throw error;}
  const width=kind==="thumbnail"?320:960,height=kind==="thumbnail"?213:640;
  await sharp(original).rotate().resize(width,height,{fit:"contain",background:"#17191b",withoutEnlargement:true}).webp({quality:kind==="thumbnail"?78:82,effort:6}).toFile(destination);
  const bytes=await readFile(destination),meta=await sharp(bytes).metadata();
  assert.ok(bytes.length<(kind==="thumbnail"?25000:110000));
  assets.push({file:destination,kind,original,width:meta.width,height:meta.height,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
}
for(const item of generation.mapping) {
  for(const phase of item.static?["hold"]:["start","end"]) {
    const name=phase==="end"?item.end:item.start,record=records.get(name);
    assert.equal(record?.status,"visually-reviewed");
    await save(record.original,`public/images/exercises/v3/${item.id}-${phase}.webp`,"photograph");
  }
  const hero=`public/images/exercises/v3/${item.id}-${item.static?"hold":"end"}.webp`;
  await save(hero,`public/images/exercises/thumbnails/${item.id}.webp`,"thumbnail");
}
const result={method:"Built-in image_gen originals, visually inspected, then Sharp resize/WebP encoding. No image content altered during optimization.",generated:generation.generated,rejected:generation.rejected,accepted:generation.accepted,photographs:assets.filter(a=>a.kind==="photograph").length,thumbnails:assets.filter(a=>a.kind==="thumbnail").length,bytes:assets.reduce((sum,a)=>sum+a.bytes,0),assets};
await writeFile(`${root}/assets.json`,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({...result,assets:undefined},null,2));
