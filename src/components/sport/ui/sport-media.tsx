"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { useT } from "@/components/language-provider";
import { SportIcon, type SportIconName } from "./sport-icons";

export type SportImageSource = { src: string; alt: string };
type MediaProps = { image?: SportImageSource; ratio?: "landscape" | "wide" | "square"; sizes?: string; icon?: SportIconName; decorative?: boolean; className?: string; loading?: "lazy" | "eager"; fallback?: ReactNode };

function MediaContent({ image, ratio = "landscape", sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw", icon = "image", decorative = false, className, loading = "lazy", fallback: replacement }: MediaProps) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const fallback = !image || !image.src.trim() || failed;
  return <div className={clsx("sport-media", `sport-media-${ratio}`, className)} role={fallback && !decorative ? "img" : undefined} aria-label={fallback && !decorative ? t("sport.ui.mediaUnavailable") : undefined}>
    <span aria-hidden="true" className="sport-media-placeholder">{fallback && replacement ? replacement : <><SportIcon name={icon} className="h-8 w-8" />{fallback && !decorative && <span>{t("sport.ui.mediaUnavailable")}</span>}</>}</span>
    {!fallback && <Image src={image.src} alt={decorative ? "" : image.alt} fill sizes={sizes} loading={loading} className="object-cover" onError={() => setFailed(true)} />}
  </div>;
}

export function SportMedia(props: MediaProps) {
  // Changing a source retries it without resetting errors on every render.
  return <MediaContent key={props.image?.src ?? "no-image"} {...props} />;
}
