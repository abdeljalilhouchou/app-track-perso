"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { anatomyCopy } from "@/lib/anatomy/copy";
import { type AnatomyViewCommand, type MuscleGroupId, type WorkingSide } from "@/lib/anatomy/rowing";
import type { AnatomySceneController, SceneOptions } from "./anatomy-engine";
import { AnatomyFallback } from "./anatomy-fallback";
import { SportButton } from "../ui/sport-primitives";

const subscribeDark = (callback: () => void) => { const media = matchMedia("(prefers-color-scheme: dark)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); };
const subscribeMotion = (callback: () => void) => { const media = matchMedia("(prefers-reduced-motion: reduce)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); };
export default function MuscleViewer3D({ side, selected, onSelect, colors, xray, children }: { side: WorkingSide; selected: MuscleGroupId | null; onSelect: (id: MuscleGroupId) => void; colors: boolean; xray: boolean; children?: ReactNode }) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const copy = anatomyCopy(language).ui;
  const systemDark = useSyncExternalStore(subscribeDark, () => matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const dark = theme === "dark" || theme === "system" && systemDark;
  const [status, setStatus] = useState<"loading" | "ready" | "webgl" | "model">("loading");
  const [manual2d, setManual2d] = useState(false);
  const [back2d, setBack2d] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const element = useRef<HTMLDivElement>(null);
  const engine = useRef<AnatomySceneController | null>(null);
  const current = useRef<SceneOptions>({ side, selected, colors, xray, dark, reducedMotion });
  const selection = useRef(onSelect);
  useEffect(() => { selection.current = onSelect; }, [onSelect]);
  useEffect(() => { current.current = { side, selected, colors, xray, dark, reducedMotion }; engine.current?.update(current.current); }, [side, selected, colors, xray, dark, reducedMotion]);
  useEffect(() => {
    if (manual2d || !element.current) return;
    const target = element.current;
    const controller = new AbortController();
    void import("./anatomy-engine").then(async ({ createAnatomyScene }) => {
      if (controller.signal.aborted) return;
      const scene = await createAnatomyScene(target, current.current, (id) => selection.current(id), controller.signal, () => { engine.current = null; setStatus("webgl"); });
      if (controller.signal.aborted) { scene.dispose(); return; }
      engine.current = scene; scene.update(current.current); setStatus("ready");
    }).catch((error: { kind?: string }) => { if (!controller.signal.aborted) setStatus(error.kind === "webgl" ? "webgl" : "model"); });
    return () => { controller.abort(); engine.current?.dispose(); engine.current = null; };
  }, [attempt, manual2d]);
  const fallback = manual2d || status === "webgl" || status === "model";
  function command(value: AnatomyViewCommand) {
    if (fallback) { if (value === "front") setBack2d(false); else if (value === "back" || value === "reset") setBack2d(true); return; }
    engine.current?.command(value);
  }
  function retry() { setStatus("loading"); setManual2d(false); setAttempt((current) => current + 1); }
  return <div data-anatomy-viewer data-anatomy-status={fallback ? "fallback" : status} className="anatomy-viewer">
    {fallback && <div role="status" className="anatomy-fallback-notice"><strong>{copy.fallback}</strong><p>{manual2d ? copy.fallbackBody : `${status === "webgl" ? copy.webglFailed : copy.modelFailed} ${copy.fallbackBody}`}</p></div>}
    <div className="anatomy-viewport">
      {fallback ? <div className="anatomy-stage anatomy-stage-2d"><AnatomyFallback back={back2d} side={side} selected={selected} onSelect={onSelect} colors={colors} dark={dark} /></div>
        : <div ref={element} className="anatomy-stage" role="img" aria-label={copy.viewer}>{status === "loading" && <p className="anatomy-loading" role="status">{copy.loading}</p>}</div>}
      {!fallback && <>
        <div className="anatomy-floating-tools anatomy-floating-rotation" role="group" aria-label={copy.viewer}>
          <SportButton variant="secondary" disabled={status !== "ready"} aria-label={copy.rotateLeft} title={copy.rotateLeft} onClick={() => command("left")} data-anatomy-command="left">↶</SportButton>
          <SportButton variant="secondary" disabled={status !== "ready"} aria-label={copy.rotateRight} title={copy.rotateRight} onClick={() => command("right")} data-anatomy-command="right">↷</SportButton>
        </div>
        <div className="anatomy-floating-tools anatomy-floating-zoom" role="group" aria-label={copy.viewer}>
          <SportButton variant="secondary" disabled={status !== "ready"} icon="plus" aria-label={copy.zoomIn} title={copy.zoomIn} onClick={() => command("zoomIn")} data-anatomy-command="zoomIn" />
          <SportButton variant="secondary" disabled={status !== "ready"} icon="minus" aria-label={copy.zoomOut} title={copy.zoomOut} onClick={() => command("zoomOut")} data-anatomy-command="zoomOut" />
          <SportButton variant="secondary" disabled={status !== "ready"} icon="retry" aria-label={copy.reset} title={copy.reset} onClick={() => command("reset")} data-anatomy-command="reset" />
        </div>
      </>}
    </div>
    <div className="anatomy-view-controls" role="group" aria-label={copy.viewer}>
      <SportButton variant="secondary" disabled={!fallback && status !== "ready"} onClick={() => command("front")} data-anatomy-command="front">{copy.front}</SportButton>
      <SportButton variant="secondary" disabled={!fallback && status !== "ready"} onClick={() => command("back")} data-anatomy-command="back">{copy.back}</SportButton>
      {!fallback ? <SportButton variant="secondary" disabled={status !== "ready"} onClick={() => command("fullBody")} data-anatomy-command="fullBody">{copy.fullBody}</SportButton>
        : <SportButton variant="ghost" icon="retry" aria-label={copy.reset} title={copy.reset} onClick={() => command("reset")} data-anatomy-command="reset" />}
    </div>
    {children}
    <p className="sport-description anatomy-gesture">{fallback ? copy.fallbackBody : copy.gesture}</p>
    <div className="anatomy-mode-control">{fallback ? <SportButton variant="ghost" onClick={retry}>{manual2d ? copy.show3d : copy.retry}</SportButton> : <SportButton variant="ghost" onClick={() => setManual2d(true)}>{copy.show2d}</SportButton>}</div>
  </div>;
}
