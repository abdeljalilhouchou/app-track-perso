"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday as isTodayFn,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { toggleHabitLog, setHabitLogNote } from "@/lib/actions/habits";
import { useT } from "@/components/language-provider";
import { WEEKDAY_SLUGS } from "@/lib/habit-categories";

export function MonthCalendar({
  habitId,
  month,
  color,
  loggedDates,
  notesByDate,
}: {
  habitId: string;
  month: Date;
  color: string;
  loggedDates: Set<string>;
  notesByDate: Record<string, string>;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const [selected, setSelected] = useState(todayStr);
  const [noteDraft, setNoteDraft] = useState(notesByDate[todayStr] ?? "");

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function selectDay(dateStr: string) {
    setSelected(dateStr);
    setNoteDraft(notesByDate[dateStr] ?? "");
  }

  function saveNote() {
    if (noteDraft.trim() === (notesByDate[selected] ?? "").trim()) return;
    startTransition(async () => void (await run(() => setHabitLogNote(habitId, selected, noteDraft), { success: t("habits.monthCalendar.noteSaved"), failure: t("habits.monthCalendar.noteSaveError") })));
  }

  const selectedDone = loggedDates.has(selected);
  const selectedIsFuture = selected > todayStr;

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-foreground-muted">
        {WEEKDAY_SLUGS.map((slug) => (
          <span key={slug}>{t(`habits.weekdaysMid.${slug}`)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const logged = loggedDates.has(key);
          const hasNote = Boolean(notesByDate[key]);
          const future = key > todayStr;
          const isToday = isTodayFn(day);
          const isSelected = key === selected;

          return (
            <button
              key={key}
              disabled={!inMonth}
              onClick={() => selectDay(key)}
              className={`relative aspect-square rounded-xl text-sm font-medium transition-all disabled:cursor-default ${
                !inMonth ? "opacity-0" : ""
              } ${future ? "text-foreground-muted opacity-40" : "hover:scale-105 hover:opacity-80"} ${
                isToday ? "ring-2 ring-accent" : ""
              } ${isSelected ? "outline-2 outline-offset-1" : ""}`}
              style={{
                background: logged ? color : "var(--surface-muted)",
                color: logged ? "white" : undefined,
                outlineColor: isSelected ? "var(--foreground)" : undefined,
              }}
            >
              {format(day, "d")}
              {hasNote && (
                <span
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                  style={{ background: logged ? "white" : color }}
                />
              )}
            </button>
          );
        })}
      </div>

      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="mt-4 rounded-xl border border-border bg-surface-muted p-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium capitalize">
            {format(new Date(selected), "EEEE d MMMM", { locale: fr })}
          </p>
          <button
            disabled={selectedIsFuture || pending}
            onClick={() =>
              startTransition(async () =>
                void (await run(() => toggleHabitLog(habitId, selected), {
                  success: selectedDone ? t("habits.monthCalendar.uncheckedDay") : t("habits.monthCalendar.checkedDay"),
                  undo: { run: () => toggleHabitLog(habitId, selected) },
                }))
              )
            }
            className="rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-40"
            style={{
              background: selectedDone ? color : "var(--foreground-muted)",
              color: selectedDone ? "white" : "var(--on-accent)",
            }}
          >
            {selectedDone ? t("habits.monthCalendar.done") : t("habits.monthCalendar.markDone")}
          </button>
        </div>
        <input
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={saveNote}
          disabled={selectedIsFuture}
          placeholder={t("habits.monthCalendar.notePlaceholder")}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none transition focus:border-accent disabled:opacity-50"
        />
      </motion.div>
    </div>
  );
}
