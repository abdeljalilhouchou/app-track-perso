"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { weekdaySlug } from "@/lib/habit-categories";
import { habitBadges, monthShares, moodEffects, periodStats, weekdayRates, type LogLite } from "@/lib/habits-v2";
import type { Habit } from "@/types/database";

const PERIODS = [7, 30, 365] as const;
const BADGE_ICON: Record<string, string> = { streak7: "🔥", streak30: "🏔️", streak100: "💎", perfectWeek: "🌟", perfectMonth: "🗓️", checks100: "💯" };
const card = "rounded-3xl border border-border bg-surface p-4";

export function HabitsProgress({ habits, index, moods, today }: {
  habits: Habit[];
  index: Map<string, Map<string, LogLite>>;
  moods: { entry_date: string; mood_score: number }[];
  today: string;
}) {
  const { t, language } = useLanguage();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const p = (key: string, vars?: Record<string, string | number>) => t(`habits.v2.progress.${key}`, vars);

  if (!habits.length) return <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-foreground-muted">{p("empty")}</p>;

  const stats = periodStats(habits, index, today, days);
  const month = monthShares(habits, index, today);
  const badges = habitBadges(habits, index, today);
  const effects = moodEffects(habits, index, moods, today);
  const weekdays = weekdayRates(habits, index, today).filter((row) => row.rate !== null) as { day: number; rate: number }[];
  const best = weekdays.length >= 2 ? weekdays.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const worst = weekdays.length >= 2 ? weekdays.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  const locale = language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(`${today}T12:00:00`));
  const shade = (share: number | null) => share === null ? "transparent" : share === 0 ? "var(--surface-muted)" : `color-mix(in srgb, var(--habit) ${Math.round(25 + share * 75)}%, var(--surface))`;
  const sign = (value: number) => (value > 0 ? "+" : "−");

  return (
    <div className="space-y-4" data-habits-progress>
      <div role="group" aria-label={p("rate")} className="flex gap-2">
        {PERIODS.map((value) => (
          <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)} className={`min-h-9 rounded-full border px-3.5 text-sm font-semibold ${days === value ? "border-[var(--habit)] text-[var(--habit)]" : "border-border text-foreground-muted"}`} style={days === value ? { background: "color-mix(in srgb, var(--habit) 14%, var(--surface))" } : undefined} data-habits-period={value}>
            {p(`periods.p${value}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4" data-habits-stat="rate">
          <p className="text-xs text-foreground-muted">{p("rate")}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{stats.rate === null ? "—" : `${stats.rate} %`}</p>
          {stats.delta !== null && stats.delta !== 0 && <p className="mt-1 text-xs font-semibold" style={{ color: stats.delta > 0 ? "var(--success)" : "var(--danger)" }}>{p("vsPrevious", { sign: sign(stats.delta), value: Math.abs(stats.delta) })}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">{p("perfectDays")}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{stats.perfectDays}</p>
          <p className="mt-1 text-xs text-foreground-muted">{p("perfectHint")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">{p("bestStreak")}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{stats.bestStreak ? stats.bestStreak.value : "—"}</p>
          {stats.bestStreak && <p className="mt-1 truncate text-xs text-foreground-muted">{stats.bestStreak.name}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">{p("checks")}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">{stats.done}</p>
          <p className="mt-1 text-xs text-foreground-muted">{p("checksHint", { expected: stats.expected })}</p>
        </div>
      </div>

      <section aria-labelledby="habits-month" className={`${card} space-y-3`}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="habits-month" className="font-semibold first-letter:uppercase">{monthName}</h2>
          <span className="text-xs text-foreground-muted">{p("monthHint")}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-foreground-muted" aria-hidden>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => <span key={day}>{t(`habits.weekdaysShort.${weekdaySlug(day)}`)}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5" data-habits-month>
          {Array.from({ length: month.offset }, (_, i) => <span key={`pad-${i}`} />)}
          {month.days.map((day) => (
            <span key={day.date} role="img" aria-label={`${Number(day.date.slice(8))} : ${day.share === null ? "—" : `${Math.round(day.share * 100)} %`}`} className="aspect-square rounded-lg" style={{ background: shade(day.share), outline: day.date === today ? "2px solid var(--habit)" : undefined, outlineOffset: -2, border: day.share === null && day.date <= today ? "1px dashed var(--border)" : undefined }} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted" aria-hidden>
          {p("less")}
          {[0, 0.33, 0.66, 1].map((share) => <span key={share} className="h-3 w-3 rounded" style={{ background: shade(share) }} />)}
          {p("more")}
        </div>
      </section>

      <section aria-labelledby="habits-per-habit" className={`${card} space-y-3.5`}>
        <h2 id="habits-per-habit" className="text-sm font-semibold text-foreground-muted">{p("perHabit", { period: p(`periods.p${days}`) })}</h2>
        {stats.perHabit.map((row) => {
          const habit = habits.find((item) => item.id === row.id)!;
          const weak = row.rate !== null && row.rate < 50;
          return (
            <div key={row.id} data-habits-row={row.name}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold"><span aria-hidden>{habit.icon} </span>{row.name}</span>
                <span className="shrink-0 text-xs" style={{ color: weak ? "var(--mood-text)" : "var(--foreground-muted)" }}>{row.rate === null ? "—" : `${row.rate} %`}{weak ? ` · ${p("toStrengthen")}` : ""}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full" style={{ width: `${row.rate ?? 0}%`, background: habit.color }} /></div>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="habits-badges" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="habits-badges" className="font-semibold">{p("badgesTitle")}</h2>
          <span className="text-xs text-foreground-muted">{badges.filter((badge) => badge.earned).length} / {badges.length}</span>
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {badges.map((badge) => (
            <li key={badge.id} className="rounded-2xl border p-3 text-center" style={badge.earned ? { background: "color-mix(in srgb, var(--habit) 12%, var(--surface))", borderColor: "color-mix(in srgb, var(--habit) 40%, var(--border))" } : { borderStyle: "dashed", borderColor: "var(--border)" }} data-habit-badge={badge.id} data-earned={badge.earned || undefined}>
              <p className={`text-2xl ${badge.earned ? "" : "opacity-40 grayscale"}`} aria-hidden>{BADGE_ICON[badge.id]}</p>
              <p className="mt-1.5 text-xs font-semibold">{p(`badges.${badge.id}.title`)}</p>
              {badge.earned ? (
                <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--habit)" }}>{badge.detail ?? p(`badges.${badge.id}.hint`)}</p>
              ) : (
                <div className="mx-1.5 mt-1.5 h-1 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(badge.progress * 100)} aria-label={p(`badges.${badge.id}.hint`)}>
                  <div className="h-full rounded-full" style={{ width: `${badge.progress * 100}%`, background: "var(--habit)" }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="habits-mood" className={`${card} space-y-3`} data-habits-mood>
        <h2 id="habits-mood" className="font-semibold">{p("moodTitle")}</h2>
        {effects.length ? effects.slice(0, 5).map((effect) => (
          <div key={effect.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{effect.name}</p>
              <p className="text-xs text-foreground-muted">{p("moodLine", { with: effect.withHabit.toFixed(1), without: effect.without.toFixed(1) })}</p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: Math.abs(effect.diff) < 0.2 ? "var(--foreground-muted)" : effect.diff > 0 ? "var(--success)" : "var(--danger)" }}>{Math.abs(effect.diff) < 0.2 ? "≈ 0" : `${sign(effect.diff)}${Math.abs(effect.diff).toFixed(1)}`}</span>
          </div>
        )) : <p className="text-sm text-foreground-muted">{p("moodEmpty")}</p>}
      </section>

      {best && worst && best.day !== worst.day && (
        <p className="rounded-3xl p-4 text-sm leading-relaxed" style={{ background: "color-mix(in srgb, var(--habit) 12%, var(--surface))" }}>
          {p("bestDay", { best: t(`habits.weekdaysLong.${weekdaySlug(best.day)}`), bestRate: best.rate, worst: t(`habits.weekdaysLong.${weekdaySlug(worst.day)}`), worstRate: worst.rate })}
        </p>
      )}
    </div>
  );
}
