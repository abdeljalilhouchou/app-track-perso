export type TemplateView = {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: { name: string; muscle: string; sets: number; reps: number }[];
};

export type CatalogItem = { name: string; muscle: string };

export type SessionItem = {
  id: string;
  date: string;
  activity: string;
  duration: number;
  intensity: number;
  notes: string | null;
  muscleGroups: string[];
};
