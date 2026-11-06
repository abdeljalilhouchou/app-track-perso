import { DEFAULT_EXERCISES, exerciseKey } from "@/lib/strength";
import type { Language } from "@/lib/language";
import type { Equipment, LibraryExercise } from "./types";

// Display metadata only. Canonical names/identities and database seed actions stay unchanged.
const names: [string, string, string, Equipment?][] = [
  ["Développé couché barre", "Barbell bench press", "ضغط الصدر بالبار", "barbell"],
  ["Développé couché haltères", "Dumbbell bench press", "ضغط الصدر بالدمبل", "dumbbell"],
  ["Développé incliné barre", "Incline barbell press", "ضغط مائل بالبار", "barbell"],
  ["Développé incliné haltères", "Incline dumbbell press", "ضغط مائل بالدمبل", "dumbbell"],
  ["Développé décliné", "Decline press", "ضغط الصدر على مقعد منحدر"],
  ["Écarté haltères", "Dumbbell fly", "تفتيح الصدر بالدمبل", "dumbbell"],
  ["Écarté poulie vis-à-vis", "Cable fly", "تفتيح الصدر بالكابل", "cable"],
  ["Pec deck (butterfly)", "Pec deck fly", "تفتيح الصدر بالجهاز", "machine"],
  ["Pompes", "Push-up", "تمرين الضغط", "bodyweight"],
  ["Dips (pectoraux)", "Chest dip", "متوازي للصدر", "bodyweight"],
  ["Pull-over haltère", "Dumbbell pullover", "سحب الدمبل خلف الرأس", "dumbbell"],
  ["Tractions", "Pull-up", "العقلة بقبضة علوية", "pullupBar"],
  ["Tractions prise neutre", "Neutral-grip pull-up", "العقلة بقبضة محايدة", "pullupBar"],
  ["Rowing barre", "Barbell row", "تجديف بالبار", "barbell"],
  ["Rowing haltère unilatéral", "One-arm dumbbell row", "تجديف دمبل بذراع واحدة", "dumbbell"],
  ["Rowing machine", "Machine row", "تجديف بالجهاز", "machine"],
  ["Tirage vertical poulie", "Lat pulldown", "سحب علوي بالكابل", "cable"],
  ["Tirage horizontal poulie", "Seated cable row", "سحب أفقي بالكابل", "cable"],
  ["Soulevé de terre", "Deadlift", "الرفعة الميتة"],
  ["Pull-over poulie", "Cable pullover", "سحب بذراعين مستقيمتين بالكابل", "cable"],
  ["Hyperextensions", "Back extension", "تمديد الظهر"],
  ["Développé militaire barre", "Barbell overhead press", "ضغط الكتفين بالبار", "barbell"],
  ["Développé épaules haltères", "Dumbbell shoulder press", "ضغط الكتفين بالدمبل", "dumbbell"],
  ["Élévations latérales", "Lateral raise", "رفع جانبي للكتفين"],
  ["Élévations frontales", "Front raise", "رفع أمامي للكتفين"],
  ["Oiseau haltères", "Dumbbell reverse fly", "تفتيح خلفي بالدمبل", "dumbbell"],
  ["Face pull", "Face pull", "سحب نحو الوجه", "cable"],
  ["Shrugs haltères", "Dumbbell shrug", "هز الكتفين بالدمبل", "dumbbell"],
  ["Arnold press", "Arnold press", "ضغط أرنولد", "dumbbell"],
  ["Curl barre", "Barbell curl", "ثني المرفقين بالبار", "barbell"],
  ["Curl barre EZ", "EZ-bar curl", "ثني المرفقين ببار EZ", "barbell"],
  ["Curl haltères", "Dumbbell biceps curl", "ثني العضلة ذات الرأسين بالدمبل", "dumbbell"],
  ["Curl marteau", "Hammer curl", "ثني المرفقين بقبضة المطرقة", "dumbbell"],
  ["Curl incliné", "Incline curl", "ثني المرفقين على مقعد مائل"],
  ["Curl pupitre (Larry Scott)", "Preacher curl", "ثني المرفقين على مسند سكوت"],
  ["Curl poulie basse", "Low cable curl", "ثني المرفقين بالكابل السفلي", "cable"],
  ["Barre au front", "Lying triceps extension", "تمديد العضلة ثلاثية الرؤوس مستلقياً", "barbell"],
  ["Extension poulie haute (corde)", "Rope triceps pushdown", "تمديد المرفقين بالحبل", "cable"],
  ["Extension poulie haute (barre)", "Bar triceps pushdown", "تمديد المرفقين بقضيب الكابل", "cable"],
  ["Extension nuque haltère", "Overhead dumbbell triceps extension", "تمديد المرفقين بالدمبل فوق الرأس", "dumbbell"],
  ["Dips (triceps)", "Triceps dip", "متوازي للعضلة ثلاثية الرؤوس", "bodyweight"],
  ["Kickback haltère", "Dumbbell triceps kickback", "تمديد المرفق خلفاً بالدمبل", "dumbbell"],
  ["Développé couché prise serrée", "Close-grip bench press", "ضغط الصدر بقبضة ضيقة"],
  ["Squat", "Squat", "القرفصاء"],
  ["Front squat", "Front squat", "القرفصاء الأمامية"],
  ["Presse à cuisses", "Leg press", "ضغط الساقين بالجهاز", "machine"],
  ["Leg extension", "Leg extension", "تمديد الركبتين بالجهاز", "machine"],
  ["Fentes marchées", "Walking lunge", "اندفاع بالمشي"],
  ["Squat bulgare", "Bulgarian split squat", "القرفصاء البلغارية"],
  ["Hack squat", "Hack squat", "قرفصاء هاك"],
  ["Leg curl allongé", "Lying leg curl", "ثني الركبتين مستلقياً", "machine"],
  ["Leg curl assis", "Seated leg curl", "ثني الركبتين جالساً", "machine"],
  ["Soulevé de terre jambes tendues", "Stiff-leg deadlift", "رفعة ميتة بساقين شبه مستقيمتين"],
  ["Good morning", "Good morning", "انحناء الجذع صباح الخير"],
  ["Hip thrust", "Hip thrust", "دفع الوركين"],
  ["Abduction machine", "Hip abduction machine", "إبعاد الوركين بالجهاز", "machine"],
  ["Kickback poulie", "Cable glute kickback", "دفع الساق خلفاً بالكابل", "cable"],
  ["Mollets debout", "Standing calf raise", "رفع الكعبين واقفاً"],
  ["Mollets assis", "Seated calf raise", "رفع الكعبين جالساً"],
  ["Mollets à la presse", "Leg press calf raise", "رفع الكعبين بجهاز ضغط الساقين", "machine"],
  ["Crunch", "Crunch", "كرنش البطن", "bodyweight"],
  ["Crunch poulie", "Cable crunch", "كرنش بالكابل", "cable"],
  ["Relevé de jambes suspendu", "Hanging leg raise", "رفع الساقين مع التعلق", "pullupBar"],
  ["Gainage (planche)", "Forearm plank", "بلانك على الساعدين", "bodyweight"],
  ["Roue abdominale", "Ab wheel rollout", "تمديد بعجلة البطن", "wheel"],
  ["Russian twist", "Russian twist", "لف الجذع الروسي"],
  ["Curl poignets", "Wrist curl", "ثني المعصمين"],
  ["Curl inversé", "Reverse curl", "ثني المرفقين بقبضة معكوسة"],
  ["Marche du fermier", "Farmer carry", "مشي المزارع بالأثقال"],
];
const displayNames = new Map(names.map(([fr, en, ar, equipment]) => [exerciseKey(fr), { fr, en, ar, equipment }]));

export function builtinKey(name: string) {
  return `strength-${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function baseCatalog(language: Language): LibraryExercise[] {
  return DEFAULT_EXERCISES.map(({ name, muscle }) => {
    const metadata = displayNames.get(exerciseKey(name));
    return { key: builtinKey(name), name: metadata?.[language] ?? name, storedName: name,
      discipline: "musculation", primary: [muscle], secondary: [],
      equipment: metadata?.equipment ? [metadata.equipment] : [], level: null, guideId: null,
      origin: "builtin", searchNames: metadata ? [metadata.fr, metadata.en, metadata.ar] : [name] };
  });
}

