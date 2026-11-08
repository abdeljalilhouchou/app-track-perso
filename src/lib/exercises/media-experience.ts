import type { ExerciseVisualMedia } from "./visual-media-types";
import { resolveExerciseAnatomy } from "@/lib/anatomy/identity";
import { EXERCISE_V3_IDS } from "./media-v3-index";

/** Explicit rollout, independent of future image additions to the registry. */
export const MEDIA_EXPERIENCE_PILOTS = [
  "strength-developpe-incline-halteres", "strength-rowing-haltere-unilateral",
  "strength-squat", "strength-curl-incline", "strength-tirage-horizontal-poulie",
] as const;
export function isMediaExperiencePilot(id: string): id is typeof MEDIA_EXPERIENCE_PILOTS[number] { return MEDIA_EXPERIENCE_PILOTS.some((key) => key === id); }
export const MEDIA_EXPERIENCE_IDS = [...MEDIA_EXPERIENCE_PILOTS, ...EXERCISE_V3_IDS] as const;
export function hasExerciseMediaExperience(id: string): id is typeof MEDIA_EXPERIENCE_IDS[number] { return MEDIA_EXPERIENCE_IDS.some((key) => key === id); }
export function mediaExperienceId(name: string, muscle: string) {
  const id = resolveExerciseAnatomy({ name, muscle });
  return id && hasExerciseMediaExperience(id) ? id : null;
}
export function mediaGalleryFrames(media: ExerciseVisualMedia | null | undefined) {
  if (!media) return [];
  const positions = [media.startPositionImage, media.endPositionImage, media.staticPositionImage].filter((image) => image !== undefined);
  const candidates = positions.length ? positions : [{ ...media.heroImage, label: media.variant, caption: media.variant }];
  return candidates.filter((image, index) => candidates.findIndex((other) => other.src === image.src) === index);
}
