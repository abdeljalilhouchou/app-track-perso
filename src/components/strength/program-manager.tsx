"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useT } from "@/components/language-provider";
import {
  createDefaultProgram,
  deleteTemplate,
  moveTemplate,
  saveTemplate,
  seedDefaultExercises,
} from "@/lib/actions/strength";
import { MUSCLE_GROUPS, exerciseKey, muscleColor, muscleGroupI18nPath } from "@/lib/strength";
import { ExercisePicker } from "@/components/strength/exercise-picker";
import type { CatalogItem, TemplateView } from "@/components/strength/types";

type Row = { name: string; muscle: string; sets: number; reps: number };

const smallInput =
  "w-14 rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-center text-xs outline-none focus:border-sport";

function muscleLabel(group: string, t: ReturnType<typeof useT>) {
  const path = muscleGroupI18nPath(group);
  return path ? t(path) : group;
}

function MuscleChip({ group, active, onClick }: { group: string; active: boolean; onClick?: () => void }) {
  const t = useT();
  const color = muscleColor(group);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rounded-full border px-2.5 py-1 text-xs font-medium transition"
      style={{
        borderColor: active ? color : `color-mix(in srgb, ${color} 35%, var(--border))`,
        background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : "transparent",
        color: active ? color : "var(--foreground-muted)",
      }}
    >
      {muscleLabel(group, t)}
    </button>
  );
}

function TemplateEditor({
  catalog,
  initial,
  onDone,
}: {
  catalog: CatalogItem[];
  initial?: TemplateView;
  onDone: () => void;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [groups, setGroups] = useState<string[]>(initial?.muscleGroups ?? []);
  const [rows, setRows] = useState<Row[]>(initial?.exercises ?? []);
  const [error, setError] = useState<string | null>(null);

  function move(i: number, dir: -1 | 1) {
    setRows((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function patch(i: number, values: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...values } : r)));
  }

  function toggleGroup(g: string) {
    setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await run(() => saveTemplate({ id: initial?.id, name, muscleGroups: groups, exercises: rows }), {
        success: initial
          ? t("sport.programManager.templateUpdatedToast", { name })
          : t("sport.programManager.templateCreatedToast", { name }),
        failure: t("sport.common.sessionNotSaved"),
      });
      if (!result || result.error) return setError(result?.error ?? t("sport.common.saveError"));
      onDone();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("sport.programManager.namePlaceholder")}
        className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium outline-none focus:border-sport focus:ring-2 focus:ring-sport/30"
      />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.programManager.targetedMuscles")}</p>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map((g) => (
            <MuscleChip key={g} group={g} active={groups.includes(g)} onClick={() => toggleGroup(g)} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {t("sport.programManager.exercisesCount", { count: rows.length })}
        </p>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-sport/40 p-4 text-center text-xs text-foreground-muted">
            {t("sport.programManager.addExercisesHint")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={t("sport.programManager.moveRowUpAria")}
                    className="text-[10px] leading-none text-foreground-muted transition hover:text-foreground disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={t("sport.programManager.moveRowDownAria")}
                    className="mt-1 text-[10px] leading-none text-foreground-muted transition hover:text-foreground disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-[11px]" style={{ color: muscleColor(r.muscle) }}>
                    {muscleLabel(r.muscle, t)}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={r.sets}
                  onChange={(e) => patch(i, { sets: Number(e.target.value) })}
                  aria-label={t("sport.programManager.setsOfAria", { name: r.name })}
                  className={smallInput}
                />
                <span className="text-xs text-foreground-muted">×</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={r.reps}
                  onChange={(e) => patch(i, { reps: Number(e.target.value) })}
                  aria-label={t("sport.programManager.repsOfAria", { name: r.name })}
                  className={smallInput}
                />
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={t("sport.programManager.removeAria", { name: r.name })}
                  className="text-xs text-foreground-muted transition hover:text-danger"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExercisePicker
        catalog={catalog}
        excludedKeys={rows.map((r) => exerciseKey(r.name))}
        defaultMuscle={groups[0] ?? "Pectoraux"}
        onPick={(exName, muscle) => setRows((prev) => [...prev, { name: exName, muscle, sets: 3, reps: 10 }])}
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !name.trim() || rows.length === 0}
          onClick={save}
          className="rounded-lg bg-sport px-4 py-2 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? t("sport.common.saving") : initial ? t("sport.programManager.saveEdits") : t("sport.programManager.createSession")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-muted transition hover:bg-surface-muted"
        >
          {t("sport.common.cancel")}
        </button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  index,
  total,
  catalog,
}: {
  template: TemplateView;
  index: number;
  total: number;
  catalog: CatalogItem[];
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const expanded = open || editing;
  const totalSets = template.exercises.reduce((s, e) => s + e.sets, 0);

  return (
    <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface">
      <div className="flex items-center gap-3 px-5 py-4">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: "color-mix(in srgb, var(--sport) 16%, transparent)", color: "var(--sport)" }}
        >
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => !editing && setOpen((o) => !o)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold">{template.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
            {template.muscleGroups.map((g) => (
              <span key={g} style={{ color: muscleColor(g) }}>
                {muscleLabel(g, t)}
              </span>
            ))}
            <span className="text-foreground-muted">
              · {t("sport.programManager.templateSummary", { exercises: template.exercises.length, sets: totalSets })}
            </span>
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1 text-foreground-muted">
          <button
            type="button"
            disabled={pending || index === 0}
            onClick={() => startTransition(async () => void (await run(() => moveTemplate(template.id, "up"))))}
            aria-label={t("sport.programManager.moveSessionUpAria")}
            className="rounded-md px-1.5 py-1 text-xs transition hover:bg-surface-muted disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={pending || index === total - 1}
            onClick={() => startTransition(async () => void (await run(() => moveTemplate(template.id, "down"))))}
            aria-label={t("sport.programManager.moveSessionDownAria")}
            className="rounded-md px-1.5 py-1 text-xs transition hover:bg-surface-muted disabled:opacity-30"
          >
            ▼
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {editing ? (
                <TemplateEditor catalog={catalog} initial={template} onDone={() => setEditing(false)} />
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-1.5">
                    {template.exercises.map((e) => (
                      <li key={e.name} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
                        <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: muscleColor(e.muscle) }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.name}</p>
                          <p className="text-[11px]" style={{ color: muscleColor(e.muscle) }}>
                            {muscleLabel(e.muscle, t)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--sport)" }}>
                          {e.sets} × {e.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-foreground-muted transition hover:text-foreground"
                    >
                      {t("sport.programManager.edit")}
                    </button>
                    <ConfirmDeleteButton
                      disabled={pending}
                      onConfirm={() =>
                        startTransition(
                          async () =>
                            void (await run(() => deleteTemplate(template.id), {
                              success: t("sport.programManager.templateDeletedToast", { name: template.name }),
                            }))
                        )
                      }
                      title={t("sport.common.confirmDeleteSessionTitle")}
                      message={t("sport.programManager.confirmDeleteTemplateMessage", { name: template.name })}
                      className="text-foreground-muted transition hover:text-danger"
                    >
                      {t("sport.common.delete")}
                    </ConfirmDeleteButton>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProgramManager({ templates, catalog }: { templates: TemplateView[]; catalog: CatalogItem[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          {t("sport.programManager.myWeekTitle", {
            count: templates.length,
            unit: t(templates.length > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne"),
          })}
        </p>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full border border-sport/40 px-3 py-1.5 text-xs font-medium text-foreground-muted transition hover:border-sport hover:text-sport"
          >
            {t("sport.programManager.newSession")}
          </button>
        )}
      </div>

      {creating && <TemplateEditor catalog={catalog} onDone={() => setCreating(false)} />}

      {templates.length === 0 && !creating ? (
        <div className="rounded-2xl border border-dashed border-sport/40 p-6 text-center">
          <p className="text-sm text-foreground-muted">{t("sport.programManager.noSessions")}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await run(() => createDefaultProgram(), {
                  success: t("sport.programManager.programCreatedToast"),
                  failure: t("sport.common.programNotCreated"),
                });
                if (r?.error) setError(r.error);
              })
            }
            className="mt-3 rounded-xl bg-sport px-4 py-2 text-sm font-semibold text-on-accent transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? t("sport.programManager.creating") : t("sport.common.createSplitButton")}
          </button>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      ) : (
        templates.map((tpl, i) => <TemplateCard key={tpl.id} template={tpl} index={i} total={templates.length} catalog={catalog} />)
      )}

      <p className="text-[11px] text-foreground-muted">{t("sport.programManager.orderHint")}</p>

      {catalog.length < 20 && (
        <div className="rounded-2xl border border-dashed border-sport/40 p-4">
          <p className="mb-2 text-sm text-foreground-muted">
            {t("sport.programManager.catalogHint", {
              count: catalog.length,
              unit: t(catalog.length > 1 ? "sport.common.exerciseOther" : "sport.common.exerciseOne"),
            })}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(
                async () => void (await run(() => seedDefaultExercises(), { success: t("sport.programManager.catalogImportedToast") }))
              )
            }
            className="rounded-lg border border-sport/50 px-3.5 py-2 text-sm font-medium text-sport transition hover:bg-sport-soft disabled:opacity-60"
          >
            {pending ? t("sport.programManager.importing") : t("sport.programManager.importCatalogButton")}
          </button>
        </div>
      )}
    </div>
  );
}
