"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { Discipline, ExerciseDetail } from "@/lib/exercises/types";
import { SportButton, SportErrorState, SportLink } from "../ui/sport-primitives";
import { ExerciseDetailContent } from "./exercise-detail";

export default function ExerciseGuideDialog({ name, discipline, exerciseId, onClose }: { name: string; discipline: Discipline; exerciseId?: string; onClose: () => void }) {
  const { t, dir } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<ExerciseDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const query = new URLSearchParams({ name, discipline, ...(exerciseId ? { exerciseId } : {}) }).toString();
  useEffect(() => {
    const panel = dialog.current;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal();
    document.body.style.overflow = "hidden";
    return () => { panel?.close(); document.body.style.overflow = previousOverflow; if (focused?.isConnected) focused.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/sport/exercise-guide?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("guide"); return response.json() as Promise<ExerciseDetail>; })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [query, attempt]);
  return <dialog ref={dialog} dir={dir} className="sport-ui exercise-guide-dialog" aria-label={t("sport.library.openGuide", { name })} onCancel={onClose} onClose={onClose} onClick={(event) => {
    if (event.target !== dialog.current) return;
    const rect = dialog.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>
    <div className="exercise-guide-dialog-header"><h2 className="min-w-0 break-words text-lg font-semibold">{data?.exercise.name ?? name}</h2><SportButton variant="secondary" onClick={onClose} aria-label={t("sport.library.closeGuide")}>×</SportButton></div>
    <div className="p-4 sm:p-6">{failed ? <SportErrorState title={t("sport.library.failed")} action={<SportButton onClick={() => { setFailed(false); setData(null); setAttempt((current) => current + 1); }}>{t("sport.library.retry")}</SportButton>} />
      : data ? <><ExerciseDetailContent data={data} /><SportLink prefetch={false} className="mt-5" href={data.exercise.key === "unlisted" ? `/sport/exercises/lookup?${query}` : `/sport/exercises/${encodeURIComponent(data.exercise.key)}`} target="_blank" rel="noopener noreferrer">{t("sport.library.fullPage")} ↗</SportLink></>
        : <p role="status" className="sport-description">{t("sport.library.loading")}</p>}</div>
  </dialog>;
}
