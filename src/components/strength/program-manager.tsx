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
import { programBalance } from "@/lib/strength-focus";

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
    <div className="space-y-4 rounded-3xl border-[1.5px] border-sport/50 bg-surface p-4">
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
  isNext,
}: {
  template: TemplateView;
  index: number;
  total: number;
  catalog: CatalogItem[];
  isNext: boolean;
}) {
  const t = useT();
  const f = (key: string, vars?: Record<string, string | number>) => t(`sport.focus.${key}`, vars);
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [open, setOpen] = useState(isNext);
  const [editing, setEditing] = useState(false);
  const expanded = open || editing;
  const totalSets = template.exercises.reduce((s, e) => s + e.sets, 0);

  return (
    <article className="overflow-hidden rounded-3xl bg-surface" style={{ border: isNext ? "1.5px solid color-mix(in srgb, var(--sport) 45%, var(--border))" : "1px solid var(--border)" }} data-template-card>
      <div className="flex items-center gap-2.5 p-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold" style={isNext ? { background: "var(--sport)", color: "#062016" } : { background: "var(--surface-muted)" }}>
          {index + 1}
        </span>
        <button type="button" onClick={() => !editing && setOpen((o) => !o)} aria-expanded={expanded} className="min-w-0 flex-1 text-start">
          <p className="truncate text-base font-bold">{template.name}</p>
          <p className="mt-0.5 truncate text-xs text-foreground-muted">{f("templateStats", { exercises: template.exercises.length, sets: totalSets })}</p>
        </button>
        <div className="flex shrink-0 items-center">
          <button type="button" disabled={pending || index === 0} onClick={() => startTransition(async () => void (await run(() => moveTemplate(template.id, "up"))))} aria-label={t("sport.programManager.moveSessionUpAria")} className="grid h-10 w-9 place-items-center rounded-xl text-sm text-foreground-muted transition hover:bg-surface-muted disabled:opacity-30">▲</button>
          <button type="button" disabled={pending || index === total - 1} onClick={() => startTransition(async () => void (await run(() => moveTemplate(template.id, "down"))))} aria-label={t("sport.programManager.moveSessionDownAria")} className="grid h-10 w-9 place-items-center rounded-xl text-sm text-foreground-muted transition hover:bg-surface-muted disabled:opacity-30">▼</button>
        </div>
      </div>
      {template.muscleGroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
          {template.muscleGroups.map((g) => (
            <span key={g} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${muscleColor(g)} 15%, transparent)`, color: `color-mix(in srgb, ${muscleColor(g)} 75%, var(--foreground))` }}>
              {muscleLabel(g, t)}
            </span>
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} className="overflow-hidden">
            <div className="border-t border-border px-3.5 pb-3.5 pt-1">
              {editing ? (
                <div className="pt-2.5"><TemplateEditor catalog={catalog} initial={template} onDone={() => setEditing(false)} /></div>
              ) : (
                <div className="space-y-3">
                  <ol>
                    {template.exercises.map((e, i) => (
                      <li key={`${e.name}-${i}`} className={`flex min-h-12 items-center gap-3 py-2 ${i ? "border-t border-border" : ""}`}>
                        <span aria-hidden className="h-7 w-1 shrink-0 rounded-full" style={{ background: muscleColor(e.muscle) }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{e.name}</p>
                          <p className="text-[11px] text-foreground-muted">{muscleLabel(e.muscle, t)}</p>
                        </div>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums">{e.sets} × {e.reps}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-xl border border-border text-[13px] font-semibold transition hover:bg-surface-muted" data-template-edit>
                      {t("sport.programManager.edit")}
                    </button>
                    <ConfirmDeleteButton
                      disabled={pending}
                      onConfirm={() => startTransition(async () => void (await run(() => deleteTemplate(template.id), { success: t("sport.programManager.templateDeletedToast", { name: template.name }) })))}
                      title={t("sport.common.confirmDeleteSessionTitle")}
                      message={t("sport.programManager.confirmDeleteTemplateMessage", { name: template.name })}
                      className="min-h-11 w-full rounded-xl border border-border text-[13px] font-semibold text-danger transition hover:bg-surface-muted"
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
    </article>
  );
}

export function ProgramManager({ templates, catalog, suggestedId = null }: { templates: TemplateView[]; catalog: CatalogItem[]; suggestedId?: string | null }) {
  const t = useT();
  const f = (key: string, vars?: Record<string, string | number>) => t(`sport.focus.${key}`, vars);
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = templates.find((tpl) => tpl.id === suggestedId) ?? null;
  const balance = programBalance(templates);
  const most = Math.max(1, ...balance.map((item) => item.sets));
  const low = balance.filter((item) => item.low);

  return (
    <div className="mx-auto max-w-2xl space-y-5" data-program-manager>
      {templates.length > 0 && (
        <section aria-label={f("programLabel")} className="space-y-2.5 rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-foreground-muted">{f("programLabel")}</p>
              <p className="mt-0.5 text-xl font-extrabold">{f(templates.length === 1 ? "rotationOne" : "rotation", { count: templates.length })}</p>
            </div>
            {next && <span className="shrink-0 rounded-full bg-sport-soft px-2.5 py-1 text-xs font-bold" style={{ color: "color-mix(in srgb, var(--sport) 62%, var(--foreground))" }}>{f("nextUpName", { name: next.name })}</span>}
          </div>
          <p className="text-[13px] text-foreground-muted">{f("rotationHint")}</p>
        </section>
      )}

      <section aria-labelledby="program-templates" className="space-y-2.5">
        <h2 id="program-templates" className="text-[15px] font-semibold">{f("templatesTitle")}</h2>
        {creating && <TemplateEditor catalog={catalog} onDone={() => setCreating(false)} />}
        {templates.length === 0 && !creating ? (
          <div className="rounded-3xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-foreground-muted">{t("sport.programManager.noSessions")}</p>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await run(() => createDefaultProgram(), { success: t("sport.programManager.programCreatedToast"), failure: t("sport.common.programNotCreated") });
                  if (r?.error) setError(r.error);
                })
              }
              className="mt-3 min-h-11 rounded-xl px-4 text-sm font-bold text-[#062016] disabled:opacity-60"
              style={{ background: "var(--sport)" }}
            >
              {pending ? t("sport.programManager.creating") : t("sport.common.createSplitButton")}
            </button>
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          </div>
        ) : (
          templates.map((tpl, i) => <TemplateCard key={tpl.id} template={tpl} index={i} total={templates.length} catalog={catalog} isNext={tpl.id === suggestedId} />)
        )}
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="min-h-[52px] w-full rounded-3xl border-[1.5px] border-dashed border-border text-sm font-bold transition hover:bg-surface-muted" data-new-template>
            {f("newTemplate")}
          </button>
        )}
      </section>

      {templates.length > 0 && (
        <section aria-labelledby="program-balance" className="space-y-2.5" data-program-balance>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="program-balance" className="text-[15px] font-semibold">{f("balance")}</h2>
            <span className="text-xs text-foreground-muted">{f("balanceScope")}</span>
          </div>
          <div className="space-y-2.5 rounded-3xl border border-border bg-surface p-3.5">
            <ul className="space-y-2.5">
              {balance.map((item) => (
                <li key={item.muscle} className="grid grid-cols-[104px_minmax(0,1fr)_28px] items-center gap-2.5 text-[13px]">
                  <span className="truncate">{muscleLabel(item.muscle, t)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full" style={{ width: `${Math.max(3, (item.sets / most) * 100)}%`, background: item.low ? "var(--nutrition)" : "var(--sport)" }} /></span>
                  <span className="text-end font-bold tabular-nums" style={item.low ? { color: "color-mix(in srgb, var(--nutrition) 75%, var(--foreground))" } : undefined}>{item.sets}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs" style={{ color: low.length ? "color-mix(in srgb, var(--nutrition) 75%, var(--foreground))" : "var(--foreground-muted)" }}>
              {low.length ? f("balanceLow", { muscles: low.map((item) => muscleLabel(item.muscle, t)).join(", ") }) : f("balanceOk")}
            </p>
          </div>
        </section>
      )}

      {catalog.length < 20 && (
        <div className="rounded-3xl border border-dashed border-border p-4">
          <p className="mb-2 text-sm text-foreground-muted">
            {t("sport.programManager.catalogHint", { count: catalog.length, unit: t(catalog.length > 1 ? "sport.common.exerciseOther" : "sport.common.exerciseOne") })}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => void (await run(() => seedDefaultExercises(), { success: t("sport.programManager.catalogImportedToast") })))}
            className="min-h-11 rounded-xl border border-border px-3.5 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-60"
          >
            {pending ? t("sport.programManager.importing") : t("sport.programManager.importCatalogButton")}
          </button>
        </div>
      )}
    </div>
  );
}
