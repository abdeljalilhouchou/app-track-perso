export const ROWING_PILOT_ID = "one-arm-dumbbell-row" as const;
export type AnatomyPilotId = typeof ROWING_PILOT_ID;

const rowingNames = new Set([
  "Rowing haltère unilatéral", "One-arm dumbbell row", "تجديف دمبل بذراع واحدة",
].map(identity));
function identity(value: string) { return value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " "); }

/** Current strength drafts have a generated row ID, not a stable catalog FK.
 * Resolve only explicit canonical aliases, then use the stable editorial ID.
 * Do not infer a movement from a substring, muscle group, or generated draft UUID.
 */
export function resolveAnatomyPilot({ guideId, name, muscle }: { guideId?: string | null; name: string; muscle?: string }): AnatomyPilotId | null {
  if (guideId === ROWING_PILOT_ID) return ROWING_PILOT_ID;
  if (guideId) return null;
  if (muscle && muscle !== "Dos") return null;
  return rowingNames.has(identity(name)) ? ROWING_PILOT_ID : null;
}
