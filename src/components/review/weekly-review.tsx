"use client";

import Link from "next/link";
import { useState, useTransition, type CSSProperties } from "react";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/toast/toast-provider";
import { saveWeeklyGoal } from "@/lib/actions/review";
import { HOLO_MOODS } from "@/lib/holo-face";
import { formatSleep, fromMinutes } from "@/lib/sleep";
import type { Goal, GoalResult, ReviewDay, WeeklyReview } from "@/lib/weekly-review";
import { WeeklyStory } from "./weekly-story";

export const localeOf = (language: string) => (language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR");
const toDate = (date: string) => new Date(`${date}T12:00:00`);
export const moodColor = (score: number) => HOLO_MOODS[Math.min(5, Math.max(1, Math.round(score)))].color;

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Shared by the page and the story: labels that need the language. */
export function useReviewFormat() {
  const { t, language } = useLanguage();
  const locale = localeOf(language);
  const r: Translate = (key, vars) => t(`review.${key}`, vars);
  const num = (value: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  // Built by hand: formatRange spaces and dashes differ between the server and browsers.
  const range = (start: string, end: string) => {
    const dayMonth = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    const dayOnly = new Intl.DateTimeFormat(locale, { day: "numeric" });
    if (start.slice(0, 7) !== end.slice(0, 7)) return r("range", { from: dayMonth.format(toDate(start)), to: dayMonth.format(toDate(end)) });
    // English puts the month first: "Nov 16 – 22"; French and Arabic last: "16 – 22 nov.".
    return language === "en" ? r("range", { from: dayMonth.format(toDate(start)), to: dayOnly.format(toDate(end)) }) : r("range", { from: dayOnly.format(toDate(start)), to: dayMonth.format(toDate(end)) });
  };
  const weekday = (date: string, style: "long" | "narrow" = "long") => new Intl.DateTimeFormat(locale, { weekday: style }).format(toDate(date));
  const moodName = (score: number) => t(`mood.v2.moodLevels.l${Math.min(5, Math.max(1, Math.round(score)))}`);
  const level = (score: number | null) => r(`levels.${score === null ? "empty" : score >= 80 ? "great" : score >= 65 ? "good" : score >= 45 ? "ok" : "low"}`);
  const goalLabel = (goal: Goal) => r(`goal.labels.${goal.key}`, { target: goal.target });
  const goalValue = (goal: GoalResult) => (goal.key === "sleep7" ? formatSleep(goal.value) : goal.key === "habits" ? `${goal.value} %` : num(goal.value));
  const goalTarget = (goal: Goal) => (goal.key === "sleep7" ? formatSleep(goal.target) : goal.key === "habits" ? `${goal.target} %` : num(goal.target));
  return { t, r, language, num, range, weekday, moodName, level, goalLabel, goalValue, goalTarget };
}

type Format = ReturnType<typeof useReviewFormat>;

/** "toutes les habitudes · 5,2 km · humeur Super" */
function dayParts(day: ReviewDay, f: Format, hard: boolean) {
  const parts: string[] = [];
  if (hard && day.sleepMinutes !== null && day.sleepMinutes < 420) parts.push(f.r("parts.sleep", { duration: formatSleep(day.sleepMinutes) }));
  if (day.habitsDue) parts.push(day.habitsDone >= day.habitsDue ? f.r("parts.allHabits") : f.r("parts.habits", { done: day.habitsDone, due: day.habitsDue }));
  if (day.km) parts.push(f.r("parts.km", { km: f.num(day.km, 1) }));
  else if (day.sportMinutes) parts.push(f.r("parts.sport", { minutes: day.sportMinutes }));
  if (day.mood !== null) parts.push(f.r("parts.mood", { level: f.moodName(day.mood) }));
  if (!hard && day.sleepMinutes !== null && parts.length < 3) parts.push(f.r("parts.sleep", { duration: formatSleep(day.sleepMinutes) }));
  return parts.slice(0, 3).join(" · ");
}

export function insightText(insight: WeeklyReview["insights"][number], f: Format) {
  switch (insight.key) {
    case "sportMood": return f.r("insights.sportMood", { with: f.num(insight.withSport, 1), without: f.num(insight.without, 1) });
    case "sleepMood": return f.r("insights.sleepMood", { enough: f.num(insight.enough, 1), short: f.num(insight.short, 1) });
    case "bedtime": return f.r("insights.bedtime", { minutes: insight.minutes });
    case "proteinWeekend": return f.r("insights.proteinWeekend", { weekend: insight.weekend, weekdays: insight.weekdays });
    case "habitWeekday": {
      // 2024-01-01 was a Monday: weekday 1..7 maps onto that week.
      const date = `2024-01-0${insight.weekday}`;
      return f.r("insights.habitWeekday", { weekday: f.weekday(date), rate: insight.rate, others: insight.others });
    }
  }
}
export const insightColor = { sportMood: "var(--sport)", sleepMood: "var(--accent)", bedtime: "var(--accent)", proteinWeekend: "var(--nutrition)", habitWeekday: "var(--habit)" } as const;

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return <svg className="h-[18px] w-[18px] rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} /></svg>;
}

export function ScoreRing({ score, size = 112, label }: { score: number | null; size?: number; label: string }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  return <span className="relative block shrink-0" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in srgb, var(--foreground) 10%, transparent)" strokeWidth={10} />
      <circle className="review-ring" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={10} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * (score ?? 0)) / 100} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ "--ring": c } as CSSProperties} />
    </svg>
  </span>;
}

export function WeeklyReviewView({ review, today, prevWeek, nextWeek, goalCheck, goalWeek, goalThisWeek, chosenGoal, calorieGoal, openStory }: {
  review: WeeklyReview; today: string; prevWeek: string | null; nextWeek: string | null;
  goalCheck: GoalResult | null; goalWeek: string | null; goalThisWeek: boolean; chosenGoal: Goal | null;
  calorieGoal: number | null; openStory: boolean;
}) {
  const f = useReviewFormat();
  const { r, num } = f;
  const toast = useToast();
  const { week, previous } = review;
  const [story, setStory] = useState(openStory);
  const [picked, setPicked] = useState<Goal | null>(chosenGoal);
  const [shared, setShared] = useState(false);
  const [pending, startTransition] = useTransition();

  const range = f.range(week.start, week.end);
  const goals = picked && !review.suggestions.some((g) => g.key === picked.key) ? [picked, ...review.suggestions.slice(0, 2)] : review.suggestions;
  const pick = (goal: Goal) => {
    if (!goalWeek || pending) return;
    const before = picked;
    setPicked(goal);
    startTransition(async () => {
      const result = await saveWeeklyGoal(goalWeek, goal.key, goal.target);
      if (result.error) { setPicked(before); toast.error(r(result.error === "schema" ? "goal.schema" : "goal.error")); }
      else toast.success(r("goal.saved"));
    });
  };

  const share = async () => {
    const text = r("shareText", {
      range, score: week.score ?? "–", habits: week.habits.rate === null ? "–" : `${week.habits.rate} %`,
      sessions: week.sport.sessions, sleep: week.sleep.avgMinutes === null ? "–" : formatSleep(week.sleep.avgMinutes),
    });
    try {
      if (navigator.share) { await navigator.share({ title: r("title"), text }); return; }
      await navigator.clipboard.writeText(text);
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch { /* cancelled */ }
  };

  const delta = review.delta;
  const daysTracked = week.days.filter((d) => d.habitsDone || d.mood !== null || d.sportMinutes || d.sleepMinutes !== null || d.kcal !== null).length;
  const stat = (name: string, now: number | null, before: number | null, digits = 0, unit = "") => {
    if (now === null || before === null || now === before) return null;
    const diff = Math.round((now - before) * 10 ** digits) / 10 ** digits;
    return { text: `${diff > 0 ? "+" : "−"}${num(Math.abs(diff), digits)}${unit}`, up: diff > 0, name };
  };
  const cards = [
    { key: "habits", color: "var(--habit)", name: r("stats.habits"), value: week.habits.rate === null ? null : `${week.habits.rate} %`,
      detail: r("stats.habitsDetail", { done: week.habits.done, expected: week.habits.expected }), pct: week.habits.rate ?? 0,
      delta: stat("habits", week.habits.rate, previous.habits.rate, 0, " %") },
    { key: "sport", color: "var(--sport)", name: r("stats.sport"), value: week.sport.sessions ? num(week.sport.sessions) : null,
      detail: week.sport.km ? r("stats.sportDetail", { km: num(week.sport.km, 1), duration: formatSleep(week.sport.minutes) }) : r("stats.sportMinutes", { duration: formatSleep(week.sport.minutes) }),
      pct: Math.min(100, week.sport.sessions * 25), delta: stat("sport", week.sport.sessions, previous.sport.sessions) },
    { key: "nutrition", color: "var(--nutrition)", name: r("stats.nutrition"), value: week.nutrition.kcalAvg === null ? null : num(week.nutrition.kcalAvg),
      detail: calorieGoal ? r("stats.kcalDetail", { goal: num(calorieGoal) }) : r("stats.kcalNoGoal", { days: week.nutrition.days }),
      pct: calorieGoal && week.nutrition.kcalAvg ? Math.min(100, (week.nutrition.kcalAvg / calorieGoal) * 100) : (week.nutrition.days / 7) * 100,
      delta: stat("nutrition", week.nutrition.kcalAvg, previous.nutrition.kcalAvg) },
    { key: "sleep", color: "var(--accent)", name: r("stats.sleep"), value: week.sleep.avgMinutes === null ? null : formatSleep(week.sleep.avgMinutes),
      detail: week.sleep.bedOffset === null ? "" : r("stats.sleepDetail", { time: fromMinutes(week.sleep.bedOffset) }),
      pct: week.sleep.avgMinutes === null ? 0 : Math.min(100, (week.sleep.avgMinutes / 450) * 100),
      delta: week.sleep.avgMinutes !== null && previous.sleep.avgMinutes !== null && week.sleep.avgMinutes !== previous.sleep.avgMinutes
        ? { text: `${week.sleep.avgMinutes > previous.sleep.avgMinutes ? "+" : "−"}${formatSleep(Math.abs(week.sleep.avgMinutes - previous.sleep.avgMinutes))}`, up: week.sleep.avgMinutes > previous.sleep.avgMinutes, name: "sleep" } : null },
    { key: "mood", color: "var(--mood)", name: r("stats.mood"), value: week.mood.avg === null ? null : f.moodName(week.mood.avg),
      detail: week.mood.avg === null ? "" : r("stats.moodDetail", { avg: num(week.mood.avg, 1), days: week.mood.days }), pct: week.mood.avg === null ? 0 : ((week.mood.avg - 1) / 4) * 100,
      delta: stat("mood", week.mood.avg, previous.mood.avg, 1) },
    { key: "protein", color: "#ec4899", name: r("stats.protein"), value: week.nutrition.days ? `${week.nutrition.proteinDays} / 7` : null,
      detail: r("stats.proteinDetail"), pct: (week.nutrition.proteinDays / 7) * 100, delta: stat("protein", week.nutrition.proteinDays, previous.nutrition.proteinDays) },
  ];

  return (
    <div className="page-shell space-y-4 animate-fade-in" data-review>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[.08em] text-accent">{review.finished ? r("title") : r("inProgress")}</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight" data-review-range>{range}</h1>
        </div>
        <nav className="flex shrink-0 gap-2" aria-label={r("title")}>
          {prevWeek ? <Link href={`/bilan?semaine=${prevWeek}`} aria-label={r("prev")} className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface transition hover:bg-surface-muted" data-review-prev><Arrow dir="prev" /></Link> : null}
          {nextWeek
            ? <Link href={`/bilan?semaine=${nextWeek}`} aria-label={r("next")} className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface transition hover:bg-surface-muted" data-review-next><Arrow dir="next" /></Link>
            : <span aria-hidden className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface opacity-35"><Arrow dir="next" /></span>}
        </nav>
      </header>

      <div className="review-columns">
        <div className="space-y-4">
          <section className="glass-card space-y-5 p-5" style={{ "--glow": "var(--accent)" } as CSSProperties} data-review-score>
            <div className="flex items-center gap-[18px]">
              <span className="relative">
                <ScoreRing score={week.score} label={week.score === null ? r("noScore") : r("scoreLabel", { score: week.score })} />
                <span aria-hidden className="absolute inset-0 grid place-items-center text-center">
                  <span><span className="block text-[32px] font-black leading-none tabular-nums">{week.score ?? "–"}</span><span className="text-[11px] text-foreground-muted">{r("outOf")}</span></span>
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-xl font-extrabold leading-tight">{f.level(week.score)}</p>
                <p className="mt-1.5 text-sm leading-snug text-foreground-muted">
                  {week.score === null ? r("emptyWeek") : week.habits.perfectDays ? r("perfect", { count: week.habits.perfectDays }) : r("tracked", { count: daysTracked })}
                </p>
                {delta !== null && <span className={`mt-2.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${delta > 0 ? "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success" : delta < 0 ? "bg-[color-mix(in_srgb,var(--nutrition)_15%,transparent)] text-[var(--nutrition)]" : "bg-surface-muted text-foreground-muted"}`} data-review-delta>
                  {delta > 0 ? r("deltaUp", { value: delta }) : delta < 0 ? r("deltaDown", { value: `−${Math.abs(delta)}` }) : r("deltaSame")}
                </span>}
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-xs font-semibold text-foreground-muted">{r("dayChart")}</p>
              <div className="grid grid-cols-7 items-end gap-2" data-review-days>
                {week.days.map((day) => {
                  const share = day.habitsDue ? day.habitsDone / day.habitsDue : 0;
                  const future = day.date > today;
                  return <div key={day.date} className={`flex flex-col items-center gap-1.5 ${future ? "opacity-40" : ""}`} data-review-day>
                    <span className="flex h-[74px] w-full items-end overflow-hidden rounded-[10px] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">
                      <span className="review-bar block w-full rounded-[10px]" style={{ height: `${share * 100}%`, background: share >= 1 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 45%, transparent)" }} />
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full" style={day.mood !== null ? { background: moodColor(day.mood), boxShadow: `0 0 10px ${moodColor(day.mood)}` } : { border: "1.5px solid var(--border)" }} />
                    <span className={`text-xs ${review.best?.date === day.date ? "font-black text-foreground" : "font-semibold text-foreground-muted"}`}>{f.weekday(day.date, "narrow")}</span>
                  </div>;
                })}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2.5" data-review-stats>
            {cards.map((card) => <article key={card.key} className="glass-card p-3.5" style={{ "--glow": card.color, borderRadius: 20 } as CSSProperties} data-review-stat={card.key}>
              <span className="flex items-center justify-between gap-1">
                <span className="truncate text-[13px] font-bold">{card.name}</span>
                {card.delta && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums ${card.delta.up ? "bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-success" : "bg-[color-mix(in_srgb,var(--nutrition)_15%,transparent)] text-[var(--nutrition)]"}`}>{card.delta.text}</span>}
              </span>
              <span className={`mt-2.5 block font-black leading-tight tabular-nums ${card.value ? "text-2xl" : "text-base text-foreground-muted"}`}>{card.value ? <bdi>{card.value}</bdi> : r("stats.none")}</span>
              {card.value && card.detail && <span className="mt-1 block text-xs leading-snug text-foreground-muted">{card.detail}</span>}
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"><span className="block h-full rounded-full" style={{ width: `${card.pct}%`, background: card.color }} /></span>
            </article>)}
          </div>
        </div>

        <div className="space-y-4">
          {goalCheck && <section className={`flex items-center gap-3 rounded-[22px] border p-4 ${goalCheck.done ? "border-[color-mix(in_srgb,var(--success)_40%,var(--border))] bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))]" : "border-border bg-surface"}`} data-review-goal-check>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black ${goalCheck.done ? "bg-success text-white" : "bg-surface-muted text-foreground-muted"}`} aria-hidden>{goalCheck.done ? "✓" : "·"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground-muted">{r("goal.check")}</p>
              <p className="text-[15px] font-bold leading-snug">{f.goalLabel(goalCheck)}</p>
              <p className="mt-0.5 text-xs text-foreground-muted">{r("goal.progress", { value: f.goalValue(goalCheck), target: f.goalTarget(goalCheck) })}</p>
            </div>
            <span className={`shrink-0 text-sm font-extrabold ${goalCheck.done ? "text-success" : "text-foreground-muted"}`}>{goalCheck.done ? r("goal.done") : review.finished ? r("goal.missed") : r("goal.running")}</span>
          </section>}

          <section className="space-y-3 rounded-[24px] border border-border bg-surface/85 p-[18px] backdrop-blur" data-review-insights>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--mood)_15%,transparent)] text-[var(--mood-text)]" aria-hidden>
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" /></svg>
              </span>
              <div>
                <h2 className="text-[17px] font-extrabold">{r("insights.title")}</h2>
                <p className="text-xs text-foreground-muted">{r("insights.hint")}</p>
              </div>
            </div>
            {review.insights.length ? review.insights.map((insight) => <div key={insight.key} className="flex items-start gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] p-3" data-review-insight={insight.key}>
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: insightColor[insight.key], boxShadow: `0 0 10px ${insightColor[insight.key]}` }} />
              <p className="text-sm leading-relaxed">{insightText(insight, f)}</p>
            </div>) : <p className="text-sm leading-relaxed text-foreground-muted">{r("insights.none")}</p>}
          </section>

          {(review.best || review.hardest) && <section className="grid grid-cols-2 gap-2.5">
            {review.best && <div className="rounded-[20px] border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_8%,var(--surface))] p-4" data-review-best>
              <p className="text-xs font-bold text-success">{r("best")}</p>
              <p className="mt-1.5 text-xl font-black capitalize">{f.weekday(review.best.date)}</p>
              <p className="mt-1 text-xs leading-snug text-foreground-muted">{dayParts(review.best, f, false)}</p>
            </div>}
            {review.hardest && <div className="rounded-[20px] border border-[color-mix(in_srgb,var(--nutrition)_35%,var(--border))] bg-[color-mix(in_srgb,var(--nutrition)_8%,var(--surface))] p-4" data-review-hardest>
              <p className="text-xs font-bold text-[var(--nutrition)]">{r("hardest")}</p>
              <p className="mt-1.5 text-xl font-black capitalize">{f.weekday(review.hardest.date)}</p>
              <p className="mt-1 text-xs leading-snug text-foreground-muted">{dayParts(review.hardest, f, true)}</p>
            </div>}
          </section>}

          {goalWeek && <section className="space-y-3 rounded-[24px] border border-border bg-surface/85 p-[18px] backdrop-blur" data-review-goals>
            <h2 className="text-[17px] font-extrabold">{goalThisWeek ? r("goal.titleThis") : r("goal.title")}</h2>
            <p className="text-[13px] leading-snug text-foreground-muted">{r("goal.hint")}</p>
            <div role="radiogroup" aria-label={goalThisWeek ? r("goal.titleThis") : r("goal.title")} className="flex flex-col gap-2">
              {goals.map((goal) => {
                const on = picked?.key === goal.key;
                return <button key={goal.key} type="button" role="radio" aria-checked={on} disabled={pending} onClick={() => pick(goal)}
                  className={`flex min-h-[60px] items-center gap-3 rounded-2xl px-3.5 py-2.5 text-start transition ${on ? "border-[1.5px] border-accent bg-accent-soft" : "border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] hover:bg-surface-muted"}`} data-review-goal={goal.key}>
                  <span className={`h-[18px] w-[18px] shrink-0 rounded-full ${on ? "border-[5px] border-accent" : "border-2 border-foreground-muted/50"}`} />
                  <span><span className="block text-sm font-bold">{f.goalLabel(goal)}</span><span className="mt-0.5 block text-xs text-foreground-muted">{r(`goal.whys.${goal.key}`)}</span></span>
                </button>;
              })}
            </div>
          </section>}

          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => setStory(true)} className="flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] bg-accent px-3 text-[15px] font-bold text-white transition hover:opacity-90" data-review-story-open>
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 4v16l13-8z" /></svg>{r("story.open")}
            </button>
            <button type="button" onClick={share} className="flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-border bg-surface px-3 text-[15px] font-bold transition hover:bg-surface-muted" data-review-share>
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
              <span aria-live="polite">{shared ? r("shared") : r("share")}</span>
            </button>
          </div>
        </div>
      </div>

      {story && <WeeklyStory review={review} range={range} goals={goalWeek ? goals : []} picked={picked} onPick={pick} goalThisWeek={goalThisWeek} onClose={() => setStory(false)} />}
    </div>
  );
}
