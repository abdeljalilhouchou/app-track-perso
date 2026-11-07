import "server-only";
import { EXERCISE_THUMBNAILS, type ExerciseMediaId } from "./media-thumbnails";
import type { ExerciseImageAsset, ExercisePositionImage, ExerciseVisualMedia } from "./visual-media-types";
import type { Equipment, LibraryExercise, Localized } from "./types";

const l = (fr: string, en: string, ar: string): Localized<string> => ({ fr, en, ar });
const image = (src: string, alt: Localized<string>): ExerciseImageAsset => ({ src: `/images/exercises/${src}`, width: 960, height: 640, alt });
const position = (src: string, label: Localized<string>, caption: Localized<string>): ExercisePositionImage => ({ ...image(src, caption), label, caption });
const start = l("Position de départ", "Starting position", "وضعية البداية");
const end = l("Position d’arrivée", "End position", "وضعية الوصول");
const records: Record<string, ExerciseVisualMedia> = {};
const equipment: Record<ExerciseMediaId, Equipment[]> = {
  "strength-developpe-incline-halteres": ["dumbbell", "bench"],
  "strength-rowing-haltere-unilateral": ["dumbbell", "bench"],
  "strength-squat": ["barbell"], "strength-curl-incline": ["dumbbell", "bench"],
  "strength-tirage-horizontal-poulie": ["cable"], "strength-curl-halteres": ["dumbbell"], "strength-pompes": ["bodyweight"],
};
function add(id: ExerciseMediaId, hero: string, variant: Localized<string>, checks: Localized<string>[], sources: ExerciseVisualMedia["technicalSources"], positions?: [ExercisePositionImage, ExercisePositionImage]) {
  records[id] = {
    exerciseId: id, heroImage: image(hero, EXERCISE_THUMBNAILS[id]),
    thumbnail: { src: `/images/exercises/thumbnails/${id}.webp`, width: 320, height: 213, alt: EXERCISE_THUMBNAILS[id] },
    startPositionImage: positions?.[0], endPositionImage: positions?.[1], variant, technicalChecks: checks,
    illustratedEquipment: equipment[id],
    source: "image_gen", license: "generated-for-project-no-third-party-license-asserted",
    reviewStatus: "technical-reviewed", userApproval: positions ? "pending-pilot-validation" : "existing-media", technicalSources: sources,
  };
}

add("strength-developpe-incline-halteres", "pilot/incline-dumbbell-press-end.webp",
  l("Développé incliné à deux haltères, banc modérément incliné.", "Two-dumbbell incline press on a moderately inclined bench.", "ضغط مائل بدمبلين على مقعد بميل معتدل."), [
    l("Garde la tête, le dos et le bassin soutenus, avec les pieds au sol.", "Keep the head, back and pelvis supported, with feet grounded.", "أبق الرأس والظهر والحوض مدعومة والقدمين على الأرض."),
    l("Contrôle les poignets au-dessus des coudes et pousse les deux haltères ensemble.", "Control wrists over elbows and press both dumbbells together.", "حافظ على الرسغين فوق المرفقين وادفع الدمبلين معاً."),
    l("Les deux vues montrent le bas puis le haut de la poussée ; redescends ensuite sous contrôle.", "The views show the bottom and top of the press; then lower under control.", "تعرض الصورتان أسفل الدفع وأعلاه؛ اخفض الدمبلين بعد ذلك بتحكم."),
  ], [{ title: "ACE — Incline chest press", url: "https://www.acefitness.org/resources/everyone/exercise-library/25/incline-chest-press/" }], [
    position("pilot/incline-dumbbell-press-start.webp", start, l("Haltères près du haut du thorax, coudes fléchis et banc incliné visible.", "Dumbbells beside the upper chest, elbows bent and inclined bench visible.", "الدمبلان قرب أعلى الصدر والمرفقان مثنيان والمقعد المائل ظاهر.")),
    position("pilot/incline-dumbbell-press-end.webp", end, l("Haltères séparés au-dessus du haut du thorax, bras presque tendus et appuis conservés.", "Separate dumbbells above the upper chest, arms almost straight and supports maintained.", "الدمبلان منفصلان فوق أعلى الصدر والذراعان شبه ممدودتين مع ثبات الارتكاز.")),
  ]);
add("strength-rowing-haltere-unilateral", "one-arm-dumbbell-row.webp",
  l("Rowing unilatéral, main et genou du même côté sur le banc.", "One-arm row with the same-side hand and knee on the bench.", "تجديف بذراع واحدة مع ارتكاز يد وركبة الجهة نفسها على المقعد."), [
    l("Conserve les appuis sur le banc et au sol pendant le tirage.", "Maintain the bench and floor support points throughout the row.", "حافظ على نقاط الارتكاز على المقعد والأرض أثناء السحب."),
    l("Ramène le coude vers la hanche sans tourner le buste.", "Draw the elbow toward the hip without rotating the torso.", "اسحب المرفق نحو الورك دون تدوير الجذع."),
    l("Le bras s’allonge au retour, sans laisser le dos s’arrondir.", "Straighten the arm on the return without rounding the back.", "مد الذراع في العودة دون تقويس الظهر."),
  ], [{ title: "ACE — Single-arm row", url: "https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/" }], [
    position("pilot/one-arm-dumbbell-row-start.webp", start, l("Haltère suspendu sous l’épaule, bras presque tendu et dos stable avec appui sur banc.", "Dumbbell hanging below the shoulder, arm almost straight and back stable with bench support.", "الدمبل معلق أسفل الكتف والذراع شبه ممدودة والظهر ثابت مع دعم المقعد.")),
    position("one-arm-dumbbell-row.webp", end, l("Coude fléchi près du buste et haltère près de la hanche, sans rotation du tronc.", "Elbow bent beside the torso and dumbbell near the hip, without trunk rotation.", "المرفق مثني قرب الجذع والدمبل قرب الورك دون دوران الجذع.")),
  ]);
add("strength-squat", "pilot/barbell-back-squat-bottom.webp",
  l("Exemple illustré : squat avec barre haute sur le dos. Les autres variantes de squat ne sont pas représentées ici.", "Illustrated example: high-bar back squat. Other squat variations are not depicted here.", "المثال المصور: قرفصاء مع البار أعلى الظهر. لا تمثل الصور أنواع القرفصاء الأخرى."), [
    l("Place la barre sur le haut du dos, avec une prise stable et les pieds entièrement au sol.", "Rest the bar on the upper back, with a stable grip and whole feet grounded.", "ضع البار أعلى الظهر بقبضة ثابتة مع ارتكاز كامل القدمين على الأرض."),
    l("Fléchis les hanches et les genoux en gardant les genoux dans la direction des pieds.", "Bend hips and knees while keeping knees aligned with the feet.", "اثن الوركين والركبتين مع توجيه الركبتين باتجاه القدمين."),
    l("La seconde photo est le point bas, pas la fin de la répétition. Remonte ensuite en conservant tes appuis ; la profondeur dépend de ton contrôle.", "The second photo is the bottom, not the end of the repetition. Stand back up with stable support; depth depends on control.", "الصورة الثانية هي الوضع السفلي وليست نهاية التكرار. عد للوقوف مع ثبات الارتكاز حسب مدى التحكم."),
  ], [{ title: "ACE — Back squat", url: "https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/" }], [
    position("pilot/barbell-back-squat-start.webp", start, l("Debout, barre sur le haut du dos, genoux et hanches déployés, pieds au sol.", "Standing with the bar on the upper back, knees and hips extended, feet grounded.", "وقوف والبار أعلى الظهر مع مد الركبتين والوركين وارتكاز القدمين.")),
    position("pilot/barbell-back-squat-bottom.webp", l("Point bas de la descente", "Bottom of the descent", "أسفل النزول"), l("Hanches abaissées, genoux fléchis, talons au sol et barre toujours soutenue par le haut du dos.", "Hips lowered, knees bent, heels grounded and bar still supported on the upper back.", "الوركان منخفضان والركبتان مثنيتان والكعبان على الأرض والبار مدعوم أعلى الظهر.")),
  ]);
add("strength-curl-incline", "pilot/incline-dumbbell-curl-end.webp",
  l("Curl à deux haltères, assis sur un banc incliné et prise en supination.", "Two-dumbbell curl, seated on an inclined bench with a supinated grip.", "ثني المرفقين بدمبلين جالساً على مقعد مائل وراحتي اليدين للأعلى."), [
    l("Garde le dos soutenu et les pieds au sol.", "Keep the back supported and feet grounded.", "أبق الظهر مدعوماً والقدمين على الأرض."),
    l("Laisse les bras près du buste, légèrement en arrière, et fléchis les coudes sans les projeter en avant.", "Keep upper arms beside and slightly behind the torso; bend elbows without driving them forward.", "أبق أعلى الذراعين قرب الجذع وخلفه قليلاً واثن المرفقين دون دفعهما للأمام."),
    l("Les épaules restent stables et les poignets neutres ; redescends les haltères lentement.", "Keep shoulders stable and wrists neutral; lower the dumbbells slowly.", "حافظ على ثبات الكتفين وحياد الرسغين واخفض الدمبلين ببطء."),
  ], [{ title: "Catalyst Athletics — Incline dumbbell curl", url: "https://www.catalystathletics.com/exercise/850/Incline-Dumbbell-Curl/" }], [
    position("pilot/incline-dumbbell-curl-start.webp", start, l("Bras allongés près du buste sur le banc incliné, un haltère dans chaque main.", "Arms hanging beside the torso on the inclined bench, one dumbbell in each hand.", "الذراعان ممدودتان قرب الجذع على المقعد المائل ودمبل في كل يد.")),
    position("pilot/incline-dumbbell-curl-end.webp", end, l("Coudes fléchis, haltères rapprochés des épaules, dos toujours soutenu sur le même banc incliné.", "Elbows bent, dumbbells near the shoulders, back still supported on the same inclined bench.", "المرفقان مثنيان والدمبلان قرب الكتفين والظهر مدعوم على المقعد المائل نفسه.")),
  ]);
add("strength-tirage-horizontal-poulie", "pilot/seated-cable-row-end.webp",
  l("Tirage horizontal assis à la poulie basse, poignée rapprochée en prise neutre.", "Seated low cable row with a close neutral-grip handle.", "سحب أفقي جالس بالكابل السفلي مع مقبض ضيق وقبضة محايدة."), [
    l("Garde les pieds calés, les genoux légèrement fléchis et le buste stable.", "Keep feet braced, knees softly bent and torso stable.", "ثبت القدمين مع ثني مريح للركبتين وثبات الجذع."),
    l("Tire la poignée vers le haut de l’abdomen avec les coudes près du buste.", "Draw the handle toward the upper abdomen with elbows near the torso.", "اسحب المقبض نحو أعلى البطن مع بقاء المرفقين قرب الجذع."),
    l("Le câble reste relié à la poignée et tendu ; reviens bras allongés sans balancer le dos.", "Keep the cable connected and taut; return to extended arms without swinging the back.", "أبق الكابل متصلاً ومشدوداً وعد لمد الذراعين دون تأرجح الظهر."),
  ], [{ title: "PureGym — Seated cable row", url: "https://www.puregym.com/exercises/back/rows/seated-cable-row/" }], [
    position("pilot/seated-cable-row-start.webp", start, l("Bras presque tendus vers la poulie basse, pieds calés et poignée tenue à deux mains.", "Arms almost straight toward the low pulley, feet braced and both hands gripping the handle.", "الذراعان شبه ممدودتين نحو البكرة السفلية والقدمان ثابتتان واليدان تمسكان بالمقبض.")),
    position("pilot/seated-cable-row-end.webp", end, l("Poignée rapprochée du haut de l’abdomen, coudes en arrière et buste stable.", "Handle close to the upper abdomen, elbows back and torso stable.", "المقبض قريب من أعلى البطن والمرفقان للخلف والجذع ثابت.")),
  ]);
add("strength-curl-halteres", "dumbbell-curl.webp", l("Curl debout en supination — photographie existante conservée.", "Standing supinated curl — existing photograph retained.", "ثني المرفقين واقفاً بقبضة مستلقية، مع الاحتفاظ بالصورة الحالية."), [], []);
add("strength-pompes", "push-up.webp", l("Pompe au sol — photographie existante conservée.", "Floor push-up — existing photograph retained.", "ضغط أرضي مع الاحتفاظ بالصورة الحالية."), [], []);

export const EXERCISE_VISUAL_MEDIA: Readonly<Record<string, ExerciseVisualMedia>> = records;
export function visualMediaFor(exercise: Pick<LibraryExercise, "key" | "origin" | "discipline">) {
  return exercise.origin === "builtin" && exercise.discipline === "musculation" ? records[exercise.key] ?? null : null;
}
