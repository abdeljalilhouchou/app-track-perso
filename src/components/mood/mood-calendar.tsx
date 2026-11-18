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
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import { parseMoodNote } from "@/lib/mood-tags";
import { formatDay, localeOf, MOOD_COLOR, MOOD_EMOJI } from "./mood-scale";

export type MoodDay = { date: string; mood: number; energy: number; notes: string | null };

const EMOJI = MOOD_EMOJI;
const SCORE_COLOR = MOOD_COLOR;

export function MoodCalendar({ days, today }: { days: MoodDay[]; today: string }) {
  const { t, language } = useLanguage();
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
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="whitespace-nowrap font-semibold">{t("mood.calendar.title")}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label={t("mood.calendar.prevMonth")}
            className="grid h-11 w-11 place-items-center rounded-lg text-foreground-muted transition hover:bg-surface-muted rtl:rotate-180"
          >
            ←
          </button>
          <p className="min-w-32 text-center text-sm font-medium first-letter:uppercase">{new Intl.DateTimeFormat(localeOf(language), { month: "long", year: "numeric" }).format(month)}</p>
          <button
            type="button"
            disabled={isCurrentMonth}
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label={t("mood.calendar.nextMonth")}
            className="grid h-11 w-11 place-items-center rounded-lg text-foreground-muted transition hover:bg-surface-muted disabled:opacity-30 rtl:rotate-180"
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
              aria-pressed={isSel}
              aria-label={`${formatDay(key, language)}${entry ? ` · ${t(`mood.v2.moodLevels.l${entry.mood}`)}` : ""}`}
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
            {formatDay(selected, language)}
          </p>
          {detail ? (
            <p className="mt-1">
              <span className="mr-1.5 text-lg">{EMOJI[detail.mood]}</span>
              {t("mood.calendar.moodLabel")} <strong>{detail.mood}/5</strong> · {t("mood.calendar.energyLabel")}{" "}
              <strong>{detail.energy}/5</strong>
              {detail.notes && (
                <span className="block pt-1 text-xs text-foreground-muted">
                  {(() => { const note = parseMoodNote(detail.notes); return [note.tags.map((tag) => t(`mood.v2.tags.${tag}`)).join(" · "), note.text && t("mood.calendar.notesQuote", { notes: note.text })].filter(Boolean).join(" — "); })()}
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
