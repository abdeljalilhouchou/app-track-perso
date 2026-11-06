import type { Language } from "@/lib/language";
import type { MuscleGroupId } from "./rowing";

const fr = {
  adaptation: "Adaptation d’affichage Track Perso : couleurs, matériaux, éclairage et cadrage ; géométrie du fichier conservée.", provenance: "Provenance et adaptations",
  backMuscles: "Dos", fullBody: "Corps entier", rowingRole: "Pendant le tirage", primaryGroup: "Muscles principaux", secondaryGroup: "Muscles secondaires", stabilizerGroup: "Stabilisateurs",
  close: "Fermer le visualiseur", expand: "Agrandir", collapse: "Réduire", viewer: "Corps anatomique masculin 3D interactif",
  muscles: "Muscles", technique: "Technique", mistakes: "Erreurs", tips: "Conseils", front: "Vue avant", back: "Vue arrière", rotateLeft: "Tourner vers la gauche", rotateRight: "Tourner vers la droite", zoomIn: "Zoomer", zoomOut: "Dézoomer", reset: "Réinitialiser la vue", side: "Côté travaillé", left: "Gauche", right: "Droite",
  primary: "Principal", secondary: "Secondaire", stabilizer: "Stabilisateur", neutral: "Autre zone", legend: "Rôle dans ce mouvement", list: "Muscles sollicités", selected: "Muscle sélectionné", deep: "Muscle profond : les couches voisines sont atténuées pour le repérer.", xray: "Atténuer les couches superficielles", colors: "Afficher les couleurs",
  gesture: "Glisse sur le corps pour tourner. Pince pour zoomer. Défile en dehors du modèle.", loading: "Chargement du modèle anatomique…", webglFailed: "La vue 3D est indisponible sur cet appareil.", modelFailed: "Le modèle 3D n’a pas pu être chargé.", retry: "Réessayer la 3D", fallback: "Repères anatomiques 2D", fallbackBody: "La vue 2D permet de consulter les muscles et leurs rôles. La rotation 3D et le zoom tactile ne sont pas disponibles dans ce mode.", show2d: "Passer aux repères 2D", show3d: "Afficher le corps 3D",
  pose: "Modèle de repérage en position debout. Le mouvement est expliqué dans l’onglet Technique.", variant: "Repères pour un tirage avec une main et un genou sur le banc. Les rôles varient avec la trajectoire du coude et les appuis.", classification: "Classification pédagogique pour cette variante ; validation professionnelle à compléter.", credit: "Atlas masculin : Fit Mit With / Z-Anatomy / BodyParts3D", license: "Licence CC BY-SA 4.0", source: "Sources et attribution", previous: "Couche visible", equipment: "Haltère · Banc", level: "Niveau indicatif : intermédiaire",
};
type Copy = { [K in keyof typeof fr]: string };
const en: Copy = {
  adaptation: "Track Perso display adaptation: colors, materials, lighting and framing; file geometry preserved.", provenance: "Provenance and adaptations",
  backMuscles: "Back", fullBody: "Full body", rowingRole: "During the pull", primaryGroup: "Primary muscles", secondaryGroup: "Secondary muscles", stabilizerGroup: "Stabilizers",
  close: "Close muscle viewer", expand: "Expand", collapse: "Collapse", viewer: "Interactive male 3D anatomy model",
  muscles: "Muscles", technique: "Technique", mistakes: "Mistakes", tips: "Tips", front: "Front view", back: "Back view", rotateLeft: "Rotate left", rotateRight: "Rotate right", zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Reset view", side: "Working side", left: "Left", right: "Right",
  primary: "Primary", secondary: "Secondary", stabilizer: "Stabilizer", neutral: "Other region", legend: "Role in this movement", list: "Muscles involved", selected: "Selected muscle", deep: "Deep muscle: nearby layers are faded to reveal it.", xray: "Fade superficial layers", colors: "Show colors",
  gesture: "Drag the body to rotate. Pinch to zoom. Scroll outside the model.", loading: "Loading the anatomy model…", webglFailed: "The 3D view is unavailable on this device.", modelFailed: "The 3D model could not be loaded.", retry: "Retry 3D", fallback: "2D muscle landmarks", fallbackBody: "The 2D view provides muscles and their roles. 3D rotation and pinch zoom are unavailable in this mode.", show2d: "Switch to 2D landmarks", show3d: "Show 3D body",
  pose: "Standing anatomical reference model. The movement is explained in the Technique section.", variant: "Landmarks for a row with one hand and knee supported on a bench. Roles vary with elbow path and support points.", classification: "Educational classification for this variation; professional validation remains pending.", credit: "Male atlas: Fit Mit With / Z-Anatomy / BodyParts3D", license: "CC BY-SA 4.0 license", source: "Sources and attribution", previous: "Visible layer", equipment: "Dumbbell · Bench", level: "Indicative level: intermediate",
};
const ar: Copy = {
  adaptation: "تكييف العرض في Track Perso: الألوان والخامات والإضاءة والتأطير مع الحفاظ على هندسة الملف.", provenance: "المصدر والتعديلات",
  backMuscles: "الظهر", fullBody: "الجسم بالكامل", rowingRole: "أثناء السحب", primaryGroup: "العضلات الرئيسية", secondaryGroup: "العضلات الثانوية", stabilizerGroup: "العضلات المثبتة",
  close: "إغلاق عارض العضلات", expand: "تكبير اللوحة", collapse: "تصغير اللوحة", viewer: "نموذج تشريحي ثلاثي الأبعاد لرجل قابل للتفاعل",
  muscles: "العضلات", technique: "الأداء", mistakes: "الأخطاء", tips: "نصائح", front: "عرض أمامي", back: "عرض خلفي", rotateLeft: "التدوير لليسار", rotateRight: "التدوير لليمين", zoomIn: "تقريب", zoomOut: "إبعاد", reset: "إعادة ضبط العرض", side: "جهة العمل", left: "اليسرى", right: "اليمنى",
  primary: "رئيسية", secondary: "ثانوية", stabilizer: "مثبتة", neutral: "منطقة أخرى", legend: "الدور في هذه الحركة", list: "العضلات المشاركة", selected: "العضلة المحددة", deep: "عضلة عميقة: تُخفف الطبقات المجاورة لإظهارها.", xray: "تخفيف الطبقات السطحية", colors: "عرض الألوان",
  gesture: "اسحب فوق الجسم للتدوير وبإصبعين للتقريب. مرر خارج النموذج لتحريك اللوحة.", loading: "جارٍ تحميل النموذج التشريحي…", webglFailed: "العرض ثلاثي الأبعاد غير متاح على هذا الجهاز.", modelFailed: "تعذر تحميل النموذج ثلاثي الأبعاد.", retry: "إعادة محاولة العرض ثلاثي الأبعاد", fallback: "مناطق عضلية ثنائية الأبعاد", fallbackBody: "يوضح العرض الثنائي العضلات وأدوارها. التدوير الثلاثي والتقريب باللمس غير متاحين في هذا الوضع.", show2d: "الانتقال للعرض الثنائي", show3d: "عرض الجسم ثلاثي الأبعاد",
  pose: "نموذج تشريحي مرجعي في وضع الوقوف. تُشرح الحركة في قسم الأداء.", variant: "مرجع للسحب مع ارتكاز يد وركبة على مقعد. تختلف الأدوار بحسب مسار المرفق ونقاط الارتكاز.", classification: "تصنيف تعليمي لهذه الطريقة؛ المراجعة المهنية ما زالت مطلوبة.", credit: "أطلس رجالي: Fit Mit With / Z-Anatomy / BodyParts3D", license: "ترخيص CC BY-SA 4.0", source: "المصادر والإسناد", previous: "الطبقة الظاهرة", equipment: "دمبل · مقعد", level: "المستوى التقريبي: متوسط",
};
type MuscleCopy = Record<MuscleGroupId, { name: string; description: string }>;
const musclesFr: MuscleCopy = {
  lats: { name: "Grand dorsal", description: "Participe à ramener le bras près du tronc et vers la hanche pendant le tirage." },
  rhomboids: { name: "Rhomboïdes", description: "Participent au rapprochement et au contrôle de l’omoplate. Ils se trouvent sous le trapèze." },
  middleTraps: { name: "Trapèze moyen", description: "Accompagne le rapprochement de l’omoplate lorsque le coude recule." },
  lowerTraps: { name: "Trapèze inférieur", description: "Contribue au contrôle de la position de l’omoplate, en coordination avec les autres muscles scapulaires." },
  rearDeltoid: { name: "Deltoïde postérieur", description: "Aide au déplacement du bras vers l’arrière. Sa contribution varie avec l’écartement du coude." },
  biceps: { name: "Biceps brachial", description: "Assiste la flexion du coude au cours du tirage, sans remplacer le mouvement du bras et de l’omoplate." },
  elbowFlexors: { name: "Brachial et brachio-radial", description: "Aident à fléchir le coude ; leur contribution dépend aussi de l’orientation de la prise." },
  abdominals: { name: "Paroi abdominale", description: "Contribue au maintien du tronc et au contrôle de sa rotation malgré la charge d’un seul côté." },
  spinalStabilizers: { name: "Stabilisateurs lombaires", description: "Aident à conserver la position du rachis. L’appui sur banc réduit le besoin de soutenir le buste par rapport à une variante sans appui." },
};
const musclesEn: MuscleCopy = {
  lats: { name: "Latissimus dorsi", description: "Helps bring the upper arm toward the torso and hip during the pull." },
  rhomboids: { name: "Rhomboids", description: "Help retract and control the scapula. They lie underneath the trapezius." },
  middleTraps: { name: "Middle trapezius", description: "Assists scapular retraction as the elbow travels backward." },
  lowerTraps: { name: "Lower trapezius", description: "Helps control scapular position in coordination with other scapular muscles." },
  rearDeltoid: { name: "Posterior deltoid", description: "Assists the arm moving backward. Its contribution varies with elbow position." },
  biceps: { name: "Biceps brachii", description: "Assists elbow flexion during the row, alongside movement at the shoulder and scapula." },
  elbowFlexors: { name: "Brachialis and brachioradialis", description: "Assist elbow flexion; their contribution also depends on grip orientation." },
  abdominals: { name: "Abdominal wall", description: "Helps maintain trunk position and resist rotation under the one-sided load." },
  spinalStabilizers: { name: "Lumbar stabilizers", description: "Help maintain spinal position. Bench support reduces the need to support the torso compared with an unsupported variation." },
};
const musclesAr: MuscleCopy = {
  lats: { name: "العضلة الظهرية العريضة", description: "تساهم في تقريب أعلى الذراع من الجذع والورك أثناء السحب." },
  rhomboids: { name: "العضلات المعينية", description: "تساعد في تقريب لوح الكتف والتحكم فيه وتقع تحت العضلة شبه المنحرفة." },
  middleTraps: { name: "شبه المنحرفة الوسطى", description: "تساعد في تقريب لوح الكتف عند تحرك المرفق للخلف." },
  lowerTraps: { name: "شبه المنحرفة السفلية", description: "تساهم في التحكم في وضع لوح الكتف بالتنسيق مع العضلات الكتفية الأخرى." },
  rearDeltoid: { name: "العضلة الدالية الخلفية", description: "تساعد في تحريك الذراع للخلف وتتغير مساهمتها بحسب بُعد المرفق عن الجذع." },
  biceps: { name: "العضلة ذات الرأسين العضدية", description: "تساعد في ثني المرفق أثناء السحب بالتزامن مع حركة الذراع ولوح الكتف." },
  elbowFlexors: { name: "العضدية والعضدية الكعبرية", description: "تساعدان في ثني المرفق وتتأثر مساهمتهما أيضاً باتجاه القبضة." },
  abdominals: { name: "جدار البطن", description: "يساعد في تثبيت الجذع ومقاومة دورانه مع وجود الحمل على جهة واحدة." },
  spinalStabilizers: { name: "مثبتات أسفل الظهر", description: "تساعد في الحفاظ على وضع العمود الفقري. يقلل الارتكاز على المقعد الحاجة إلى دعم الجذع مقارنة بالسحب دون ارتكاز." },
};
// Short functional summaries derive from the existing descriptions of this variant.
const actionsFr: Record<MuscleGroupId, string> = {
  lats: "Ramener le bras vers le tronc et la hanche.", rhomboids: "Rapprocher et contrôler l’omoplate.", middleTraps: "Accompagner le rapprochement de l’omoplate.", lowerTraps: "Contrôler la position de l’omoplate.", rearDeltoid: "Accompagner le bras vers l’arrière.", biceps: "Assister la flexion du coude.", elbowFlexors: "Participer à la flexion du coude.", abdominals: "Maintenir le tronc et contrôler sa rotation.", spinalStabilizers: "Conserver la position du rachis.",
};
const actionsEn: Record<MuscleGroupId, string> = {
  lats: "Bring the upper arm toward the torso and hip.", rhomboids: "Retract and control the scapula.", middleTraps: "Assist scapular retraction.", lowerTraps: "Control scapular position.", rearDeltoid: "Assist the arm moving backward.", biceps: "Assist elbow flexion.", elbowFlexors: "Contribute to elbow flexion.", abdominals: "Maintain the trunk and resist rotation.", spinalStabilizers: "Maintain spinal position.",
};
const actionsAr: Record<MuscleGroupId, string> = {
  lats: "تقريب أعلى الذراع من الجذع والورك.", rhomboids: "تقريب لوح الكتف والتحكم فيه.", middleTraps: "المساعدة في تقريب لوح الكتف.", lowerTraps: "التحكم في وضع لوح الكتف.", rearDeltoid: "المساعدة في تحريك الذراع للخلف.", biceps: "المساعدة في ثني المرفق.", elbowFlexors: "المساهمة في ثني المرفق.", abdominals: "تثبيت الجذع ومقاومة دورانه.", spinalStabilizers: "الحفاظ على وضع العمود الفقري.",
};
export function anatomyCopy(language: Language) { return { ui: ({ fr, en, ar })[language], muscles: ({ fr: musclesFr, en: musclesEn, ar: musclesAr })[language], actions: ({ fr: actionsFr, en: actionsEn, ar: actionsAr })[language] }; }
