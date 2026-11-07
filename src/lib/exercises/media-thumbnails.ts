import type { Language } from "@/lib/language";
import { resolveExerciseAnatomy, type AnatomyIdentity } from "@/lib/anatomy/identity";
import type { Equipment } from "./types";

// Lightweight image index only; full media records and positions stay server-side.
export const EXERCISE_THUMBNAILS = {
  "strength-developpe-incline-halteres": { fr: "Homme réalisant un développé incliné avec deux haltères.", en: "Adult man performing an incline dumbbell bench press.", ar: "رجل بالغ يؤدي ضغط الصدر بالدمبل على مقعد مائل." },
  "strength-rowing-haltere-unilateral": { fr: "Homme réalisant un rowing haltère unilatéral avec appui sur banc.", en: "Adult man performing a bench-supported one-arm dumbbell row.", ar: "رجل بالغ يؤدي تجديف الدمبل بذراع واحدة مع الارتكاز على مقعد." },
  "strength-squat": { fr: "Homme en position basse d’un squat barre haute sur le dos.", en: "Adult man at the bottom of a high-bar back squat.", ar: "رجل بالغ في الوضع السفلي للقرفصاء مع البار أعلى الظهر." },
  "strength-curl-incline": { fr: "Homme réalisant un curl haltères assis sur un banc incliné.", en: "Adult man performing a seated incline dumbbell curl.", ar: "رجل بالغ يؤدي ثني المرفقين بالدمبل جالساً على مقعد مائل." },
  "strength-tirage-horizontal-poulie": { fr: "Homme réalisant un tirage horizontal assis à la poulie basse.", en: "Adult man performing a seated low cable row.", ar: "رجل بالغ يؤدي سحباً أفقياً جالساً بالكابل السفلي." },
  "strength-curl-halteres": { fr: "Homme réalisant un curl haltères debout en supination.", en: "Adult man performing a standing supinated dumbbell curl.", ar: "رجل بالغ يثني المرفقين واقفاً بالدمبل وراحتي اليدين للأعلى." },
  "strength-pompes": { fr: "Homme réalisant une pompe au sol, corps aligné.", en: "Adult man performing a floor push-up with aligned body.", ar: "رجل بالغ يؤدي تمرين الضغط الأرضي مع استقامة الجسم." },
} as const;
export type ExerciseMediaId = keyof typeof EXERCISE_THUMBNAILS;
export const EXERCISE_MEDIA_EQUIPMENT: Record<ExerciseMediaId, Equipment[]> = {
  "strength-developpe-incline-halteres": ["dumbbell", "bench"],
  "strength-rowing-haltere-unilateral": ["dumbbell", "bench"],
  "strength-squat": ["barbell"], "strength-curl-incline": ["dumbbell", "bench"],
  "strength-tirage-horizontal-poulie": ["cable"], "strength-curl-halteres": ["dumbbell"], "strength-pompes": ["bodyweight"],
};
export function exerciseThumbnail(input: AnatomyIdentity, language: Language) {
  const id = resolveExerciseAnatomy(input);
  if (!id || !Object.hasOwn(EXERCISE_THUMBNAILS, id)) return undefined;
  return { src: `/images/exercises/thumbnails/${id}.webp`, alt: EXERCISE_THUMBNAILS[id as ExerciseMediaId][language], fit: "contain" as const };
}
