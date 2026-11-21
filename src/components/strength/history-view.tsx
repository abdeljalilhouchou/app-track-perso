"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { addDays, format, parseISO, startOfWeek, subWeeks } from "date-fns";
import { useLanguage } from "@/components/language-provider";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import { DRAFT_EVENT, DRAFT_KEY, type Draft } from "@/components/strength/session-logger";
import type { SessionItem } from "@/components/strength/types";
import { deleteWorkout } from "@/lib/actions/sport";
import type { WorkoutDetail } from "@/lib/strength-stats";
import { formatLocalizedDate } from "@/lib/format-date";

const WEEKS_PER_PAGE = 4;

/** A new session draft with the exercises and set count of a past session, values left to fill. */
function draftFromDetail(session: SessionItem, detail: WorkoutDetail, templateId: string | null): Draft {
  return {
    name: session.activity,
    templateId,
    muscleGroups: session.muscleGroups,
    startedAt: Date.now(),
    exercises: detail.exercises.map((exercise) => ({
      id: crypto.randomUUID(),
      name: exercise.name,
      muscle: exercise.muscle,
      targetReps: exercise.sets[0]?.reps ?? null,
      sets: exercise.sets.map(() => ({ reps: "", weight: "", done: false })),
    })),
  };
}
const weekOf = (date: string) => format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");

export function HistoryView({ sessions, details, records, openDate, today, templateIds }: {
  sessions: SessionItem[];
  details: Record<string, WorkoutDetail>;
  /** Exercise names that set a record, per workout. */
  records: Record<string, string[]>;
  /** A day to open on arrival (links from the Sport hub and the calendar). */
  openDate: string | null;
  today: string;
  templateIds: Record<string, string | null>;
}) {
  const { t, language } = useLanguage();
  const f = (key: string, vars?: Record<string, string | number>) => t(`sport.focus.${key}`, vars);
  const n = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const router = useRouter();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);
  const [openId, setOpenId] = useState<string | null>(() => sessions.find((session) => session.date === openDate)?.id ?? null);

  const tons = (kg: number) => (kg >= 1000 ? `${n.format(Math.round(kg / 100) / 10)} t` : `${n.format(kg)} kg`);
  const needle = query.trim().toLocaleLowerCase(language);
  const matching = needle
    ? sessions.filter((session) => session.activity.toLocaleLowerCase(language).includes(needle) || details[session.id]?.exercises.some((exercise) => exercise.name.toLocaleLowerCase(language).includes(needle)))
    : sessions;

  const groups: { week: string; sessions: SessionItem[] }[] = [];
  for (const session of matching) {
    const week = weekOf(session.date);
    const last = groups[groups.length - 1];
    if (last?.week === week) last.sessions.push(session);
    else groups.push({ week, sessions: [session] });
  }
  // A session opened from a link stays reachable even when it is several weeks back.
  const openIndex = openId ? groups.findIndex((group) => group.sessions.some((session) => session.id === openId)) : -1;
  const shown = groups.slice(0, Math.max(pages * WEEKS_PER_PAGE, openIndex + 1));
  const thisWeek = weekOf(today);
  const lastWeek = format(subWeeks(parseISO(thisWeek), 1), "yyyy-MM-dd");
  const weekLabel = (week: string) => {
    if (week === thisWeek) return f("thisWeekGroup");
    if (week === lastWeek) return f("lastWeekGroup");
    const end = format(addDays(parseISO(week), 6), "yyyy-MM-dd");
    return `${formatLocalizedDate(week, language, { day: "numeric" })} – ${formatLocalizedDate(end, language, { day: "numeric", month: "short" })}`;
  };

  function redo(session: SessionItem) {
    const detail = details[session.id];
    if (!detail) return;
    try {
      if (localStorage.getItem(DRAFT_KEY) && !confirm(f("redoConfirm"))) return;
      const draft = draftFromDetail(session, detail, templateIds[session.id] ?? null);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      window.dispatchEvent(new Event(DRAFT_EVENT));
    } catch {
      return;
    }
    router.push("/sport/musculation?tab=session");
  }

  if (sessions.length === 0) {
    return <p className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">{t("sport.common.noSessionsRecorded")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5" data-history-view>
      <div className="flex gap-2">
        <label className="relative block flex-1">
          <span className="sr-only">{f("searchAria")}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="pointer-events-none absolute start-3 top-3.5 text-foreground-muted"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={f("searchPlaceholder")} className="h-11 w-full rounded-2xl border border-border bg-surface pe-3 ps-9 text-sm outline-none focus:border-sport" data-history-search />
        </label>
        <Link href="/sport/calendar" prefetch={false} aria-label={f("calendar")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface"><SportIcon name="calendar" className="h-[18px] w-[18px]" /></Link>
      </div>

      {shown.length === 0 && <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">{f("noResults")}</p>}

      {shown.map((group) => {
        const minutes = group.sessions.reduce((sum, session) => sum + session.duration, 0);
        const volume = group.sessions.reduce((sum, session) => sum + (details[session.id]?.volume ?? 0), 0);
        const summary = [
          f(group.sessions.length === 1 ? "sessionsCountOne" : "sessionsCount", { count: n.format(group.sessions.length) }),
          minutes >= 60 ? t("sport.hubDashboard.hoursMinutes", { hours: n.format(Math.floor(minutes / 60)), minutes: n.format(minutes % 60) }) : `${n.format(minutes)} min`,
          volume > 0 ? tons(volume) : null,
        ].filter(Boolean).join(" · ");
        return (
          <section key={group.week} aria-label={weekLabel(group.week)} className="space-y-2" data-history-week>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-foreground-muted">{weekLabel(group.week)}</h2>
              <span className="text-xs text-foreground-muted">{summary}</span>
            </div>
            {group.sessions.map((session) => {
              const detail = details[session.id];
              const open = openId === session.id;
              const recordNames = records[session.id] ?? [];
              const line = [`${n.format(session.duration)} min`, detail ? t(detail.totalSets === 1 ? "sport.focus.setsCountOne" : "sport.focus.setsCount", { count: n.format(detail.totalSets) }) : null, detail && detail.volume > 0 ? tons(detail.volume) : null].filter(Boolean).join(" · ");
              return (
                <article key={session.id} className="overflow-hidden rounded-[20px] bg-surface" style={{ border: open ? "1.5px solid color-mix(in srgb, var(--sport) 40%, var(--border))" : "1px solid var(--border)" }} data-history-session={session.date}>
                  <button type="button" onClick={() => setOpenId(open ? null : session.id)} aria-expanded={open} className="flex w-full items-center gap-3 p-3.5 text-start">
                    <span className="w-11 shrink-0 text-center">
                      <span className="block text-[11px] uppercase text-foreground-muted">{formatLocalizedDate(session.date, language, { weekday: "short" })}</span>
                      <span className="block text-xl font-extrabold leading-tight">{formatLocalizedDate(session.date, language, { day: "numeric" })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[15px] font-bold">{session.activity}</span>
                        {recordNames.length > 0 && <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in srgb, var(--mood) 16%, transparent)", color: "color-mix(in srgb, var(--mood) 70%, var(--foreground))" }}>★ {f("recordsBadge", { count: n.format(recordNames.length) })}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-foreground-muted">{line}</span>
                    </span>
                    <SportIcon name="chevron" className={`sport-chevron h-3.5 w-3.5 shrink-0 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
                        <div className="border-t border-border px-3.5 pb-3.5" data-history-detail>
                          {detail?.exercises.map((exercise, index) => (
                            <div key={`${exercise.name}-${index}`} className={`py-2.5 ${index ? "border-t border-border" : ""}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 truncate text-sm font-semibold">{exercise.name}</span>
                                {recordNames.includes(exercise.name) ? <span className="shrink-0 text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--mood) 70%, var(--foreground))" }}>★ {f("record")}</span> : null}
                              </div>
                              <bdi className="mt-0.5 block text-xs tabular-nums text-foreground-muted">{exercise.sets.map((set) => (set.weight > 0 ? `${n.format(set.weight)}×${n.format(set.reps)}` : `${n.format(set.reps)} reps`)).join(" · ")}</bdi>
                            </div>
                          ))}
                          {(session.notes || session.intensity) && (
                            <p className="mt-2.5 rounded-xl bg-surface-muted px-3 py-2.5 text-[13px]">
                              {[session.notes ? `« ${session.notes} »` : null, f("feelingValue", { value: n.format(session.intensity) })].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <div className={`mt-3 grid gap-2 ${detail ? "grid-cols-2" : "grid-cols-1"}`}>
                            {detail && <button type="button" onClick={() => redo(session)} className="min-h-11 rounded-xl bg-sport-soft text-[13px] font-bold" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }} data-history-redo>{f("redo")}</button>}
                            <ConfirmDeleteButton
                              disabled={pending}
                              onConfirm={() => startTransition(async () => void (await run(() => deleteWorkout(session.id), { success: t("sport.common.sessionDeletedToast", { name: session.activity }), failure: t("sport.common.deleteImpossible") })))}
                              title={t("sport.common.confirmDeleteSessionTitle")}
                              message={t(detail ? "sport.sessionList.confirmDeleteWithSets" : "sport.common.confirmDeleteMessage", { activity: session.activity, date: formatLocalizedDate(session.date, language, { day: "numeric", month: "long" }) })}
                              className="min-h-11 w-full rounded-xl border border-border text-[13px] font-semibold text-danger"
                            >
                              {t("sport.common.delete")}
                            </ConfirmDeleteButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </section>
        );
      })}

      {groups.length > shown.length && (
        <button type="button" onClick={() => setPages((value) => value + 1)} className="min-h-12 w-full rounded-2xl border border-border text-sm font-semibold transition hover:bg-surface-muted" data-history-more>
          {f("older")}
        </button>
      )}
    </div>
  );
}
