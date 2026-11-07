"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/components/language-provider";
import { resolveExerciseAnatomy, type AnatomyIdentity } from "@/lib/anatomy/identity";
import { SportIcon } from "../ui/sport-icons";

const ExerciseMuscleDialog = dynamic(() => import("./exercise-muscle-dialog"), { ssr: false });
export function ExerciseMuscleButton(props: AnatomyIdentity & { showUnavailable?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = useT();
  const anatomyId = resolveExerciseAnatomy(props);
  if (!anatomyId) return props.showUnavailable ? <p className="sport-description" data-anatomy-unavailable>{t("sport.library.anatomyUnavailable")}</p> : null;
  function close() { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }
  return <><button ref={trigger} type="button" className="sport-button sport-button-secondary anatomy-open-button" aria-haspopup="dialog" onClick={() => setOpen(true)} data-anatomy-open={anatomyId}><SportIcon name="anatomy" className="h-4 w-4" />{t("sport.library.targetMuscles")}</button>{open && <ExerciseMuscleDialog key={anatomyId} anatomyId={anatomyId} onClose={close} />}</>;
}
