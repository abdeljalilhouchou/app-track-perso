import { baseCatalog } from "@/lib/exercises/catalog";

// Only identities and canonical aliases are eagerly loaded. No anatomy, copy or Three.js.
const guideKeys: Record<string, string> = {
  "barbell-bench-press": "strength-developpe-couche-barre",
  "dumbbell-curl": "strength-curl-halteres", "push-up": "strength-pompes",
  "forearm-plank": "strength-gainage-planche", "pull-up": "strength-tractions",
  "seated-cable-row": "strength-tirage-horizontal-poulie",
  "one-arm-dumbbell-row": "strength-rowing-haltere-unilateral",
  "bodyweight-squat": "bodyweight-squat",
};
// Its title does not establish the intended shoulder trajectory. Keep the classic guide.
export const ANATOMY_UNSUPPORTED_KEYS = ["strength-pull-over-haltere"] as const;
const entries = baseCatalog("fr").filter((item) => !ANATOMY_UNSUPPORTED_KEYS.some((key) => key === item.key));
export const ANATOMY_CATALOG_KEYS = [...entries.map((item) => item.key), "bodyweight-squat"];
const supported = new Set(ANATOMY_CATALOG_KEYS);
export const ANATOMY_PARTIAL_KEYS = ["strength-rowing-machine", "strength-arnold-press", "strength-marche-du-fermier"] as const;
const normalize = (value: string) => value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
const aliases = new Map<string, string | null>();
for (const entry of entries) for (const muscle of entry.primary) for (const alias of entry.searchNames) {
  const key = `${muscle}|${normalize(alias)}`;
  // A collision is ambiguous and must never silently pick the first movement.
  aliases.set(key, aliases.has(key) && aliases.get(key) !== entry.key ? null : entry.key);
}
for (const name of ["Squat au poids du corps", "Bodyweight squat", "قرفصاء بوزن الجسم"]) aliases.set(`Quadriceps|${normalize(name)}`, "bodyweight-squat");
export type AnatomyIdentity = { name: string; muscle?: string; guideId?: string | null; exerciseKey?: string; origin?: string; discipline?: string; validatedAnatomyId?: string };

/** Library: stable catalog key. Legacy strength rows: exact canonical alias AND
 * stored muscle category (the existing exerciseKey identity), never fuzzy names.
 * Personal titles/editorial guide matches are not validated associations.
 */
export function resolveExerciseAnatomy(input: AnatomyIdentity): string | null {
  if (input.discipline && input.discipline !== "musculation") return null;
  if (input.validatedAnatomyId) return supported.has(input.validatedAnatomyId) ? input.validatedAnatomyId : null;
  if (input.origin === "personal" || input.exerciseKey?.startsWith("personal-")) return null;
  if (input.exerciseKey) return supported.has(input.exerciseKey) ? input.exerciseKey : null;
  if (input.guideId) return guideKeys[input.guideId] ?? null;
  if (!input.muscle) return null;
  return aliases.get(`${input.muscle}|${normalize(input.name)}`) ?? null;
}

/** Counts supplied catalog rows only, including the current user's custom rows. */
export function anatomyCoverage(items: { key: string; name: string; origin: string; discipline: string }[]) {
  const strength = items.filter((item) => item.discipline === "musculation");
  const mapped = strength.map((item) => resolveExerciseAnatomy({ ...item, exerciseKey: item.key })).filter((id): id is string => id !== null);
  return { total: strength.length, mapped: mapped.length, partial: mapped.filter((id) => ANATOMY_PARTIAL_KEYS.some((key) => key === id)).length, unsupported: strength.length - mapped.length };
}
