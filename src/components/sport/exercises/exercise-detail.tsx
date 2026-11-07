"use client";

import { useId } from "react";
import { useLanguage } from "@/components/language-provider";
import { muscleGroupI18nPath } from "@/lib/strength";
import type { ExerciseDetail as Detail } from "@/lib/exercises/types";
import { SportBadge, SportCard, SportEmptyState, SportSectionHeading } from "../ui/sport-primitives";
import { SportMedia } from "../ui/sport-media";
import { MovementSketch } from "./movement-sketch";
import { MuscleMap } from "./muscle-map";
import { ExerciseDemonstration } from "./exercise-demonstration";
import { ExerciseMuscleButton } from "../anatomy/exercise-muscle-button";
import { ExerciseVisualSequence, ExerciseVisualTechnique } from "./exercise-visual-sequence";
import { ExercisePerformance } from "./exercise-performance";
import { ExercisePremiumDetail } from "./exercise-premium-detail";
import { isMediaExperiencePilot } from "@/lib/exercises/media-experience";

export function ExerciseDetailContent({ data }: { data: Detail }) {
  if (data.media && isMediaExperiencePilot(data.exercise.key)) return <ExercisePremiumDetail key={data.exercise.key} data={data} />;
  return <ClassicExerciseDetail data={data} />;
}

function ClassicExerciseDetail({ data }: { data: Detail }) {
  const { t } = useLanguage();
  const id = useId();
  const l = (key: string) => t(`sport.library.${key}`);
  const { exercise, text, media } = data;
  const equipment = media?.illustratedEquipment ?? exercise.equipment;
  const muscleLabel = (value: string) => { const key = muscleGroupI18nPath(value); return key ? t(key) : value; };
  const primary = data.muscles?.primary ?? exercise.primary.map(muscleLabel), secondary = data.muscles?.secondary ?? exercise.secondary.map(muscleLabel);
  return <div className="exercise-detail space-y-5" data-exercise-detail>
    <ExerciseMuscleButton name={exercise.name} exerciseKey={exercise.key} origin={exercise.origin} discipline={exercise.discipline} showUnavailable />
    <figure className="overflow-hidden rounded-2xl border border-border"><SportMedia image={exercise.image} fallback={<MovementSketch id={exercise.guideId} />} sizes="(max-width: 768px) 100vw, 760px" /><figcaption className="bg-surface-muted px-4 py-2 text-xs text-foreground-muted">{l(exercise.image ? "photoCredit" : "illustration")}</figcaption></figure>
    {media?.startPositionImage && <ExerciseVisualSequence key={media.exerciseId} media={media} />}
    <dl className="exercise-facts"><div><dt>{l(media ? "illustratedEquipment" : "equipment")}</dt><dd>{equipment.length ? equipment.map((item) => l(`materials.${item}`)).join(" · ") : l("unknown")}</dd></div><div><dt>{l("level")}</dt><dd>{exercise.level ? l(`levels.${exercise.level}`) : l("unknown")}</dd></div></dl>
    <nav aria-label={l("guide")} className="exercise-section-links">{["technique", "muscles", "mistakes", "tips"].map((item) => <a key={item} href={`#${id}-${item}`}>{l(item)}</a>)}</nav>
    <section id={`${id}-technique`} className="scroll-mt-6"><SportSectionHeading title={l("technique")} />
      {text ? <SportCard><p className="sport-description">{text.description}</p><h3 className="mt-4 font-semibold">{l("objective")}</h3><p className="sport-description mt-1">{text.objective}</p><ol className="exercise-steps mt-5">{(["preparation", "position", "execution", "return"] as const).map((item, index) => <li key={item}><span aria-hidden="true">{index + 1}</span><div><h3 className="font-semibold">{l(item)}</h3><p className="sport-description mt-1">{text[item]}</p></div></li>)}</ol></SportCard>
        : media?.technicalChecks.length ? <ExerciseVisualTechnique media={media} /> : <SportEmptyState title={l("missingGuide")} description={l("missingGuideBody")} icon="info" />}
      {!text && (exercise.description || exercise.instructions) && <SportCard className="mt-3"><h3 className="font-semibold">{l("savedInstructions")}</h3><p className="sport-description mt-2 whitespace-pre-wrap">{exercise.description}</p><p className="sport-description mt-2 whitespace-pre-wrap">{exercise.instructions}</p></SportCard>}
    </section>
    <section><SportCard><h2 className="mb-3 font-semibold">{l("demonstration")}</h2><ExerciseDemonstration /></SportCard></section>
    <section id={`${id}-muscles`} className="scroll-mt-6"><SportSectionHeading title={l("muscles")} /><SportCard><div className="grid gap-4 sm:grid-cols-2">{[["primary", primary], ["secondary", secondary]].map(([kind, values]) => <div key={kind as string}><h3 className="text-sm font-semibold">{l(kind as string)}</h3><div className="mt-2 flex flex-wrap gap-2">{(values as string[]).length ? (values as string[]).map((item) => <SportBadge key={item} tone={kind === "primary" ? "sport" : "accent"}>{item}</SportBadge>) : <p className="sport-description">{l(kind === "primary" ? "unknown" : "noSecondary")}</p>}</div></div>)}</div><div className="mt-6"><MuscleMap guideId={exercise.guideId} primary={primary} secondary={secondary} /></div></SportCard></section>
    <section id={`${id}-mistakes`} className="scroll-mt-6"><SportSectionHeading title={l("mistakes")} /><SportCard>{text ? <ul className="exercise-prose-list">{text.mistakes.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="sport-description">{l("missingGuide")}</p>}</SportCard></section>
    <section id={`${id}-tips`} className="scroll-mt-6"><SportSectionHeading title={l("tips")} /><SportCard>{text ? <><dl className="exercise-advice">{(["breathing", "range", "tempo"] as const).map((item) => <div key={item}><dt>{l(item)}</dt><dd>{text[item]}</dd></div>)}</dl><h3 className="mt-5 font-semibold">{l("stability")}</h3><ul className="exercise-prose-list mt-2">{text.tips.map((item) => <li key={item}>{item}</li>)}</ul><div className="exercise-safety mt-5"><h3 className="font-semibold">{l("safety")}</h3><p className="sport-description mt-1">{text.safety}</p></div></> : <p className="sport-description">{l("missingGuide")}</p>}</SportCard></section>
    <ExercisePerformance data={data} />
    {data.sources.length > 0 && <SportCard><h2 className="font-semibold">{l("sources")}</h2><p className="sport-description mt-2">{l("sourceNote")}</p><ul className="mt-3 space-y-2">{data.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="exercise-source-link">{source.title}<span className="sr-only"> ↗</span></a></li>)}</ul></SportCard>}
  </div>;
}
