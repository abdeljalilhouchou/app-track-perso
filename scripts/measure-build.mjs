import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { gzipSync } from "node:zlib";

// Measure build artifacts only: no requests, environment files, or user data.
const build = path.resolve(".next");
const routes = ["dashboard", "habits", "nutrition", "humeur", "profil", "sport", "sport/musculation", "sport/calendar", "sport/stats", "sport/calisthenics", "sport/running"];
if (process.argv.includes("--exercise-library")) routes.push("sport/exercises", "sport/exercises/[key]");
const bytes = async (files) => {
  const sizes = await Promise.all([...new Set(files)].map(async (file) => {
    const buffer = await readFile(path.join(build, file));
    return { file, raw: buffer.length, gzip: gzipSync(buffer).length };
  }));
  return { raw: sizes.reduce((sum, item) => sum + item.raw, 0), gzip: sizes.reduce((sum, item) => sum + item.gzip, 0), files: sizes };
};
const report = { generatedAt: new Date().toISOString(), method: "Unique initial JS files from route entryJSFiles + rootMainFiles + polyfillFiles; gzip per file. Not a browser transfer or timing measurement.", routes: {} };
for (const route of routes) {
  const directory = path.join(build, "server/app/(app)", route);
  const sandbox = {};
  vm.runInNewContext(await readFile(path.join(directory, "page_client-reference-manifest.js"), "utf8"), sandbox);
  const manifest = Object.values(sandbox.__RSC_MANIFEST)[0];
  const entry = Object.entries(manifest.entryJSFiles).find(([key]) => key.endsWith(`/src/app/(app)/${route}/page`));
  if (!entry) throw new Error(`Missing JS entry for /${route}`);
  const root = JSON.parse(await readFile(path.join(directory, "page/build-manifest.json"), "utf8"));
  report.routes[`/${route}`] = await bytes([...entry[1], ...root.rootMainFiles, ...root.polyfillFiles]);
}
const media = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else media.push({ file: path.relative(process.cwd(), file).replaceAll("\\", "/"), bytes: (await stat(file)).size });
  }
}
await walk(path.resolve("public"));
await walk(path.join(build, "static/media"));
report.media = media;
const output = process.argv[2];
if (output) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
}
console.table(Object.entries(report.routes).map(([route, size]) => ({ route, "JS KiB": (size.raw / 1024).toFixed(1), "gzip KiB": (size.gzip / 1024).toFixed(1), files: size.files.length })));
