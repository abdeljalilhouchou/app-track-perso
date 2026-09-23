"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useT } from "@/components/language-provider";

export type MoodDay = { date: string; mood: number; energy: number; notes: string | null };

const EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];
const SCORE_COLOR = ["", "var(--danger)", "var(--nutrition)", "var(--mood)", "var(--sport)", "var(--success)"];

export function MoodCalendar({ days, today }: { days: MoodDay[]; today: string }) {
  const t = useT();
  const byDate = new Map(days.map((d) => [d.date, d]));
  const [month, setMonth] = useState(startOfMonth(parseISO(today)));
  const [selected, setSelected] = useState(today);

  const WEEKDAYS = [
    t("mood.calendar.weekdayMon"),
    t("mood.calendar.weekdayTue"),
    t("mood.calendar.weekdayWed"),
    t("mood.calendar.weekdayThu"),
    t("mood.calendar.weekdayFri"),
    t("mood.calendar.weekdaySat"),
    t("mood.calendar.weekdaySun"),
  ];

  const grid = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const detail = byDate.get(selected);
  const isCurrentMonth = isSameMonth(month, parseISO(today));

  return (
    <div className="rounded-2xl border-[1.5px] border-mood/50 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("mood.calendar.title")}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label={t("mood.calendar.prevMonth")}
            className="rounded-lg px-2 py-1 text-foreground-muted transition hover:bg-surface-muted"
          >
            ←
          </button>
          <p className="min-w-32 text-center text-sm font-medium capitalize">{format(month, "MMMM yyyy", { locale: fr })}</p>
          <button
            type="button"
            disabled={isCurrentMonth}
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label={t("mood.calendar.nextMonth")}
            className="rounded-lg px-2 py-1 text-foreground-muted transition hover:bg-surface-muted disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-[10px] text-foreground-muted">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const entry = byDate.get(key);
          const future = key > today;
          const isSel = key === selected;
          return (
            <button
              key={key}
              type="button"
              disabled={future || !inMonth}
              onClick={() => setSelected(key)}
              className="relative flex aspect-square flex-col items-center justify-center rounded-lg text-[10px] transition disabled:opacity-0"
              style={{
                background: entry
                  ? `color-mix(in srgb, ${SCORE_COLOR[entry.mood]} 22%, var(--surface))`
                  : "var(--surface-muted)",
                border: `1.5px solid ${
                  isSel ? "var(--foreground)" : entry ? `color-mix(in srgb, ${SCORE_COLOR[entry.mood]} 45%, var(--border))` : "transparent"
                }`,
              }}
            >
              <span className="text-foreground-muted">{format(day, "d")}</span>
              {entry && <span className="text-base leading-none">{EMOJI[entry.mood]}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-foreground-muted">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: SCORE_COLOR[s] }} />
            {EMOJI[s]} {s}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="mt-4 rounded-xl border border-mood/30 p-3 text-sm"
        >
          <p className="text-xs font-semibold capitalize text-foreground-muted">
            {format(parseISO(selected), "EEEE d MMMM", { locale: fr })}
          </p>
          {detail ? (
            <p className="mt-1">
              <span className="mr-1.5 text-lg">{EMOJI[detail.mood]}</span>
              {t("mood.calendar.moodLabel")} <strong>{detail.mood}/5</strong> · {t("mood.calendar.energyLabel")}{" "}
              <strong>{detail.energy}/5</strong>
              {detail.notes && (
                <span className="block pt-1 text-xs text-foreground-muted">
                  {t("mood.calendar.notesQuote", { notes: detail.notes })}
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-xs text-foreground-muted">{t("mood.calendar.noEntry")}</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
