import type { SportImageSource } from "@/components/sport/ui/sport-media";

// Local generated mood imagery. Provenance, prompts and file sizes are recorded
// in docs/design-system/MEDIA_REGISTRY.md. Never use as exercise instructions.
export const sportMedia = {
  strength: { src: "/images/sport/strength.webp", altKey: "sport.ui.strengthAlt" },
  calisthenics: { src: "/images/sport/calisthenics.webp", altKey: "sport.ui.calisthenicsAlt" },
  running: { src: "/images/sport/running.webp", altKey: "sport.ui.runningAlt" },
} as const;

export function sportImage(key: keyof typeof sportMedia, translate: (key: string) => string): SportImageSource {
  const image = sportMedia[key];
  return { src: image.src, alt: translate(image.altKey) };
}
