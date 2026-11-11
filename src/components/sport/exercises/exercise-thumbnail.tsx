"use client";

import { useLanguage } from "@/components/language-provider";
import { exerciseThumbnail } from "@/lib/exercises/media-thumbnails";
import { SportMedia } from "../ui/sport-media";
import { ExerciseGuideButton } from "./exercise-guide-button";
import { resolveExerciseAnatomy } from "@/lib/anatomy/identity";
import { hasExerciseMediaExperience } from "@/lib/exercises/media-experience";

/** Purely presentational; no draft, timer, program or database action. */
export function ExerciseThumbnail({ name, muscle, large = false }: { name: string; muscle: string; large?: boolean }) {
  const { language } = useLanguage();
  const image = exerciseThumbnail({ name, muscle }, language);
  if (!image) return null;
  const key = resolveExerciseAnatomy({ name, muscle });
  if (key && hasExerciseMediaExperience(key)) return <ExerciseGuideButton name={name} exerciseKey={key}><SportMedia image={image} decorative ratio="square" sizes={large ? "120px" : "64px"} /></ExerciseGuideButton>;
  return <div className="exercise-inline-thumbnail" data-exercise-thumbnail><SportMedia image={image} ratio="square" sizes="80px" /></div>;
}
