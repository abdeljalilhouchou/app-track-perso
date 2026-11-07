"use client";

import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/components/language-provider";
import type { Discipline } from "@/lib/exercises/types";
import { SportIcon } from "../ui/sport-icons";

const GuideDialog = dynamic(() => import("./exercise-guide-dialog"));

/** The guide opens without navigating or unmounting session/program drafts. */
export function ExerciseGuideButton({ name, discipline = "musculation", exerciseId, exerciseKey, children }: { name: string; discipline?: Discipline; exerciseId?: string; exerciseKey?: string; children?: ReactNode }) {
  const [opening, setOpening] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = useT();
  function close() { setOpening(null); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })); }
  return <><button ref={trigger} type="button" className={`exercise-guide-button${children ? " exercise-inline-thumbnail exercise-photo-trigger" : ""}`} aria-label={t("sport.library.openGuide", { name })} aria-haspopup="dialog" data-exercise-thumbnail={children ? "" : undefined} data-exercise-thumbnail-trigger={children ? exerciseKey : undefined} onClick={(event) => { event.stopPropagation(); setOpening({ left: window.scrollX, top: window.scrollY }); }}>{children ?? <><SportIcon name="info" className="h-4 w-4" /><span className="sr-only">{t("sport.library.guide")}</span></>}</button>
    {opening && <GuideDialog name={name} discipline={discipline} exerciseId={exerciseId} exerciseKey={exerciseKey} returnScroll={opening} onClose={close} />}</>;
}
