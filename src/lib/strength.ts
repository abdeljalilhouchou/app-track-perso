export const MUSCLE_GROUPS = [
  "Pectoraux",
  "Dos",
  "Épaules",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Ischio-jambiers",
  "Fessiers",
  "Mollets",
  "Abdominaux",
  "Avant-bras",
] as const;

const MUSCLE_COLORS: Record<string, string> = {
  Pectoraux: "var(--nutrition)",
  Dos: "var(--water)",
  Épaules: "var(--habit)",
  Biceps: "var(--accent)",
  Triceps: "var(--weight)",
  Quadriceps: "var(--sport)",
  "Ischio-jambiers": "var(--mood)",
  Fessiers: "#ec4899",
  Mollets: "#14b8a6",
  Abdominaux: "var(--danger)",
  "Avant-bras": "var(--foreground-muted)",
};

export function muscleColor(group: string) {
  return MUSCLE_COLORS[group] ?? "var(--foreground-muted)";
}

/** Stable identity of an exercise across sessions (case/space-insensitive). */
export function exerciseKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export type SeedExercise = { name: string; muscle: string };

export const DEFAULT_EXERCISES: SeedExercise[] = [
  // Pectoraux
  { name: "Développé couché barre", muscle: "Pectoraux" },
  { name: "Développé couché haltères", muscle: "Pectoraux" },
  { name: "Développé incliné barre", muscle: "Pectoraux" },
  { name: "Développé incliné haltères", muscle: "Pectoraux" },
  { name: "Développé décliné", muscle: "Pectoraux" },
  { name: "Écarté haltères", muscle: "Pectoraux" },
  { name: "Écarté poulie vis-à-vis", muscle: "Pectoraux" },
  { name: "Pec deck (butterfly)", muscle: "Pectoraux" },
  { name: "Pompes", muscle: "Pectoraux" },
  { name: "Dips (pectoraux)", muscle: "Pectoraux" },
  { name: "Pull-over haltère", muscle: "Pectoraux" },
  // Dos
  { name: "Tractions", muscle: "Dos" },
  { name: "Tractions prise neutre", muscle: "Dos" },
  { name: "Rowing barre", muscle: "Dos" },
  { name: "Rowing haltère unilatéral", muscle: "Dos" },
  { name: "Rowing machine", muscle: "Dos" },
  { name: "Tirage vertical poulie", muscle: "Dos" },
  { name: "Tirage horizontal poulie", muscle: "Dos" },
  { name: "Soulevé de terre", muscle: "Dos" },
  { name: "Pull-over poulie", muscle: "Dos" },
  { name: "Hyperextensions", muscle: "Dos" },
  // Épaules
  { name: "Développé militaire barre", muscle: "Épaules" },
  { name: "Développé épaules haltères", muscle: "Épaules" },
  { name: "Élévations latérales", muscle: "Épaules" },
  { name: "Élévations frontales", muscle: "Épaules" },
  { name: "Oiseau haltères", muscle: "Épaules" },
  { name: "Face pull", muscle: "Épaules" },
  { name: "Shrugs haltères", muscle: "Épaules" },
  { name: "Arnold press", muscle: "Épaules" },
  // Biceps
  { name: "Curl barre", muscle: "Biceps" },
  { name: "Curl barre EZ", muscle: "Biceps" },
  { name: "Curl haltères", muscle: "Biceps" },
  { name: "Curl marteau", muscle: "Biceps" },
  { name: "Curl incliné", muscle: "Biceps" },
  { name: "Curl pupitre (Larry Scott)", muscle: "Biceps" },
  { name: "Curl poulie basse", muscle: "Biceps" },
  // Triceps
  { name: "Barre au front", muscle: "Triceps" },
  { name: "Extension poulie haute (corde)", muscle: "Triceps" },
  { name: "Extension poulie haute (barre)", muscle: "Triceps" },
  { name: "Extension nuque haltère", muscle: "Triceps" },
  { name: "Dips (triceps)", muscle: "Triceps" },
  { name: "Kickback haltère", muscle: "Triceps" },
  { name: "Développé couché prise serrée", muscle: "Triceps" },
  // Quadriceps
  { name: "Squat", muscle: "Quadriceps" },
  { name: "Front squat", muscle: "Quadriceps" },
  { name: "Presse à cuisses", muscle: "Quadriceps" },
  { name: "Leg extension", muscle: "Quadriceps" },
  { name: "Fentes marchées", muscle: "Quadriceps" },
  { name: "Squat bulgare", muscle: "Quadriceps" },
  { name: "Hack squat", muscle: "Quadriceps" },
  // Ischio-jambiers
  { name: "Leg curl allongé", muscle: "Ischio-jambiers" },
  { name: "Leg curl assis", muscle: "Ischio-jambiers" },
  { name: "Soulevé de terre jambes tendues", muscle: "Ischio-jambiers" },
  { name: "Good morning", muscle: "Ischio-jambiers" },
  // Fessiers
  { name: "Hip thrust", muscle: "Fessiers" },
  { name: "Abduction machine", muscle: "Fessiers" },
  { name: "Kickback poulie", muscle: "Fessiers" },
  // Mollets
  { name: "Mollets debout", muscle: "Mollets" },
  { name: "Mollets assis", muscle: "Mollets" },
  { name: "Mollets à la presse", muscle: "Mollets" },
  // Abdominaux
  { name: "Crunch", muscle: "Abdominaux" },
  { name: "Crunch poulie", muscle: "Abdominaux" },
  { name: "Relevé de jambes suspendu", muscle: "Abdominaux" },
  { name: "Gainage (planche)", muscle: "Abdominaux" },
  { name: "Roue abdominale", muscle: "Abdominaux" },
  { name: "Russian twist", muscle: "Abdominaux" },
  // Avant-bras
  { name: "Curl poignets", muscle: "Avant-bras" },
  { name: "Curl inversé", muscle: "Avant-bras" },
  { name: "Marche du fermier", muscle: "Avant-bras" },
];

export type ProgramExercise = { name: string; muscle: string; sets: number; reps: number };
export type ProgramSession = { name: string; muscleGroups: string[]; exercises: ProgramExercise[] };

/** A classic 4-day split, offered as a one-click starting point (fully editable afterwards). */
export const DEFAULT_PROGRAM: ProgramSession[] = [
  {
    name: "Pectoraux & Triceps",
    muscleGroups: ["Pectoraux", "Triceps"],
    exercises: [
      { name: "Développé couché barre", muscle: "Pectoraux", sets: 4, reps: 8 },
      { name: "Développé incliné haltères", muscle: "Pectoraux", sets: 3, reps: 10 },
      { name: "Écarté poulie vis-à-vis", muscle: "Pectoraux", sets: 3, reps: 12 },
      { name: "Dips (triceps)", muscle: "Triceps", sets: 3, reps: 10 },
      { name: "Barre au front", muscle: "Triceps", sets: 3, reps: 10 },
      { name: "Extension poulie haute (corde)", muscle: "Triceps", sets: 3, reps: 12 },
    ],
  },
  {
    name: "Dos & Biceps",
    muscleGroups: ["Dos", "Biceps"],
    exercises: [
      { name: "Tractions", muscle: "Dos", sets: 4, reps: 8 },
      { name: "Rowing barre", muscle: "Dos", sets: 4, reps: 8 },
      { name: "Tirage vertical poulie", muscle: "Dos", sets: 3, reps: 10 },
      { name: "Rowing haltère unilatéral", muscle: "Dos", sets: 3, reps: 10 },
      { name: "Curl barre EZ", muscle: "Biceps", sets: 3, reps: 10 },
      { name: "Curl marteau", muscle: "Biceps", sets: 3, reps: 12 },
    ],
  },
  {
    name: "Jambes",
    muscleGroups: ["Quadriceps", "Ischio-jambiers", "Mollets"],
    exercises: [
      { name: "Squat", muscle: "Quadriceps", sets: 4, reps: 8 },
      { name: "Presse à cuisses", muscle: "Quadriceps", sets: 3, reps: 12 },
      { name: "Leg curl allongé", muscle: "Ischio-jambiers", sets: 3, reps: 12 },
      { name: "Fentes marchées", muscle: "Quadriceps", sets: 3, reps: 12 },
      { name: "Leg extension", muscle: "Quadriceps", sets: 3, reps: 12 },
      { name: "Mollets debout", muscle: "Mollets", sets: 4, reps: 15 },
    ],
  },
  {
    name: "Épaules & Abdos",
    muscleGroups: ["Épaules", "Abdominaux"],
    exercises: [
      { name: "Développé militaire barre", muscle: "Épaules", sets: 4, reps: 8 },
      { name: "Élévations latérales", muscle: "Épaules", sets: 4, reps: 12 },
      { name: "Oiseau haltères", muscle: "Épaules", sets: 3, reps: 12 },
      { name: "Face pull", muscle: "Épaules", sets: 3, reps: 15 },
      { name: "Crunch poulie", muscle: "Abdominaux", sets: 3, reps: 15 },
      { name: "Relevé de jambes suspendu", muscle: "Abdominaux", sets: 3, reps: 12 },
    ],
  },
];

/** Estimated one-rep max (Epley). A single rep is the max itself. */
export function estimate1RM(weightKg: number, reps: number) {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export type SetInput = { reps: number; weight: number };

export function setsVolume(sets: SetInput[]) {
  return Math.round(sets.reduce((s, x) => s + x.reps * x.weight, 0));
}

export function formatWeight(kg: number) {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, "");
}
