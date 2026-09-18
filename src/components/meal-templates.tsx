"use client";

import { useMemo, useState, useTransition } from "react";
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
      if (initial) {
        const result = await updateMealTemplate(initial.id, name, icon, scaled);
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        await createMealTemplate(name, icon, scaled);
      }
      onDone();
    });
  }

  return (
    <div className="space-y-3 rounded-xl bg-surface-muted p-3">
      <div className="flex gap-2">
        <IconPicker name="icon" value={icon} onChange={setIcon} choices={TEMPLATE_ICONS} color="var(--nutrition)" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la recette (ex: Bowl protéiné)"
          className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un aliment à ajouter..."
          className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-accent"
        />
        <input
          type="number"
          min={1}
          value={grams}
          onChange={(e) => setGrams(Number(e.target.value))}
          aria-label="Quantité à ajouter"
          className="w-20 rounded-lg border border-border bg-surface px-2 py-2 text-xs outline-none focus:border-accent"
        />
      </div>
      {matches.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {matches.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => addItem(f)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-surface"
              >
                <span>{f.icon}</span>
                <span className="flex-1">{f.name}</span>
                <span className="text-foreground-muted">+ ajouter ({grams}{f.unit})</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div>
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-xs">
                <span>{it.base.icon}</span>
                <span className="min-w-0 flex-1 truncate">{it.base.food_name}</span>
                <input
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) => setQty(i, Number(e.target.value))}
                  aria-label={`Quantité de ${it.base.food_name}`}
                  className="w-16 rounded-md border border-border bg-surface-muted px-1.5 py-1 text-xs outline-none focus:border-accent"
                />
                <span className="w-5 text-foreground-muted">{it.base.unit}</span>
                <span className="w-16 text-right text-foreground-muted">{scaled[i].calories} kcal</span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Retirer ${it.base.food_name}`}
                  className="text-foreground-muted hover:text-danger"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-foreground-muted">
            Total : {Math.round(totals.calories)} kcal · {Math.round(totals.protein * 10) / 10}g protéines
          </p>
        </div>
      )}

      {error && <p className="text-xs text-danger">Enregistrement impossible : {error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !name.trim() || items.length === 0 || hasInvalidQty}
          onClick={save}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {initial ? "Enregistrer les modifications" : "Enregistrer la recette"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function TemplateRow({ template, foods }: { template: TemplateWithItems; foods: Food[] }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>("dejeuner");
  const totalCalories = template.meal_template_items.reduce((sum, it) => sum + it.calories, 0);

  if (editing) {
    return (
      <li>
        <TemplateBuilder foods={foods} initial={template} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-surface-muted p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface text-sm">
          {template.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{template.name}</p>
          <p className="text-xs text-foreground-muted">
            {template.meal_template_items.length} aliments · {Math.round(totalCalories)} kcal
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-xs text-foreground-muted hover:text-foreground"
        >
          Modifier
        </button>
        <ConfirmDeleteButton
          disabled={pending}
          onConfirm={() => startTransition(() => deleteMealTemplate(template.id))}
          title="Supprimer cette recette ?"
          message={`"${template.name}" sera retirée de tes recettes.`}
          className="shrink-0 text-xs text-foreground-muted hover:text-danger"
        >
          ✕
        </ConfirmDeleteButton>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as (typeof MEAL_TYPES)[number]["value"])}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent"
        >
          {MEAL_TYPES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => logMealTemplate(template.id, mealType))}
          className="flex-1 rounded-lg border-[1.5px] border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
        >
          Journaliser cette recette
        </button>
      </div>
    </li>
  );
}

export function MealTemplatesPanel({ templates, foods }: { templates: TemplateWithItems[]; foods: Food[] }) {
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          📖 Mes recettes ({templates.length})
        </p>
        {!showBuilder && (
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent"
          >
            + Nouvelle recette
          </button>
        )}
      </div>

      {showBuilder && (
        <div className="mb-4">
          <TemplateBuilder foods={foods} onDone={() => setShowBuilder(false)} />
        </div>
      )}

      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-foreground-muted">
          Aucune recette enregistrée pour l&apos;instant. Combine des aliments en une recette pour la journaliser en un clic.
        </p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} foods={foods} />
          ))}
        </ul>
      )}
    </div>
  );
}
