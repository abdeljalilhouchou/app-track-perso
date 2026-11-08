import "server-only";
import type { GuideText, Localized } from "./types";
import type { ExercisePositionImage, ExerciseVisualMedia } from "./visual-media-types";
import { EXERCISE_V3_THUMBNAILS, EXERCISE_V3_EQUIPMENT, type ExerciseV3MediaId } from "./media-v3-index";

const l = (fr: string, en: string, ar: string): Localized<string> => ({ fr, en, ar });
type Copy = {
  variant: Localized<string>; start: Localized<string>; end?: Localized<string>;
  setup: Localized<string>; returning: Localized<string>; range: Localized<string>;
  mistakes: Localized<string>[]; tips: Localized<string>[];
  source: { title: string; url: string }; endLabel?: Localized<string>;
};

// Original editorial descriptions of the photographed variants, not new anatomy mappings.
export const EXERCISE_V3_COPY: Record<ExerciseV3MediaId, Copy> = {
  "strength-developpe-couche-barre": {
    variant: l("Développé couché barre sur banc plat, prise en pronation.", "Flat barbell bench press with an overhand grip.", "ضغط الصدر بالبار على مقعد مستوٍ بقبضة علوية."),
    start: l("Tête, omoplates et bassin sur le banc plat, pieds au sol ; barre au-dessus du thorax, coudes fléchis et poignets alignés.", "Head, shoulder blades and pelvis on the flat bench, feet grounded; bar above chest with bent elbows and aligned wrists.", "الرأس ولوحا الكتف والحوض على المقعد المستوي والقدمان ثابتتان؛ البار فوق الصدر والمرفقان مثنيان والرسغان مستقيمان."),
    end: l("Pousse la barre au-dessus du thorax jusqu’à des bras presque tendus, en gardant tous les appuis.", "Press the bar above the chest until arms are almost straight, maintaining every support point.", "ادفع البار فوق الصدر حتى تصبح الذراعان شبه ممدودتين مع الحفاظ على جميع نقاط الارتكاز."),
    setup: l("Vérifie banc, sécurités et colliers ; prévois une aide pour sortir et reposer la barre.", "Check bench, safeties and collars; arrange help to unrack and rack the bar.", "تحقق من المقعد ووسائل الأمان والأقفال ورتب مساعدة لإخراج البار وإعادته."),
    returning: l("Fléchis les coudes lentement pour ramener la barre vers le thorax, sans rebond.", "Bend elbows slowly to lower the bar toward the chest, without bouncing.", "اثن المرفقين ببطء لإعادة البار نحو الصدر دون ارتداد."),
    range: l("Garde une descente compatible avec tes épaules et le contrôle de la barre.", "Use a lowering range compatible with shoulder comfort and bar control.", "اختر مدى خفض يناسب راحة الكتفين والتحكم في البار."),
    mistakes: [l("Tête ou bassin décollés : réduis la charge et retrouve les appuis.", "Head or pelvis lifting: reduce load and restore support.", "ارتفاع الرأس أو الحوض: خفف الحمل واستعد الارتكاز."), l("Poignets cassés : replace-les au-dessus des avant-bras.", "Bent wrists: realign them over the forearms.", "ثني الرسغين: أعد محاذاتهما فوق الساعدين.")],
    tips: [l("Utilise une prise fermée et symétrique.", "Use a closed, symmetrical grip.", "استخدم قبضة مغلقة ومتناظرة."), l("Repose la barre seulement quand elle est au-dessus des crochets.", "Rack only once the bar is above the hooks.", "أعد البار فقط عندما يصبح فوق الخطافات.")],
    source: { title: "PureGym — Barbell bench press", url: "https://www.puregym.com/exercises/chest/bench-press/barbell-bench-press/" },
  },
  "strength-ecarte-poulie-vis-a-vis": {
    variant: l("Écarté debout, deux poulies proches de la hauteur des épaules.", "Standing chest fly with two pulleys near shoulder height.", "تفتيح الصدر واقفاً ببكرتين قرب مستوى الكتفين."),
    start: l("Appuis décalés, buste stable ; tiens une poignée de chaque côté, bras ouverts et coudes légèrement fléchis.", "Staggered stance, steady torso; hold one handle on each side, arms open and elbows softly bent.", "وقفة متباعدة للأمام والخلف وجذع ثابت؛ أمسك مقبضاً في كل جانب والذراعان مفتوحتان والمرفقان مثنيان قليلاً."),
    end: l("Rapproche les poignées devant le thorax en décrivant un arc, sans transformer le geste en développé.", "Bring handles together in front of the chest along an arc, without turning the movement into a press.", "قرب المقبضين أمام الصدر بمسار قوسي دون تحويل الحركة إلى دفع بالمرفقين."),
    setup: l("Règle les deux poulies à la même hauteur et vérifie chaque attache avant de prendre les poignées.", "Set both pulleys to the same height and check each attachment before gripping.", "اضبط البكرتين على الارتفاع نفسه وتحقق من كل وصلة قبل الإمساك بالمقبضين."),
    returning: l("Rouvre les bras sous contrôle, en conservant la légère flexion des coudes et la tension des câbles.", "Reopen arms under control, keeping a soft elbow bend and cable tension.", "افتح الذراعين بتحكم مع بقاء ثني خفيف للمرفقين وشد الكابلين."),
    range: l("Ne laisse pas les mains reculer loin derrière la ligne du thorax.", "Do not let hands travel far behind the chest line.", "لا تدع اليدين تتراجعان كثيراً خلف مستوى الصدر."),
    mistakes: [l("Coudes très pliés : allège pour conserver un mouvement d’écarté.", "Deeply bent elbows: lower the load to keep a fly motion.", "ثني شديد للمرفقين: خفف الحمل للحفاظ على حركة التفتيح."), l("Buste entraîné par les câbles : stabilise tes appuis et raccourcis l’amplitude.", "Torso pulled by cables: stabilize your stance and shorten the range.", "سحب الجذع بالكابلين: ثبت الارتكاز وقلل المدى.")],
    tips: [l("Garde les poignets dans l’axe des avant-bras.", "Keep wrists aligned with forearms.", "أبق الرسغين بمحاذاة الساعدين."), l("Conserve le même angle des coudes pendant l’arc.", "Keep the elbow angle consistent through the arc.", "حافظ على زاوية المرفقين أثناء المسار القوسي.")],
    source: { title: "PureGym — Cable flyes", url: "https://www.puregym.com/exercises/chest/chest-fly/cable-flyes/" },
  },
  "strength-tractions": {
    variant: l("Traction stricte à la barre, prise en pronation.", "Strict bar pull-up with an overhand grip.", "عقلة ثابتة على البار بقبضة علوية."),
    start: l("Suspends-toi à la barre avec une prise fermée, bras presque tendus, épaules contrôlées et pieds hors du sol.", "Hang with a closed grip, arms almost straight, shoulders controlled and feet clear of the floor.", "تعلق بقبضة مغلقة والذراعان شبه ممدودتين والكتفان متحكم بهما والقدمان بعيدتان عن الأرض."),
    end: l("Tire les coudes vers le bas pour amener le menton au-dessus de la barre, sans élan ni cou projeté.", "Draw elbows downward to bring the chin above the bar, without swinging or craning the neck.", "اسحب المرفقين للأسفل حتى يتجاوز الذقن البار دون تأرجح أو دفع الرقبة للأمام."),
    setup: l("Vérifie la fixation de la barre et utilise un accès stable pour la saisir.", "Check bar security and use a stable way to reach it.", "تحقق من تثبيت البار واستخدم وسيلة ثابتة للوصول إليه."),
    returning: l("Redescends en dépliant lentement les coudes, sans chute ni relâchement brutal des épaules.", "Lower by slowly extending elbows, without dropping or abruptly relaxing shoulders.", "انزل بمد المرفقين ببطء دون سقوط أو إرخاء مفاجئ للكتفين."),
    range: l("Adapte l’assistance pour garder un mouvement contrôlé et confortable.", "Adjust assistance to maintain a controlled, comfortable movement.", "عدل المساعدة للحفاظ على حركة مريحة ومتحكم بها."),
    mistakes: [l("Balancement des jambes : reviens à une suspension stable.", "Swinging legs: restore a steady hang.", "تأرجح الساقين: استعد التعلق الثابت."), l("Menton lancé vers la barre : garde la nuque dans le prolongement du dos.", "Chin thrust toward bar: keep the neck aligned with the back.", "دفع الذقن نحو البار: أبق الرقبة بمحاذاة الظهر.")],
    tips: [l("Garde la prise en pronation sur les deux vues.", "Keep the overhand grip in both phases.", "حافظ على القبضة العلوية في المرحلتين."), l("Choisis une aide adaptée plutôt que de donner de l’élan.", "Choose suitable assistance rather than using momentum.", "اختر مساعدة مناسبة بدلاً من استخدام الاندفاع.")],
    source: { title: "PureGym — Pull-up", url: "https://www.puregym.com/exercises/back/pull-up/" },
  },
  "strength-rowing-barre": {
    variant: l("Rowing barre penché, prise en pronation et buste maintenu.", "Bent-over barbell row with an overhand grip and fixed torso.", "تجديف البار بانحناء الوركين وقبضة علوية مع ثبات الجذع."),
    start: l("Pieds au sol, genoux souples, hanches reculées ; dos stable, regard vers le sol et barre suspendue sous les épaules.", "Feet grounded, soft knees and hips hinged back; steady back, downward gaze and bar hanging below shoulders.", "القدمان ثابتتان والركبتان مرنتان والوركان للخلف؛ ظهر ثابت ونظر نحو الأرض والبار معلق أسفل الكتفين."),
    end: l("Tire la barre vers le haut de l’abdomen en ramenant les coudes en arrière, sans redresser le buste.", "Row the bar toward the upper abdomen, drawing elbows back without raising the torso.", "اسحب البار نحو أعلى البطن مع إرجاع المرفقين دون رفع الجذع."),
    setup: l("Choisis une charge maîtrisable et installe ta charnière de hanche avant de commencer les répétitions.", "Choose a manageable load and establish the hip hinge before starting reps.", "اختر حملاً تتحكم فيه واتخذ انحناء الوركين قبل بدء التكرارات."),
    returning: l("Allonge les bras lentement en conservant l’angle du buste et les genoux souples.", "Extend arms slowly while keeping torso angle and soft knees.", "مد الذراعين ببطء مع الحفاظ على زاوية الجذع ومرونة الركبتين."),
    range: l("La barre se rapproche du ventre sans à-coup ; ne cherche pas à la monter au cou.", "Bring the bar toward the abdomen smoothly; do not row it to the neck.", "قرب البار من البطن بسلاسة ولا تسحبه نحو الرقبة."),
    mistakes: [l("Buste qui se redresse : allège et maintiens la charnière de hanche.", "Torso rising: lower the load and keep the hip hinge.", "ارتفاع الجذع: خفف الحمل وحافظ على انحناء الوركين."), l("Tête relevée : dirige le regard vers le sol pour aligner la nuque.", "Head lifted: look toward the floor to align the neck.", "رفع الرأس: انظر نحو الأرض لمحاذاة الرقبة.")],
    tips: [l("Conserve une prise symétrique en pronation.", "Maintain a symmetrical overhand grip.", "حافظ على قبضة علوية متناظرة."), l("Garde la barre proche du corps pendant le tirage.", "Keep the bar close to the body while rowing.", "أبق البار قريباً من الجسم أثناء السحب.")],
    source: { title: "ACE — Barbell bent-over row", url: "https://www.acefitness.org/resources/pros/expert-articles/6215/one-weight-workout-series-the-barbell/" },
  },
  "strength-developpe-militaire-barre": {
    variant: l("Développé militaire strict debout, barre devant les épaules.", "Strict standing overhead press with the bar in front of shoulders.", "دفع صارم للبار فوق الرأس واقفاً والبار أمام الكتفين."),
    start: l("Pieds stables, tronc gainé ; barre devant le haut du thorax, prise en pronation et avant-bras sous la barre.", "Stable feet and braced trunk; bar in front of upper chest, overhand grip and forearms below the bar.", "قدمان ثابتتان وجذع مشدود؛ البار أمام أعلى الصدر بقبضة علوية والساعدان أسفله."),
    end: l("Pousse au-dessus de la tête jusqu’à des bras presque tendus, sans impulsion des jambes ni cambrure exagérée.", "Press overhead until arms are almost straight, without leg drive or excessive back arch.", "ادفع فوق الرأس حتى تصبح الذراعان شبه ممدودتين دون دفع الساقين أو تقوس زائد للظهر."),
    setup: l("Règle le rack à une hauteur accessible et vérifie l’espace libre au-dessus de la barre.", "Set an accessible rack height and check overhead clearance.", "اضبط الرف على ارتفاع مناسب وتحقق من المساحة فوق البار."),
    returning: l("Ramène la barre devant les épaules lentement en gardant les poignets alignés et les appuis stables.", "Lower the bar in front of shoulders slowly, keeping wrists aligned and feet stable.", "أعد البار أمام الكتفين ببطء مع استقامة الرسغين وثبات القدمين."),
    range: l("Utilise une amplitude contrôlée sans pousser la tête ni les lombaires en arrière.", "Use a controlled range without forcing head or lower back backward.", "استخدم مدى متحكماً به دون دفع الرأس أو أسفل الظهر للخلف."),
    mistakes: [l("Jambes qui donnent l’élan : réduis la charge pour une poussée stricte.", "Leg drive: reduce load for a strict press.", "اندفاع الساقين: خفف الحمل لأداء الدفع الصارم."), l("Côtes qui se soulèvent : retrouve l’alignement du tronc.", "Ribs flaring: restore trunk alignment.", "بروز الأضلاع: استعد محاذاة الجذع.")],
    tips: [l("Place la barre devant la tête, pas derrière la nuque.", "Keep the bar in front of the head, not behind the neck.", "أبق البار أمام الرأس وليس خلف الرقبة."), l("Repose la barre sous contrôle dans le rack.", "Return the bar to the rack under control.", "أعد البار إلى الرف بتحكم.")],
    source: { title: "USMC — Force Fitness Exercise Guidebook, barbell overhead press", url: "https://www.tbs.marines.mil/Portals/230/Force%20Fitness%20Exercise%20Guidebook.pdf?ver=eGNb828lVw2cF1Ji_XVUsg%3D%3D" },
  },
  "strength-elevations-laterales": {
    variant: l("Élévations latérales debout avec haltères, sans élan.", "Standing dumbbell lateral raises without momentum.", "رفع جانبي بالدمبل واقفاً دون اندفاع."),
    start: l("Debout, pieds stables et haltères près des cuisses ; coudes souples, poignets droits et épaules relâchées.", "Stand with stable feet and dumbbells beside thighs; soft elbows, straight wrists and relaxed shoulders.", "قف بقدمين ثابتتين والدمبلان قرب الفخذين مع مرفقين مرنين ورسغين مستقيمين وكتفين مرتخيين."),
    end: l("Écarte les bras légèrement vers l’avant jusqu’aux environs de la hauteur des épaules, sans hausser le buste.", "Raise arms outward and slightly forward to around shoulder height, without lifting or swinging the torso.", "ارفع الذراعين جانبياً وإلى الأمام قليلاً قرب مستوى الكتفين دون رفع الجذع أو تأرجحه."),
    setup: l("Prends deux haltères légers que tu peux contrôler et libère l’espace de chaque côté.", "Choose controllable light dumbbells and clear space on both sides.", "اختر دمبلين خفيفين تتحكم فيهما وأخل المساحة على الجانبين."),
    returning: l("Redescends les bras lentement près des cuisses, sans laisser tomber les haltères.", "Lower arms slowly beside thighs without dropping the dumbbells.", "اخفض الذراعين ببطء قرب الفخذين دون إسقاط الدمبلين."),
    range: l("Arrête la montée avant une gêne ou une perte de contrôle, sans forcer au-dessus des épaules.", "Stop before discomfort or loss of control; do not force above shoulder height.", "توقف قبل الانزعاج أو فقدان التحكم ولا تفرض الرفع فوق الكتفين."),
    mistakes: [l("Balancement du buste : allège pour lever sans élan.", "Torso swinging: lighten the load for a steady lift.", "تأرجح الجذع: خفف الحمل للرفع بثبات."), l("Poignets cassés ou pouces forcés vers le bas : garde une prise confortable.", "Bent wrists or thumbs forced down: use a comfortable grip.", "ثني الرسغين أو توجيه الإبهامين للأسفل قسراً: استخدم قبضة مريحة.")],
    tips: [l("Conserve une légère flexion des coudes.", "Keep a soft elbow bend.", "حافظ على ثني خفيف للمرفقين."), l("Privilégie une montée régulière plutôt qu’une charge élevée.", "Choose a steady lift over excessive load.", "فضل الرفع المنتظم على الحمل الزائد.")],
    source: { title: "ACE — Dumbbell lateral raises", url: "https://www.acefitness.org/resources/pros/expert-articles/5277/train-this-not-that-the-upper-body-edition/" },
  },
  "strength-curl-marteau": {
    variant: l("Curl marteau debout à deux haltères, prise neutre maintenue.", "Standing two-dumbbell hammer curl with a maintained neutral grip.", "ثني المرفقين واقفاً بدمبلين مع الحفاظ على القبضة المحايدة."),
    start: l("Pieds stables, bras près du buste et haltères au niveau des cuisses ; paumes tournées l’une vers l’autre.", "Feet stable, upper arms beside torso and dumbbells at thighs; palms face each other.", "قدمان ثابتتان وذراعان قرب الجذع والدمبلان عند الفخذين وراحتا اليدين متقابلتان."),
    end: l("Fléchis les coudes pour monter les haltères près des épaules, pouces vers le haut et poignets neutres.", "Bend elbows to lift dumbbells near shoulders, thumbs up and wrists neutral.", "اثن المرفقين لرفع الدمبلين قرب الكتفين والإبهامان للأعلى والرسغان محايدان."),
    setup: l("Choisis une charge qui permet de garder les épaules et le tronc stables.", "Choose a load that keeps shoulders and torso steady.", "اختر حملاً يسمح بثبات الكتفين والجذع."),
    returning: l("Déplie les coudes lentement sans tourner les paumes vers le haut.", "Extend elbows slowly without turning palms upward.", "مد المرفقين ببطء دون تدوير راحتي اليدين للأعلى."),
    range: l("Arrête la montée avant de devoir avancer les bras ou balancer le buste.", "Stop lifting before upper arms move forward or torso starts swinging.", "توقف عن الرفع قبل دفع الذراعين للأمام أو تأرجح الجذع."),
    mistakes: [l("Prise qui se retourne : conserve les paumes face à face.", "Grip rotating: keep palms facing each other.", "دوران القبضة: أبق راحتي اليدين متقابلتين."), l("Coudes projetés en avant : allège et stabilise les bras.", "Elbows driven forward: lighten the load and steady upper arms.", "دفع المرفقين للأمام: خفف الحمل وثبت أعلى الذراعين.")],
    tips: [l("Garde les poignets dans l’axe des avant-bras.", "Keep wrists aligned with forearms.", "أبق الرسغين بمحاذاة الساعدين."), l("Les deux haltères suivent le même rythme.", "Move both dumbbells at the same steady pace.", "حرك الدمبلين بإيقاع منتظم واحد.")],
    source: { title: "Muscle & Strength — Standing hammer curl", url: "https://www.muscleandstrength.com/exercises/standing-hammer-curl.html" },
  },
  "strength-extension-poulie-haute-corde": {
    variant: l("Extension des coudes à la poulie haute avec corde, debout.", "Standing high-cable rope triceps pushdown.", "مد المرفقين بالحبل على البكرة العلوية واقفاً."),
    start: l("Face à la poulie haute, tiens chaque extrémité de la corde en prise neutre ; coudes fléchis près du buste.", "Face the high pulley, gripping each rope end neutrally; elbows bent beside the torso.", "واجه البكرة العلوية وأمسك كل طرف للحبل بقبضة محايدة والمرفقان مثنيان قرب الجذع."),
    end: l("Étends les coudes pour amener les mains près des cuisses, sans déplacer les épaules ni balancer le tronc.", "Extend elbows to bring hands beside thighs without shifting shoulders or swinging the torso.", "مد المرفقين لتقريب اليدين من الفخذين دون تحريك الكتفين أو تأرجح الجذع."),
    setup: l("Vérifie le mousqueton, place la poulie en hauteur et choisis une résistance maîtrisable.", "Check the carabiner, set a high pulley and choose manageable resistance.", "تحقق من المشبك واضبط البكرة عالياً واختر مقاومة تتحكم فيها."),
    returning: l("Laisse les coudes se fléchir lentement, bras toujours près des côtes et câble tendu.", "Let elbows bend slowly, upper arms still beside ribs and cable taut.", "دع المرفقين ينثنيان ببطء مع بقاء أعلى الذراعين قرب الأضلاع وشد الكابل."),
    range: l("Va vers l’extension sans verrouillage brutal ni traction des coudes loin derrière le buste.", "Move toward extension without forceful locking or pulling elbows far behind the torso.", "اقترب من المد دون قفل عنيف أو سحب المرفقين بعيداً خلف الجذع."),
    mistakes: [l("Buste qui s’abaisse pour aider : allège et stabilise la posture.", "Torso dropping to assist: reduce load and stabilize posture.", "خفض الجذع للمساعدة: خفف الحمل وثبت الوضعية."), l("Coudes qui s’écartent : garde les bras près du corps.", "Elbows flaring: keep upper arms beside the body.", "تباعد المرفقين: أبق أعلى الذراعين قرب الجسم.")],
    tips: [l("Garde une prise neutre et les poignets droits.", "Maintain a neutral grip and straight wrists.", "حافظ على قبضة محايدة ورسغين مستقيمين."), l("Laisse la corde se séparer légèrement en bas sans forcer les poignets.", "Let rope ends separate slightly at the bottom without forcing wrists.", "اسمح لطرفي الحبل بالتباعد قليلاً في الأسفل دون إجبار الرسغين.")],
    source: { title: "PureGym — Tricep pushdowns", url: "https://www.puregym.com/exercises/arms-and-shoulders/tricep-extension/tricep-pushdowns/" },
  },
  "strength-presse-a-cuisses": {
    variant: l("Exemple illustré : presse à cuisses inclinée avec chariot.", "Illustrated variation: inclined sled leg press.", "الطريقة المصورة: ضغط الساقين على جهاز مائل بعربة."),
    start: l("Tête, dos et bassin soutenus, mains aux poignées ; pieds à plat sur la plateforme et genoux fléchis dans l’axe des pieds.", "Head, back and pelvis supported, hands on handles; feet flat on the plate and bent knees following toes.", "الرأس والظهر والحوض مدعومة واليدان على المقابض؛ القدمان مسطحتان على المنصة والركبتان مثنيتان باتجاه القدمين."),
    end: l("Pousse la plateforme en étendant les jambes presque complètement, sans verrouiller les genoux ni décoller les talons.", "Press the platform away until legs are almost straight, without locking knees or lifting heels.", "ادفع المنصة حتى تصبح الساقان شبه مستقيمتين دون قفل الركبتين أو رفع الكعبين."),
    setup: l("Règle le siège, repère les sécurités et vérifie la charge avant de libérer le chariot.", "Adjust the seat, locate safeties and check load before releasing the sled.", "اضبط المقعد وحدد وسائل الأمان وتحقق من الحمل قبل تحرير العربة."),
    returning: l("Fléchis les genoux lentement pour rapprocher le chariot, en gardant le bassin sur le dossier.", "Bend knees slowly to bring the sled closer while keeping the pelvis supported.", "اثن الركبتين ببطء لتقريب العربة مع بقاء الحوض مدعوماً."),
    range: l("Réduis la descente avant que le bassin s’enroule ou que les talons perdent l’appui.", "Shorten the descent before the pelvis curls or heels lose contact.", "قلل النزول قبل التفاف الحوض أو فقدان ارتكاز الكعبين."),
    mistakes: [l("Genoux verrouillés : garde une extension contrôlée.", "Locked knees: use controlled extension.", "قفل الركبتين: استخدم مداً متحكماً به."), l("Bassin décollé : réduis profondeur et charge.", "Pelvis lifting: reduce depth and load.", "ارتفاع الحوض: قلل العمق والحمل.")],
    tips: [l("Conserve le contact de tout le pied avec la plateforme.", "Keep the whole foot in contact with the plate.", "حافظ على تلامس كامل القدم مع المنصة."), l("Remets les sécurités avant de quitter le siège.", "Engage safeties before leaving the seat.", "أعد وسائل الأمان قبل مغادرة المقعد.")],
    source: { title: "Muscle & Strength — Leg press", url: "https://www.muscleandstrength.com/exercises/45-degree-leg-press.html" },
  },
  "strength-leg-extension": {
    variant: l("Extension des genoux assis à la machine, deux jambes.", "Seated machine leg extension with both legs.", "مد الركبتين جالساً على الجهاز بالساقين معاً."),
    start: l("Dos et bassin contre les supports, genoux fléchis près de l’axe ; rouleau à l’avant du bas des jambes, au-dessus des chevilles.", "Back and pelvis supported, bent knees near the pivot; roller in front of lower shins above ankles.", "الظهر والحوض مدعومان والركبتان مثنيتان قرب محور الجهاز؛ الأسطوانة أمام أسفل الساقين فوق الكاحلين."),
    end: l("Étends les genoux pour lever le rouleau, cuisses soutenues et mains aux poignées, sans à-coup.", "Extend knees to lift the roller, keeping thighs supported and hands on handles without jerking.", "مد الركبتين لرفع الأسطوانة مع دعم الفخذين واليدين على المقابض دون حركة مفاجئة."),
    setup: l("Ajuste siège, dossier et rouleau à ta taille avant de choisir la charge.", "Adjust seat, backrest and roller to your size before selecting load.", "اضبط المقعد والمسند والأسطوانة حسب طولك قبل اختيار الحمل."),
    returning: l("Redescends les pieds lentement en fléchissant les genoux, sans laisser retomber la pile.", "Lower feet slowly by bending knees, without dropping the weight stack.", "اخفض القدمين ببطء بثني الركبتين دون إسقاط الأوزان."),
    range: l("Approche l’extension sans verrouillage forcé ; adapte le réglage si le genou est gêné.", "Approach extension without forced locking; adjust settings for knee discomfort.", "اقترب من المد دون قفل قسري وعدل الضبط عند انزعاج الركبة."),
    mistakes: [l("Bassin qui se soulève : allège et reprends l’appui du siège.", "Pelvis lifting: reduce load and restore seat support.", "ارتفاع الحوض: خفف الحمل واستعد دعم المقعد."), l("Rouleau sur les pieds : replace-le au-dessus des chevilles.", "Roller on feet: reposition it above the ankles.", "الأسطوانة على القدمين: أعد وضعها فوق الكاحلين.")],
    tips: [l("Garde les deux jambes au même rythme.", "Move both legs at the same pace.", "حرك الساقين بإيقاع واحد."), l("Tiens les poignées sans tirer le buste vers l’avant.", "Hold handles without pulling the torso forward.", "أمسك المقابض دون سحب الجذع للأمام.")],
    source: { title: "PureGym — Leg extensions", url: "https://www.puregym.com/exercises/legs/quad-exercises/leg-extensions/" },
  },
  "strength-fentes-marchees": {
    variant: l("Fentes marchées avec deux haltères ; la seconde vue montre le point bas d’un pas.", "Walking dumbbell lunges; the second view shows the bottom of one step.", "اندفاع بالمشي بدمبلين؛ تعرض الصورة الثانية أسفل خطوة واحدة."),
    start: l("Debout, pieds écartés à largeur de hanches et un haltère de chaque côté, bras allongés et buste stable.", "Stand with feet hip-width apart, a dumbbell at each side, arms extended and torso steady.", "قف والقدمان بعرض الوركين ودمبل في كل جانب والذراعان ممدودتان والجذع ثابت."),
    end: l("Avance un pied puis abaisse-toi en pliant les deux genoux, pied avant à plat et talon arrière levé.", "Step forward and lower by bending both knees, front foot flat and rear heel raised.", "اخط للأمام ثم انزل بثني الركبتين والقدم الأمامية مسطحة والكعب الخلفي مرفوع."),
    endLabel: l("Point bas du pas", "Bottom of the step", "أسفل الخطوة"),
    setup: l("Dégage un couloir de marche et choisis des haltères qui ne gênent pas l’équilibre.", "Clear a walking lane and choose dumbbells that do not compromise balance.", "أخل مسار المشي واختر دمبلين لا يؤثران في التوازن."),
    returning: l("Pousse dans le pied avant pour te relever, puis avance la jambe arrière pour le pas suivant.", "Push through the front foot to rise, then bring the rear leg forward for the next step.", "ادفع بالقدم الأمامية للوقوف ثم قدم الساق الخلفية للخطوة التالية."),
    range: l("Abaisse le genou arrière sans le heurter au sol et sans perdre les appuis.", "Lower the rear knee without hitting the floor or losing balance.", "اخفض الركبة الخلفية دون صدمها بالأرض أو فقدان التوازن."),
    mistakes: [l("Pieds sur une seule ligne : garde deux rails à largeur de hanches.", "Feet on one line: keep two hip-width tracks.", "القدمان على خط واحد: حافظ على مسارين بعرض الوركين."), l("Genou avant qui rentre : guide-le dans la direction du pied.", "Front knee collapsing inward: guide it along the foot.", "انهيار الركبة الأمامية للداخل: وجهها باتجاه القدم.")],
    tips: [l("Garde les haltères de part et d’autre des cuisses.", "Keep dumbbells outside the thighs.", "أبق الدمبلين خارج الفخذين."), l("Stabilise chaque pas avant d’avancer à nouveau.", "Stabilize each step before moving forward again.", "ثبت كل خطوة قبل التقدم مجدداً.")],
    source: { title: "PureGym — Walking lunges", url: "https://www.puregym.com/exercises/legs/quad-exercises/lunges/walking-lunges/" },
  },
  "strength-leg-curl-allonge": {
    variant: l("Leg curl allongé sur le ventre, bassin et cuisses soutenus.", "Prone lying leg curl with supported pelvis and thighs.", "ثني الركبتين مستلقياً على البطن مع دعم الحوض والفخذين."),
    start: l("Allongé face au sol, mains aux poignées, genoux près de l’axe ; rouleau derrière le bas des jambes, au-dessus des talons.", "Lie face down holding handles, knees near the pivot; roller behind lower legs above heels.", "استلق ووجهك للأسفل واليدان على المقابض والركبتان قرب المحور؛ الأسطوانة خلف أسفل الساقين فوق الكعبين."),
    end: l("Fléchis les genoux pour rapprocher les talons des fessiers, sans décoller le bassin ni les cuisses.", "Bend knees to bring heels toward the buttocks without lifting pelvis or thighs.", "اثن الركبتين لتقريب الكعبين من الأرداف دون رفع الحوض أو الفخذين."),
    setup: l("Ajuste le rouleau et l’axe de la machine ; vérifie que les poignées sont accessibles.", "Adjust roller and machine alignment; check the handles are within reach.", "اضبط الأسطوانة ومحور الجهاز وتحقق من إمكانية الوصول إلى المقابض."),
    returning: l("Allonge les jambes lentement, en gardant le rouleau au contact et le tronc soutenu.", "Extend legs slowly, keeping roller contact and torso support.", "مد الساقين ببطء مع بقاء تلامس الأسطوانة ودعم الجذع."),
    range: l("Ne force pas la flexion au point de cambrer le dos ou de lever les hanches.", "Do not force knee flexion until the back arches or hips rise.", "لا تفرض ثني الركبتين إلى حد تقوس الظهر أو ارتفاع الوركين."),
    mistakes: [l("Bassin qui monte : réduis la charge et retrouve le contact du support.", "Pelvis rising: reduce load and restore pad contact.", "ارتفاع الحوض: خفف الحمل واستعد ملامسة الوسادة."), l("Nuque relevée : garde le regard vers le sol.", "Neck lifted: keep gaze toward the floor.", "رفع الرقبة: حافظ على النظر نحو الأرض.")],
    tips: [l("Garde les cuisses immobiles contre le support.", "Keep thighs still against the pad.", "أبق الفخذين ثابتين على الوسادة."), l("Utilise le même rythme avec les deux jambes.", "Use the same pace for both legs.", "استخدم الإيقاع نفسه للساقين.")],
    source: { title: "PureGym — Prone leg curl setup", url: "https://www.puregym.com/amp/blog/how-to-use-gym-equipment/" },
  },
  "strength-mollets-debout": {
    variant: l("Exemple illustré : élévation des talons au poids du corps, au sol avec appui léger.", "Illustrated variation: floor bodyweight calf raise with light balance support.", "الطريقة المصورة: رفع الكعبين بوزن الجسم على الأرض مع ارتكاز خفيف للتوازن."),
    start: l("Pieds parallèles au sol, talons posés et genoux souples ; une main touche légèrement un support fixe.", "Feet parallel and flat, heels down and knees soft; one hand lightly touches a fixed support.", "القدمان متوازيتان ومسطحتان والكعبان على الأرض والركبتان مرنتان؛ يد تلامس دعامة ثابتة بخفة."),
    end: l("Soulève les deux talons pour monter sur l’avant des pieds, sans plier les genoux ni te suspendre au support.", "Lift both heels onto the forefeet without bending knees or hanging from the support.", "ارفع الكعبين للارتكاز على مقدمة القدمين دون ثني الركبتين أو التعلق بالدعامة."),
    setup: l("Choisis un sol stable et un appui qui ne peut pas basculer.", "Choose stable flooring and support that cannot tip.", "اختر أرضية ثابتة ودعامة لا تنقلب."),
    returning: l("Redescends les talons lentement jusqu’au sol sans rebond.", "Lower heels slowly back to the floor without bouncing.", "اخفض الكعبين ببطء نحو الأرض دون ارتداد."),
    range: l("Monte selon ton équilibre et ton contrôle, sans rouler sur le bord des pieds.", "Rise within balance and control, without rolling onto foot edges.", "ارتفع حسب توازنك وتحكمك دون الميل على حافتي القدمين."),
    mistakes: [l("Genoux qui se plient : garde les jambes confortablement allongées.", "Knees bending: keep legs comfortably extended.", "ثني الركبتين: أبق الساقين ممدودتين براحة."), l("Élan et rebond : ralentis la montée et la descente.", "Momentum and bouncing: slow the rise and lowering.", "الاندفاع والارتداد: أبطئ الرفع والخفض.")],
    tips: [l("Conserve une pression régulière sur l’avant des deux pieds.", "Keep even pressure through both forefeet.", "حافظ على ضغط متساوٍ على مقدمة القدمين."), l("L’appui sert à l’équilibre, pas à te tirer vers le haut.", "The support provides balance, not upward pulling.", "الدعامة للتوازن وليست لسحب الجسم للأعلى.")],
    source: { title: "NHS — Strength exercises, calf raises", url: "https://www.nhs.uk/live-well/exercise/strength-exercises/" },
  },
  "strength-crunch-poulie": {
    variant: l("Crunch à genoux avec corde de poulie haute, flexion contrôlée du tronc.", "Kneeling high-cable rope crunch with controlled trunk flexion.", "كرنش راكع بحبل البكرة العلوية مع ثني متحكم به للجذع."),
    start: l("À genoux sur un tapis, bassin stable ; tiens les extrémités de corde près du visage, coudes fléchis et câble tendu.", "Kneel on a mat with stable hips; hold rope ends near the face, elbows bent and cable taut.", "اركع على بساط بحوض ثابت وأمسك طرفي الحبل قرب الوجه والمرفقان مثنيان والكابل مشدود."),
    end: l("Rapproche les côtes du bassin en enroulant le tronc ; les bras guident la corde sans tirer sur la nuque.", "Bring ribs toward pelvis by curling the trunk; arms guide the rope without pulling the neck.", "قرب الأضلاع من الحوض بثني الجذع؛ توجه الذراعان الحبل دون سحب الرقبة."),
    setup: l("Vérifie la corde et l’attache haute, place le tapis à distance confortable puis règle une charge modérée.", "Check rope and high attachment, place the mat at a comfortable distance and select a manageable load.", "تحقق من الحبل والوصلة العلوية وضع البساط على مسافة مريحة واختر حملاً مناسباً."),
    returning: l("Déroule le tronc lentement vers la position de départ, sans cambrure forcée ni déplacement du bassin.", "Uncurl slowly toward the start without forced back arch or hip movement.", "عد بالجذع ببطء نحو البداية دون تقوس قسري للظهر أو تحريك الحوض."),
    range: l("Reste dans une flexion confortable ; les mains gardent leur position par rapport au visage.", "Use comfortable trunk flexion; keep hands in the same position relative to the face.", "استخدم ثنياً مريحاً للجذع وأبق اليدين في الموضع نفسه بالنسبة للوجه."),
    mistakes: [l("Bassin qui part vers les talons : stabilise les hanches et réduis la charge.", "Hips moving toward heels: stabilize hips and reduce load.", "تحريك الحوض نحو الكعبين: ثبت الوركين وخفف الحمل."), l("Bras qui tirent la corde : conserve l’angle des coudes et enroule le tronc.", "Arms pulling the rope: keep elbow angle and curl the trunk.", "سحب الحبل بالذراعين: حافظ على زاوية المرفقين واثن الجذع.")],
    tips: [l("Expire pendant l’enroulement sans bloquer la respiration.", "Exhale during the curl without holding your breath.", "ازفر أثناء الثني دون حبس النفس."), l("Garde les genoux et les pieds en place.", "Keep knees and feet in place.", "أبق الركبتين والقدمين في موضعهما.")],
    source: { title: "Muscle & Strength — Cable crunch", url: "https://www.muscleandstrength.com/exercises/cable-crunch.html" },
  },
  "strength-gainage-planche": {
    variant: l("Gainage sur les avant-bras, maintien statique avec respiration régulière.", "Forearm plank, a static hold with steady breathing.", "بلانك على الساعدين مع ثبات وتنفس منتظم."),
    start: l("Avant-bras et pointes des pieds sur le tapis, coudes sous les épaules ; tête, tronc et bassin alignés.", "Forearms and toes on the mat, elbows under shoulders; head, trunk and pelvis aligned.", "الساعدان وأصابع القدمين على البساط والمرفقان تحت الكتفين والرأس والجذع والحوض بمحاذاة واحدة."),
    setup: l("Pose les avant-bras sur un tapis stable et allonge les jambes progressivement.", "Place forearms on a stable mat and extend legs gradually.", "ضع الساعدين على بساط ثابت ومد الساقين تدريجياً."),
    returning: l("Pose les genoux au sol pour sortir du maintien sous contrôle.", "Lower knees to leave the hold under control.", "ضع الركبتين على الأرض للخروج من الثبات بتحكم."),
    range: l("Maintiens l’alignement tant que tu peux respirer et contrôler la posture.", "Hold alignment while breathing and controlling posture.", "حافظ على المحاذاة ما دمت تتنفس وتتحكم في الوضعية."),
    mistakes: [l("Bassin qui s’affaisse : raccourcis le maintien ou pose les genoux.", "Hips sagging: shorten the hold or lower knees.", "هبوط الحوض: قلل مدة الثبات أو ضع الركبتين."), l("Tête relevée : dirige le regard vers le tapis.", "Head lifted: look toward the mat.", "رفع الرأس: انظر نحو البساط.")],
    tips: [l("Respire régulièrement pendant le maintien.", "Breathe steadily during the hold.", "تنفس بانتظام أثناء الثبات."), l("Garde les épaules au-dessus des coudes.", "Keep shoulders above elbows.", "أبق الكتفين فوق المرفقين.")],
    source: { title: "ACE — Front plank", url: "https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/" },
  },
};

const startLabel=l("Position de départ", "Starting position", "وضعية البداية");
const endLabel=l("Position d’arrivée", "End position", "وضعية الوصول");
const image=(id: ExerciseV3MediaId, phase: string, alt: Localized<string>)=>({src:`/images/exercises/v3/${id}-${phase}.webp`,width:960,height:640,alt});
export const EXERCISE_VISUAL_MEDIA_V3: Readonly<Record<string, ExerciseVisualMedia>> = Object.fromEntries(
  Object.entries(EXERCISE_V3_COPY).map(([key,copy])=>{
    const id=key as ExerciseV3MediaId;
    const position=(phase:string,caption:Localized<string>,label:Localized<string>):ExercisePositionImage=>({...image(id,phase,caption),label,caption});
    return [id,{
      exerciseId:id,heroImage:image(id,copy.end?"end":"hold",EXERCISE_V3_THUMBNAILS[id]),
      thumbnail:{src:`/images/exercises/thumbnails/${id}.webp`,width:320,height:213,alt:EXERCISE_V3_THUMBNAILS[id]},
      ...(copy.end?{startPositionImage:position("start",copy.start,startLabel),endPositionImage:position("end",copy.end,copy.endLabel??endLabel)}:{staticPositionImage:position("hold",copy.start,l("Maintien statique","Static hold","ثبات ثابت"))}),
      variant:copy.variant,technicalChecks:[copy.start,...(copy.end?[copy.end]:[]),copy.returning],
      illustratedEquipment:EXERCISE_V3_EQUIPMENT[id],source:"image_gen" as const,
      license:"generated-for-project-no-third-party-license-asserted" as const,
      reviewStatus:"technical-reviewed" as const,userApproval:"pending-batch-validation" as const,
      technicalSources:[copy.source],
    }];
  })
);

/** Existing guides take precedence; this only supplies previously undocumented photographed variants. */
export function v3Technique(id:string, language:keyof Localized<string>):GuideText|null {
  const copy=Object.hasOwn(EXERCISE_V3_COPY,id)?EXERCISE_V3_COPY[id as ExerciseV3MediaId]:undefined;
  if(!copy)return null;
  return {
    description:copy.variant[language],objective:(copy.end??copy.start)[language],
    preparation:copy.setup[language],position:copy.start[language],execution:(copy.end??copy.start)[language],return:copy.returning[language],
    breathing:(copy.end?l("Souffle pendant l’effort et inspire au retour, en gardant le contrôle du tronc.","Exhale through the effort and inhale on return while keeping trunk control.","ازفر أثناء الجهد واستنشق عند العودة مع الحفاظ على التحكم في الجذع."):l("Respire régulièrement pendant tout le maintien.","Breathe steadily throughout the hold.","تنفس بانتظام طوال الثبات."))[language],
    range:copy.range[language],tempo:(copy.end?l("Mouvement régulier et retour contrôlé, sans rebond ni élan.","Steady movement and controlled return, without bouncing or momentum.","حركة منتظمة وعودة متحكم بها دون ارتداد أو اندفاع."):l("Maintien immobile et sortie progressive.","Steady hold and gradual release.","ثبات مستمر وخروج تدريجي."))[language],
    mistakes:copy.mistakes.map(value=>value[language]),tips:copy.tips.map(value=>value[language]),
    safety:l("Adapte la charge et les réglages à ton contrôle. Arrête un mouvement douloureux et demande une aide pour une installation incertaine.","Match load and settings to your control. Stop painful movement and get help with an uncertain setup.","عدل الحمل والضبط حسب تحكمك وتوقف عند الألم واطلب المساعدة إذا لم تكن واثقاً من الإعداد.")[language],
  };
}
