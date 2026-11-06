import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const beforePath = process.argv[2] ?? "docs/anatomy/rowing-before.json";
const afterPath = process.argv[3] ?? "docs/anatomy/rowing-after.json";
const outputPath = process.argv[4] ?? "docs/anatomy/bundle-audit.json";
const before = JSON.parse(await readFile(beforePath, "utf8"));
const after = JSON.parse(await readFile(afterPath, "utf8"));
const markers = ["THREE.WebGLRenderer", "THREE.GLTFLoader", "OrbitControls:"];
const cache = new Map();
async function bytes(file) { if (!cache.has(file)) cache.set(file, await readFile(path.join(".next", file))); return cache.get(file); }
const initial = [];
for (const [route, report] of Object.entries(after.routes)) {
  for (const { file } of report.files) {
    const content = (await bytes(file)).toString("utf8");
    assert.ok(!markers.some(marker => content.includes(marker)), `3D engine entered initial JS: ${route}/${file}`);
  }
  initial.push({ route, beforeGzip: before.routes[route]?.gzip ?? null, afterGzip: report.gzip, deltaGzip: before.routes[route] ? report.gzip - before.routes[route].gzip : null });
}
const deferred = [];
for (const file of await readdir(".next/static/chunks")) {
  if (!file.endsWith(".js")) continue;
  const location = `static/chunks/${file}`, buffer = await bytes(location), content = buffer.toString("utf8");
  if (markers.some(marker => content.includes(marker))) deferred.push({ file: location, bytes: buffer.length, gzip: gzipSync(buffer).length });
}
assert.ok(deferred.length > 0, "Expected real Three.js engine in deferred output");
const result = { method: "Initial route manifests checked for actual Three.js implementation markers; deferred files measured from build output, not a browser transfer measurement.", beforePath, afterPath, initialEngineAbsent: true, routes: initial, deferredEngineFiles: deferred };
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ initialEngineAbsent: true, routesChecked: initial.length, deferredEngineFiles: deferred }, null, 2));
