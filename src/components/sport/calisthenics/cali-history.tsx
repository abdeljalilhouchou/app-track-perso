"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { addDays, format, parseISO, startOfWeek, subWeeks } from "date-fns";
import { useLanguage } from "@/components/language-provider";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import { categoryColor } from "@/lib/calisthenics/focus";
import { formatLocalizedDate } from "@/lib/format-date";
import type { CalisthenicsExercise, CalisthenicsSet, Workout } from "@/types/database";

const WEEKS_PER_PAGE = 4;
const weekOf = (date: string) => format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");

export function CaliHistory({ workouts, setsByWorkout, exercisesById, recordsByWorkout, openId: initialOpen, today, busy, onRedo, onDelete }: {
  workouts: Workout[];
  setsByWorkout: Map<string, CalisthenicsSet[]>;
  exercisesById: Map<string, CalisthenicsExercise>;
  /** Exercise ids that set a record in each workout. */
  recordsByWorkout: Map<string, Set<string>>;
  openId: string | null;
  today: string;
  busy: boolean;
  onRedo: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
}) {
  const { t, language } = useLanguage();
  const v = (key: string, vars?: Record<string, string | number>) => t(`sport.calisthenicsUi.v3.${key}`, vars);
  const n = new Intl.NumberFormat(language);
  const nameOf = (exercise: CalisthenicsExercise | undefined, fallback: string) => (exercise ? (language === "ar" ? exercise.name_ar : language === "en" ? exercise.name_en : exercise.name_fr) : fallback);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);
  const [openId, setOpenId] = useState<string | null>(initialOpen);

  const totals = (workout: Workout) => {
    const rows = setsByWorkout.get(workout.id) ?? [];
    return { sets: rows.length, reps: rows.reduce((sum, row) => sum + (row.reps ?? 0), 0), hold: rows.reduce((sum, row) => sum + (row.hold_seconds ?? 0), 0) };
  };
  const hold = (seconds: number) => (seconds >= 60 ? `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")}` : `${seconds} s`);
  const needle = query.trim().toLocaleLowerCase(language);
  const matching = needle
    ? workouts.filter((workout) => workout.activity.toLocaleLowerCase(language).includes(needle) || (setsByWorkout.get(workout.id) ?? []).some((row) => nameOf(exercisesById.get(row.exercise_id ?? ""), row.exercise_name).toLocaleLowerCase(language).includes(needle)))
    : workouts;
  const groups: { week: string; workouts: Workout[] }[] = [];
  for (const workout of matching) {
    const week = weekOf(workout.workout_date);
    const last = groups[groups.length - 1];
    if (last?.week === week) last.workouts.push(workout);
    else groups.push({ week, workouts: [workout] });
  }
  const openIndex = openId ? groups.findIndex((group) => group.workouts.some((workout) => workout.id === openId)) : -1;
  const shown = groups.slice(0, Math.max(pages * WEEKS_PER_PAGE, openIndex + 1));
  const thisWeek = weekOf(today);
  const lastWeek = format(subWeeks(parseISO(thisWeek), 1), "yyyy-MM-dd");
  const weekLabel = (week: string) => week === thisWeek ? v("thisWeek") : week === lastWeek ? v("lastWeekGroup") : `${formatLocalizedDate(week, language, { day: "numeric" })} – ${formatLocalizedDate(format(addDays(parseISO(week), 6), "yyyy-MM-dd"), language, { day: "numeric", month: "short" })}`;

  if (workouts.length === 0) return <p className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">{v("noHistory")}</p>;

  return <div className="mx-auto max-w-2xl space-y-5" data-cali-history>
    <div className="flex gap-2">
      <label className="relative block flex-1">
        <span className="sr-only">{v("searchAria")}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="pointer-events-none absolute start-3 top-3.5 text-foreground-muted"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={v("searchPlaceholder")} className="h-11 w-full rounded-2xl border border-border bg-surface pe-3 ps-9 text-sm outline-none focus:border-sport" data-cali-history-search />
      </label>
      <Link href="/sport/calendar" prefetch={false} aria-label={v("calendar")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface"><SportIcon name="calendar" className="h-[18px] w-[18px]" /></Link>
    </div>

    {shown.length === 0 && <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">{v("noResults")}</p>}

    {shown.map((group) => {
      const minutes = group.workouts.reduce((sum, workout) => sum + workout.duration_minutes, 0);
      const reps = group.workouts.reduce((sum, workout) => sum + totals(workout).reps, 0);
      const summary = [v(group.workouts.length === 1 ? "sessionsCountOne" : "sessionsCount", { count: n.format(group.workouts.length) }), minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`, reps ? `${n.format(reps)} ${v("reps")}` : null].filter(Boolean).join(" · ");
      return <section key={group.week} aria-label={weekLabel(group.week)} className="space-y-2" data-cali-history-week>
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-[13px] font-bold uppercase tracking-wide text-foreground-muted">{weekLabel(group.week)}</h2><span className="text-xs text-foreground-muted">{summary}</span></div>
        {group.workouts.map((workout) => {
          const open = openId === workout.id;
          const rows = setsByWorkout.get(workout.id) ?? [];
          const sum = totals(workout);
          const records = recordsByWorkout.get(workout.id) ?? new Set<string>();
          const line = [`${workout.duration_minutes} min`, `${sum.sets} ${v("setsUnit")}`, sum.reps ? `${n.format(sum.reps)} ${v("reps")}` : null, sum.hold ? v("holdAmount", { value: hold(sum.hold) }) : null].filter(Boolean).join(" · ");
          const byExercise: { id: string; name: string; category: string | undefined; values: string[] }[] = [];
          for (const row of rows) {
            const id = row.exercise_id ?? row.exercise_name;
            let entry = byExercise.find((item) => item.id === id);
            if (!entry) { entry = { id, name: nameOf(exercisesById.get(row.exercise_id ?? ""), row.exercise_name), category: exercisesById.get(row.exercise_id ?? "")?.category ?? row.category, values: [] }; byExercise.push(entry); }
            entry.values.push((row.hold_seconds !== null ? `${row.hold_seconds} s` : `${row.reps ?? 0}`) + (row.added_weight_kg ? ` +${row.added_weight_kg} kg` : row.assistance_kg ? ` −${row.assistance_kg} kg` : ""));
          }
          return <article key={workout.id} className="overflow-hidden rounded-[20px] bg-surface" style={{ border: open ? "1.5px solid color-mix(in srgb, var(--habit) 40%, var(--border))" : "1px solid var(--border)" }} data-cali-history-session={workout.id}>
            <button type="button" onClick={() => setOpenId(open ? null : workout.id)} aria-expanded={open} className="flex w-full items-center gap-3 p-3.5 text-start">
              <span className="w-11 shrink-0 text-center"><span className="block text-[11px] uppercase text-foreground-muted">{formatLocalizedDate(workout.workout_date, language, { weekday: "short" })}</span><span className="block text-xl font-extrabold leading-tight">{formatLocalizedDate(workout.workout_date, language, { day: "numeric" })}</span></span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[15px] font-bold">{workout.activity}</span>{records.size > 0 && <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in srgb, var(--mood) 16%, transparent)", color: "color-mix(in srgb, var(--mood) 70%, var(--foreground))" }}>{v("recordBadge", { count: n.format(records.size) })}</span>}</span>
                <span className="mt-0.5 block truncate text-xs text-foreground-muted">{line}</span>
              </span>
              <SportIcon name="chevron" className={`sport-chevron h-3.5 w-3.5 shrink-0 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
            </button>
            <AnimatePresence initial={false}>
              {open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
                <div className="border-t border-border px-3.5 pb-3.5" data-cali-history-detail>
                  {byExercise.map((entry, index) => <div key={entry.id} className={`py-2.5 ${index ? "border-t border-border" : ""}`}>
                    <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><span aria-hidden className="h-4 w-1 shrink-0 rounded-sm" style={{ background: categoryColor(entry.category) }} /><span className="truncate">{entry.name}</span></span>{records.has(entry.id) && <span className="shrink-0 text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--mood) 70%, var(--foreground))" }}>★</span>}</div>
                    <bdi className="ms-3 mt-0.5 block text-xs tabular-nums text-foreground-muted">{entry.values.join(" · ")}</bdi>
                  </div>)}
                  {workout.notes && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-muted px-3 py-2.5 text-[13px]">{workout.notes}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={!rows.length} onClick={() => onRedo(workout)} className="min-h-11 rounded-xl text-[13px] font-bold disabled:opacity-40" style={{ background: "color-mix(in srgb, var(--habit) 16%, var(--surface))", color: "color-mix(in srgb, var(--habit) 70%, var(--foreground))" }} data-cali-redo>{v("redo")}</button>
                    <button type="button" disabled={busy} onClick={() => onDelete(workout)} className="min-h-11 rounded-xl border border-border text-[13px] font-semibold text-danger">{v("delete")}</button>
                  </div>
                </div>
              </motion.div>}
            </AnimatePresence>
          </article>;
        })}
      </section>;
    })}

    {groups.length > shown.length && <button type="button" onClick={() => setPages((value) => value + 1)} className="min-h-12 w-full rounded-2xl border border-border text-sm font-semibold transition hover:bg-surface-muted">{v("older")}</button>}
  </div>;
}
