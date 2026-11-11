"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { Discipline, ExerciseDetail } from "@/lib/exercises/types";
import { SportButton, SportErrorState, SportLink } from "../ui/sport-primitives";
import { ExerciseDetailContent } from "./exercise-detail";
import type { ExerciseSheetTab } from "./exercise-premium-detail";
import { hasExerciseMediaExperience } from "@/lib/exercises/media-experience";
import { muscleGroupI18nPath } from "@/lib/strength";
import { SportMedia } from "../ui/sport-media";
import { SportIcon } from "../ui/sport-icons";

export default function ExerciseGuideDialog({ name, discipline, exerciseId, exerciseKey, initialTab, returnScroll, onClose }: { name: string; discipline: Discipline; exerciseId?: string; exerciseKey?: string; initialTab?: ExerciseSheetTab; returnScroll?: { left: number; top: number }; onClose: () => void }) {
  const { t, dir } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [data, setData] = useState<ExerciseDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const premium = hasExerciseMediaExperience(data?.exercise.key ?? exerciseKey ?? "");
  const query = new URLSearchParams({ name, discipline, ...(exerciseId ? { exerciseId } : {}), ...(exerciseKey ? { key: exerciseKey } : {}) }).toString();
  function close() {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(onClose, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
  }
  useEffect(() => {
    const panel = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const scroll = returnScroll ?? { left: window.scrollX, top: window.scrollY };
    panel?.showModal();
    // A static heading keeps the start of long content in view on opening.
    heading.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      panel?.close(); document.body.style.overflow = previousOverflow;
      // Native dialog focus restoration and scroll anchoring finish at the next layout.
      // Restore again after that layout, including when a nested 3D dialog was used.
      window.scrollTo({ ...scroll, behavior: "instant" });
      requestAnimationFrame(() => window.scrollTo({ ...scroll, behavior: "instant" }));
    };
  }, [returnScroll]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/sport/exercise-guide?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("guide"); return response.json() as Promise<ExerciseDetail>; })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [query, attempt]);
  const muscleNames = data?.exercise.primary.map((group) => { const key = muscleGroupI18nPath(group); return key ? t(key) : group; }) ?? [];
  const equipment = data?.media?.illustratedEquipment ?? data?.exercise.equipment ?? [];
  return <dialog ref={dialog} dir={dir} className={`sport-ui exercise-guide-dialog${premium ? " exercise-premium-dialog" : ""}${expanded ? " is-expanded" : ""}${closing ? " is-closing" : ""}`} data-exercise-guide-dialog aria-label={t("sport.library.openGuide", { name })} onCancel={(event) => { if (event.target !== dialog.current) return; event.preventDefault(); event.stopPropagation(); close(); }} onClose={(event) => event.stopPropagation()} onClick={(event) => {
    if (event.target !== dialog.current) return;
    const rect = dialog.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  }}>
    <div className="exercise-guide-dialog-header">
      {premium && <button type="button" className="exercise-sheet-handle" aria-label={t(`sport.library.${expanded ? "collapseGuide" : "expandGuide"}`)} aria-expanded={expanded} data-guide-expand
        onClick={() => { if (dragged.current) { dragged.current = false; return; } setExpanded((value) => !value); }}
        onPointerDown={(event) => { if (event.isPrimary) { dragged.current = false; dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); } }}
        onPointerCancel={() => { dragStart.current = null; }}
        onPointerUp={(event) => { const from = dragStart.current; dragStart.current = null; if (from !== null && Math.abs(event.clientY - from) > 35) { dragged.current = true; setExpanded(event.clientY < from); event.preventDefault(); } }}><span aria-hidden="true" /></button>}
      <div className="exercise-sheet-heading">
        {premium && data?.exercise.thumbnail && <div className="exercise-sheet-thumbnail"><SportMedia image={data.exercise.thumbnail} ratio="square" sizes="64px" decorative /></div>}
        <div className="min-w-0 flex-1">{!premium && <p className="sport-description text-xs">{t("sport.library.guide")}</p>}<h2 ref={heading} tabIndex={-1}>{data?.exercise.name ?? name}</h2>{premium && <p className="exercise-sheet-subtitle">{[...muscleNames, ...equipment.map((item) => t(`sport.library.materials.${item}`))].join(" · ")}</p>}</div>
        <SportButton variant="secondary" onClick={close} aria-label={t("sport.library.closeGuide")} data-guide-close><SportIcon name="close" /></SportButton>
      </div>
    </div>
    <div className="exercise-guide-dialog-body p-4 sm:p-6">{failed ? <SportErrorState title={t("sport.library.failed")} action={<SportButton onClick={() => { setFailed(false); setData(null); setAttempt((current) => current + 1); }}>{t("sport.library.retry")}</SportButton>} />
      : data ? <><ExerciseDetailContent data={data} initialTab={initialTab} /><SportLink prefetch={false} className="mt-5" href={data.exercise.key === "unlisted" ? `/sport/exercises/lookup?${query}` : `/sport/exercises/${encodeURIComponent(data.exercise.key)}`} target="_blank" rel="noopener noreferrer">{t("sport.library.fullPage")} ↗</SportLink></>
        : <p role="status" className="sport-description">{t("sport.library.loading")}</p>}</div>
  </dialog>;
}
