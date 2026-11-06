"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/components/language-provider";
import { resolveAnatomyPilot } from "@/lib/anatomy/pilots";
import { SportIcon } from "../ui/sport-icons";

const ExerciseMuscleDialog = dynamic(() => import("./exercise-muscle-dialog"), { ssr: false });
export function ExerciseMuscleButton({ name, muscle, guideId }: { name: string; muscle?: string; guideId?: string | null }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = useT();
  const pilot = resolveAnatomyPilot({ name, muscle, guideId });
  if (!pilot) return null;
  function close() { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }
  return <><button ref={trigger} type="button" className="sport-button sport-button-secondary anatomy-open-button" aria-haspopup="dialog" onClick={() => setOpen(true)} data-anatomy-open={pilot}><SportIcon name="anatomy" className="h-4 w-4" />{t("sport.library.targetMuscles")}</button>{open && <ExerciseMuscleDialog onClose={close} />}</>;
}
