import type { Language } from "@/lib/language";

const fr = {
  deep: "Ce groupe contient des structures profondes. Utilise l’atténuation des couches pour mieux les repérer.",
  role: "Rôle pendant cet exercice", partial: "Visualisation anatomique partielle", unavailable: "Non directement visualisé dans cet atlas", simplified: "Repères simplifiés : les muscles profonds ou sans zone distincte restent consultables dans la liste.",
  notSupported: "La visualisation anatomique n’est pas disponible pour cet exercice. La fiche classique reste accessible.",
  standing: "Atlas debout de repérage musculaire ; il ne simule pas la posture ni le mouvement de l’exercice.",
  unknownLevel: "Niveau indicatif : non documenté", unknownEquipment: "Équipement non documenté",
  classification: "Rôles pédagogiques selon la variante décrite, sans mesure d’activation. Une revue anatomique professionnelle reste à compléter.",
};
type Copy = Record<keyof typeof fr, string>;
const en: Copy = {
  deep: "This group includes deep structures. Use layer fading to locate them more clearly.",
  role: "Role during this exercise", partial: "Partial anatomical visualization", unavailable: "Not directly visualized in this atlas", simplified: "Simplified landmarks: deep muscles and groups without a separate region remain available in the list.",
  notSupported: "Anatomical visualization is unavailable for this exercise. The classic exercise sheet remains accessible.",
  standing: "Standing muscle reference atlas; it does not simulate exercise posture or movement.",
  unknownLevel: "Indicative level: undocumented", unknownEquipment: "Equipment undocumented",
  classification: "Educational roles for the described variation, without activation measurements. Professional anatomical review remains pending.",
};
const ar: Copy = {
  deep: "تتضمن هذه المجموعة بنى عميقة. استخدم تخفيف الطبقات لتحديدها بوضوح أكبر.",
  role: "الدور أثناء هذا التمرين", partial: "عرض تشريحي جزئي", unavailable: "غير معروضة مباشرة في هذا الأطلس", simplified: "معالم مبسطة؛ تبقى العضلات العميقة والمجموعات دون منطقة مستقلة متاحة في القائمة.",
  notSupported: "العرض التشريحي غير متاح لهذا التمرين. تبقى بطاقة التمرين التقليدية متاحة.",
  standing: "أطلس واقف لتحديد العضلات، لا يحاكي وضعية التمرين أو حركته.",
  unknownLevel: "المستوى التقريبي: غير موثق", unknownEquipment: "المعدات غير موثقة",
  classification: "أدوار تعليمية للطريقة الموصوفة دون قياس التنشيط؛ المراجعة التشريحية المهنية ما زالت مطلوبة.",
};
export function generalAnatomyCopy(language: Language) { return ({ fr, en, ar })[language]; }
