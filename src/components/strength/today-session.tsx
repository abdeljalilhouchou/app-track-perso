"use client";

import { useState, useTransition, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { createDefaultProgram, markTemplateDone } from "@/lib/actions/strength";
import { muscleColor } from "@/lib/strength";
import type { ExerciseSummary } from "@/lib/strength-stats";
import { SessionLogger, useSavedDraft, clearDraft, type Draft, type SessionResult } from "@/components/strength/session-logger";
import type { CatalogItem, TemplateView } from "@/components/strength/types";

function draftFromTemplate(t: TemplateView): Draft {
  return {
    name: t.name,
    templateId: t.id,
    muscleGroups: t.muscleGroups,
    startedAt: Date.now(),
    exercises: t.exercises.map((e) => ({
      id: crypto.randomUUID(),
      name: e.name,
      muscle: e.muscle,
      targetReps: e.reps,
      sets: Array.from({ length: e.sets }, () => ({ reps: "", weight: "", done: false })),
    })),
  };
}

function freeDraft(): Draft {
  return { name: "Séance libre", templateId: null, muscleGroups: [], startedAt: Date.now(), exercises: [] };
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
  const [pending, startTransition] = useTransition();
  const [marking, startMarking] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [active, setActive] = useState<Draft | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [burst, setBurst] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const saved = parseDraft(useSavedDraft());

  const suggested = templates.find((t) => t.id === suggestedId) ?? null;

  function markDone(t: TemplateView) {
    setError(null);
    setNotice(null);
    startMarking(async () => {
      const r = await markTemplateDone(t.id, today);
      if (r.error) setError(r.error);
      else setNotice(`« ${t.name} » marquée comme faite (60 min). Tu peux la supprimer dans l'onglet Historique si besoin.`);
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
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer" className="text-foreground-muted hover:text-foreground">
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
          <p className="text-lg font-semibold">Séance enregistrée 🎉</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {result.name} · {result.minutes} min · {result.sets} séries · {result.volume.toLocaleString("fr-FR")} kg de volume
          </p>
          {result.records.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.records.map((r) => (
                <li key={`${r.name}-${r.kind}`} className="text-sm">
                  🏆 Nouveau record de {r.kind === "1RM" ? "force (1RM estimé)" : "charge"} :{" "}
                  <strong>{r.name}</strong> — {r.value}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-3 text-xs font-medium text-sport hover:underline"
          >
            Fermer
          </button>
        </motion.div>
      )}

      {saved && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-mood/60 bg-mood-soft p-4">
          <div>
            <p className="text-sm font-semibold">Séance en cours : {saved.name}</p>
            <p className="text-xs text-foreground-muted">
              Démarrée à {format(new Date(saved.startedAt), "HH:mm")} — tes séries sont sauvegardées.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => start(saved)}
              className="rounded-lg bg-sport px-3.5 py-2 text-sm font-semibold text-on-accent transition hover:opacity-90"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Supprimer cette séance en cours ?")) clearDraft();
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted transition hover:bg-surface-muted hover:text-danger"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-dashed border-sport/50 p-8 text-center">
          <span className="text-4xl">🏋️</span>
          <p className="mt-3 font-medium">Crée ton programme de musculation</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-foreground-muted">
            Un split sur 4 jours (Pectoraux &amp; Triceps, Dos &amp; Biceps, Jambes, Épaules &amp; Abdos) avec ses exercices,
            que tu pourras modifier entièrement dans l&apos;onglet Programme.
          </p>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await createDefaultProgram();
                  if (r.error) setError(r.error);
                })
              }
              className="rounded-xl bg-sport px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Création..." : "Créer mon split 4 jours"}
            </button>
            <button
              type="button"
              onClick={() => start(freeDraft())}
              className="rounded-xl border border-sport/50 px-5 py-2.5 text-sm font-medium text-sport transition hover:bg-sport-soft"
            >
              Séance libre
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Cette semaine</p>
              <p className="text-sm">
                <span className="font-semibold" style={{ color: "var(--sport)" }}>
                  {sessionsThisWeek}
                </span>{" "}
                / {goal} séances
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
              {templates.map((t) => {
                const doneOn = doneThisWeek[t.id];
                const isNext = t.id === suggestedId && !doneOn;
                return (
                  <li key={t.id} className="flex items-stretch gap-1.5">
                    <button
                      type="button"
                      onClick={() => start(draftFromTemplate(t))}
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
                        <span className="block truncate text-sm font-medium">{t.name}</span>
                        <span className="flex flex-wrap gap-x-2 text-[11px] text-foreground-muted">
                          {t.muscleGroups.map((g) => (
                            <span key={g} style={{ color: muscleColor(g) }}>
                              {g}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-foreground-muted">
                        {doneOn
                          ? `fait ${format(parseISO(doneOn), "EEE", { locale: fr })}`
                          : isNext
                            ? "prochaine"
                            : "à faire"}
                      </span>
                    </button>
                    {!doneOn && (
                      <button
                        type="button"
                        disabled={marking}
                        onClick={() => markDone(t)}
                        title="Marquer cette séance comme faite"
                        aria-label={`Marquer ${t.name} comme faite`}
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
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Séance conseillée aujourd&apos;hui</p>
              <p className="mt-1 text-xl font-semibold tracking-tight">{suggested.name}</p>
              <p className="mt-0.5 text-sm text-foreground-muted">
                {suggested.exercises.length} exercices · {suggested.exercises.reduce((s, e) => s + e.sets, 0)} séries
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
                  <li className="text-xs text-foreground-muted">+ {suggested.exercises.length - 5} autres exercices</li>
                )}
              </ul>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => start(draftFromTemplate(suggested))}
                  className="flex-1 rounded-xl bg-sport px-5 py-3 text-sm font-semibold text-on-accent transition hover:opacity-90"
                >
                  Démarrer la séance
                </button>
                <button
                  type="button"
                  disabled={marking}
                  onClick={() => markDone(suggested)}
                  className="flex-1 rounded-xl border-[1.5px] border-sport px-5 py-3 text-sm font-semibold text-sport transition hover:bg-sport hover:text-on-accent disabled:opacity-50"
                >
                  {marking ? "Enregistrement..." : "Marquer comme fait"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-foreground-muted">
                « Marquer comme fait » enregistre la séance sans le détail des séries (60 min, intensité 3).
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => start(freeDraft())}
            className="rounded-lg border border-dashed border-sport/50 px-3.5 py-2 text-sm font-medium text-sport transition hover:bg-sport-soft"
          >
            + Séance libre (sans programme)
          </button>
        </>
      )}

      <details className="group rounded-2xl border-[1.5px] border-sport/40 bg-surface">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium">
          <span className="text-foreground-muted group-open:text-foreground">➕ Autre activité (cardio, sport collectif…)</span>
        </summary>
        <div className="px-2 pb-2">{cardio}</div>
      </details>
    </div>
  );
}
