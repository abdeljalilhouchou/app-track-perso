"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { Discipline, ExerciseDetail } from "@/lib/exercises/types";
import { SportButton, SportErrorState, SportLink } from "../ui/sport-primitives";
import { ExerciseDetailContent } from "./exercise-detail";
import { isMediaExperiencePilot } from "@/lib/exercises/media-experience";

export default function ExerciseGuideDialog({ name, discipline, exerciseId, exerciseKey, returnScroll, onClose }: { name: string; discipline: Discipline; exerciseId?: string; exerciseKey?: string; returnScroll?: { left: number; top: number }; onClose: () => void }) {
  const { t, dir } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<ExerciseDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const premium = isMediaExperiencePilot(data?.exercise.key ?? exerciseKey ?? "");
  const query = new URLSearchParams({ name, discipline, ...(exerciseId ? { exerciseId } : {}), ...(exerciseKey ? { key: exerciseKey } : {}) }).toString();
  useEffect(() => {
    const panel = dialog.current;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const scroll = returnScroll ?? { left: window.scrollX, top: window.scrollY };
    panel?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close(); document.body.style.overflow = previousOverflow;
      if (focused?.isConnected) focused.focus({ preventScroll: true });
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
  return <dialog ref={dialog} dir={dir} className={`sport-ui exercise-guide-dialog${premium ? " exercise-premium-dialog" : ""}${expanded ? " is-expanded" : ""}`} data-exercise-guide-dialog aria-label={t("sport.library.openGuide", { name })} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }} onClose={(event) => { event.stopPropagation(); onClose(); }} onClick={(event) => {
    if (event.target !== dialog.current) return;
    const rect = dialog.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>
    <div className="exercise-guide-dialog-header"><div className="min-w-0 flex-1"><p className="sport-description text-xs">{t("sport.library.guide")}</p><h2 className="break-words text-lg font-semibold">{data?.exercise.name ?? name}</h2></div>{premium && <SportButton variant="ghost" aria-label={t(`sport.library.${expanded ? "collapseGuide" : "expandGuide"}`)} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} data-guide-expand>{expanded ? "↙" : "↗"}</SportButton>}<SportButton variant="secondary" onClick={onClose} aria-label={t("sport.library.closeGuide")} data-guide-close>×</SportButton></div>
    <div className="p-4 sm:p-6">{failed ? <SportErrorState title={t("sport.library.failed")} action={<SportButton onClick={() => { setFailed(false); setData(null); setAttempt((current) => current + 1); }}>{t("sport.library.retry")}</SportButton>} />
      : data ? <><ExerciseDetailContent data={data} /><SportLink prefetch={false} className="mt-5" href={data.exercise.key === "unlisted" ? `/sport/exercises/lookup?${query}` : `/sport/exercises/${encodeURIComponent(data.exercise.key)}`} target="_blank" rel="noopener noreferrer">{t("sport.library.fullPage")} ↗</SportLink></>
        : <p role="status" className="sport-description">{t("sport.library.loading")}</p>}</div>
  </dialog>;
}
