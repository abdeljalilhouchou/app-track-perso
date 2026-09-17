"use client";

import { useMemo, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { createMealTemplate, deleteMealTemplate, logMealTemplate, type TemplateItemInput } from "@/lib/actions/nutrition";
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

function TemplateBuilder({ foods, onDone }: { foods: Food[]; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🍽️");
  const [items, setItems] = useState<TemplateItemInput[]>([]);
  const [query, setQuery] = useState("");
  const [grams, setGrams] = useState(100);

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
      },
    ]);
    setQuery("");
    setGrams(100);
  }

  const totals = items.reduce(
    (acc, it) => ({ calories: acc.calories + it.calories, protein: acc.protein + it.protein }),
    { calories: 0, protein: 0 }
  );

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
                <span className="text-foreground-muted">+ ajouter</span>
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
                <span>{it.icon}</span>
                <span className="flex-1">{it.food_name} · {it.quantity_grams}g</span>
                <span className="text-foreground-muted">{it.calories} kcal</span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
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

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !name.trim() || items.length === 0}
          onClick={() =>
            startTransition(async () => {
              await createMealTemplate(name, icon, items);
              onDone();
            })
          }
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Enregistrer la recette
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

function TemplateRow({ template }: { template: TemplateWithItems }) {
  const [pending, startTransition] = useTransition();
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>("dejeuner");
  const totalCalories = template.meal_template_items.reduce((sum, it) => sum + it.calories, 0);

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

export function MealTemplates({ templates, foods }: { templates: TemplateWithItems[]; foods: Food[] }) {
  const [open, setOpen] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
      >
        📖 Mes recettes
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} widthClassName="max-w-lg">
        <div className="rounded-2xl bg-surface shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-surface px-5 py-4">
            <span className="text-sm font-semibold">Mes recettes ({templates.length})</span>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-surface-muted text-foreground-muted transition hover:bg-border">
              ✕
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            {!showBuilder ? (
              <button
                onClick={() => setShowBuilder(true)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent"
              >
                + Nouvelle recette
              </button>
            ) : (
              <TemplateBuilder foods={foods} onDone={() => setShowBuilder(false)} />
            )}

            {templates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-foreground-muted">
                Aucune recette enregistrée pour l&apos;instant.
              </p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto">
                {templates.map((t) => (
                  <TemplateRow key={t.id} template={t} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
