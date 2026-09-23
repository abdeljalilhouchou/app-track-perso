"use client";

import { useState, useTransition, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { Dialog } from "@/components/ui/dialog";
import { useT } from "@/components/language-provider";
import { createDefaultProgram, markTemplateDone } from "@/lib/actions/strength";
import { muscleColor, muscleGroupI18nPath } from "@/lib/strength";
import type { ExerciseSummary } from "@/lib/strength-stats";
import { SessionLogger, useSavedDraft, clearDraft, type Draft, type SessionResult } from "@/components/strength/session-logger";
import type { CatalogItem, TemplateView } from "@/components/strength/types";

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
}) {
  const t = useT();
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

  return (
    <div className="space-y-6">
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-[1.5px] border-sport bg-sport-soft p-5"
        >
          <p className="text-lg font-semibold">{t("sport.todaySession.sessionSavedTitle")}</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("sport.todaySession.sessionSavedSummary", {
              name: result.name,
              minutes: result.minutes,
              sets: result.sets,
              volume: result.volume.toLocaleString("fr-FR"),
            })}
          </p>
          {result.records.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.records.map((r) => (
                <li key={`${r.name}-${r.kind}`} className="text-sm">
                  {t("sport.todaySession.newRecord", {
                    type: t(r.kind === "1RM" ? "sport.todaySession.recordType1RM" : "sport.todaySession.recordTypeWeight"),
                    name: r.name,
                    value: r.value,
                  })}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-3 text-xs font-medium text-sport hover:underline"
          >
            {t("sport.common.close")}
          </button>
        </motion.div>
      )}

      {saved && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-mood/60 bg-mood-soft p-4">
          <div>
            <p className="text-sm font-semibold">{t("sport.todaySession.sessionInProgress", { name: saved.name })}</p>
            <p className="text-xs text-foreground-muted">
              {t("sport.todaySession.startedAt", { time: format(new Date(saved.startedAt), "HH:mm") })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => start(saved)}
              className="rounded-lg bg-sport px-3.5 py-2 text-sm font-semibold text-on-accent transition hover:opacity-90"
            >
              {t("sport.todaySession.resume")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(t("sport.todaySession.confirmDeleteInProgress"))) clearDraft();
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted transition hover:bg-surface-muted hover:text-danger"
            >
              {t("sport.common.delete")}
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-sport/50 p-8 text-center">
          <span className="text-4xl">🏋️</span>
          <p className="mt-3 font-medium">{t("sport.todaySession.emptyTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">{t("sport.todaySession.emptyBody")}</p>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await run(() => createDefaultProgram(), {
                    success: t("sport.todaySession.programCreatedToast"),
                    failure: t("sport.common.programNotCreated"),
                  });
                  if (r?.error) setError(r.error);
                })
              }
              className="rounded-xl bg-sport px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? t("sport.programManager.creating") : t("sport.common.createSplitButton")}
            </button>
            <button
              type="button"
              onClick={() => start(freeDraft(t("sport.todaySession.freeSessionName")))}
              className="rounded-xl border border-sport/50 px-5 py-2.5 text-sm font-medium text-sport transition hover:bg-sport-soft"
            >
              {t("sport.todaySession.freeSessionName")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.todaySession.thisWeekLabel")}</p>
              <p className="text-sm">
                <span className="font-semibold" style={{ color: "var(--sport)" }}>
                  {sessionsThisWeek}
                </span>{" "}
                / {goal} {t("sport.common.sessionOther")}
              </p>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--sport)" }}
                initial={false}
                animate={{ width: `${Math.min(100, Math.round((sessionsThisWeek / Math.max(1, goal)) * 100))}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {templates.map((tpl) => {
                const doneOn = doneThisWeek[tpl.id];
                const isNext = tpl.id === suggestedId && !doneOn;
                return (
                  <li key={tpl.id} className="flex items-stretch gap-1.5">
                    <button
                      type="button"
                      onClick={() => start(draftFromTemplate(tpl))}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-surface-muted"
                      style={{
                        borderColor: isNext ? "var(--sport)" : "color-mix(in srgb, var(--sport) 30%, var(--border))",
                        background: doneOn ? "color-mix(in srgb, var(--sport) 10%, var(--surface))" : undefined,
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          background: doneOn ? "var(--sport)" : "var(--surface-muted)",
                          color: doneOn ? "var(--on-accent)" : "var(--foreground-muted)",
                        }}
                      >
                        {doneOn ? "✓" : "•"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{tpl.name}</span>
                        <span className="flex flex-wrap gap-x-2 text-[11px] text-foreground-muted">
                          {tpl.muscleGroups.map((g) => (
                            <span key={g} style={{ color: muscleColor(g) }}>
                              {muscleLabel(g)}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-foreground-muted">
                        {doneOn
                          ? t("sport.todaySession.doneOn", { day: format(parseISO(doneOn), "EEE", { locale: fr }) })
                          : isNext
                            ? t("sport.todaySession.next")
                            : t("sport.todaySession.todo")}
                      </span>
                    </button>
                    {!doneOn && (
                      <button
                        type="button"
                        disabled={marking}
                        onClick={() => markDone(tpl)}
                        title={t("sport.todaySession.markDoneTitleAttr")}
                        aria-label={t("sport.todaySession.markDoneAria", { name: tpl.name })}
                        className="shrink-0 rounded-xl border border-sport/40 px-3 text-sm font-semibold text-sport transition hover:bg-sport hover:text-on-accent disabled:opacity-50"
                      >
                        ✓
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {suggested && (
            <div className="rounded-2xl border-[1.5px] border-sport bg-sport-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.todaySession.suggestedTitle")}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight">{suggested.name}</p>
              <p className="mt-0.5 text-sm text-foreground-muted">
                {t("sport.todaySession.suggestedStats", {
                  count: suggested.exercises.length,
                  sets: suggested.exercises.reduce((s, e) => s + e.sets, 0),
                })}
              </p>
              <ul className="mt-3 space-y-0.5 text-sm">
                {suggested.exercises.slice(0, 5).map((e) => (
                  <li key={e.name} className="flex justify-between gap-3">
                    <span className="truncate">{e.name}</span>
                    <span className="shrink-0 text-foreground-muted">
                      {e.sets} × {e.reps}
                    </span>
                  </li>
                ))}
                {suggested.exercises.length > 5 && (
                  <li className="text-xs text-foreground-muted">
                    {t("sport.todaySession.moreExercises", { count: suggested.exercises.length - 5 })}
                  </li>
                )}
              </ul>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => start(draftFromTemplate(suggested))}
                  className="flex-1 rounded-xl bg-sport px-5 py-3 text-sm font-semibold text-on-accent transition hover:opacity-90"
                >
                  {t("sport.todaySession.startSession")}
                </button>
                <button
                  type="button"
                  disabled={marking}
                  onClick={() => markDone(suggested)}
                  className="flex-1 rounded-xl border-[1.5px] border-sport px-5 py-3 text-sm font-semibold text-sport transition hover:bg-sport hover:text-on-accent disabled:opacity-50"
                >
                  {t("sport.todaySession.markDone")}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-foreground-muted">{t("sport.todaySession.markDoneHint")}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => start(freeDraft(t("sport.todaySession.freeSessionName")))}
            className="rounded-lg border border-dashed border-sport/50 px-3.5 py-2 text-sm font-medium text-sport transition hover:bg-sport-soft"
          >
            {t("sport.todaySession.freeSessionNoProgram")}
          </button>
        </>
      )}

      <Dialog open={markTarget !== null} onClose={() => setMarkTarget(null)} widthClassName="max-w-sm">
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

      <details className="group rounded-2xl border-[1.5px] border-sport/40 bg-surface">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium">
          <span className="text-foreground-muted group-open:text-foreground">{t("sport.todaySession.otherActivity")}</span>
        </summary>
        <div className="px-2 pb-2">{cardio}</div>
      </details>
    </div>
  );
}
