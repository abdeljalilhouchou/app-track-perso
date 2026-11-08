"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/components/language-provider";
import type { mediaGalleryFrames } from "@/lib/exercises/media-experience";
import { SportMedia } from "../ui/sport-media";
import { SportIcon } from "../ui/sport-icons";
import { SportButton } from "../ui/sport-primitives";

type Props = {
  frame: ReturnType<typeof mediaGalleryFrames>[number]; name: string; index: number; count: number;
  onMove: (delta: number) => void; onClose: () => void;
};

/** Only mounted on request, above the existing sheet (or full exercise page). */
export default function ExercisePhotoDialog({ frame, name, index, count, onMove, onClose }: Props) {
  const { t, language, dir } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const panel = dialog.current;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sheet = focused?.closest("dialog");
    const sheetScroll = sheet?.scrollTop;
    const previousOverflow = document.body.style.overflow;
    const scroll = { left: window.scrollX, top: window.scrollY };
    panel?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => {
        if (sheet && sheetScroll !== undefined) sheet.scrollTop = sheetScroll;
        window.scrollTo({ ...scroll, behavior: "instant" });
      });
    };
  }, []);
  function close() { dialog.current?.close(); onClose(); }
  return <dialog ref={dialog} dir={dir} className="sport-ui exercise-photo-dialog" data-photo-dialog aria-label={t("sport.library.photoGallery", { name })}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); close(); }}
    onClose={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      // Do not let arrows bubble to the gallery and advance twice.
      event.stopPropagation();
      const delta = event.key === "ArrowRight" ? (dir === "rtl" ? -1 : 1) : event.key === "ArrowLeft" ? (dir === "rtl" ? 1 : -1) : 0;
      if (delta && count > 1) { event.preventDefault(); onMove(delta); }
    }}
    onClick={(event) => {
      if (event.target !== dialog.current) return;
      const rect = dialog.current.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}>
    <header><div><h2>{name}</h2><p className="sport-description" aria-live="polite">{frame.label[language]}{count > 1 && ` · ${(index + 1).toLocaleString(language)} / ${count.toLocaleString(language)}`}</p></div><SportButton variant="secondary" aria-label={t("sport.library.closePhoto")} onClick={close} data-photo-close><SportIcon name="close" /></SportButton></header>
    <div className="exercise-photo-full" key={frame.src}><SportMedia image={{ src: frame.src, alt: frame.alt[language], fit: "contain" }} sizes="(max-width: 960px) 100vw, 960px" loading="eager" /></div>
    <footer>{count > 1 && <SportButton variant="secondary" onClick={() => onMove(-1)} aria-label={t("sport.library.previousPhoto")}><SportIcon name="chevron" className="exercise-gallery-prev-icon h-5 w-5" /></SportButton>}<p className="sport-description">{frame.caption[language]}</p>{count > 1 && <SportButton variant="secondary" onClick={() => onMove(1)} aria-label={t("sport.library.nextPhoto")}><SportIcon name="chevron" className="exercise-gallery-next-icon h-5 w-5" /></SportButton>}</footer>
  </dialog>;
}
