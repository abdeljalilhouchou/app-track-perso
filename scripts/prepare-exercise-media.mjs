import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Re-encode already generated and visually inspected originals. No generation,
// network access or database access. Existing exercise photos are never replaced.
const sourceArg = process.argv.indexOf("--source-dir");
if (sourceArg < 0 || !process.argv[sourceArg + 1]) throw new Error("Usage: node scripts/prepare-exercise-media.mjs --source-dir <generated-image-directory>");
const source = path.resolve(process.argv[sourceArg + 1]);
const generated = [
  ["incline-dumbbell-press-start", "exec-47e9e317-eca7-4e66-b40f-5acb5199005b.png"],
  ["incline-dumbbell-press-end", "exec-b03cadbd-adcd-4d33-890a-cab793464e66.png"],
  ["one-arm-dumbbell-row-start", "exec-3ebf0eb0-6086-43f4-9d89-c8d2695a21d5.png"],
  ["barbell-back-squat-start", "exec-17a57a67-d075-4eb4-834b-2af6b70b79e1.png"],
  ["barbell-back-squat-bottom", "exec-15b80147-9654-4333-9154-828982196a94.png"],
  ["incline-dumbbell-curl-start", "exec-b2888b29-66b0-4ece-a726-bc52c1adc4f3.png"],
  ["incline-dumbbell-curl-end", "exec-e1b9b4da-6694-447a-8126-99271283784b.png"],
  ["seated-cable-row-start", "exec-9c630a65-8f64-46ea-b3b9-235991317634.png"],
  ["seated-cable-row-end", "exec-3609e9f5-c9fa-46c0-bad2-9ea25441f329.png"],
];
const thumbnails = [
  ["strength-developpe-incline-halteres", "pilot/incline-dumbbell-press-end.webp"],
  ["strength-rowing-haltere-unilateral", "one-arm-dumbbell-row.webp"],
  ["strength-squat", "pilot/barbell-back-squat-bottom.webp"],
  ["strength-curl-incline", "pilot/incline-dumbbell-curl-end.webp"],
  ["strength-tirage-horizontal-poulie", "pilot/seated-cable-row-end.webp"],
  ["strength-curl-halteres", "dumbbell-curl.webp"],
  ["strength-pompes", "push-up.webp"],
];
const directory = path.resolve("public/images/exercises");
await mkdir(path.join(directory, "pilot"), { recursive: true });
await mkdir(path.join(directory, "thumbnails"), { recursive: true });
const assets = [];
async function record(file, type, original) {
  const bytes = await readFile(file), metadata = await sharp(bytes).metadata();
  assets.push({ file: path.relative(process.cwd(), file).replaceAll("\\", "/"), type, original, width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
for (const [name, filename] of generated) {
  const original = path.join(source, filename), destination = path.join(directory, "pilot", `${name}.webp`);
  await sharp(original).rotate().resize(960, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(destination);
  await record(destination, "generated-photograph", original);
}
for (const [id, hero] of thumbnails) {
  const destination = path.join(directory, "thumbnails", `${id}.webp`);
  await sharp(path.join(directory, hero)).resize(320, 214, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(destination);
  await record(destination, "thumbnail-derivative", `public/images/exercises/${hero}`);
}
await mkdir("docs/exercise-visual-library", { recursive: true });
await writeFile("docs/exercise-visual-library/asset-files.json", JSON.stringify({ tool: "Built-in image_gen, followed by local Sharp resizing/encoding", generationDate: "2026-11-07", license: "AI outputs created for this project; no third-party stock/Creative Commons license or exclusivity asserted.", assets }, null, 2) + "\n");
console.log(JSON.stringify({ generatedPhotographs: generated.length, thumbnails: thumbnails.length, totalBytes: assets.reduce((sum, item) => sum + item.bytes, 0) }));
