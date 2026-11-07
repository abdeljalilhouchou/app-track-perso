import type { AnatomyMuscle, ExerciseAnatomyConfig } from "./types";
import type { WorkingSide } from "./rowing";

/** Match glTF metadata only; unknown structures always return to neutral. */
export function muscleFromMetadata(config: ExerciseAnatomyConfig, metadata: { key?: unknown; side?: unknown; muscleId?: unknown }, side: WorkingSide): AnatomyMuscle | null {
  if (typeof metadata.key !== "string" || (metadata.side !== "left" && metadata.side !== "right")) return null;
  if (metadata.muscleId !== `${metadata.key}_${metadata.side}`) return null;
  const group = config.muscles.find((item) => item.keys.includes(metadata.key as string));
  return group && (!config.unilateral || group.role === "stabilizer" || metadata.side === side) ? group : null;
}
