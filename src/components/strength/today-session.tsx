"use client";

import { useState, useTransition, type ReactNode } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { Dialog } from "@/components/ui/dialog";
import { useLanguage, useT } from "@/components/language-provider";
import { createDefaultProgram, markTemplateDone } from "@/lib/actions/strength";
import Image from "next/image";
import { exerciseKey, muscleGroupI18nPath } from "@/lib/strength";
import { nextTarget } from "@/lib/strength-focus";
import { sportImage } from "@/lib/sport-media";
import { SportIcon } from "@/components/sport/ui/sport-icons";
import type { ExerciseSummary } from "@/lib/strength-stats";
import { SessionLogger, useSavedDraft, clearDraft, type Draft, type SessionResult } from "@/components/strength/session-logger";
import type { CatalogItem, TemplateView } from "@/components/strength/types";
import { formatLocalizedDate } from "@/lib/format-date";

function draftFromTemplate(tpl: TemplateView): Draft {
  return {
    name: tpl.name,
    templateId: tpl.id,
    muscleGroups: tpl.muscleGroups,
    startedAt: Date.now(),
    exercises: tpl.exercises.map((e) => ({
      id: crypto.randomUUID(),
      name: e.name,
      muscle: e.muscle,
      targetReps: e.reps,
      sets: Array.from({ length: e.sets }, () => ({ reps: "", weight: "", done: false })),
    })),
  };
}

function freeDraft(freeSessionName: string): Draft {
  return { name: freeSessionName, templateId: null, muscleGroups: [], startedAt: Date.now(), exercises: [] };
}

function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Draft;
    return Array.isArray(d.exercises) && typeof d.startedAt === "number" ? d : null;
  } catch {
    return null;
  }
}

export function TodaySession({
  templates,
  doneThisWeek,
  suggestedId,
  sessionsThisWeek,
  goal,
  summaries,
  catalog,
  today,
  cardio,
  lastByTemplate = {},
}: {
  templates: TemplateView[];
  doneThisWeek: Record<string, string>;
  suggestedId: string | null;
  sessionsThisWeek: number;
  goal: number;
  summaries: ExerciseSummary[];
  catalog: CatalogItem[];
  today: string;
  cardio: ReactNode;
  lastByTemplate?: Record<string, { date: string; minutes: number }>;
}) {
  const t = useT();
  const { language } = useLanguage();
  const muscleLabel = (group: string) => {
    const path = muscleGroupI18nPath(group);
    return path ? t(path) : group;
  };
  const [pending, startTransition] = useTransition();
  const [marking, startMarking] = useTransition();
  const run = useActionToast();
  const [markTarget, setMarkTarget] = useState<TemplateView | null>(null);
  const [markDuration, setMarkDuration] = useState("60");
  const [markDate, setMarkDate] = useState(today);
  const [markIntensity, setMarkIntensity] = useState(3);
  const [notice, setNotice] = useState<string | null>(null);
  const [active, setActive] = useState<Draft | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [burst, setBurst] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const saved = parseDraft(useSavedDraft());

  const suggested = templates.find((tpl) => tpl.id === suggestedId) ?? null;

  const DURATION_KEY = "mark-done-duration";

  /** Opens the small form (duration / date / intensity) instead of recording blindly. */
  function markDone(tpl: TemplateView) {
    let remembered = "60";
    try {
      remembered = localStorage.getItem(DURATION_KEY) ?? "60";
    } catch {
      // storage unavailable: fall back to 60
    }
    setMarkDuration(remembered);
    setMarkDate(today);
    setMarkIntensity(3);
    setMarkTarget(tpl);
  }

  function confirmMark() {
    const target = markTarget;
    const minutes = Math.round(Number(markDuration));
    if (!target) return;
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
      setError(t("sport.todaySession.invalidDuration"));
      return;
    }
    setError(null);
    setNotice(null);
    startMarking(async () => {
      const r = await run(() => markTemplateDone(target.id, markDate, minutes, markIntensity), { failure: t("sport.common.sessionNotSaved") });
      if (r?.error) return setError(r.error);
      if (!r) return;
      try {
        localStorage.setItem(DURATION_KEY, String(minutes));
      } catch {
        // not critical
      }
      setMarkTarget(null);
      setNotice(t("sport.todaySession.markedDoneNotice", { name: target.name, minutes }));
    });
  }

  function start(draft: Draft) {
    setResult(null);
    setActive(draft);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (active) {
    return (
      <SessionLogger
        key={active.startedAt}
        initial={active}
        summaries={summaries}
        catalog={catalog}
        today={today}
        onExit={() => setActive(null)}
        onSaved={(r) => {
          setActive(null);
          setResult(r);
          if (r.records.length > 0) setBurst((b) => b + 1);
        }}
      />
    );
  }

  const chosen = templates.find((tpl) => tpl.id === chosenId) ?? suggested ?? templates[0] ?? null;
  const n = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
  const summaryByKey = new Map(summaries.map((summary) => [summary.key, summary]));
  const f = (key: string, vars?: Record<string, string | number>) => t(`sport.focus.${key}`, vars);
  const ink = "color-mix(in srgb, var(--sport) 62%, var(--foreground))";

  return (
    <div className="mx-auto max-w-2xl space-y-5" data-today-session>
      <ConfettiBurst trigger={burst} />

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border-[1.5px] border-sport bg-sport-soft p-4 text-sm">
          <p>✓ {notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label={t("sport.common.close")} className="text-foreground-muted hover:text-foreground">
            ✕
          </button>
        </div>
      )}
      {error && templates.length > 0 && <p className="text-xs text-danger">{error}</p>}

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border-[1.5px] border-sport bg-sport-soft p-5" data-session-result>
          <p className="text-lg font-semibold">{t("sport.todaySession.sessionSavedTitle")}</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("sport.todaySession.sessionSavedSummary", { name: result.name, minutes: result.minutes, sets: result.sets, volume: n.format(result.volume) })}
          </p>
          {result.records.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.records.map((r) => (
                <li key={`${r.name}-${r.kind}`} className="text-sm">
                  {t("sport.todaySession.newRecord", { type: t(r.kind === "1RM" ? "sport.todaySession.recordType1RM" : "sport.todaySession.recordTypeWeight"), name: r.name, value: r.value })}
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setResult(null)} className="mt-3 min-h-10 text-xs font-semibold" style={{ color: ink }}>
            {t("sport.common.close")}
          </button>
        </motion.div>
      )}

      {saved && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-[1.5px] p-4" style={{ borderColor: "color-mix(in srgb, var(--sport) 50%, var(--border))", background: "var(--sport-soft)" }} data-session-resume>
          <div className="min-w-0">
            <p className="text-sm font-bold">{f("resumeTitle", { name: saved.name })}</p>
            <p className="text-xs text-foreground-muted">{f("resumeHint", { time: format(new Date(saved.startedAt), "HH:mm") })}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => start(saved)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-[#062016]" style={{ background: "var(--sport)" }}>
              {t("sport.todaySession.resume")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(t("sport.todaySession.confirmDeleteInProgress"))) clearDraft();
              }}
              className="min-h-11 rounded-xl border border-border px-3 text-sm text-foreground-muted transition hover:text-danger"
            >
              {t("sport.common.delete")}
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-3xl border-[1.5px] border-dashed border-sport/50 p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sport-soft" style={{ color: ink }}><SportIcon name="strength" className="h-7 w-7" /></span>
          <p className="mt-3 font-semibold">{t("sport.todaySession.emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">{t("sport.todaySession.emptyBody")}</p>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await run(() => createDefaultProgram(), { success: t("sport.todaySession.programCreatedToast"), failure: t("sport.common.programNotCreated") });
                  if (r?.error) setError(r.error);
                })
              }
              className="min-h-11 rounded-xl px-5 text-sm font-bold text-[#062016] disabled:opacity-60"
              style={{ background: "var(--sport)" }}
            >
              {pending ? t("sport.programManager.creating") : t("sport.common.createSplitButton")}
            </button>
            <button type="button" onClick={() => start(freeDraft(t("sport.todaySession.freeSessionName")))} className="min-h-11 rounded-xl border border-border px-5 text-sm font-semibold">
              {t("sport.todaySession.freeSessionName")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <section aria-label={f("programLabel")} className="space-y-2.5" data-program-strip>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold">{f("programLabel")}</p>
              <span className="text-xs text-foreground-muted">{f("weekCount", { done: n.format(sessionsThisWeek), goal: n.format(goal) })}</span>
            </div>
            <ol className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {templates.map((tpl) => {
                const doneOn = doneThisWeek[tpl.id];
                const selected = chosen?.id === tpl.id;
                return (
                  <li key={tpl.id} className="min-w-[104px] flex-1">
                    <button
                      type="button"
                      onClick={() => setChosenId(tpl.id)}
                      aria-pressed={selected}
                      className="flex min-h-14 w-full flex-col items-start justify-center rounded-2xl px-3 py-2 text-start"
                      style={selected ? { border: "2px solid var(--sport)" } : doneOn ? { background: "var(--sport-soft)" } : { border: "1px solid var(--border)", background: "var(--surface)" }}
                    >
                      <span className="w-full truncate text-[13px] font-bold" style={doneOn && !selected ? { color: ink } : undefined}>{doneOn ? "✓ " : ""}{tpl.name}</span>
                      <span className="text-[11px]" style={{ color: tpl.id === suggestedId && !doneOn ? ink : "var(--foreground-muted)" }}>
                        {doneOn ? f("doneOn", { day: formatLocalizedDate(doneOn, language, { weekday: "short", day: "numeric" }) }) : tpl.id === suggestedId ? f("today") : f("upNext")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {chosen && (
            <section aria-labelledby="session-of-day" className="overflow-hidden rounded-3xl border-[1.5px]" style={{ borderColor: "color-mix(in srgb, var(--sport) 45%, var(--border))", background: "color-mix(in srgb, var(--sport) 6%, var(--surface))" }} data-session-hero>
              <div className="relative h-[176px]">
                <Image src={sportImage("strength", t).src} alt="" fill priority sizes="(max-width: 672px) 100vw, 672px" className="object-cover object-[center_60%]" />
                <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(0 0 0 / 0.1) 0%, rgb(0 0 0 / 0.45) 50%, rgb(0 0 0 / 0.88) 100%)" }} />
                <div className="absolute inset-x-[18px] bottom-3.5 text-white">
                  {chosen.id === suggestedId && <span className="mb-2 inline-block rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#6ee7b7]">{f("sessionOfDay")}</span>}
                  <h2 id="session-of-day" className="text-[28px] font-extrabold leading-tight">{chosen.name}</h2>
                  <p className="mt-0.5 text-[13px] text-white/85">
                    {[f("stats", { count: n.format(chosen.exercises.length), sets: n.format(chosen.exercises.reduce((sum, e) => sum + e.sets, 0)) }), chosen.muscleGroups.map(muscleLabel).join(", ")].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3.5 p-[18px] pt-4">
                <p className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-2.5 text-[13px]">
                  <SportIcon name="stats" className="h-4 w-4 shrink-0" />
                  {lastByTemplate[chosen.id]
                    ? f("lastTime", { date: formatLocalizedDate(lastByTemplate[chosen.id].date, language, { weekday: "short", day: "numeric", month: "short" }), minutes: n.format(lastByTemplate[chosen.id].minutes) })
                    : f("neverDone")}
                </p>
                {chosen.exercises.length > 0 && (
                  <div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 px-0.5 pb-1.5 text-[11px] text-foreground-muted">
                      <span>{f("colExercise")}</span><span className="text-end">{f("colLast")}</span><span className="min-w-16 text-end" style={{ color: ink }}>{f("colGoal")}</span>
                    </div>
                    <ol>
                      {chosen.exercises.slice(0, 4).map((exercise, i) => {
                        const summary = summaryByKey.get(exerciseKey(exercise.name));
                        const last = summary?.sessions[summary.sessions.length - 1];
                        const top = last ? Math.max(...last.sets.map((set) => set.weight)) : null;
                        const aim = last ? nextTarget(last.sets, exercise.reps) : null;
                        const fmt = (weight: number, reps: number) => (weight > 0 ? `${n.format(weight)} kg` : `${n.format(reps)} reps`);
                        return (
                          <li key={`${exercise.name}-${i}`} className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-0.5 py-2.5 ${i ? "border-t border-border" : ""}`} data-hero-exercise>
                            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{exercise.name}</span><span className="block text-xs text-foreground-muted">{n.format(exercise.sets)} × {n.format(exercise.reps)}</span></span>
                            <span className="text-end text-[13px] text-foreground-muted">{last && top !== null ? fmt(top, Math.max(...last.sets.map((set) => set.reps))) : "—"}</span>
                            <span className="min-w-16 text-end text-[13px] font-bold" style={aim?.up ? { color: ink } : undefined}>{aim ? `${aim.up ? "↑ " : ""}${fmt(aim.weight, aim.reps)}` : "—"}</span>
                          </li>
                        );
                      })}
                    </ol>
                    {chosen.exercises.length > 4 && <p className="mt-1.5 text-[13px] text-foreground-muted">{f("more", { count: n.format(chosen.exercises.length - 4) })}</p>}
                  </div>
                )}
                <button type="button" onClick={() => start(draftFromTemplate(chosen))} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl text-base font-extrabold text-[#062016] transition-transform active:scale-[0.98]" style={{ background: "var(--sport)", boxShadow: "0 10px 28px -12px var(--sport)" }} data-start-session>
                  <SportIcon name="play" className="h-[18px] w-[18px]" />{f("start")}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={marking || Boolean(doneThisWeek[chosen.id])} onClick={() => markDone(chosen)} className="min-h-11 rounded-2xl border border-border bg-surface text-[13px] font-semibold disabled:opacity-50" data-mark-done>{f("markDone")}</button>
                  <button type="button" onClick={() => setPickerOpen(true)} className="min-h-11 rounded-2xl border border-border bg-surface text-[13px] font-semibold">{f("change")}</button>
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="something-else" className="space-y-2.5">
            <h2 id="something-else" className="text-[15px] font-semibold">{f("somethingElse")}</h2>
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <button type="button" onClick={() => start(freeDraft(t("sport.todaySession.freeSessionName")))} className="flex w-full items-center gap-3 border-b border-border p-3.5 text-start transition hover:bg-surface-muted" data-free-session>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sport-soft" style={{ color: ink }}><SportIcon name="plus" className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{f("free")}</span><span className="block text-xs text-foreground-muted">{f("freeHint")}</span></span>
                <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0" />
              </button>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-muted"><SportIcon name="activity" className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{f("other")}</span><span className="block text-xs text-foreground-muted">{f("otherHint")}</span></span>
                  <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-2 pb-2">{cardio}</div>
              </details>
            </div>
          </section>
        </>
      )}

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} widthClassName="max-w-sm" ariaLabel={f("changeTitle")}>
        <div className="space-y-3 rounded-3xl border border-border bg-surface p-5 shadow-2xl">
          <p className="text-base font-bold">{f("changeTitle")}</p>
          <ul className="space-y-1.5">
            {templates.map((tpl) => (
              <li key={tpl.id}>
                <button type="button" onClick={() => { setChosenId(tpl.id); setPickerOpen(false); }} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 text-start" style={{ borderColor: chosen?.id === tpl.id ? "var(--sport)" : "var(--border)" }}>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{tpl.name}</span><span className="block truncate text-xs text-foreground-muted">{tpl.muscleGroups.map(muscleLabel).join(", ")}</span></span>
                  {doneThisWeek[tpl.id] && <span className="text-xs font-semibold" style={{ color: ink }}>✓</span>}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setPickerOpen(false)} className="min-h-11 w-full rounded-xl border border-border text-sm font-semibold">{f("close")}</button>
        </div>
      </Dialog>

      <Dialog
        open={markTarget !== null}
        onClose={() => setMarkTarget(null)}
        widthClassName="max-w-sm"
        ariaLabel={markTarget?.name ?? t("sport.todaySession.markDone")}
      >
        <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.todaySession.markDone")}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{markTarget?.name}</p>

          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1 text-xs text-foreground-muted">
              {t("sport.todaySession.durationLabel")}
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                value={markDuration}
                onChange={(e) => setMarkDuration(e.target.value)}
                autoFocus
                className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:border-sport focus:ring-2 focus:ring-sport/30"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[45, 60, 75, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarkDuration(String(m))}
                  className="rounded-full border px-2.5 py-1 text-xs transition"
                  style={{
                    borderColor: markDuration === String(m) ? "var(--sport)" : "color-mix(in srgb, var(--sport) 35%, var(--border))",
                    background: markDuration === String(m) ? "var(--sport)" : "transparent",
                    color: markDuration === String(m) ? "var(--on-accent)" : undefined,
                  }}
                >
                  {m} {t("sport.common.min")}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-foreground-muted">
                {t("sport.todaySession.dateLabel")}
                <input
                  type="date"
                  value={markDate}
                  max={today}
                  onChange={(e) => setMarkDate(e.target.value || today)}
                  className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:border-sport"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-foreground-muted">
                {t("sport.common.intensityLabel")}
                <select
                  value={markIntensity}
                  onChange={(e) => setMarkIntensity(Number(e.target.value))}
                  className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:border-sport"
                >
                  <option value={1}>{t("sport.common.intensity1")}</option>
                  <option value={2}>{t("sport.common.intensity2")}</option>
                  <option value={3}>{t("sport.common.intensity3")}</option>
                  <option value={4}>{t("sport.common.intensity4")}</option>
                  <option value={5}>{t("sport.common.intensity5")}</option>
                </select>
              </label>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={marking}
              onClick={confirmMark}
              className="flex-1 rounded-xl bg-sport px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
            >
              {marking ? t("sport.common.saving") : t("sport.todaySession.confirmSession")}
            </button>
            <button
              type="button"
              onClick={() => setMarkTarget(null)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
            >
              {t("sport.common.cancel")}
            </button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
