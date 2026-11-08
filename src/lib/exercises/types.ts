import type { Language } from "@/lib/language";
import type { SportImageSource } from "@/components/sport/ui/sport-media";
import type { ExerciseVisualMedia } from "./visual-media-types";

export type Discipline = "musculation" | "calisthenics" | "running";
export type Equipment = "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "pullupBar" | "bench" | "wheel";
export type Level = "beginner" | "intermediate" | "advanced";
export type Localized<T> = Record<Language, T>;
export type GuideText = {
  description: string; objective: string; preparation: string; position: string;
  execution: string; return: string; breathing: string; range: string; tempo: string;
  mistakes: string[]; tips: string[]; safety: string;
};
export type Guide = {
  id: string; names: Localized<string>; aliases: string[]; calisthenicsKeys?: string[];
  primary: string[]; secondary: string[]; equipment: Equipment[]; level: Level;
  text: Localized<GuideText>; image?: { src: string; alt: Localized<string> };
  sources: { title: string; url: string }[];
};
export type LibraryExercise = {
  key: string; name: string; storedName: string; discipline: Discipline;
  primary: string[]; secondary: string[]; equipment: Equipment[]; level: Level | null;
  guideId: string | null; image?: SportImageSource; thumbnail?: SportImageSource; databaseId?: string;
  origin: "builtin" | "personal" | "calisthenics"; searchNames: string[];
  description?: string; instructions?: string;
};
export type PerformanceSet = { reps: number | null; weight: number | null; seconds?: number | null; assistance?: number | null; addedWeight?: number | null; variation?: string };
export type GuidePerformance = {
  latest: { date: string; workoutId: string; sets: PerformanceSet[] } | null;
  maxWeight?: { weight: number; reps: number; date: string } | null;
  bestVolume?: { value: number; date: string } | null;
};
export type ExerciseDetail = {
  exercise: LibraryExercise; text: GuideText | null;
  media?: ExerciseVisualMedia | null;
  anatomySummary?: { primary: string[]; secondary: string[]; stabilizer: string[]; limitations: string[]; details?: { name: string; role: "primary" | "secondary" | "stabilizer"; action: string | null }[] } | null;
  muscles: { primary: string[]; secondary: string[] } | null;
  sources: Guide["sources"]; performance: GuidePerformance; language: Language;
};
