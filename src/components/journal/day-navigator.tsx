"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useClickOutside } from "@/lib/use-click-outside";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function DayNavigator({
  selectedDate,
  basePath = "/journal",
  markedDates,
}: {
  selectedDate: string;
  basePath?: string;
  markedDates?: string[];
}) {
  const router = useRouter();
  const marked = new Set(markedDates ?? []);
  const selected = parseISO(selectedDate);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function goToDate(date: Date) {
    setOpen(false);
    router.push(`${basePath}?date=${format(date, "yyyy-MM-dd")}`, { scroll: false });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {weekDays.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isSelected = dateStr === selectedDate;
          return (
            <Link
              key={dateStr}
              href={`${basePath}?date=${dateStr}`}
              scroll={false}
              className="flex w-11 shrink-0 flex-col items-center gap-1 rounded-xl py-2 transition"
              style={{ background: isSelected ? "var(--accent-soft)" : "transparent" }}
            >
              <span className="text-[10px] font-semibold text-foreground-muted">{WEEKDAY_LABELS[i]}</span>
              <span
                className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  background: isSelected ? "var(--accent)" : "transparent",
                  color: isSelected ? "white" : dateStr === todayStr ? "var(--accent)" : "var(--foreground)",
                }}
              >
                {format(day, "d")}
              </span>
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: marked.has(dateStr) ? "var(--nutrition)" : "transparent" }}
              />
            </Link>
          );
        })}
      </div>

      <div ref={ref} className="relative shrink-0">
        <button
          onClick={() => {
            setViewMonth(startOfMonth(selected));
            setOpen((o) => !o);
          }}
          aria-label="Choisir une date"
          className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground-muted transition hover:bg-surface"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-border bg-surface p-4 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="rounded-lg p-1 text-foreground-muted transition hover:bg-surface-muted"
                  aria-label="Mois précédent"
                >
                  ←
                </button>
                <p className="text-sm font-medium capitalize">{format(viewMonth, "MMMM yyyy", { locale: fr })}</p>
                <button
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="rounded-lg p-1 text-foreground-muted transition hover:bg-surface-muted"
                  aria-label="Mois suivant"
                >
                  →
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-foreground-muted">
                {WEEKDAY_LABELS.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const isSel = isSameDay(day, selected);
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={!inMonth}
                      onClick={() => goToDate(day)}
                      className="relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition disabled:opacity-0"
                      style={{
                        background: isSel ? "var(--accent)" : "transparent",
                        color: isSel ? "white" : isToday(day) ? "var(--accent)" : "var(--foreground)",
                      }}
                    >
                      {format(day, "d")}
                      {marked.has(format(day, "yyyy-MM-dd")) && (
                        <span
                          className="absolute bottom-0.5 h-1 w-1 rounded-full"
                          style={{ background: isSel ? "white" : "var(--nutrition)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => goToDate(new Date())}
                  className="mt-3 w-full rounded-lg border border-border py-1.5 text-xs font-medium text-foreground-muted transition hover:bg-surface-muted"
                >
                  Aujourd&apos;hui
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
