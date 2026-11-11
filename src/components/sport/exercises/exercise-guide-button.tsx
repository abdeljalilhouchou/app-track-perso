"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/components/language-provider";
import type { Discipline } from "@/lib/exercises/types";
import type { ExerciseSheetTab } from "./exercise-premium-detail";
import { SportIcon } from "../ui/sport-icons";

const GuideDialog = dynamic(() => import("./exercise-guide-dialog"));

/** The guide opens without navigating or unmounting session/program drafts. */
export function ExerciseGuideButton({ name, discipline = "musculation", exerciseId, exerciseKey, children, label, initialTab }: { name: string; discipline?: Discipline; exerciseId?: string; exerciseKey?: string; children?: ReactNode; label?: string; initialTab?: ExerciseSheetTab }) {
  const [opening, setOpening] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const t = useT();
  // Restore after the child dialog has unmounted and released modal inertness.
  // Focusing in the close handler can run before React commits that removal.
  useEffect(() => {
    if (opening) { wasOpen.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    trigger.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [opening]);
  function close() { setOpening(null); }
  return <><button ref={trigger} type="button" className={`exercise-guide-button${children ? " exercise-inline-thumbnail exercise-photo-trigger" : ""}${label ? " exercise-guide-action sport-button sport-button-secondary" : ""}`} aria-label={t("sport.library.openGuide", { name })} aria-haspopup="dialog" data-exercise-thumbnail={children ? "" : undefined} data-exercise-thumbnail-trigger={children ? exerciseKey : undefined} onClick={(event) => { event.stopPropagation(); setOpening({ left: window.scrollX, top: window.scrollY }); }}>{children ?? <><SportIcon name={label ? "program" : "info"} className="h-4 w-4" />{label ?? <span className="sr-only">{t("sport.library.guide")}</span>}</>}</button>
    {opening && <GuideDialog name={name} discipline={discipline} exerciseId={exerciseId} exerciseKey={exerciseKey} initialTab={initialTab} returnScroll={opening} onClose={close} />}</>;
}
