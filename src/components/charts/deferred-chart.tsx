"use client";

import { Profiler, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/language-provider";

export function ChartPlaceholder() {
  const t = useT();
  return <div role="status" className="flex h-[220px] items-center justify-center rounded-xl bg-surface-muted text-xs text-foreground-muted">{t("common.loading")}</div>;
}

// Hidden tabs don't intersect: avoid downloading/rendering charts until needed.
// Once visible, keep the chart mounted to preserve interactions.
export function DeferredChart({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setReady(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className="min-h-[220px] min-w-0">
    {ready ? process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG === "true" ? (
      <Profiler id="chart" onRender={(_, phase, actualDuration) => {
        console.info("[track-perso:chart]", { phase, durationMs: actualDuration });
      }}>{children}</Profiler>
    ) : children : <ChartPlaceholder />}
  </div>;
}
