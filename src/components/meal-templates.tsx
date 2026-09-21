"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import {
  createMealTemplate,
  deleteMealTemplate,
  logMealTemplate,
  updateMealTemplate,
  type TemplateItemInput,
} from "@/lib/actions/nutrition";
import { computeMacros } from "@/lib/food-database";
import type { Food, MealTemplate, MealTemplateItem } from "@/types/database";

const TEMPLATE_ICONS = ["🍽️", "🥗", "🍳", "🥪", "🍲", "🥙", "🍱", "🥞", "🍛", "🍜"];

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "Petit-déj" },
  { value: "dejeuner", label: "Déjeuner" },
  { value: "diner", label: "Dîner" },
  { value: "collation", label: "Collation" },
] as const;

type TemplateWithItems = MealTemplate & { meal_template_items: MealTemplateItem[] };

// `base` holds the macros for `base.quantity_grams`; the edited quantity scales them proportionally.
type DraftItem = { base: TemplateItemInput; qty: number };

const round1 = (n: number) => Math.round(n * 10) / 10;

function scaleItem({ base, qty }: DraftItem): TemplateItemInput {
  const r = base.quantity_grams > 0 ? qty / base.quantity_grams : 1;
  return {
    ...base,
    quantity_grams: qty,
    calories: round1(base.calories * r),
    protein: round1(base.protein * r),
    carbs: round1(base.carbs * r),
    fat: round1(base.fat * r),
    fiber: round1(base.fiber * r),
    sugar: round1(base.sugar * r),
    sodium: round1(base.sodium * r),
    caffeine: round1(base.caffeine * r),
  };
}

function toDraft(item: MealTemplateItem): DraftItem {
  return {
    base: {
      food_id: item.food_id,
      food_name: item.food_name,
      icon: item.icon,
      quantity_grams: item.quantity_grams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sugar: item.sugar,
      sodium: item.sodium,
      caffeine: item.caffeine,
      unit: item.unit,
    },
    qty: item.quantity_grams,
  };
}

const iconBox = "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface text-sm";

function TemplateBuilder({
  foods,
  onDone,
  initial,
}: {
  foods: Food[];
  onDone: () => void;
  initial?: TemplateWithItems;
}) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "🍽️");
  const [items, setItems] = useState<DraftItem[]>(() => (initial?.meal_template_items ?? []).map(toDraft));
  const [query, setQuery] = useState("");
  const [grams, setGrams] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, foods]);

  function addItem(food: Food) {
    const m = computeMacros(food, grams);
    setItems((prev) => [
      ...prev,
      {
        qty: grams,
        base: {
          food_id: food.id,
          food_name: food.name,
          icon: food.icon,
          quantity_grams: grams,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber,
          sugar: m.sugar,
          sodium: m.sodium,
          caffeine: m.caffeine,
          unit: food.unit,
        },
      },
    ]);
    setQuery("");
    setGrams(100);
  }

  function setQty(index: number, qty: number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, qty } : it)));
  }

  const scaled = items.map(scaleItem);
  const totals = scaled.reduce(
    (acc, it) => ({ calories: acc.calories + it.calories, protein: acc.protein + it.protein }),
    { calories: 0, protein: 0 }
  );
  const hasInvalidQty = items.some((it) => !(it.qty > 0));

  function save() {
    setError(null);
    startTransition(async () => {
      const result = initial
        ? await run(() => updateMealTemplate(initial.id, name, icon, scaled), { success: `Recette « ${name} » modifiée` })
        : await run(() => createMealTemplate(name, icon, scaled), { success: `Recette « ${name} » créée 📖` });
      if (!result || result.error) {
        setError(result?.error ?? "Enregistrement impossible.");
        return;
      }
      onDone();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <IconPicker name="icon" value={icon} onChange={setIcon} choices={TEMPLATE_ICONS} color="var(--nutrition)" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la recette (ex: Bowl protéiné)"
          className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
              <span className={iconBox}>{it.base.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.base.food_name}</p>
                <p className="text-xs text-foreground-muted">
                  {scaled[i].calories} kcal · {scaled[i].protein}g P · {scaled[i].carbs}g G · {scaled[i].fat}g L
                </p>
              </div>
              <input
                type="number"
                min={1}
                value={it.qty}
                onChange={(e) => setQty(i, Number(e.target.value))}
                aria-label={`Quantité de ${it.base.food_name}`}
                className="w-16 shrink-0 rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
              />
              <span className="w-5 shrink-0 text-xs text-foreground-muted">{it.base.unit}</span>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Retirer ${it.base.food_name}`}
                className="shrink-0 text-foreground-muted hover:text-danger"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="+ Ajouter un aliment..."
          className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          type="number"
          min={1}
          value={grams}
          onChange={(e) => setGrams(Number(e.target.value))}
          aria-label="Quantité à ajouter"
          className="w-20 rounded-xl border border-border bg-surface-muted px-2 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      {matches.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-nutrition/40 bg-surface p-1.5">
          {matches.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => addItem(f)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-muted"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="flex-1">{f.name}</span>
                <span className="text-xs text-foreground-muted">
                  + {grams}
                  {f.unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <p className="text-xs text-foreground-muted">
          Total : {Math.round(totals.calories)} kcal · {Math.round(totals.protein * 10) / 10}g protéines
        </p>
      )}

      {error && <p className="text-xs text-danger">Enregistrement impossible : {error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !name.trim() || items.length === 0 || hasInvalidQty}
          onClick={save}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent transition hover:opacity-90 disabled:opacity-50"
        >
          {initial ? "Enregistrer les modifications" : "Enregistrer la recette"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface-muted"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function TemplateCard({ template, foods }: { template: TemplateWithItems; foods: Food[] }) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>("dejeuner");

  const items = template.meal_template_items;
  const totals = items.reduce(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const expanded = open || editing;

  return (
    <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface">
      <button
        type="button"
        onClick={() => !editing && setOpen((o) => !o)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={iconBox.replace("bg-surface ", "bg-surface-muted ")}>{template.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{template.name}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {Math.round(totals.calories)} kcal · {Math.round(totals.protein)}g P · {Math.round(totals.carbs)}g G ·{" "}
            {Math.round(totals.fat)}g L
          </p>
        </div>
        <span className="shrink-0 text-xs text-foreground-muted">
          {items.length} aliment{items.length !== 1 ? "s" : ""}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-xs text-foreground-muted"
        >
          ▼
        </motion.span>
      </button>

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
                <TemplateBuilder foods={foods} initial={template} onDone={() => setEditing(false)} />
              ) : (
                <div className="space-y-4">
                  <ul className="space-y-1.5">
                    {items.map((it) => (
                      <li key={it.id} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
                        <span className={iconBox}>{it.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{it.food_name}</p>
                          <p className="text-xs text-foreground-muted">
                            {it.quantity_grams}
                            {it.unit} · {it.calories} kcal · {it.protein}g P · {it.carbs}g G · {it.fat}g L
                          </p>
                          {(it.fiber > 0 || it.sugar > 0 || it.sodium > 0 || it.caffeine > 0) && (
                            <p className="text-[10px] text-foreground-muted/70">
                              {it.fiber}g fibres · {it.sugar}g sucres · {it.sodium}mg sodium
                              {it.caffeine > 0 ? ` · ☕ ${it.caffeine}mg caféine` : ""}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value as (typeof MEAL_TYPES)[number]["value"])}
                      className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent"
                    >
                      {MEAL_TYPES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => startTransition(async () => void (await run(() => logMealTemplate(template.id, mealType), { success: `Recette « ${template.name} » ajoutée au journal`, failure: "Ajout impossible" })))}
                      className="flex-1 rounded-lg border-[1.5px] border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-50"
                    >
                      Journaliser cette recette
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="shrink-0 text-xs text-foreground-muted hover:text-foreground"
                    >
                      Modifier
                    </button>
                    <ConfirmDeleteButton
                      disabled={pending}
                      onConfirm={() => startTransition(async () => void (await run(() => deleteMealTemplate(template.id), { success: `Recette « ${template.name} » supprimée` })))}
                      title="Supprimer cette recette ?"
                      message={`"${template.name}" sera retirée de tes recettes.`}
                      className="shrink-0 text-xs text-foreground-muted hover:text-danger"
                    >
                      Supprimer
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

export function MealTemplatesPanel({ templates, foods }: { templates: TemplateWithItems[]; foods: Food[] }) {
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Mes recettes ({templates.length})
        </p>
        {!showBuilder && (
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 rounded-full border border-nutrition/40 px-3 py-1.5 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent"
          >
            + Nouvelle recette
          </button>
        )}
      </div>

      {showBuilder && (
        <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
          <TemplateBuilder foods={foods} onDone={() => setShowBuilder(false)} />
        </div>
      )}

      {templates.length === 0 && !showBuilder ? (
        <p className="rounded-2xl border border-dashed border-nutrition/40 p-6 text-center text-xs text-foreground-muted">
          Aucune recette enregistrée pour l&apos;instant. Combine des aliments en une recette pour la journaliser en un clic.
        </p>
      ) : (
        templates.map((t) => <TemplateCard key={t.id} template={t} foods={foods} />)
      )}
    </div>
  );
}
