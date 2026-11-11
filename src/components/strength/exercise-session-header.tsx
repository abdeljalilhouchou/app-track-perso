"use client";

import { useRef } from "react";
import { useT } from "@/components/language-provider";
import { ExerciseGuideButton } from "@/components/sport/exercises/exercise-guide-button";
import { ExerciseMuscleButton } from "@/components/sport/anatomy/exercise-muscle-button";
import { ExerciseThumbnail } from "@/components/sport/exercises/exercise-thumbnail";
import { SportIcon } from "@/components/sport/ui/sport-icons";

type Props = {
  name: string;
  muscle: string;
  mediaId: string;
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
};

/**
 * Presentation of the premium session card header. It owns no workout data: the
 * session logger keeps the draft, the sets and every handler and passes callbacks in.
 * The thumbnail and the Technique shortcut open the shared guide sheet; the
 * 3D shortcut opens the shared muscle viewer. Nothing here navigates.
 */
export function ExerciseSessionHeader({ name, muscle, mediaId, muscleLabel, equipment, targetText, lastText, hasHistory, canMoveUp, canMoveDown, onMoveUp, onMoveDown, onRemove }: Props) {
  const t = useT();
  const menu = useRef<HTMLDetailsElement>(null);
  const run = (action: () => void) => () => { menu.current?.removeAttribute("open"); action(); };
  return <div className="exercise-session-head" data-exercise-session-head>
    <ExerciseThumbnail name={name} muscle={muscle} large />
    <div className="exercise-session-main">
      <div className="exercise-session-titlebar">
        <p className="exercise-session-title">{name}</p>
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
      <ExerciseGuideButton name={name} exerciseKey={mediaId} label={t("sport.library.technique")} initialTab="technique" />
    </div>
  </div>;
}
