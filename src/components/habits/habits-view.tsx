"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Reorder } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ReorderableCard } from "@/components/strength/reorderable-card";
import { HabitCardV2, type HabitLogRow } from "@/components/habits/habit-card-v2";
import { HabitSheet } from "@/components/habits/habit-sheet";
import { HabitsProgress } from "@/components/habits/habits-progress";
import { HabitsManage } from "@/components/habits/habits-manage";
import { reorderHabits } from "@/lib/actions/habits";
import { currentStreak, dayState, isFlexible, jokerLeftThisWeek, weekStart, weeklyReview, addDays } from "@/lib/habits-v2";
import type { HabitIdea } from "@/lib/habit-categories";
import type { Habit } from "@/types/database";

type Tab = "today" | "progress" | "manage";
type Sheet = { habit?: Habit; idea?: HabitIdea; key: number } | null;
const MOMENT_ORDER = ["morning", "afternoon", "evening", "any"] as const;
const MOMENT_ICON = { morning: "🌅", afternoon: "☀️", evening: "🌙", any: "🕑" };

export function HabitsView({ habits, paused, logs, moods, today, todayLabel }: {
  habits: Habit[];
  paused: Habit[];
  logs: HabitLogRow[];
  moods: { entry_date: string; mood_score: number }[];
  today: string;
  todayLabel: string;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("today");
  const [sheet, setSheet] = useState<Sheet>(null);
  const index = new Map<string, Map<string, HabitLogRow>>();
  for (const log of logs) {
    if (!index.has(log.habit_id)) index.set(log.habit_id, new Map());
    index.get(log.habit_id)!.set(log.log_date, log);
  }
  const open = (next: Omit<NonNullable<Sheet>, "key">) => setSheet({ ...next, key: Date.now() });

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in" data-habits-view>
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide first-letter:uppercase" style={{ color: "var(--habit)" }}>{todayLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t("pages.habits.title")}</h1>
        </div>
        <button type="button" onClick={() => open({})} aria-label={t("habits.v2.newHabit")} className="grid h-11 w-11 place-items-center rounded-2xl text-on-accent shadow-lg" style={{ background: "var(--habit)", color: "#0b0b10" }} data-habit-new>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </header>

      <div role="tablist" aria-label={t("pages.habits.title")} className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["today", "progress", "manage"] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className="min-h-10 rounded-xl text-sm font-semibold transition-colors" style={tab === value ? { background: "var(--habit)", color: "#0b0b10" } : { color: "var(--foreground-muted)" }} data-habits-tab={value}>
            {t(`habits.v2.tabs.${value}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "today" && <TodayTab habits={habits} index={index} today={today} onEdit={(habit) => open({ habit })} onOpenProgress={() => setTab("progress")} />}
        {tab === "progress" && <HabitsProgress habits={habits} index={index} moods={moods} today={today} />}
        {tab === "manage" && <HabitsManage habits={habits} paused={paused} today={today} onIdea={(idea) => open({ idea })} />}
      </div>

      {sheet && <HabitSheet key={sheet.key} open onClose={() => setSheet(null)} habit={sheet.habit} idea={sheet.idea} />}
    </div>
  );
}

function TodayTab({ habits, index, today, onEdit, onOpenProgress }: {
  habits: Habit[];
  index: Map<string, Map<string, HabitLogRow>>;
  today: string;
  onEdit: (habit: Habit) => void;
  onOpenProgress: () => void;
}) {
  const { t } = useLanguage();
  const run = useActionToast();
  const [, startTransition] = useTransition();
  const [order, setOrder] = useState(() => habits.map((habit) => habit.id));
  const [reviewHidden, setReviewHidden] = useState<string | null>(() => {
    try { return localStorage.getItem("track-perso:habits-review-hidden"); } catch { return null; }
  });
  const byId = new Map(habits.map((habit) => [habit.id, habit]));
  // Keep new habits (after a create) at the end of the saved order.
  const ids = [...order.filter((id) => byId.has(id)), ...habits.map((habit) => habit.id).filter((id) => !order.includes(id))];

  const dueToday = (habit: Habit) => {
    const state = dayState(habit, index.get(habit.id)?.get(today), today, today);
    if (state !== "off") return true;
    // A flexible habit stays on today's list until its weekly target is met.
    if (!isFlexible(habit)) return false;
    const start = weekStart(today);
    let kept = 0;
    for (let i = 0; i < 7; i++) if (dayState(habit, index.get(habit.id)?.get(addDays(start, i)), addDays(start, i), today) === "done") kept += 1;
    return kept < habit.target_per_week;
  };
  const due = ids.map((id) => byId.get(id)!).filter(dueToday);
  const notToday = ids.map((id) => byId.get(id)!).filter((habit) => !dueToday(habit));
  const doneCount = due.filter((habit) => {
    const state = dayState(habit, index.get(habit.id)?.get(today), today, today);
    return state === "done";
  }).length;
  const remaining = due.length - doneCount;
  const streaks = habits.map((habit) => ({ name: habit.name, value: currentStreak(habit, index.get(habit.id), today), flexible: isFlexible(habit) })).filter((row) => !row.flexible).sort((a, b) => b.value - a.value);
  const jokerLeft = habits.some((habit) => jokerLeftThisWeek(habit, index.get(habit.id), today));
  const review = weeklyReview(habits, index, today);
  const ratio = due.length ? doneCount / due.length : 0;

  const moved = useRef(false);
  // One group per moment: a drag reorders that moment, the others keep their place.
  const reorderMoment = (momentIds: string[], next: string[]) => {
    moved.current = true;
    let k = 0;
    setOrder(ids.map((id) => (momentIds.includes(id) ? next[k++] : id)));
  };
  const commitOrder = () => {
    if (!moved.current) return;
    moved.current = false;
    startTransition(async () => void (await run(() => reorderHabits(ids))));
  };
  const hideReview = (start: string) => {
    setReviewHidden(start);
    try { localStorage.setItem("track-perso:habits-review-hidden", start); } catch { /* storage unavailable */ }
  };

  if (!habits.length) {
    return <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-foreground-muted" data-habits-empty>{t("habits.v2.empty")}</p>;
  }

  return (
    <div className="space-y-5">
      {review && reviewHidden !== review.start && (
        <section aria-labelledby="habits-review" className="space-y-3 rounded-3xl border border-border bg-surface p-4" data-habits-review>
          <div className="flex items-center justify-between gap-2">
            <h2 id="habits-review" className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              {t("habits.v2.review.title", { range: `${Number(review.start.slice(8))}–${Number(review.end.slice(8))}/${review.end.slice(5, 7)}` })}
            </h2>
            <button type="button" onClick={() => hideReview(review.start)} aria-label={t("habits.v2.review.hide")} className="-me-2 grid h-9 w-9 place-items-center rounded-xl text-foreground-muted hover:bg-surface-muted">×</button>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-bold tabular-nums">{review.rate} %</span>
            {review.delta !== null && review.delta !== 0 && (
              <span className="text-sm font-semibold" style={{ color: review.delta > 0 ? "var(--success)" : "var(--danger)" }}>
                {review.delta > 0 ? "▲" : "▼"} {t("habits.v2.review.points", { sign: "", value: Math.abs(review.delta) })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {review.best && <div className="rounded-2xl p-3" style={{ background: "color-mix(in srgb, var(--success) 12%, var(--surface))" }}><p className="text-[11px]" style={{ color: "var(--success)" }}>{t("habits.v2.review.top")}</p><p className="truncate text-sm font-semibold">{review.best.name} · {review.best.done}/{review.best.expected}</p></div>}
            {review.weakest && <div className="rounded-2xl p-3" style={{ background: "color-mix(in srgb, var(--nutrition) 12%, var(--surface))" }}><p className="text-[11px]" style={{ color: "var(--nutrition)" }}>{t("habits.v2.review.weak")}</p><p className="truncate text-sm font-semibold">{review.weakest.name} · {review.weakest.done}/{review.weakest.expected}</p></div>}
          </div>
          <button type="button" onClick={onOpenProgress} className="text-sm font-semibold" style={{ color: "var(--habit)" }}>{t("habits.v2.review.details")} ›</button>
        </section>
      )}

      <section className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4" data-habits-summary>
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
            <circle cx="38" cy="38" r="32" fill="none" stroke="var(--surface-muted)" strokeWidth="8" />
            <circle cx="38" cy="38" r="32" fill="none" stroke="var(--habit)" strokeWidth="8" strokeLinecap="round" strokeDasharray={201} strokeDashoffset={201 * (1 - ratio)} transform="rotate(-90 38 38)" className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums"><span>{doneCount}<span className="text-xs font-medium text-foreground-muted">/{due.length}</span></span></span>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="font-semibold">{!due.length ? t("habits.v2.noneToday") : remaining === 0 ? t("habits.v2.allDone") : remaining === 1 ? t("habits.v2.remainingOne") : t("habits.v2.remaining", { count: remaining })}</p>
          {streaks[0] && streaks[0].value > 0 && <p className="truncate text-xs text-foreground-muted">{t("habits.v2.bestStreak", { value: t("habits.v2.card.streakDays", { count: streaks[0].value }), name: streaks[0].name })}</p>}
          {jokerLeft && <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "color-mix(in srgb, #38bdf8 14%, var(--surface))", color: "#38bdf8" }}>◆ {t("habits.v2.jokerAvailable")}</span>}
        </div>
      </section>

      <div className="space-y-6">
        {MOMENT_ORDER.map((moment) => {
          const list = due.filter((habit) => (habit.moment ?? "any") === moment);
          if (!list.length) return null;
          return (
            <section key={moment} aria-labelledby={`moment-${moment}`} className="space-y-3" data-habits-moment={moment}>
              <h2 id={`moment-${moment}`} className="flex items-center gap-2 font-semibold"><span aria-hidden>{MOMENT_ICON[moment]}</span>{t(`habits.v2.moments.${moment}`)}<span className="text-xs font-medium text-foreground-muted">· {list.length}</span></h2>
              <Reorder.Group as="div" axis="y" values={list.map((habit) => habit.id)} onReorder={(next) => reorderMoment(list.map((habit) => habit.id), next)} className="space-y-3">
                {list.map((habit) => (
                  <MovableCard key={habit.id} id={habit.id} onDrop={commitOrder}>
                    {(startDrag) => <HabitCardV2 habit={habit} logs={index.get(habit.id) ?? new Map()} today={today} onEdit={() => onEdit(habit)} onDragStart={startDrag} />}
                  </MovableCard>
                ))}
              </Reorder.Group>
            </section>
          );
        })}
      </div>

      {notToday.length > 0 && (
        <details className="rounded-2xl border border-dashed border-border px-4" data-habits-not-today>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground-muted [&::-webkit-details-marker]:hidden">
            {t("habits.v2.notToday", { count: notToday.length })}<span aria-hidden className="rtl:rotate-180">›</span>
          </summary>
          <div className="space-y-3 pb-4">
            {notToday.map((habit) => <HabitCardV2 key={habit.id} habit={habit} logs={index.get(habit.id) ?? new Map()} today={today} onEdit={() => onEdit(habit)} />)}
          </div>
        </details>
      )}

    </div>
  );
}

/** A card the user can drag by its handle; the new order is saved when the drag ends. */
function MovableCard({ id, onDrop, children }: { id: string; onDrop: () => void; children: (startDrag: (event: React.PointerEvent) => void) => ReactNode }) {
  return (
    <div onPointerUp={onDrop}>
      <ReorderableCard id={id}>{children}</ReorderableCard>
    </div>
  );
}
