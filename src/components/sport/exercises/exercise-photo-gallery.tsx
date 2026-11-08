"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language-provider";
import type { ExerciseVisualMedia } from "@/lib/exercises/visual-media-types";
import { mediaGalleryFrames } from "@/lib/exercises/media-experience";
import { SportMedia } from "../ui/sport-media";
import { SportButton } from "../ui/sport-primitives";
import { MovementSketch } from "./movement-sketch";
import { SportIcon } from "../ui/sport-icons";

const PhotoDialog = dynamic(() => import("./exercise-photo-dialog"));

/** The registered photographs only; a single frame never becomes a carousel. */
export function ExercisePhotoGallery({ media, guideId, name }: { media: ExerciseVisualMedia; guideId: string | null; name: string }) {
  const { t, language, dir } = useLanguage();
  const frames = mediaGalleryFrames(media);
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const enlargeTrigger = useRef<HTMLButtonElement>(null);
  const wasEnlarged = useRef(false);
  useEffect(() => {
    if (enlarged) { wasEnlarged.current = true; return; }
    if (!wasEnlarged.current) return;
    wasEnlarged.current = false;
    enlargeTrigger.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => enlargeTrigger.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [enlarged]);
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  const active = frames[index] ?? frames[0];
  const multiple = frames.length > 1;
  function move(delta: number) { setIndex((value) => (value + delta + frames.length) % frames.length); }
  function keyboard(event: KeyboardEvent) {
    if (!multiple) return;
    const delta = event.key === "ArrowRight" ? (dir === "rtl" ? -1 : 1) : event.key === "ArrowLeft" ? (dir === "rtl" ? 1 : -1) : 0;
    if (delta) { event.preventDefault(); move(delta); }
    else if (event.key === "Home" || event.key === "End") { event.preventDefault(); setIndex(event.key === "Home" ? 0 : frames.length - 1); }
  }
  function down(event: PointerEvent) {
    start.current = multiple && event.pointerType === "touch" && event.isPrimary ? { x: event.clientX, y: event.clientY, time: performance.now() } : null;
  }
  function up(event: PointerEvent) {
    const point = start.current; start.current = null;
    if (!point || performance.now() - point.time > 800) return;
    const x = point.x - event.clientX, y = point.y - event.clientY;
    if (Math.abs(x) >= 50 && Math.abs(x) > Math.abs(y) * 1.3) move((x > 0 ? 1 : -1) * (dir === "rtl" ? -1 : 1));
  }
  return <section className="exercise-photo-gallery" aria-label={t("sport.library.photoGallery", { name })} onKeyDown={keyboard} data-photo-gallery data-gallery-index={index} data-gallery-src={active?.src}>
    <figure className="exercise-gallery-frame" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { start.current = null; }}>
      <div key={active?.src ?? "missing"} className="exercise-gallery-image" data-gallery-main><SportMedia image={active ? { src: active.src, alt: active.alt[language], fit: "contain" } : undefined} fallback={<MovementSketch id={guideId} />} sizes="(max-width: 767px) 100vw, 760px" /></div>
      <figcaption className="exercise-gallery-caption" aria-live="polite" aria-atomic="true"><span className="exercise-gallery-marker" aria-hidden="true" /><strong data-gallery-label>{active?.label[language] ?? t("sport.library.illustration")}</strong></figcaption>
      {active && <button ref={enlargeTrigger} type="button" className="exercise-gallery-enlarge" aria-label={t("sport.library.enlargePhoto")} aria-haspopup="dialog" onClick={() => setEnlarged(true)} data-gallery-enlarge><SportIcon name="expand" /></button>}
    </figure>
    {active?.caption[language] && <p className="sport-description exercise-gallery-description">{active.caption[language]}</p>}
    {multiple && <div className="exercise-gallery-controls">
      <SportButton variant="secondary" onClick={() => move(-1)} aria-label={t("sport.library.previousPhoto")} data-gallery-previous><SportIcon name="chevron" className="exercise-gallery-prev-icon h-5 w-5" /></SportButton>
      <div className="exercise-gallery-positions" role="group" aria-label={t("sport.library.movementPositions")}>{frames.map((frame, value) => <button key={frame.src} type="button" aria-pressed={index === value} onClick={() => setIndex(value)} data-gallery-position={value}><SportMedia image={{ src: frame.src, alt: "" }} decorative sizes="128px" /><span>{frame.label[language]}</span></button>)}</div>
      <SportButton variant="secondary" onClick={() => move(1)} aria-label={t("sport.library.nextPhoto")} data-gallery-next><SportIcon name="chevron" className="exercise-gallery-next-icon h-5 w-5" /></SportButton>
    </div>}
    <div className="exercise-gallery-footer"><span>{t("sport.library.photoCredit")}</span>{multiple && <span>{t("sport.library.photoCount", { current: (index + 1).toLocaleString(language), total: frames.length.toLocaleString(language) })}</span>}</div>
    {enlarged && active && <PhotoDialog frame={active} name={name} index={index} count={frames.length} onMove={move} onClose={() => setEnlarged(false)} />}
  </section>;
}
