"use client";

import { useEffect, useRef } from "react";
import { buildStubble, buildWire, features, HOLO_MOODS, type P3 } from "@/lib/holo-face";

const WIRE = buildWire();
const STUBBLE = buildStubble();
const hexToRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/**
 * The holographic head of the mood page. It turns slowly, breathes, blinks, can be turned
 * with a finger, and eases into the expression and colour of `score` (0 = not chosen yet).
 * Drawing stops while it is off screen or the tab is hidden.
 */
export function HoloFace({ score, compact = false, label }: { score: number; compact?: boolean; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef(score);
  const pulseRef = useRef(-10);

  useEffect(() => {
    if (scoreRef.current !== score) pulseRef.current = performance.now() / 1000;
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, frameId = 0, visible = true;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1), r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);
    resize();

    let drag: { x: number; y: number; yaw: number; pitch: number } | null = null, userYaw = 0, userPitch = 0;
    const down = (e: PointerEvent) => { if (compact) return; drag = { x: e.clientX, y: e.clientY, yaw: userYaw, pitch: userPitch }; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!drag) return; userYaw = drag.yaw + (e.clientX - drag.x) * 0.008; userPitch = Math.max(-0.4, Math.min(0.4, drag.pitch + (e.clientY - drag.y) * 0.004)); };
    const up = () => { drag = null; };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

    const dust = Array.from({ length: compact ? 30 : 80 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 2 - 1, s: Math.random() * 1.5 + 0.3 }));
    const start = performance.now();
    let smile = HOLO_MOODS[scoreRef.current]?.smile ?? 0, color = hexToRgb(HOLO_MOODS[scoreRef.current]?.color ?? "#fbbf24"), nextBlink = 2.2;

    const frame = (now: number) => {
      frameId = 0;
      if (!visible || document.hidden) return;
      const t = now / 1000, local = (now - start) / 1000;
      const mood = HOLO_MOODS[scoreRef.current] ?? HOLO_MOODS[0];
      smile += (mood.smile - smile) * 0.07;
      const goal = hexToRgb(mood.color);
      color = color.map((c, i) => c + (goal[i] - c) * 0.06);
      const [r, gC, b] = color.map(Math.round);
      let blink = 0;
      if (!reduce) {
        if (local > nextBlink + 0.15) nextBlink = local + 2.2 + Math.random() * 2.8;
        if (local > nextBlink) blink = Math.sin(((local - nextBlink) / 0.15) * Math.PI);
      }
      if (!drag) { userYaw *= 0.96; userPitch *= 0.96; }
      const sad = Math.max(0, -smile), happy = Math.max(0, smile);
      const yaw = (reduce ? 0.32 : Math.sin(local * 0.42) * 0.5) + userYaw;
      const pitch = (reduce ? 0 : Math.sin(local * 0.31) * 0.05) + sad * 0.17 - happy * 0.05 + userPitch;
      const breathe = reduce ? 0 : Math.sin(local * 1.1) * 0.006;
      const bob = reduce ? 0 : Math.abs(Math.sin(local * (1.3 + happy * 2.6))) * happy * 0.03;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const scale = Math.min(W, H) * (compact ? 0.4 : 0.34) * (1 + breathe), ox = W / 2, oy = H * (compact ? 0.5 : 0.42);
      const project = ([x, y, z]: P3): [number, number, number, number] => {
        const yy = y + bob;
        const X = x * cy + z * sy; let Z = -x * sy + z * cy;
        const Y = yy * cp - Z * sp; Z = yy * sp + Z * cp;
        const f = 3.4 / (3.4 - Z);
        return [ox + X * f * scale, oy - Y * f * scale, Z, yy];
      };

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const p of dust) {
        if (!reduce) { p.y += 0.0006 * p.s; if (p.y > 1) p.y = -1; }
        const [px, py, z] = project([p.x * 1.7, p.y * 1.7, p.z * 1.2]);
        ctx.fillStyle = `rgba(${r},${gC},${b},${0.12 + (0.22 * (z + 1)) / 2})`;
        ctx.fillRect(px, py, p.s, p.s);
      }

      const sweep = reduce ? 9 : 1.25 - ((local * 0.35) % 2.8);
      const ripple = t - pulseRef.current;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const line of WIRE) {
        const pts = line.pts.map(project);
        for (let i = 1; i < pts.length; i++) {
          const z = (pts[i][2] + pts[i - 1][2]) / 2;
          let a = Math.max(0.02, Math.min(0.5, 0.16 + z * 0.32)) * line.w;
          a += Math.max(0, 1 - Math.abs(pts[i][3] - sweep) * 9) * 0.35 * line.w;
          if (ripple < 1.4) a += Math.max(0, 1 - Math.abs(Math.hypot(pts[i][0] - ox, pts[i][1] - oy) / scale - ripple * 1.8) * 4) * 0.6;
          const tint = line.hair ? 0.75 : 1;
          ctx.strokeStyle = `rgba(${Math.round(r * tint)},${Math.round(gC * tint)},${Math.round(b * tint)},${a})`;
          ctx.lineWidth = line.row ? 1 : 0.9;
          ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
        }
      }
      for (const p of STUBBLE) {
        const [px, py, z] = project(p);
        if (z < 0) continue;
        ctx.fillStyle = `rgba(${r},${gC},${b},${0.18 * z + 0.05})`;
        ctx.fillRect(px - 0.6, py - 0.6, 1.2, 1.2);
      }
      const bright = [Math.min(255, r + 80), Math.min(255, gC + 80), Math.min(255, b + 80)].join(",");
      for (const f of features(smile, blink)) {
        const pts = f.pts.map(project);
        const col = f.tear ? "125,211,252" : f.white ? "235,240,255" : bright;
        const facing = Math.max(0, Math.min(1, (pts.reduce((sum, p) => sum + p[2], 0) / pts.length - 0.15) * 2.2));
        if (facing <= 0) continue;
        for (const [lw, alpha] of [[6, 0.12 * f.glow], [3, 0.3 * Math.min(1, f.glow)], [1.4, 0.95]]) {
          ctx.strokeStyle = `rgba(${col},${alpha * facing})`;
          ctx.lineWidth = compact ? lw * 0.7 : lw;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          if (f.solid) { ctx.fillStyle = `rgba(${col},0.9)`; ctx.fill(); }
          ctx.stroke();
        }
      }
      for (let li = 0; li < WIRE.length; li += 2) {
        if (!WIRE[li].row) continue;
        const row = WIRE[li].pts;
        for (let i = 0; i < row.length; i += 4) {
          const [px, py, z] = project(row[i]);
          if (z < 0.15) continue;
          const tw = reduce ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(local * 1.4 + i * 0.7 + li));
          ctx.fillStyle = `rgba(255,255,255,${0.3 * tw * z})`;
          ctx.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      frameId = requestAnimationFrame(frame);
    };
    const resume = () => { if (!frameId && visible && !document.hidden) frameId = requestAnimationFrame(frame); };
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
    seen.observe(canvas);
    document.addEventListener("visibilitychange", resume);
    resume();
    return () => {
      cancelAnimationFrame(frameId);
      sizeObserver.disconnect(); seen.disconnect();
      document.removeEventListener("visibilitychange", resume);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
    };
  }, [compact]);

  return <canvas ref={canvasRef} role="img" aria-label={label} className={compact ? "block h-full w-full" : "mx-auto block aspect-[1/0.92] w-full max-w-[440px] cursor-grab touch-pan-y active:cursor-grabbing"} data-holo-face />;
}
