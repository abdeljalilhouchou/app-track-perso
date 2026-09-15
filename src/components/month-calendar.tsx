"use client";

import { useTransition } from "react";
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
import { toggleHabitLog } from "@/lib/actions/habits";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function MonthCalendar({
  habitId,
  month,
  color,
  loggedDates,
}: {
  habitId: string;
  month: Date;
  color: string;
  loggedDates: Set<string>;
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-foreground-muted">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const logged = loggedDates.has(key);
          const future = key > todayStr;
          const isToday = isTodayFn(day);

          return (
            <button
              key={key}
              disabled={future || pending || !inMonth}
              onClick={() => startTransition(() => toggleHabitLog(habitId, key))}
              className={`aspect-square rounded-lg text-sm font-medium transition disabled:cursor-default ${
                !inMonth ? "opacity-0" : ""
              } ${future ? "text-foreground-muted opacity-30" : "hover:opacity-80"} ${
                isToday ? "ring-2 ring-accent" : ""
              }`}
              style={{
                background: logged ? color : "var(--surface-muted)",
                color: logged ? "white" : undefined,
              }}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
