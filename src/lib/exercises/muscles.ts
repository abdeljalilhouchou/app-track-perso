import "server-only";
import type { Language } from "@/lib/language";

// Anatomical names for the documented variants; filtering retains existing broad groups.
const muscles = {
  lats: ["Grand dorsal", "Latissimus dorsi", "العضلة الظهرية العريضة"],
  upperBack: ["Rhomboïdes et trapèzes moyens", "Rhomboids and middle trapezius", "العضلات المعينية وشبه المنحرفة الوسطى"],
  chest: ["Grand pectoral", "Pectoralis major", "العضلة الصدرية الكبرى"],
  biceps: ["Biceps brachial et brachial", "Biceps brachii and brachialis", "العضلة ذات الرأسين العضدية والعضدية"],
  triceps: ["Triceps brachial", "Triceps brachii", "العضلة ثلاثية الرؤوس العضدية"],
  frontDelts: ["Deltoïde antérieur", "Anterior deltoid", "العضلة الدالية الأمامية"],
  rearDelts: ["Deltoïde postérieur", "Posterior deltoid", "العضلة الدالية الخلفية"],
  forearms: ["Brachio-radial et muscles de préhension", "Brachioradialis and grip muscles", "العضلة العضدية الكعبرية وعضلات القبضة"],
  abs: ["Abdominaux stabilisateurs", "Abdominal stabilizers", "عضلات البطن المثبتة"],
  core: ["Grand droit, transverse et obliques", "Rectus abdominis, transversus and obliques", "المستقيمة البطنية والمستعرضة والمائلة"],
  glutes: ["Grand fessier", "Gluteus maximus", "العضلة الألوية الكبرى"],
  quads: ["Quadriceps", "Quadriceps", "العضلة رباعية الرؤوس"],
  calves: ["Muscles du mollet", "Calf muscles", "عضلات الربلة"],
} satisfies Record<string, [string, string, string]>;
type Muscle = keyof typeof muscles;
const variants: Record<string, { primary: Muscle[]; secondary: Muscle[] }> = {
  "one-arm-dumbbell-row": { primary: ["lats", "upperBack"], secondary: ["biceps", "rearDelts", "abs"] },
  "barbell-bench-press": { primary: ["chest"], secondary: ["triceps", "frontDelts"] },
  "dumbbell-curl": { primary: ["biceps"], secondary: ["forearms"] },
  "push-up": { primary: ["chest", "triceps"], secondary: ["frontDelts", "abs"] },
  "forearm-plank": { primary: ["core"], secondary: ["frontDelts", "glutes"] },
  "pull-up": { primary: ["lats", "upperBack"], secondary: ["biceps", "forearms", "abs"] },
  "seated-cable-row": { primary: ["lats", "upperBack"], secondary: ["biceps", "rearDelts"] },
  "bodyweight-squat": { primary: ["quads", "glutes"], secondary: ["abs", "calves"] },
};
export function exerciseMuscles(id: string | null, language: Language) {
  const variant = id ? variants[id] : undefined;
  if (!variant) return null;
  const index = language === "ar" ? 2 : language === "en" ? 1 : 0;
  return { primary: variant.primary.map((name) => muscles[name][index]), secondary: variant.secondary.map((name) => muscles[name][index]) };
}
