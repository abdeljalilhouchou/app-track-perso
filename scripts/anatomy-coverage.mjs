import { mkdir, writeFile, readFile } from "node:fs/promises";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { EXERCISE_ANATOMY_CONFIGS: configs } = load("src/lib/anatomy/configs.ts");
const { baseCatalog } = load("src/lib/exercises/catalog.ts");
const { ATLAS_MUSCLES } = load("src/lib/anatomy/atlas.ts");
const { guides } = load("src/lib/exercises/guides.ts");
const { DEFAULT_PROGRAM } = load("src/lib/strength.ts");
const exercises = [...baseCatalog("fr"), { key: "bodyweight-squat", name: "Squat au poids du corps", primary: ["Quadriceps"], searchNames: ["Squat au poids du corps", "Bodyweight squat", "قرفصاء بوزن الجسم"] }];
const buffer = await readFile("public/models/anatomy/male-mobile.glb");
const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
const nodes = gltf.nodes.filter((node) => node.mesh !== undefined);
const records = exercises.map((item) => {
  const config = configs.find((config) => config.id === item.key);
  return { id: item.key, name: item.name, category: item.primary[0], aliases: item.searchNames, supported: !!config, partial: config?.partial ?? false, confidence: config?.confidence ?? "unresolved-variant", initialView: config?.initialView ?? null,
    limitations: config?.limitations ?? [], sources: config?.sources ?? [],
    groups: config?.muscles.map((group) => ({ ...group, names: ATLAS_MUSCLES[group.id].name, meshIds: nodes.filter((node) => group.keys.includes(node.extras.key)).map((node) => node.extras.muscleId), actions: config.actions[group.id] })) ?? [] };
});
const report = {
  scope: "Versioned strength catalog only. Actual personal/program/history rows are user-dependent and were not read from production. Runtime identity resolution uses existing read-only data.",
  counts: { predefined: baseCatalog("fr").length, existingEditorial: 1, total: records.length, mapped: configs.length, completeWithinDeclaredScope: configs.filter((item) => !item.partial).length, partial: configs.filter((item) => item.partial).length, unsupported: records.filter((item) => !item.supported).length, professionallyValidated: 0 },
  additionalReview: records.filter((item) => item.partial || !item.supported).map((item) => item.name),
  unavailableMuscles: Object.entries(ATLAS_MUSCLES).filter(([, group]) => !group.keys.length).map(([id, group]) => ({ id, names: group.name })),
  defaultProgram: DEFAULT_PROGRAM.flatMap((session) => session.exercises.map((item) => ({ name: item.name, muscle: item.muscle, config: configs.find((config) => config.names.fr === item.name)?.id ?? null }))),
  existingGuides: guides.map((guide) => ({ id: guide.id, name: guide.names.fr })),
  records,
};
await mkdir("docs/anatomy/v3", { recursive: true });
await writeFile("docs/anatomy/v3/coverage.json", `${JSON.stringify(report, null, 2)}\n`);
const rows = records.map((item) => `| ${item.name} | \`${item.id}\` | ${item.supported ? item.partial ? "Partiel" : "Couvert" : "Non pris en charge"} | ${item.initialView ?? "—"} | ${item.groups.filter((group) => group.role === "primary").map((group) => group.names.fr).join(", ") || "—"} |`);
await writeFile("docs/anatomy/v3/INVENTORY.md", `# Inventaire calculé du catalogue Musculation\n\nGénéré par \`node scripts/anatomy-coverage.mjs\`. Données personnelles distantes non consultées ; aucune écriture. « Couvert » signifie mapping technique contrôlé, pas validation anatomique professionnelle.\n\n${Object.entries(report.counts).map(([key, value]) => `- ${key} : ${value}`).join("\n")}\n\n| Exercice | Identifiant stable | État | Vue initiale | Principaux |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\nLes clés, meshes exacts, rôles, traductions, sources et limites de chaque configuration sont dans [coverage.json](./coverage.json). Les 70 références existent déjà ; aucune entrée n’a été ajoutée au catalogue ou à Supabase.\n`);
console.log(JSON.stringify(report.counts));
