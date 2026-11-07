"use client";

import { useLanguage } from "@/components/language-provider";
import { exerciseThumbnail } from "@/lib/exercises/media-thumbnails";
import { SportMedia } from "../ui/sport-media";

/** Purely presentational; no draft, timer, program or database action. */
export function ExerciseThumbnail({ name, muscle }: { name: string; muscle: string }) {
  const { language } = useLanguage();
  const image = exerciseThumbnail({ name, muscle }, language);
  if (!image) return null;
  return <div className="exercise-inline-thumbnail" data-exercise-thumbnail><SportMedia image={image} ratio="square" sizes="80px" /></div>;
}
