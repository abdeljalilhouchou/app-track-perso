"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/toast/toast-provider";
import { deleteSleep } from "@/lib/actions/sleep";
import { DEFAULT_GOAL_MINUTES, formatSleep, MIN_NIGHTS_FOR_LINKS, sleepStats, type MoodDay, type SleepLog } from "@/lib/sleep";
import { SleepSheet } from "./sleep-sheet";

const localeOf = (language: string) => (language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR");
const card = "rounded-[20px] border border-border bg-surface";

function Compare({ label, enough, short, color, t }: { label: string; enough: number; short: number; color: string; t: (key: string) => string }) {
  const row = (name: string, value: number, strong: boolean) => <div className="mt-1.5 flex items-center gap-2.5">
    <span className="w-[92px] shrink-0 text-xs text-foreground-muted">{name}</span>
    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${(value / 5) * 100}%`, background: strong ? color : `color-mix(in srgb, ${color} 55%, var(--surface-muted))` }} /></span>
    <b className="w-8 text-end text-[13px] tabular-nums">{value.toFixed(1).replace(".", ",")}</b>
  </div>;
  return <div><p className="text-[13px] font-bold">{label}</p>{row(t("sleep.page.enough"), enough, true)}{row(t("sleep.page.short"), short, false)}</div>;
}

/** The sleep page: last night, the last 7 nights against the goal, bedtime regularity and what sleep changes. */
export function SleepView({ logs, moods, today }: { logs: SleepLog[]; moods: MoodDay[]; today: string }) {
  const { t, language } = useLanguage();
  const p = (key: string, vars?: Record<string, string | number>) => t(`sleep.page.${key}`, vars);
  const toast = useToast();
  const [sheet, setSheet] = useState<{ log: SleepLog | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const stats = sleepStats(logs, moods, today);
  const last = logs.find((log) => log.wake_date === today) ?? null;
  const weekday = new Intl.DateTimeFormat(localeOf(language), { weekday: "narrow" });
  const top = Math.max(DEFAULT_GOAL_MINUTES * 1.25, ...stats.week.map((day) => day.minutes ?? 0));

  const remove = (log: SleepLog) => {
    if (!window.confirm(t("sleep.sheet.removeConfirm"))) return;
    startTransition(async () => {
      const result = await deleteSleep(log.wake_date);
      if (result.error) toast.error(t("sleep.sheet.error")); else toast.success(t("sleep.sheet.removed"));
    });
  };

  return <div className="page-shell space-y-5 animate-fade-in" data-sleep-page>
    <header className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>{stats.average7 === null ? p("noAvg") : p("avg7", { value: formatSleep(stats.average7) })}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{t("sleep.title")}</h1>
      </div>
      <button type="button" onClick={() => setSheet({ log: last })} className="flex h-11 shrink-0 items-center rounded-2xl px-4 text-[13px] font-extrabold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }} data-sleep-add>{last ? p("edit") : p("add")}</button>
    </header>

    <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
      <div className="space-y-5">
        <section aria-label={p("lastNight")} className="relative overflow-hidden rounded-3xl border p-[18px]" style={{ background: "linear-gradient(160deg, color-mix(in srgb, #6366f1 30%, var(--surface)), var(--surface) 62%)", borderColor: "color-mix(in srgb, #818cf8 38%, var(--border))" }} data-sleep-last>
          <span aria-hidden className="sleep-mini-moon" />
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "color-mix(in srgb, #818cf8 70%, var(--foreground))" }}>{p("lastNight")}</p>
          {last ? <>
            <p className="mt-1.5 text-[44px] font-black leading-none tracking-tight tabular-nums">{formatSleep(last.duration_minutes)}</p>
            <p className="mt-1.5 text-[13px] text-foreground-muted">{p("times", { bed: last.bedtime.slice(0, 5), wake: last.wake_time.slice(0, 5), quality: `${t(`sleep.sheet.qualities.${last.quality}`)} (${last.quality}/5)` })}</p>
            {last.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{last.tags.map((tag) => <span key={tag} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold">{t(`sleep.sheet.tags.${tag}`)}</span>)}</div>}
            <button type="button" disabled={pending} onClick={() => remove(last)} className="mt-3 min-h-9 text-xs font-semibold text-danger">{t("sleep.sheet.remove")}</button>
          </> : <>
            <p className="mt-1.5 text-2xl font-extrabold">{p("noLast")}</p>
            <p className="mt-1 max-w-[260px] text-sm text-foreground-muted">{p("noLastHint")}</p>
          </>}
        </section>

        <section aria-labelledby="sleep-week" className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3"><h2 id="sleep-week" className="text-[15px] font-semibold">{p("week")}</h2><span className="text-xs text-foreground-muted">{p("goal", { value: formatSleep(DEFAULT_GOAL_MINUTES) })}</span></div>
          <div className={`${card} px-3.5 pb-2.5 pt-4`} data-sleep-week>
            <div className="relative h-[150px]">
              <div aria-hidden className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${(DEFAULT_GOAL_MINUTES / top) * 100}%`, borderColor: "color-mix(in srgb, #818cf8 60%, transparent)" }} />
              <div className="absolute inset-0 grid grid-cols-7 items-end gap-2.5">
                {stats.week.map((day, index) => <span key={day.date} title={day.minutes === null ? "—" : formatSleep(day.minutes)} data-sleep-bar className="block rounded-lg" style={{ height: day.minutes === null ? "3%" : `${Math.max(6, (day.minutes / top) * 100)}%`, background: day.minutes === null ? "var(--surface-muted)" : day.minutes < 360 ? "color-mix(in srgb, #fb923c 60%, var(--surface-muted))" : day.minutes >= DEFAULT_GOAL_MINUTES ? "#818cf8" : "color-mix(in srgb, #818cf8 45%, var(--surface-muted))", outline: index === 6 ? "1.5px solid var(--foreground)" : undefined, outlineOffset: 2 }} />)}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2.5 text-center text-[11px] text-foreground-muted">{stats.week.map((day, index) => <span key={day.date} className={index === 6 ? "font-bold text-foreground" : ""}>{weekday.format(new Date(`${day.date}T12:00:00`))}</span>)}</div>
            <p className="mt-2.5 text-xs text-foreground-muted">{p("weekHint")}</p>
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-2.5">
          <div className={`${card} p-3.5`}><p className="text-xs text-foreground-muted">{p("bedMean")}</p><p className="mt-1 text-[22px] font-extrabold tabular-nums">{stats.bedtimeMean ?? "—"}</p><p className="mt-0.5 text-[11px]" style={{ color: (stats.bedtimeSpread ?? 0) > 45 ? "#fdba74" : "var(--foreground-muted)" }}>{stats.bedtimeSpread === null ? (stats.bedtimeMean ? p("oneNight") : "") : p("spread", { minutes: stats.bedtimeSpread })}</p></div>
          <div className={`${card} p-3.5`}><p className="text-xs text-foreground-muted">{p("beforeMidnight")}</p><p className="mt-1 text-[22px] font-extrabold tabular-nums">{stats.beforeMidnight.count} / {stats.beforeMidnight.of}</p><p className="mt-0.5 text-[11px] text-foreground-muted">{p("ofNights")}</p></div>
        </section>

        <section aria-labelledby="sleep-links" className="space-y-2.5" data-sleep-links>
          <h2 id="sleep-links" className="text-[15px] font-semibold">{p("links")}</h2>
          {stats.links ? <div className={`${card} space-y-3 p-3.5`}>
            <Compare label={p("mood")} enough={stats.links.mood.enough} short={stats.links.mood.short} color="#fbbf24" t={t} />
            <Compare label={p("energy")} enough={stats.links.energy.enough} short={stats.links.energy.short} color="#34d399" t={t} />
            {stats.tagCost && <p className="rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed" style={{ background: "color-mix(in srgb, #818cf8 12%, transparent)", color: "color-mix(in srgb, #818cf8 65%, var(--foreground))" }}>{p("tagCost", { tag: t(`sleep.sheet.tags.${stats.tagCost.tag}`), minutes: stats.tagCost.minutes })}</p>}
          </div> : <p className={`${card} p-4 text-sm text-foreground-muted`}>{p("linksWaiting", { count: Math.max(1, MIN_NIGHTS_FOR_LINKS - logs.length) })}</p>}
          <p className="text-[11.5px] text-foreground-muted">{p("linksHint")}</p>
        </section>
      </div>
    </div>

    {sheet && <SleepSheet initial={sheet.log} lastLog={logs[0] ?? null} onClose={() => setSheet(null)} />}
  </div>;
}
