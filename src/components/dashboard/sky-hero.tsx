"use client";

import { useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";
import type { DayBar } from "./home-view";

type Phase = "dawn" | "day" | "dusk" | "night";

// The reader's hour: unknown on the server, so the sky fades in once the phone knows it.
const subscribeHour = (callback: () => void) => {
  const timer = window.setInterval(callback, 60_000);
  return () => window.clearInterval(timer);
};
const useReaderHour = () => useSyncExternalStore<number | null>(subscribeHour, () => new Date().getHours(), () => null);

export function phaseOf(hour: number): Phase {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

const RING = { habits: "var(--habit)", meals: "var(--nutrition)", water: "var(--water)", mood: "var(--mood)" } as const;
const STARS = [[40, 90, 2, 0], [120, 56, 3, 0.8], [200, 128, 2, 1.6], [330, 168, 2, 2.3], [70, 190, 3, 1.2], [168, 36, 2, 2.8], [252, 74, 2, 0.4], [18, 150, 2, 3.1], [290, 220, 3, 1.9], [228, 196, 2, 2.5], [96, 24, 2, 1.4]] as const;
const CLOUDS = [[104, 120, 28, 70, -38, 1], [176, 86, 22, 95, -70, 0.85], [236, 150, 32, 120, -20, 0.9], [60, 70, 18, 140, -100, 0.6]] as const;

function Sun({ phase }: { phase: Phase }) {
  return <span className={`sky-sun sky-sun-${phase}`} aria-hidden>
    <span className="sky-rays" />
    <span className="sky-halo" />
    <span className="sky-sun-core" />
  </span>;
}

function Moon() {
  return <span className="sky-moon" aria-hidden>
    <span className="sky-moon-halo" />
    <span className="sky-moon-core">
      <span style={{ left: 18, top: 22, width: 14, height: 14 }} />
      <span style={{ left: 44, top: 40, width: 20, height: 20 }} />
      <span style={{ left: 30, top: 56, width: 9, height: 9 }} />
      <span style={{ left: 52, top: 16, width: 7, height: 7 }} />
    </span>
  </span>;
}

/**
 * The top of the home page: a sky that follows the reader's hour (dawn, day, dusk,
 * night), the greeting and how the day is going, then the four day counters.
 */
export function SkyHero({ dateLabel, name, isNew, pct, done, total, bars, sportDone, sportGoal }: {
  dateLabel: string; name: string; isNew: boolean;
  pct: number; done: number; total: number; bars: DayBar[];
  sportDone: number; sportGoal: number;
}) {
  const { t } = useLanguage();
  const hour = useReaderHour();
  const phase = hour === null ? null : phaseOf(hour);
  const greeting = isNew ? t("home.welcome", { name }) : hour === null ? t("home.hello", { name }) : t(`home.sky.${hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening"}`, { name });
  const left = total - done;
  const line = isNew ? t("home.start.intro") : !total ? t("home.sky.none") : left <= 0 ? t("home.sky.done") : left === 1 ? t("home.sky.leftOne") : t("home.sky.left", { count: left });

  return <section className="sky-hero" data-phase={phase ?? "unknown"} data-home-sky>
    <div className="sky-scene" aria-hidden>
      {(phase === "night" || phase === "dusk") && STARS.slice(0, phase === "night" ? STARS.length : 4).map(([left, top, size, delay]) => <span key={`${left}-${top}`} className="sky-star" style={{ left: `${(left / 3.9).toFixed(1)}%`, top, width: size, height: size, animationDelay: `${delay}s` }} />)}
      {phase === "night" && <span className="sky-shooting" style={{ left: "77%", top: 40 }} />}
      {phase === "night" ? <Moon /> : phase && <Sun phase={phase} />}
      {phase === "night"
        ? <><span className="sky-mist" style={{ top: 150, width: 200, animationDuration: "80s", animationDelay: "-30s" }} /><span className="sky-mist" style={{ top: 238, width: 260, animationDuration: "110s", animationDelay: "-75s" }} /></>
        : phase && CLOUDS.slice(0, phase === "day" ? 4 : 2).map(([top, width, height, duration, delay, opacity]) => <span key={top} className="sky-cloud" style={{ top, width, height, opacity, animationDuration: `${duration}s`, animationDelay: `${delay}s` }} />)}
      {phase === "day" && <>
        <span className="sky-bird" style={{ top: 150, animationDelay: "-8s" }}><svg width="18" height="8" viewBox="0 0 18 8"><path d="M1 6 Q5 0 9 5 Q13 0 17 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></span>
        <span className="sky-bird" style={{ top: 166, animationDelay: "-9.2s" }}><svg width="14" height="7" viewBox="0 0 18 8"><path d="M1 6 Q5 0 9 5 Q13 0 17 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></span>
      </>}
      <svg className="sky-hills" viewBox="0 0 390 120" preserveAspectRatio="none"><path className="sky-hill-far" d="M0 70 Q 60 40 120 62 T 240 54 T 390 66 V120 H0Z" /><path className="sky-hill-near" d="M0 92 Q 80 66 170 86 T 390 84 V120 H0Z" /></svg>
    </div>

    <header className="sky-text">
      <p className="sky-date first-letter:uppercase">{dateLabel}</p>
      <h1 className="sky-title">{greeting}</h1>
      <p className="sky-line">{line}</p>
      {!isNew && <div className="sky-chips">
        <span className="sky-chip" data-home-pct>{t("home.sky.dayPct", { pct })}</span>
        {sportGoal > 0 && <span className="sky-chip sky-chip-sport">{t("home.sky.sport", { done: sportDone, goal: sportGoal })}</span>}
      </div>}
    </header>

    {!isNew && <div className="sky-counters" aria-label={t("home.day.label")} data-home-day>
      {bars.map((bar) => {
        const share = Math.max(0, Math.min(1, bar.share));
        const circumference = 2 * Math.PI * 18;
        return <div key={bar.key} className="sky-counter">
          <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden>
            {bar.key === "mood" && bar.muted
              ? <circle cx="22" cy="22" r="18" fill="none" stroke={RING.mood} strokeWidth="5" strokeDasharray="4 6" />
              : <><circle cx="22" cy="22" r="18" fill="none" stroke="var(--surface-muted)" strokeWidth="5" /><circle cx="22" cy="22" r="18" fill="none" stroke={RING[bar.key]} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${circumference * share} ${circumference}`} transform="rotate(-90 22 22)" className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none" /></>}
          </svg>
          <span className={`mt-1.5 block truncate text-sm font-extrabold tabular-nums ${bar.muted ? "text-foreground-muted" : ""}`}>{bar.key === "meals" ? <>{bar.value.replace(/\s*kcal$/, "")}<span className="text-[10px] font-semibold text-foreground-muted"> kcal</span></> : bar.value}</span>
          <span className="block truncate text-[11px] text-foreground-muted">{t(`home.day.${bar.key}`)}</span>
        </div>;
      })}
    </div>}
  </section>;
}
