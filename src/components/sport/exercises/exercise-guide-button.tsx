"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/components/language-provider";
import type { Discipline } from "@/lib/exercises/types";
import { SportIcon } from "../ui/sport-icons";

const GuideDialog = dynamic(() => import("./exercise-guide-dialog"));

/** The guide opens without navigating or unmounting session/program drafts. */
export function ExerciseGuideButton({ name, discipline = "musculation", exerciseId }: { name: string; discipline?: Discipline; exerciseId?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = useT();
  function close() { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }
  return <><button ref={trigger} type="button" className="exercise-guide-button" aria-label={t("sport.library.openGuide", { name })} aria-haspopup="dialog" onClick={() => setOpen(true)}><SportIcon name="info" className="h-4 w-4" /><span className="sr-only">{t("sport.library.guide")}</span></button>
    {open && <GuideDialog name={name} discipline={discipline} exerciseId={exerciseId} onClose={close} />}</>;
}
