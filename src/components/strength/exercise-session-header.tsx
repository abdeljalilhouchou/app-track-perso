"use client";

import { useRef, type PointerEvent } from "react";
import { useLanguage } from "@/components/language-provider";
import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import { ExerciseMuscleButton } from "@/components/sport/anatomy/exercise-muscle-button";
import { ExerciseThumbnail } from "@/components/sport/exercises/exercise-thumbnail";
import { exerciseThumbnail } from "@/lib/exercises/media-thumbnails";
import { SportMedia } from "@/components/sport/ui/sport-media";
import { SportIcon } from "@/components/sport/ui/sport-icons";

type Props = {
  name: string;
  muscle: string;
  /** The premium media identity, or null for exercises without one (custom ones included). */
  mediaId: string | null;
  muscleLabel: string;
  equipment: string[];
  targetText: string | null;
  lastText: string;
  hasHistory: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  /** Starts dragging the card; the handle is the only place a drag can begin. */
  onDragStart: (event: PointerEvent) => void;
};

/**
 * Header of every session card. It owns no workout data: the session logger keeps
 * the draft, the sets and every handler and passes callbacks in. The thumbnail and
 * the Technique shortcut open the shared guide sheet; the 3D shortcut opens the
 * shared muscle viewer when the exercise has an anatomy mapping. Nothing navigates.
 */
export function ExerciseSessionHeader({ name, muscle, mediaId, muscleLabel, equipment, targetText, lastText, hasHistory, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onRemove, onDragStart }: Props) {
  const { t, language } = useLanguage();
  const menu = useRef<HTMLDetailsElement>(null);
  const run = (action: () => void) => () => { menu.current?.removeAttribute("open"); action(); };
  const image = mediaId ? null : exerciseThumbnail({ name, muscle }, language);
  return <div className="exercise-session-head" data-exercise-session-head>
    {mediaId
      ? <ExerciseThumbnail name={name} muscle={muscle} large />
      : <ExerciseGuideButton name={name}>
          <span className="exercise-session-placeholder" data-exercise-placeholder={image ? undefined : ""}>
            {image ? <SportMedia image={image} decorative ratio="square" sizes="120px" /> : <SportIcon name="strength" className="h-9 w-9" />}
          </span>
        </ExerciseGuideButton>}
    <div className="exercise-session-main">
      <div className="exercise-session-titlebar">
        <p className="exercise-session-title">{name}</p>
        <button
          type="button"
          className="exercise-session-grip"
          aria-label={t("sport.sessionLogger.dragAria", { name })}
          onPointerDown={(event) => { event.preventDefault(); onDragStart(event); }}
          data-exercise-drag
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" /><circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" /><circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" /></svg>
        </button>
        <details ref={menu} className="exercise-session-menu">
          <summary aria-label={t("sport.library.exerciseActions")}><span aria-hidden="true">⋮</span></summary>
          <div>
            <button type="button" disabled={!canMoveUp} onClick={run(onMoveUp)} aria-label={t("sport.sessionLogger.moveExerciseUpAria")}>▲</button>
            <button type="button" disabled={!canMoveDown} onClick={run(onMoveDown)} aria-label={t("sport.sessionLogger.moveExerciseDownAria")}>▼</button>
            <button type="button" className="is-danger" onClick={run(onRemove)} aria-label={t("sport.sessionLogger.removeExerciseAria")}>✕</button>
          </div>
        </details>
      </div>
      <div className="exercise-session-tags"><span>{muscleLabel}</span>{equipment.map((item) => <span key={item}>{item}</span>)}</div>
      <p className="exercise-session-last" data-has-history={hasHistory}><SportIcon name="stats" className="h-4 w-4" /><span>{lastText}</span></p>
      {targetText && <p className="exercise-session-target">{targetText}</p>}
    </div>
    <div className="exercise-session-quick-actions">
      <ExerciseMuscleButton name={name} muscle={muscle} label={t("sport.library.muscles3D")} />
      <ExerciseGuideButton name={name} exerciseKey={mediaId ?? undefined} label={t("sport.library.technique")} initialTab="technique" />
    </div>
  </div>;
}
