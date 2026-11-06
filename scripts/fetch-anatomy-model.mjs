import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// Explicit, reproducible public-asset download. No credentials or project environment used.
const repository = "slfresh/fitmitwith-anatomy-atlas";
const expectedHash = "d80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54";
const headers = { "User-Agent": "Track-Perso-anatomy-asset-audit" };
async function read(url) { const response = await fetch(url, { headers }); if (!response.ok) throw new Error(`${response.status}: ${url}`); return response; }
const commit = (await (await read(`https://api.github.com/repos/${repository}/commits/master`)).json()).sha;
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Invalid upstream revision");
const base = `https://raw.githubusercontent.com/${repository}/${commit}`;
const map = await (await read(`${base}/maps/full-body-map.json`)).json();
const asset = map.assets.find((asset) => asset.sex === "male" && asset.quality === "mobile");
if (!asset || asset.sha256 !== expectedHash || asset.bytes > 3 * 1024 * 1024) throw new Error("Upstream asset changed; review before updating");
const license = await (await read(`${base}/LICENSE`)).text();
if (!license.startsWith("Attribution-ShareAlike 4.0 International")) throw new Error("Unexpected license");
const attribution = await (await read(`${base}/ATTRIBUTION.txt`)).text();
const upstreamLicense = await (await read(`${base}/upstream/Z-Anatomy-LICENSE.txt`)).text();
const binary = Buffer.from(await (await read(`${base}/${asset.url}`)).arrayBuffer());
if (binary.length !== asset.bytes || createHash("sha256").update(binary).digest("hex") !== expectedHash) throw new Error("Model integrity check failed");
if (binary.toString("ascii", 0, 4) !== "glTF" || binary.readUInt32LE(4) !== 2) throw new Error("Expected glTF 2 binary");
const destination = path.resolve("public/models/anatomy");
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, "male-mobile.glb"), binary);
await writeFile(path.join(destination, "muscle-map.json"), `${JSON.stringify(map, null, 2)}\n`);
await writeFile(path.join(destination, "LICENSE-CC-BY-SA-4.0.txt"), license);
await writeFile(path.join(destination, "ATTRIBUTION-UPSTREAM.txt"), attribution);
await writeFile(path.join(destination, "Z-Anatomy-LICENSE.txt"), upstreamLicense);
await writeFile(path.join(destination, "SOURCE.json"), `${JSON.stringify({ repository, commit, source: `${base}/${asset.url}`, sha256: expectedHash, bytes: binary.length, meshCount: asset.meshCount, triangles: asset.triangles, license: "CC-BY-SA-4.0", changes: "Male GLB copied without geometry changes. Runtime presentation adapted: materials, lighting, role colors, and camera framing. Original meshes and metadata retained." }, null, 2)}\n`);
console.log(JSON.stringify({ commit, bytes: binary.length, meshes: asset.meshCount, triangles: asset.triangles, sha256: expectedHash }));
