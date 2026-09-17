"use client";

import { motion } from "framer-motion";

type RingData = { label: string; value: number; goal: number | null; unit: string; color: string };

const STROKE_WIDTH = 12;
const GAP = 6;
const OUTER_RADIUS = 88;

function Ring({
  pct,
  radius,
  color,
  delay,
}: {
  pct: number;
  radius: number;
  color: string;
  delay: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <>
      <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth={STROKE_WIDTH} />
      <motion.circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, delay, ease: "easeOut" }}
        transform="rotate(-90 100 100)"
      />
    </>
  );
}

export function MacroRings({ rings }: { rings: RingData[] }) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0">
        {rings.map((r, i) => {
          const radius = OUTER_RADIUS - i * (STROKE_WIDTH + GAP);
          const pct = r.goal ? Math.min(100, Math.round((r.value / r.goal) * 100)) : 0;
          return <Ring key={r.label} pct={pct} radius={radius} color={r.color} delay={i * 0.1} />;
        })}
      </svg>
      <ul className="w-full max-w-xs space-y-2.5">
        {rings.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="text-foreground-muted">{r.label}</span>
            <span className="ml-auto font-semibold text-foreground">
              {r.value}
              {r.goal ? ` / ${r.goal}` : ""} {r.unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
