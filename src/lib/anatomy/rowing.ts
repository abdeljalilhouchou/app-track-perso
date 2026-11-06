export type MuscleRole = "primary" | "secondary" | "stabilizer";
export type WorkingSide = "left" | "right";
export type MuscleGroupId = "lats" | "rhomboids" | "middleTraps" | "lowerTraps" | "rearDeltoid" | "biceps" | "elbowFlexors" | "abdominals" | "spinalStabilizers";
export type RowingMuscleGroup = { id: MuscleGroupId; role: MuscleRole; keys: readonly string[]; deep?: boolean };

// Exact glTF extras.key values from the pinned CC BY-SA atlas; never triangle indices.
export const ROWING_MUSCLES: readonly RowingMuscleGroup[] = [
  { id: "lats", role: "primary", keys: ["latissimus_dorsi"] },
  { id: "rhomboids", role: "secondary", keys: ["rhomboid_major", "rhomboid_minor"], deep: true },
  { id: "middleTraps", role: "secondary", keys: ["trapezius_middle"] },
  { id: "lowerTraps", role: "secondary", keys: ["trapezius_lower"] },
  { id: "rearDeltoid", role: "secondary", keys: ["deltoid_posterior"] },
  { id: "biceps", role: "secondary", keys: ["biceps_brachii_long", "biceps_brachii_short"] },
  { id: "elbowFlexors", role: "secondary", keys: ["brachialis", "brachioradialis_muscle"] },
  { id: "abdominals", role: "stabilizer", keys: ["rectus_abdominis", "transversus_abdominis", "external_oblique", "internal_oblique"], deep: true },
  { id: "spinalStabilizers", role: "stabilizer", keys: ["iliocostalis_lumborum", "longissimus_thoracis", "multifidus_lumborum"], deep: true },
];
export const ANATOMY_ASSET = { url: "/models/anatomy/male-mobile.glb?v=d80bebc40450", bytes: 2545068, sha256: "d80bebc4045069b660ca8e7afe599d76d15ccc7d96410b3727c600ef01d24e54" } as const;
export const MUSCLE_COLORS = {
  light: { primary: "#cf2441", secondary: "#07824c", stabilizer: "#c36713", neutral: "#a8afb9", selected: "#ffffff", background: "#f0f2f8" },
  dark: { primary: "#ed405b", secondary: "#20b877", stabilizer: "#ed922f", neutral: "#9ba5b5", selected: "#ffffff", background: "#131a29" },
} as const;
export function rowingMuscleFromMetadata(metadata: { key?: unknown; side?: unknown }, side: WorkingSide) {
  if (typeof metadata.key !== "string" || !["left", "right"].includes(String(metadata.side))) return null;
  const group = ROWING_MUSCLES.find((group) => group.keys.includes(metadata.key as string));
  return group && (group.role === "stabilizer" || metadata.side === side) ? group : null;
}

export type AnatomyViewCommand = "front" | "back" | "left" | "right" | "zoomIn" | "zoomOut" | "reset" | "fullBody";
// Distances use a uniformly normalized two-unit-tall model. Initial distance is
// refined against the viewport after loading; only camera framing changes.
export const CAMERA_LIMITS = { minDistance: 1.35, maxDistance: 5.6, initialDistance: 2.6, minPolar: Math.PI * .35, maxPolar: Math.PI * .65, maxPixelRatio: 2, maxRenderPixels: 1200000 } as const;
