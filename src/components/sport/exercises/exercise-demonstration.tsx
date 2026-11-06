"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/language-provider";
import { SportButton } from "../ui/sport-primitives";
import { SportMedia, type SportImageSource } from "../ui/sport-media";

export type ExerciseVideo = { src: string; poster?: SportImageSource; captions?: { src: string; language: string; label: string }; transcript: string };
export function ExerciseDemonstration({ video }: { video?: ExerciseVideo }) {
  const t = useT();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const element = useRef<HTMLVideoElement>(null);
  // Only project-local registered assets can be requested. No implicit third-party embeds.
  const available = video?.src.startsWith("/videos/exercises/") && !video.src.includes("..");
  if (!available || !video) return <p className="sport-description" data-no-exercise-video>{t("sport.library.noVideo")}</p>;
  if (failed) return <div role="status"><p className="sport-description">{t("sport.library.videoError")}</p><SportButton onClick={() => { setFailed(false); setLoaded(false); }}>{t("sport.library.retry")}</SportButton></div>;
  return <div className="space-y-3">
    {loaded ? <><video ref={element} controls playsInline preload="none" poster={video.poster?.src} aria-label={t("sport.library.demonstration")} onError={() => setFailed(true)} className="aspect-video w-full rounded-xl bg-black">
      <source src={video.src} />{video.captions && <track kind="captions" src={video.captions.src} srcLang={video.captions.language} label={video.captions.label} default />}
    </video><SportButton variant="secondary" onClick={() => { if (element.current) { element.current.currentTime = 0; void element.current.play().catch(() => {}); } }}>{t("sport.library.replay")}</SportButton></>
      : <>{video.poster && <SportMedia image={video.poster} ratio="wide" />}<SportButton icon="play" onClick={() => setLoaded(true)}>{t("sport.library.loadVideo")}</SportButton></>}
    <p className="sport-description">{video.transcript}</p>
  </div>;
}
