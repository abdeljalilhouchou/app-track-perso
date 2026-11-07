"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { ExerciseVisualMedia } from "@/lib/exercises/visual-media-types";
import { SportMedia } from "../ui/sport-media";
import { SportCard } from "../ui/sport-primitives";

export function ExerciseVisualTechnique({ media }: { media: ExerciseVisualMedia }) {
  const { language, t } = useLanguage();
  return <SportCard data-visual-technique><p className="font-semibold">{media.variant[language]}</p><ul className="exercise-prose-list mt-3">{media.technicalChecks.map((check, index) => <li key={index}>{check[language]}</li>)}</ul><p className="sport-description mt-3">{t("sport.library.visualScope")}</p></SportCard>;
}

export function ExerciseVisualSequence({ media }: { media: ExerciseVisualMedia }) {
  const { language, t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const positions = [media.startPositionImage, media.endPositionImage].filter((image) => image !== undefined);
  if (positions.length !== 2) return null;
  return <details className="exercise-visual-sequence sport-card" data-exercise-positions onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary>{t("sport.library.movementPositions")}</summary>
    <p className="sport-description mt-3">{media.variant[language]}</p>
    {expanded && <div className="exercise-position-grid">{positions.map((image, index) => <figure key={image.src} className="min-w-0" data-exercise-position={index === 0 ? "start" : "end"}>
      <h3 className="mb-2 font-semibold">{image.label[language]}</h3>
      <SportMedia image={{ src: image.src, alt: image.alt[language], fit: "contain" }} sizes="(max-width: 767px) 100vw, 380px" />
      <figcaption className="sport-description mt-2">{image.caption[language]}</figcaption>
    </figure>)}</div>}
    <p className="sport-description mt-3">{t("sport.library.photoCredit")}</p>
  </details>;
}
