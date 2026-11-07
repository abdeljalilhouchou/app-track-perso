import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sourceLoader } from "./test-source-loader.mjs";

const load = sourceLoader();
const { baseCatalog } = load("src/lib/exercises/catalog.ts");
const { guides } = load("src/lib/exercises/guides.ts");
const { EXERCISE_VISUAL_MEDIA: media } = load("src/lib/exercises/media-registry.ts");
const { resolveExerciseAnatomy } = load("src/lib/anatomy/identity.ts");
const squat = guides.find((item) => item.id === "bodyweight-squat");
const catalog = [...baseCatalog("fr"), { key: squat.id, name: squat.names.fr, primary: squat.primary, equipment: squat.equipment, origin: "builtin", discipline: "musculation" }];
const illustrationIds = new Set(["forearm-plank", "pull-up", "barbell-bench-press", "bodyweight-squat", "seated-cable-row"]);
const records = catalog.map((exercise) => {
  const guide = guides.find((item) => item.aliases.includes(exercise.name));
  const visual = media[exercise.key];
  return { exerciseId: exercise.key, name: exercise.name, category: exercise.primary[0], equipment: exercise.equipment, illustratedEquipment: visual?.illustratedEquipment ?? null, exactVisualVariant: visual?.variant ?? null,
    previousPhoto: guide?.image?.src ?? null, originalIllustration: !!guide && illustrationIds.has(guide.id),
    heroImage: visual?.heroImage.src ?? guide?.image?.src ?? null, thumbnail: visual?.thumbnail.src ?? null,
    startPositionImage: visual?.startPositionImage?.src ?? null, endPositionImage: visual?.endPositionImage?.src ?? null,
    photoMissing: !visual && !guide?.image, positionsMissing: !visual?.startPositionImage || !visual?.endPositionImage,
    fullTechnicalGuide: !!guide, visualTechnicalNotes: visual?.technicalChecks ?? [],
    anatomyId: resolveExerciseAnatomy({ name: exercise.name, exerciseKey: exercise.key, origin: "builtin", discipline: "musculation" }),
    source: visual?.source ?? null, license: visual?.license ?? null, reviewStatus: visual?.reviewStatus ?? "missing",
    userApproval: visual?.userApproval ?? null, technicalSources: visual?.technicalSources ?? guide?.sources ?? [] };
});
const files = JSON.parse(await readFile("docs/exercise-visual-library/asset-files.json", "utf8"));
const previous = JSON.parse(await readFile("docs/exercise-library/media-registry.json", "utf8"));
const preserved = await Promise.all(previous.generatedMedia.map(async (item) => ({ file: item.path, expectedSha256: item.sha256, actualSha256: createHash("sha256").update(await readFile(item.path)).digest("hex") })));
const summary = { predefined: 69, existingEditorial: 1, versionedStrengthTotal: catalog.length, existingPhotographs: preserved.length, generatedPhotographs: files.assets.filter((item) => item.type === "generated-photograph").length, technicallyReviewedPhotographs: preserved.length + files.assets.filter((item) => item.type === "generated-photograph").length, thumbnailDerivatives: files.assets.filter((item) => item.type === "thumbnail-derivative").length, exercisesWithPhoto: records.filter((item) => item.heroImage).length, pilotExercisesWithTwoPositions: records.filter((item) => !item.positionsMissing).length, exercisesMissingPhoto: records.filter((item) => item.photoMissing).length, exercisesMissingPositions: records.filter((item) => item.positionsMissing).length, newAssetBytes: files.assets.reduce((sum, item) => sum + item.bytes, 0), userApprovedPilotExercises: 0 };
await mkdir("docs/exercise-visual-library", { recursive: true });
await writeFile("docs/exercise-visual-library/catalog-inventory.json", JSON.stringify({ scope: "Versioned catalog only; current user's 80-row composition is displayed from actual loaded rows in the application, not inferred from production data here.", summary, existingPhotoPreservation: preserved.map((item) => ({ ...item, unchanged: item.expectedSha256 === item.actualSha256 })), records }, null, 2) + "\n");
await writeFile("docs/exercise-visual-library/INVENTORY.md", `# Inventaire réel et correspondance exercice/média\n\nGénéré par \`node scripts/exercise-media-audit.mjs\`. Périmètre : 69 exercices prédéfinis + le squat au poids du corps éditorial déjà présent. Les exercices personnels et Calisthenics sont comptés séparément dans l’application.\n\n| Exercice | Identifiant stable | Catégorie | Photo principale | Deux positions | Technique |\n| --- | --- | --- | --- | --- | --- |\n${records.map((item) => `| ${item.name} | \`${item.exerciseId}\` | ${item.category} | ${item.heroImage ? `[Photo](../../public${item.heroImage})` : "Manquante"} | ${item.positionsMissing ? "À préparer" : "Disponibles"} | ${item.fullTechnicalGuide ? "Guide existant" : item.visualTechnicalNotes.length ? "Repères de la variante illustrée" : "À documenter"} |`).join("\n")}\n\nLes variantes exactes, équipements, origines, statuts de revue, sources et chemins de toutes les positions sont dans [catalog-inventory.json](./catalog-inventory.json).\n`);
console.log(JSON.stringify(summary));
