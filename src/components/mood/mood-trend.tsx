"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { formatDay } from "./mood-scale";

type Point = { date: string; mood: number; energy: number };
const PERIODS = [7, 30, 90] as const;

/** Mood and energy over 7, 30 or 90 days. */
export function MoodTrend({ entries, today }: { entries: Point[]; today: string }) {
  const { t, language } = useLanguage();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - (days - 1));
  const from = start.toISOString().slice(0, 10);
  const data = entries
    .filter((entry) => entry.date >= from && entry.date <= today)
    .map((entry) => ({ label: formatDay(entry.date, language, { day: "numeric", month: "short" }), mood: entry.mood, energy: entry.energy }));

  return (
    <section aria-labelledby="mood-trend" className="rounded-2xl border border-border bg-surface p-5" data-mood-trend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mood-trend" className="font-semibold">{t("mood.v2.trendTitle")}</h2>
        <div role="group" aria-label={t("mood.v2.trendTitle")} className="flex gap-1 rounded-full bg-surface-muted p-1">
          {PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              onClick={() => setDays(value)}
              className={`min-h-9 min-w-12 rounded-full px-3 text-xs font-semibold transition-colors ${days === value ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted"}`}
            >
              {t(`mood.v2.periods.p${value}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-foreground-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mood" />{t("mood.v2.moodQuestion")}</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full" style={{ background: "var(--accent)" }} />{t("mood.v2.energyQuestion")}</span>
      </div>
      {data.length >= 2 ? (
        <MoodLineChart data={data} labels={{ mood: t("mood.v2.moodQuestion"), energy: t("mood.v2.energyQuestion") }} />
      ) : (
        <p className="py-12 text-center text-sm text-foreground-muted">{t("mood.v2.noTrend")}</p>
      )}
    </section>
  );
}
