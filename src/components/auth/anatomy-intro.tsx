"use client";

import { useEffect, useRef, useState } from "react";
import { createIntroScene, INTRO_STEPS, introTimeline, type IntroKind, type IntroScene, type MuscleKey } from "./anatomy-intro-scene";

export type IntroTexts = { status: string; skip: string; muscles: Record<MuscleKey, string> };

/**
 * Full-screen sign-in / sign-out intro. It plays to the end (or until tapped) and only
 * then lets the destination page show: `ready` tells it the navigation has landed.
 * Loaded on demand, so Three.js and the model never weigh on the login page itself.
 */
export default function AnatomyIntro({ kind, texts, ready, onFinished }: { kind: IntroKind; texts: IntroTexts; ready: boolean; onFinished: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const lines = useRef<(SVGPolylineElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const bar = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [brand, setBrand] = useState(false);
  const [ended, setEnded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(onFinished);
  useEffect(() => { finished.current = onFinished; }, [onFinished]);

  useEffect(() => {
    const controller = new AbortController();
    const timeline = introTimeline(kind);
    const root = getComputedStyle(document.documentElement);
    const dark = document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    let scene: IntroScene | null = null;
    let frame = 0;
    let observer: ResizeObserver | null = null;
    createIntroScene(canvas.current!, { timeline, dark, accent: root.getPropertyValue("--accent").trim() || "#6366f1", signal: controller.signal })
      .then((created) => {
        scene = created;
        const box = stage.current!;
        observer = new ResizeObserver(() => scene?.resize(box.clientWidth, box.clientHeight));
        observer.observe(box);
        scene.resize(box.clientWidth, box.clientHeight);
        setLoaded(true);
        const start = performance.now();
        const tick = (now: number) => {
          const t = now - start;
          const anchors = scene!.frame(t);
          const width = box.clientWidth;
          anchors.forEach((anchor, index) => {
            const label = labels.current[index], line = lines.current[index], dot = dots.current[index];
            if (!label || !line || !dot) return;
            label.dataset.on = String(anchor.visible > 0.5);
            const opacity = String(Math.min(anchor.lit, anchor.visible));
            line.style.opacity = dot.style.opacity = opacity;
            if (!anchor.visible) return;
            label.style.top = `${anchor.y}px`;
            const left = INTRO_STEPS[index].side === "left";
            const edge = left ? 10 + label.offsetWidth : width - 10 - label.offsetWidth;
            line.setAttribute("points", `${edge},${anchor.y} ${left ? edge + 14 : edge - 14},${anchor.y} ${anchor.x},${anchor.y}`);
            dot.setAttribute("cx", String(anchor.x)); dot.setAttribute("cy", String(anchor.y));
          });
          if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, t / timeline.end)})`;
          if (t >= timeline.brand) setBrand(true);
          if (t >= timeline.end) { setEnded(true); return; }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        // Without WebGL or the model, keep the plain brand screen until the page is ready.
        if (!controller.signal.aborted) { setBrand(true); setEnded(true); }
      });
    return () => { controller.abort(); cancelAnimationFrame(frame); observer?.disconnect(); scene?.dispose(); };
  }, [kind]);

  // Leave once the sequence is over (or skipped) and the destination has loaded.
  useEffect(() => {
    if (!ended || !ready) return;
    const leave = window.setTimeout(() => setLeaving(true), 0);
    const done = window.setTimeout(() => finished.current(), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450);
    return () => { window.clearTimeout(leave); window.clearTimeout(done); };
  }, [ended, ready]);

  useEffect(() => {
    const skip = (event: KeyboardEvent) => { if (["Escape", "Enter", " "].includes(event.key)) { event.preventDefault(); setBrand(true); setEnded(true); } };
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, []);

  return <div ref={stage} className="anatomy-intro" data-leaving={leaving || undefined} role="status" aria-live="polite" aria-label={texts.status} onPointerDown={() => { setBrand(true); setEnded(true); }}>
    <canvas ref={canvas} aria-hidden="true" data-loaded={loaded || undefined} />
    <svg aria-hidden="true">{INTRO_STEPS.map((step, index) => <g key={step.key}><polyline ref={(node) => { lines.current[index] = node; }} className="anatomy-intro-lead" /><circle ref={(node) => { dots.current[index] = node; }} className="anatomy-intro-dot" r="3" /></g>)}</svg>
    {INTRO_STEPS.map((step, index) => <span key={step.key} ref={(node) => { labels.current[index] = node; }} className="anatomy-intro-label" data-side={step.side} aria-hidden="true">{texts.muscles[step.key]}</span>)}
    <div className="anatomy-intro-brand" data-on={brand || !loaded || undefined}>
      <p className="anatomy-intro-logo">track<span>.perso</span></p>
      <p className="anatomy-intro-status">{texts.status}</p>
    </div>
    {loaded && !ended && <p className="anatomy-intro-skip">{texts.skip}</p>}
    <span className="anatomy-intro-bar" aria-hidden="true"><span ref={bar} /></span>
  </div>;
}
