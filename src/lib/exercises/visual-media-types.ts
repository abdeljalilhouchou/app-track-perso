import type { Equipment, Localized } from "./types";

export type ExerciseImageAsset = { src: string; width: number; height: number; alt: Localized<string> };
export type ExercisePositionImage = ExerciseImageAsset & { label: Localized<string>; caption: Localized<string> };
export type ExerciseVisualMedia = {
  exerciseId: string; heroImage: ExerciseImageAsset; thumbnail: ExerciseImageAsset;
  startPositionImage?: ExercisePositionImage; endPositionImage?: ExercisePositionImage;
  staticPositionImage?: ExercisePositionImage;
  variant: Localized<string>; technicalChecks: Localized<string>[];
  illustratedEquipment: Equipment[];
  source: "image_gen"; license: "generated-for-project-no-third-party-license-asserted";
  reviewStatus: "technical-reviewed"; userApproval: "pending-pilot-validation" | "pending-batch-validation" | "existing-media";
  technicalSources: { title: string; url: string }[];
};
