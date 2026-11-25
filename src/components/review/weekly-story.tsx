"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { formatSleep, fromMinutes } from "@/lib/sleep";
import type { Goal, WeeklyReview } from "@/lib/weekly-review";
import { insightColor, insightText, useReviewFormat } from "./weekly-review";

type Slide = "score" | "habits" | "sport" | "rest" | "noticed" | "goal";
const GLOW: Record<Slide, string> = { score: "#818cf8", habits: "#a78bfa", sport: "#34d399", rest: "#60a5fa", noticed: "#fbbf24", goal: "#818cf8" };
const DISCIPLINES = ["running", "strength", "calisthenics", "general"] as const;

/**
 * The week as full-screen screens, tapped through like a story: the score, habits, sport,
 * sleep and meals, what was noticed, then the goal. Always dark, whatever the theme.
 */
export function WeeklyStory({ review, range, goals, picked, onPick, goalThisWeek, onClose }: {
  review: WeeklyReview; range: string; goals: Goal[]; picked: Goal | null; onPick: (goal: Goal) => void; goalThisWeek: boolean; onClose: () => void;
}) {
  const f = useReviewFormat();
  const { r, num } = f;
  const { week, delta } = review;
  const slides: Slide[] = ["score"];
  if (week.habits.expected) slides.push("habits");
  slides.push("sport");
  if (week.sleep.nights || week.nutrition.days) slides.push("rest");
  if (review.insights.length) slides.push("noticed");
  if (goals.length) slides.push("goal");
  const [index, setIndex] = useState(0);
  const slide = slides[Math.min(index, slides.length - 1)];
  const last = index >= slides.length - 1;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);

  const go = (step: number) => setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + step)));
  const keys = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
    // In right-to-left reading the arrows swap, like the screens.
    const forward = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    if (event.key === forward) go(1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") go(-1);
  };

  const big = "mt-2.5 text-[64px] font-black leading-none tracking-tight tabular-nums";
  const lead = "story-rise2 mt-2.5 text-[17px] leading-normal text-white/85";
  const tile = (label: string, value: string, color: string) => <div className="rounded-[18px] p-4" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
    <span className="block text-xs text-white/75">{label}</span><span className="mt-1.5 block text-2xl font-black tabular-nums"><bdi>{value}</bdi></span>
  </div>;

  return (
    <div role="dialog" aria-modal="true" aria-label={r("title")} onKeyDown={keys} className="review-story" data-review-story={slide}>
      <span aria-hidden className="review-story-glow" style={{ "--glow": GLOW[slide] } as CSSProperties} />

      <div className="absolute inset-x-4 top-[max(16px,env(safe-area-inset-top))] z-[3]">
        <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` }} aria-hidden>
          {slides.map((s, i) => <span key={s} className={`h-[3px] rounded-[3px] ${i <= index ? "bg-white" : "bg-white/25"}`} />)}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[13px] font-bold text-white/85">{r("story.week", { range })}</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={r("story.close")} className="-me-3 grid h-11 w-11 place-items-center rounded-full text-white" data-review-story-close>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      <section key={slide} className="review-story-slide" aria-live="polite">
        {slide === "score" && <div className="flex flex-1 flex-col items-center text-center">
          <p className="story-rise text-[15px] text-white/80">{r("story.scoreIntro")}</p>
          <span className="story-pop mt-8 grid h-[210px] w-[210px] place-items-center rounded-full border-2 border-[rgba(165,180,252,.5)] bg-[rgba(99,102,241,.16)] shadow-[0_0_80px_-10px_rgba(129,140,248,.75)]">
            <span><span className="block text-[84px] font-black leading-none tabular-nums">{week.score ?? "–"}</span><span className="text-sm text-white/75">{r("outOf")}</span></span>
          </span>
          <h2 className="story-rise2 mt-9 text-[34px] font-black leading-tight">{f.level(week.score)}</h2>
          <p className="story-rise3 mt-3 text-base leading-normal text-white/80">
            {delta === null ? (week.score === null ? r("emptyWeek") : r("tracked", { count: week.days.filter((d) => d.mood !== null || d.habitsDone || d.sleepMinutes !== null).length }))
              : delta > 0 ? r("deltaUp", { value: delta }) : delta < 0 ? r("deltaDown", { value: `−${Math.abs(delta)}` }) : r("deltaSame")}
          </p>
        </div>}

        {slide === "habits" && <div>
          <p className="story-rise text-[15px] font-bold text-[#c4b5fd]">{r("stats.habits")}</p>
          <p className={`story-rise ${big}`}>{week.habits.rate} %</p>
          <p className={lead}>{r("story.habits", { done: week.habits.done, expected: week.habits.expected, perfect: week.habits.perfectDays })}</p>
          <div className="story-rise3 mt-10 grid h-[200px] grid-cols-7 items-end gap-2">
            {week.days.map((day) => <span key={day.date} className="flex h-full flex-col items-center justify-end gap-2">
              <span className="block w-full rounded-[10px]" style={{ height: `${day.habitsDue ? Math.max(4, (day.habitsDone / day.habitsDue) * 100) : 4}%`, background: day.habitsDue && day.habitsDone >= day.habitsDue ? "#a78bfa" : "rgba(167,139,250,.4)" }} />
              <span className="text-xs font-bold text-white/70">{f.weekday(day.date, "narrow")}</span>
            </span>)}
          </div>
        </div>}

        {slide === "sport" && <div>
          <p className="story-rise text-[15px] font-bold text-[#6ee7b7]">{r("stats.sport")}</p>
          {week.sport.sessions ? <>
            <p className={`story-rise ${big}`}><bdi>{week.sport.km ? `${num(week.sport.km, 1)} km` : formatSleep(week.sport.minutes)}</bdi></p>
            <p className={lead}>{r("story.sport", { count: week.sport.sessions, duration: formatSleep(week.sport.minutes) })}</p>
            <div className="story-rise3 mt-9 flex flex-col gap-2.5">
              {DISCIPLINES.filter((d) => week.sport.byDiscipline[d]).map((d) => <div key={d} className="flex items-center justify-between rounded-2xl bg-[rgba(52,211,153,.12)] px-4 py-3.5">
                <span className="text-[15px] font-bold">{r(`disciplines.${d}`)}</span><span className="text-sm tabular-nums text-white/80">{week.sport.byDiscipline[d]}</span>
              </div>)}
            </div>
          </> : <p className="story-rise2 mt-4 text-[28px] font-black leading-tight">{r("story.sportNone")}</p>}
        </div>}

        {slide === "rest" && <div>
          <p className="story-rise text-[15px] font-bold text-[#93c5fd]">{r("story.sleepTitle")}</p>
          {week.sleep.avgMinutes !== null && <>
            <p className={`story-rise ${big}`}><bdi>{formatSleep(week.sleep.avgMinutes)}</bdi></p>
            <p className={lead}>{r("story.sleepLine", { nights: week.sleep.nights })}</p>
          </>}
          <div className="story-rise3 mt-8 grid grid-cols-2 gap-2.5">
            {week.sleep.bedOffset !== null && tile(r("story.bedMean"), fromMinutes(week.sleep.bedOffset), "#60a5fa")}
            {week.sleep.shortest && tile(r("story.shortest"), formatSleep(week.sleep.shortest.minutes), "#60a5fa")}
            {week.nutrition.kcalAvg !== null && tile(r("story.kcal"), num(week.nutrition.kcalAvg), "#fb923c")}
            {week.nutrition.days > 0 && tile(r("story.proteinOk"), `${week.nutrition.proteinDays} / 7`, "#fb923c")}
          </div>
        </div>}

        {slide === "noticed" && <div>
          <p className="story-rise text-[15px] font-bold text-[#fcd34d]">{r("story.noticed")}</p>
          <div className="story-rise2 mt-6 flex flex-col gap-3">
            {review.insights.map((insight) => <p key={insight.key} className="flex gap-3 rounded-2xl bg-white/[.06] p-4 text-base leading-relaxed">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: insightColor[insight.key] }} />{insightText(insight, f)}
            </p>)}
          </div>
        </div>}

        {slide === "goal" && <div className="flex flex-1 flex-col">
          <p className="story-rise text-[15px] font-bold text-[#a5b4fc]">{goalThisWeek ? r("goal.titleThis") : r("story.nextWeek")}</p>
          <h2 className="story-rise mt-3.5 text-[30px] font-black leading-tight">{r("story.oneGoal")}</h2>
          <div role="radiogroup" aria-label={r("goal.title")} className="story-rise2 relative z-[4] mt-6 flex flex-col gap-2.5">
            {goals.map((goal) => {
              const on = picked?.key === goal.key;
              return <button key={goal.key} type="button" role="radio" aria-checked={on} onClick={() => onPick(goal)}
                className={`min-h-14 rounded-2xl px-4 text-start text-[15px] font-bold ${on ? "border-2 border-[#a5b4fc] bg-[rgba(99,102,241,.25)]" : "border border-white/15 bg-white/[.05]"}`} data-review-story-goal={goal.key}>
                {f.goalLabel(goal)}
              </button>;
            })}
          </div>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="story-rise3 relative z-[4] min-h-14 rounded-[18px] bg-[#a5b4fc] text-base font-extrabold text-[#12122a]">{r("story.go")}</button>
        </div>}
      </section>

      {!last && <>
        <button type="button" aria-label={r("story.prev")} onClick={() => go(-1)} className="absolute bottom-0 start-0 top-24 z-[2] w-[35%] cursor-default" data-review-story-prev />
        <button type="button" aria-label={r("story.next")} onClick={() => go(1)} className="absolute bottom-0 end-0 top-24 z-[2] w-[65%] cursor-default" data-review-story-next />
        <p aria-hidden className="absolute inset-x-0 bottom-[max(24px,env(safe-area-inset-bottom))] z-[1] text-center text-xs text-white/60">{r("story.hint")}</p>
      </>}
      {last && index > 0 && <button type="button" aria-label={r("story.prev")} onClick={() => go(-1)} className="absolute start-0 top-24 z-[2] h-40 w-[30%] cursor-default" />}
    </div>
  );
}
