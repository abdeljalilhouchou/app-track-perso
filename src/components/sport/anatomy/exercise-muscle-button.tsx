"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/components/language-provider";
import { resolveExerciseAnatomy, type AnatomyIdentity } from "@/lib/anatomy/identity";
import { SportIcon } from "../ui/sport-icons";

const ExerciseMuscleDialog = dynamic(() => import("./exercise-muscle-dialog"), { ssr: false });
export function ExerciseMuscleButton(props: AnatomyIdentity & { showUnavailable?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const t = useT();
  const anatomyId = resolveExerciseAnatomy(props);
  useEffect(() => {
    if (open) { wasOpen.current = true; return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    trigger.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  if (!anatomyId) return props.showUnavailable ? <p className="sport-description" data-anatomy-unavailable>{t("sport.library.anatomyUnavailable")}</p> : null;
  function close() { setOpen(false); }
  return <><button ref={trigger} type="button" className="sport-button sport-button-secondary anatomy-open-button" aria-haspopup="dialog" onClick={() => setOpen(true)} data-anatomy-open={anatomyId}><SportIcon name="anatomy" className="h-4 w-4" />{props.label ?? t("sport.library.targetMuscles")}</button>{open && <ExerciseMuscleDialog key={anatomyId} anatomyId={anatomyId} onClose={close} />}</>;
}
