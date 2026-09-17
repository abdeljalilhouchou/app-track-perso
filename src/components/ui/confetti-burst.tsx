"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Particle = { id: number; x: number; rotate: number; color: string; delay: number; drift: number; shape: number };

const COLORS = ["#f97316", "#8b5cf6", "#10b981", "#f59e0b", "#0ea5e9", "#ef4444", "#a855f7"];

function generateParticles(seed: number): Particle[] {
  return Array.from({ length: 44 }, (_, i) => ({
    id: seed * 1000 + i,
    x: Math.random() * 100,
    rotate: Math.random() * 360,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.25,
    drift: (Math.random() - 0.5) * 160,
    shape: i % 3,
  }));
}

function Burst({ seed }: { seed: number }) {
  const [particles] = useState(() => generateParticles(seed));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1900);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, top: "-5%", left: `${p.x}%`, rotate: 0 }}
          animate={{ opacity: 0, top: "105%", left: `calc(${p.x}% + ${p.drift}px)`, rotate: p.rotate }}
          transition={{ duration: 1.5, delay: p.delay, ease: "easeIn" }}
          className="absolute"
          style={{
            width: p.shape === 0 ? 10 : 7,
            height: p.shape === 1 ? 10 : 7,
            borderRadius: p.shape === 2 ? "50%" : 2,
            background: p.color,
          }}
        />
      ))}
    </>
  );
}

/** Fires a one-shot confetti burst whenever `trigger` changes (increment a counter to re-fire). */
export function ConfettiBurst({ trigger }: { trigger: number }) {
  if (trigger <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-101 overflow-hidden">
      <Burst key={trigger} seed={trigger} />
    </div>
  );
}
