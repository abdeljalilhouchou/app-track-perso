"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISODay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/components/language-provider";
import { WEEKDAY_SLUGS } from "@/lib/habit-categories";

export type CalendarHabit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  scheduledDays: number[];
  createdOn: string;
};

export function HabitsCalendar({
  habits,
  logs,
  today,
}: {
  habits: CalendarHabit[];
  /** habit id -> list of "yyyy-MM-dd" days it was done */
  logs: Record<string, string[]>;
  today: string;
}) {
  const t = useT();
  const doneSets = new Map(Object.entries(logs).map(([id, dates]) => [id, new Set(dates)]));
  const [month, setMonth] = useState(startOfMonth(parseISO(today)));
  const [selected, setSelected] = useState(today);

  // A habit is expected on a day only if it's scheduled that weekday and already existed then.
  function expectedOn(date: string) {
    const iso = getISODay(parseISO(date));
    return habits.filter((h) => h.scheduledDays.includes(iso) && date >= h.createdOn);
  }

  const grid = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const isCurrentMonth = isSameMonth(month, parseISO(today));

  const selectedExpected = expectedOn(selected);
  const selectedDone = selectedExpected.filter((h) => doneSets.get(h.id)?.has(selected));

  return (
    <div className="rounded-2xl border-[1.5px] border-habit/50 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("habits.calendar.title")}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label={t("habits.calendar.prevMonth")}
            className="rounded-lg px-2 py-1 text-foreground-muted transition hover:bg-surface-muted"
          >
            ←
          </button>
          <p className="min-w-32 text-center text-sm font-medium capitalize">{format(month, "MMMM yyyy", { locale: fr })}</p>
          <button
            type="button"
            disabled={isCurrentMonth}
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label={t("habits.calendar.nextMonth")}
            className="rounded-lg px-2 py-1 text-foreground-muted transition hover:bg-surface-muted disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-[10px] text-foreground-muted">
        {WEEKDAY_SLUGS.map((slug) => (
          <span key={slug}>{t(`habits.weekdaysShort.${slug}`)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const future = key > today;
          const expected = expectedOn(key);
          const done = expected.filter((h) => doneSets.get(h.id)?.has(key)).length;
          const ratio = expected.length ? done / expected.length : null;
          const isSel = key === selected;
          const missed = ratio === 0 && key < today;

          let background = "var(--surface-muted)";
          let border = "transparent";
          if (ratio !== null && ratio > 0) {
            background = `color-mix(in srgb, var(--habit) ${Math.round(18 + ratio * 62)}%, var(--surface))`;
            border = `color-mix(in srgb, var(--habit) 50%, var(--border))`;
          } else if (missed) {
            background = "color-mix(in srgb, var(--danger) 12%, var(--surface-muted))";
            border = "color-mix(in srgb, var(--danger) 45%, var(--border))";
          }

          return (
            <button
              key={key}
              type="button"
              disabled={future || !inMonth}
              onClick={() => setSelected(key)}
              className="relative flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] transition disabled:opacity-0"
              style={{
                background,
                border: `1.5px solid ${isSel ? "var(--foreground)" : border}`,
                color: ratio !== null && ratio >= 0.6 ? "var(--on-accent)" : undefined,
              }}
            >
              <span className="font-medium">{format(day, "d")}</span>
              {expected.length > 0 && (
                <span className="text-[9px] opacity-80">
                  {done}/{expected.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-foreground-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ background: "color-mix(in srgb, var(--habit) 30%, var(--surface))" }} /> {t("habits.calendar.legendPartial")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ background: "var(--habit)" }} /> {t("habits.calendar.legendAll")}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ background: "var(--danger)" }} /> {t("habits.calendar.legendNone")}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="mt-4 rounded-xl border border-habit/30 p-3"
        >
          <p className="mb-2 text-xs font-semibold capitalize text-foreground-muted">
            {format(parseISO(selected), "EEEE d MMMM", { locale: fr })}
            {selectedExpected.length > 0 && (
              <span className="font-normal"> {t("habits.calendar.doneSuffix", { done: selectedDone.length, expected: selectedExpected.length })}</span>
            )}
          </p>
          {selectedExpected.length === 0 ? (
            <p className="text-xs text-foreground-muted">{t("habits.calendar.emptyDay")}</p>
          ) : (
            <ul className="space-y-1">
              {selectedExpected.map((h) => {
                const done = doneSets.get(h.id)?.has(selected) ?? false;
                return (
                  <li key={h.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                      style={{
                        background: done ? h.color : "transparent",
                        border: `1.5px solid ${done ? h.color : "var(--border)"}`,
                        color: done ? "white" : "var(--danger)",
                      }}
                    >
                      {done ? "✓" : "✕"}
                    </span>
                    <span>{h.icon}</span>
                    <span className={done ? "" : "text-foreground-muted"}>{h.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
