import type { Equipment, GuideText, Level, Localized } from "@/lib/exercises/types";
import type { MuscleGroupId as RowingGroupId, MuscleRole } from "./rowing";

export type MuscleGroupId = RowingGroupId | "upperChest" | "chest" | "lowerChest" | "frontDeltoid" | "lateralDeltoid" | "triceps" | "upperTraps" | "serratus" | "cuff" | "quadriceps" | "hamstrings" | "hipHamstrings" | "glutes" | "hipAbductors" | "adductors" | "gastrocnemius" | "soleus" | "rectusAbs" | "obliques" | "hipFlexors" | "wristFlexors" | "wristExtensors" | "grip" | "handIntrinsics";
export type AnatomyMuscle = { id: MuscleGroupId; role: MuscleRole; keys: readonly string[]; deep?: boolean; unavailable?: boolean };
export type ExerciseAnatomyConfig = {
  id: string; catalogKey: string; names: Localized<string>; category: string;
  equipment: Equipment[]; level: Level | null;
  initialView: "front" | "back"; framing: "upperBody" | "fullBody";
  unilateral: boolean; muscles: readonly AnatomyMuscle[];
  confidence: "reviewed-movement" | "variant-dependent";
  partial: boolean; limitations: Localized<string>[];
  actions: Partial<Record<MuscleGroupId, Localized<string>>>;
  technique?: Localized<GuideText>;
  sources: { title: string; url: string }[];
};
