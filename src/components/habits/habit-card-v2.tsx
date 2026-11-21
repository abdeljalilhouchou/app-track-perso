"use client";

import { useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useLanguage } from "@/components/language-provider";
import { useClickOutside } from "@/lib/use-click-outside";
import { applyHabitJoker, deleteHabit, pauseHabit, setHabitCount, setHabitLogNote, toggleHabitLog } from "@/lib/actions/habits";
import { CATEGORY_META, categorySlug, weekdaySlug } from "@/lib/habit-categories";
import { addDays, canUseJoker, currentStreak, dayState, isFlexible, isoWeekday, longestStreak, tally, weekStart, type DayState } from "@/lib/habits-v2";
import type { Habit } from "@/types/database";

export type HabitLogRow = { habit_id: string; log_date: string; value: number | null; is_joker: boolean; note: string | null; source: string | null };

const mix = (color: string, amount: number, base = "var(--surface)") => `color-mix(in srgb, ${color} ${amount}%, ${base})`;

/** One habit, as on the approved mockup: header, kind-specific body, week, history, note, actions. */
export function HabitCardV2({ habit, logs, today, onEdit, onDragStart }: {
  habit: Habit;
  logs: Map<string, HabitLogRow>;
  today: string;
  onEdit: () => void;
  onDragStart?: (event: ReactPointerEvent) => void;
}) {
  const { t } = useLanguage();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useClickOutside(popoverRef, () => setPicked(null));
  const v = (key: string, vars?: Record<string, string | number>) => t(`habits.v2.card.${key}`, vars);

  const kind = habit.kind ?? "check";
  const todayLog = logs.get(today);
  const todayState = dayState(habit, todayLog, today, today);
  const doneToday = kind === "avoid" ? false : todayState === "done";
  const [count, setCount] = useState(todayLog?.value ?? 0);
  const [note, setNote] = useState(todayLog?.note ?? "");
  const goal = habit.goal_value ?? 0;
  const streak = currentStreak(habit, logs, today);
  const flexible = isFlexible(habit);
  const categoryColor = CATEGORY_META[habit.category]?.color ?? "#6366f1";
  const start = weekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const weekDone = week.filter((date) => dayState(habit, logs.get(date), date, today) === "done").length;
  const weekTarget = flexible ? habit.target_per_week : week.filter((date) => dayState(habit, logs.get(date), date, today) !== "off").length;
  const heatStart = addDays(start, -77);
  const heat = Array.from({ length: 84 }, (_, i) => addDays(heatStart, i));
  const twelve = tally(habit, logs, heatStart, addDays(start, 6), today);
  const rate12 = twelve.expected ? `${Math.round((twelve.done / twelve.expected) * 100)} %` : "—";

  const call = (action: () => Promise<{ error: string | null }>, success?: string) =>
    startTransition(async () => void (await run(action, success ? { success } : undefined)));

  const toggleToday = () => call(() => toggleHabitLog(habit.id, today), doneToday ? v("uncheckedToast", { name: habit.name }) : v("checkedToast", { name: habit.name }));
  const changeCount = (next: number) => {
    const value = Math.max(0, Math.round(next * 100) / 100);
    setCount(value);
    startTransition(async () => {
      const result = await run(() => setHabitCount(habit.id, today, value));
      if (!result || result.error) setCount(todayLog?.value ?? 0);
    });
  };
  const slipToday = () => call(() => toggleHabitLog(habit.id, today), todayLog ? undefined : v("slipToast"));

  const stateStyle = (state: DayState, date: string) => {
    const base: React.CSSProperties = { width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 };
    if (state === "done") Object.assign(base, { background: habit.color, color: "#0b0b10" });
    else if (state === "joker") Object.assign(base, { background: mix("#38bdf8", 18), border: "1.5px solid #38bdf8", color: "#38bdf8" });
    else if (state === "partial") Object.assign(base, { background: `linear-gradient(0deg, ${habit.color} 50%, var(--surface-muted) 50%)`, border: `1.5px solid ${habit.color}` });
    else if (state === "missed" || state === "slip") Object.assign(base, { background: mix("var(--danger)", 14), border: "1.5px solid var(--danger)", color: "var(--danger)" });
    else if (state === "pending") Object.assign(base, { background: "var(--surface-muted)", border: "1.5px solid var(--border)" });
    else Object.assign(base, { color: "var(--border)" });
    if (date === today) base.boxShadow = `0 0 0 2px var(--surface), 0 0 0 3.5px ${habit.color}`;
    if (date === picked) base.outline = "2px solid var(--foreground)";
    return base;
  };
  const mark = (state: DayState) => (state === "done" ? "✓" : state === "joker" ? "◆" : state === "missed" || state === "slip" ? "✕" : state === "off" ? "·" : "");
  const dayName = (date: string) => t(`habits.weekdaysLong.${weekdaySlug(isoWeekday(date))}`);
  const pickedState = picked ? dayState(habit, logs.get(picked), picked, today) : null;

  return (
    <article
      className="flex flex-col gap-4 rounded-3xl border-[1.5px] p-4"
      style={{ borderColor: mix(habit.color, doneToday ? 55 : 35, "var(--border)"), background: doneToday ? mix(habit.color, 6) : "var(--surface)" }}
      data-habit-card={habit.name}
      data-habit-kind={kind}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: mix(habit.color, 18) }}>{habit.icon}</span>
        <div className="min-w-0 flex-1">
          <Link href={`/habits/${habit.id}`} className="block truncate font-semibold leading-tight hover:underline">{habit.name}</Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            <span className="rounded-full px-2 py-0.5" style={{ background: `color-mix(in srgb, ${categoryColor} 16%, transparent)`, color: categoryColor }}>{t(`habits.categories.${categorySlug(habit.category)}`)}</span>
            {habit.auto_source && <span className="rounded-full border border-sport/45 px-2 py-0.5 text-sport">{v("auto", { source: v(`sources.${habit.auto_source}`) })}</span>}
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: mix("var(--nutrition)", 16), color: "var(--nutrition)" }} data-habit-streak>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2c2.5 3.5 6 6 6 11a6 6 0 0 1-12 0c0-2.6 1.3-4.2 2.6-5.3.2 2.3 1.3 3.6 2.6 3.6 0-3.5-1.4-6 .8-9.3z" /></svg>
                {flexible ? v("streakWeeks", { count: streak }) : v("streakDays", { count: streak })}
              </span>
            )}
            {habit.reminder_time && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-foreground-muted">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
                {habit.reminder_time.slice(0, 5)}
              </span>
            )}
          </div>
        </div>
        {kind === "check" && (
          <button
            type="button"
            disabled={pending}
            aria-pressed={doneToday}
            onClick={toggleToday}
            className="min-h-10 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors disabled:opacity-60"
            style={doneToday ? { background: habit.color, color: "#0b0b10", boxShadow: `0 6px 18px -8px ${habit.color}` } : { border: "1px solid var(--border)" }}
            data-habit-toggle
          >
            {doneToday ? v("done") : v("markDone")}
          </button>
        )}
      </div>

      {kind === "count" && (
        <div className="flex items-center gap-3" data-habit-counter>
          <button type="button" aria-label={v("less")} disabled={count <= 0} onClick={() => changeCount(count - 1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border text-2xl disabled:opacity-40">−</button>
          <div className="min-w-0 flex-1">
            <p className="text-center text-2xl font-bold tabular-nums" aria-live="polite">{count} <span className="text-sm font-medium text-foreground-muted">/ {goal} {habit.goal_unit ?? ""}</span></p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${goal ? Math.min(100, (count / goal) * 100) : 0}%`, background: habit.color }} /></div>
          </div>
          <button type="button" aria-label={v("more")} onClick={() => changeCount(count + 1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl font-bold" style={{ background: habit.color, color: "#0b0b10" }} data-habit-plus>+</button>
        </div>
      )}

      {kind === "avoid" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted p-3.5" data-habit-avoid>
          <div>
            <p className="text-2xl font-bold tabular-nums">{todayLog ? 0 : streak} <span className="text-sm font-medium text-foreground-muted">{v("cleanDays")}</span></p>
            <p className="text-xs text-foreground-muted">{v("record", { count: longestStreak(habit, logs, today) })}</p>
          </div>
          <button type="button" disabled={pending} onClick={slipToday} className="min-h-11 rounded-2xl border px-3.5 text-sm font-semibold" style={todayLog ? { borderColor: "var(--border)" } : { borderColor: mix("var(--danger)", 45, "var(--border)"), color: "var(--danger)" }}>
            {todayLog ? v("undoSlip") : v("slipped")}
          </button>
          {todayLog && <p className="w-full text-xs text-foreground-muted">{v("slippedToday")}</p>}
        </div>
      )}

      <div>
        <div className="mb-2 flex justify-between text-xs text-foreground-muted">
          <span>{v("thisWeek")}</span>
          <span>{kind === "avoid" ? v("cleanWeek", { count: week.filter((date) => date <= today && dayState(habit, logs.get(date), date, today) === "done").length }) : v("weekCount", { done: weekDone, target: weekTarget })}</span>
        </div>
        <div className="relative grid grid-cols-7 gap-1">
          {week.map((date) => {
            const state = dayState(habit, logs.get(date), date, today);
            const tappable = date < today && state !== "off";
            const label = v("dayLabel", { day: dayName(date), state: v(`states.${state}`) });
            return (
              <div key={date} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px]" style={{ color: date === today ? habit.color : "var(--foreground-muted)", fontWeight: date === today ? 700 : 400 }}>{t(`habits.weekdaysShort.${weekdaySlug(isoWeekday(date))}`)}</span>
                {tappable ? (
                  <button type="button" aria-label={label} aria-expanded={picked === date} onClick={() => setPicked(picked === date ? null : date)} style={stateStyle(state, date)} data-habit-day={date} data-state={state}>{mark(state)}</button>
                ) : (
                  <span role="img" aria-label={label} style={stateStyle(state, date)} data-habit-day={date} data-state={state}>{mark(state)}</span>
                )}
              </div>
            );
          })}
          {picked && pickedState && (
            <div ref={popoverRef} className="absolute inset-x-0 top-full z-10 mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-muted p-2 ps-3 shadow-xl" data-habit-popover>
              <span className="text-xs">{v("catchUpQuestion", { day: dayName(picked) })}</span>
              <span className="flex-1" />
              {kind === "avoid" ? (
                <button type="button" onClick={() => { setPicked(null); call(() => toggleHabitLog(habit.id, picked)); }} className="min-h-9 rounded-xl border border-border px-3 text-xs font-semibold">{pickedState === "slip" ? v("undoSlip") : v("slipped")}</button>
              ) : pickedState === "done" || pickedState === "joker" || pickedState === "partial" ? (
                <button type="button" onClick={() => { setPicked(null); call(() => toggleHabitLog(habit.id, picked)); }} className="min-h-9 rounded-xl border border-border px-3 text-xs font-semibold">{v("uncheck")}</button>
              ) : (
                <>
                  <button type="button" onClick={() => { setPicked(null); call(() => toggleHabitLog(habit.id, picked), v("checkedToast", { name: habit.name })); }} className="min-h-9 rounded-xl bg-accent px-3 text-xs font-bold text-on-accent" data-habit-catch-up>{v("catchUp")}</button>
                  {canUseJoker(habit, logs, picked, today) && (
                    <button type="button" onClick={() => { setPicked(null); call(() => applyHabitJoker(habit.id, picked, today), v("jokerToast")); }} className="min-h-9 rounded-xl border px-3 text-xs font-semibold" style={{ borderColor: "#38bdf8", color: "#38bdf8" }} data-habit-joker>{v("joker")}</button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {picked && <div aria-hidden className="h-14" />}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div role="img" aria-label={v("rate12")} className="grid gap-[3px]" style={{ gridTemplateRows: "repeat(7, 8px)", gridAutoFlow: "column", gridAutoColumns: "8px" }}>
          {heat.map((date) => {
            const state = dayState(habit, logs.get(date), date, today);
            const fill = state === "done" ? habit.color : state === "partial" ? mix(habit.color, 50) : state === "joker" ? mix("#38bdf8", 45) : "var(--surface-muted)";
            return <span key={date} className="rounded-[2px]" style={{ background: date > today ? "transparent" : fill }} />;
          })}
        </div>
        <div className="text-end">
          <p className="text-xl font-bold tabular-nums">{rate12}</p>
          <p className="text-[11px] text-foreground-muted">{v("rate12")}</p>
        </div>
      </div>

      {(doneToday || (kind === "count" && count > 0)) && (
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground-muted">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
          <input value={note} onChange={(event) => setNote(event.target.value)} onBlur={() => note !== (todayLog?.note ?? "") && call(() => setHabitLogNote(habit.id, today, note))} maxLength={2000} placeholder={v("notePlaceholder")} aria-label={v("noteLabel")} className="min-w-0 flex-1 bg-transparent text-foreground outline-none" />
        </label>
      )}

      <div className="-mt-1 flex items-center justify-between border-t border-border pt-2">
        <button type="button" aria-label={v("drag")} onPointerDown={onDragStart} className="-ms-2 grid h-10 w-11 cursor-grab touch-none place-items-center text-foreground-muted active:cursor-grabbing" data-habit-drag>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
        </button>
        <div className="flex gap-0.5 text-sm">
          <button type="button" onClick={onEdit} className="min-h-10 rounded-xl px-2.5 text-foreground-muted hover:text-foreground" data-habit-edit>{v("edit")}</button>
          <button type="button" disabled={pending} onClick={() => call(() => pauseHabit(habit.id), t("habits.card.pauseSuccess", { name: habit.name }))} className="min-h-10 rounded-xl px-2.5 text-foreground-muted hover:text-foreground">{v("pause")}</button>
          <ConfirmDeleteButton
            disabled={pending}
            onConfirm={() => call(() => deleteHabit(habit.id), t("habits.card.deleteSuccess", { name: habit.name }))}
            title={t("habits.card.deleteConfirmTitle", { name: habit.name })}
            message={t("habits.card.deleteConfirmMessage")}
            className="min-h-10 rounded-xl px-2.5 text-danger"
          >
            {v("delete")}
          </ConfirmDeleteButton>
        </div>
      </div>
    </article>
  );
}
