import type { Equipment, Localized } from "./types";

// Only the reviewed V3 batch. Full photographs/captions/technique stay on the server.
export const EXERCISE_V3_THUMBNAILS = {
  "strength-developpe-couche-barre": { fr: "Homme réalisant un développé couché barre sur banc plat.", en: "Adult man performing a flat barbell bench press.", ar: "رجل بالغ يؤدي ضغط الصدر بالبار على مقعد مستوٍ." },
  "strength-ecarte-poulie-vis-a-vis": { fr: "Homme réalisant un écarté debout entre deux poulies.", en: "Adult man performing a standing two-cable chest fly.", ar: "رجل بالغ يؤدي تفتيح الصدر واقفاً بين بكرتين." },
  "strength-tractions": { fr: "Homme réalisant une traction à la barre en pronation.", en: "Adult man performing an overhand-grip pull-up.", ar: "رجل بالغ يؤدي العقلة بقبضة علوية وراحتي اليدين بعيداً عنه." },
  "strength-rowing-barre": { fr: "Homme réalisant un rowing barre penché en pronation.", en: "Adult man performing a bent-over overhand barbell row.", ar: "رجل بالغ يؤدي تجديف البار مع انحناء الوركين وقبضة علوية." },
  "strength-developpe-militaire-barre": { fr: "Homme réalisant un développé militaire barre debout.", en: "Adult man performing a strict standing barbell overhead press.", ar: "رجل بالغ يدفع البار فوق الرأس واقفاً دون اندفاع الساقين." },
  "strength-elevations-laterales": { fr: "Homme réalisant des élévations latérales avec deux haltères.", en: "Adult man performing standing dumbbell lateral raises.", ar: "رجل بالغ يؤدي الرفع الجانبي بدمبلين مع ثبات الجذع." },
  "strength-curl-marteau": { fr: "Homme réalisant un curl marteau avec une prise neutre.", en: "Adult man performing a neutral-grip dumbbell hammer curl.", ar: "رجل بالغ يؤدي ثني المرفقين بالدمبل بقبضة محايدة كالمطرقة." },
  "strength-extension-poulie-haute-corde": { fr: "Homme réalisant une extension des coudes à la corde sur poulie haute.", en: "Adult man performing a high-cable rope triceps pushdown.", ar: "رجل بالغ يمد المرفقين بالحبل المتصل بالبكرة العلوية." },
  "strength-presse-a-cuisses": { fr: "Homme utilisant une presse à cuisses inclinée avec appuis conservés.", en: "Adult man using an inclined leg press with supported back and pelvis.", ar: "رجل بالغ يستخدم جهاز ضغط الساقين المائل مع دعم الظهر والحوض." },
  "strength-leg-extension": { fr: "Homme réalisant une extension des genoux assis à la machine.", en: "Adult man performing a seated machine leg extension.", ar: "رجل بالغ يؤدي مد الركبتين جالساً على جهاز تمديد الساقين." },
  "strength-fentes-marchees": { fr: "Homme réalisant une fente marchée avec deux haltères.", en: "Adult man performing a forward walking dumbbell lunge.", ar: "رجل بالغ يؤدي اندفاعاً أمامياً بالمشي مع دمبل في كل يد." },
  "strength-leg-curl-allonge": { fr: "Homme réalisant un leg curl allongé sur le ventre à la machine.", en: "Adult man performing a prone lying machine leg curl.", ar: "رجل بالغ يثني الركبتين مستلقياً على البطن بجهاز ثني الساقين." },
  "strength-mollets-debout": { fr: "Homme réalisant une élévation des talons debout.", en: "Adult man performing a controlled standing calf raise.", ar: "رجل بالغ يرفع الكعبين واقفاً بحركة متحكم بها." },
  "strength-crunch-poulie": { fr: "Homme réalisant un crunch à genoux avec une corde de poulie haute.", en: "Adult man performing a kneeling high-cable rope crunch.", ar: "رجل بالغ يؤدي كرنش راكعاً بحبل متصل بالبكرة العلوية." },
  "strength-gainage-planche": { fr: "Homme maintenant une planche sur les avant-bras et les pointes des pieds.", en: "Adult man holding a static forearm plank on toes and forearms.", ar: "رجل بالغ يحافظ على بلانك ثابت بالارتكاز على الساعدين وأصابع القدمين." },
} as const satisfies Record<string, Localized<string>>;
export type ExerciseV3MediaId = keyof typeof EXERCISE_V3_THUMBNAILS;
export const EXERCISE_V3_IDS = Object.keys(EXERCISE_V3_THUMBNAILS) as ExerciseV3MediaId[];
export const EXERCISE_V3_EQUIPMENT: Record<ExerciseV3MediaId, Equipment[]> = {
  "strength-developpe-couche-barre": ["barbell", "bench"],
  "strength-ecarte-poulie-vis-a-vis": ["cable"], "strength-tractions": ["pullupBar"],
  "strength-rowing-barre": ["barbell"], "strength-developpe-militaire-barre": ["barbell"],
  "strength-elevations-laterales": ["dumbbell"], "strength-curl-marteau": ["dumbbell"],
  "strength-extension-poulie-haute-corde": ["cable"], "strength-presse-a-cuisses": ["machine"],
  "strength-leg-extension": ["machine"], "strength-fentes-marchees": ["dumbbell"],
  "strength-leg-curl-allonge": ["machine"], "strength-mollets-debout": ["bodyweight"],
  "strength-crunch-poulie": ["cable"], "strength-gainage-planche": ["bodyweight"],
};
