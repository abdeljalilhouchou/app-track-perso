"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { addFood, updateFood, deleteFood, seedDefaultFoods, seedDefaultDrinks } from "@/lib/actions/nutrition";
import { FOOD_CATEGORIES } from "@/lib/food-database";
import type { Food } from "@/types/database";

const FOOD_ICON_CHOICES = [
  "🍗", "🥩", "🍖", "🐟", "🦐", "🥚", "🥛", "🥣", "🧀", "🍚",
  "🍝", "🍞", "🥔", "🍟", "🌾", "🫘", "🍅", "🥒", "🥕", "🧅",
  "🥦", "🥬", "🫑", "🍆", "🍎", "🍌", "🍊", "🌴", "🍇", "🍓",
  "🍉", "🥑", "🥭", "🫒", "🧈", "🌰", "🥜", "🍯", "🧂", "🍫",
  "☕", "🍵", "🥤", "🧃", "💧", "🧋", "🍹", "🍽️",
];

function UnitCaffeineFields({
  defaultUnit,
  defaultCaffeine,
  fieldClass,
}: {
  defaultUnit: "g" | "ml";
  defaultCaffeine: number;
  fieldClass: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
        Type
        <select name="unit" defaultValue={defaultUnit} className={fieldClass}>
          <option value="g">Solide (g)</option>
          <option value="ml">Liquide (ml)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
        Caféine (mg/100)
        <input name="caffeine" type="number" min={0} step="0.1" defaultValue={defaultCaffeine} className={fieldClass} />
      </label>
    </div>
  );
}

function FoodRow({ food }: { food: Food }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-accent/40 bg-surface p-3">
        <form
          action={(formData) =>
            startTransition(async () => {
              await updateFood(food.id, formData);
              setEditing(false);
            })
          }
          className="space-y-2"
        >
          <div className="flex gap-2">
            <IconPicker name="icon" defaultValue={food.icon} choices={FOOD_ICON_CHOICES} color="var(--nutrition)" />
            <input
              name="name"
              required
              defaultValue={food.name}
              className="flex-1 rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <select
            name="category"
            defaultValue={food.category}
            className="w-full rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-xs outline-none focus:border-accent"
          >
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="grid grid-cols-4 gap-2">
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Kcal/100
              <input name="calories" type="number" min={0} step="0.1" defaultValue={food.calories} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Prot.
              <input name="protein" type="number" min={0} step="0.1" defaultValue={food.protein} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Gluc.
              <input name="carbs" type="number" min={0} step="0.1" defaultValue={food.carbs} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Lip.
              <input name="fat" type="number" min={0} step="0.1" defaultValue={food.fat} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Fibres
              <input name="fiber" type="number" min={0} step="0.1" defaultValue={food.fiber} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Sucres
              <input name="sugar" type="number" min={0} step="0.1" defaultValue={food.sugar} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Sodium (mg)
              <input name="sodium" type="number" min={0} step="1" defaultValue={food.sodium} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
          </div>
          <UnitCaffeineFields
            defaultUnit={food.unit}
            defaultCaffeine={food.caffeine}
            fieldClass="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Portion (libellé)
              <input name="portion_label" type="text" placeholder="Ex: 1 tranche" defaultValue={food.portion_label ?? ""} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Portion (g/ml)
              <input name="portion_grams" type="number" min={0} step="1" placeholder="Ex: 30" defaultValue={food.portion_grams ?? ""} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              Enregistrer
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface-muted">
              Annuler
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface text-sm">
        {food.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{food.name}</p>
        <p className="text-xs text-foreground-muted">
          {food.calories} kcal · {food.protein}g P · {food.carbs}g G · {food.fat}g L (/100{food.unit})
          {food.caffeine > 0 ? ` · ☕ ${food.caffeine}mg` : ""}
          {food.portion_grams ? ` · portion : ${food.portion_label ?? `${food.portion_grams}${food.unit}`}` : ""}
        </p>
      </div>
      <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-foreground-muted hover:text-foreground">
        Modifier
      </button>
      <ConfirmDeleteButton
        disabled={pending}
        onConfirm={() => startTransition(() => deleteFood(food.id))}
        title="Supprimer cet aliment ?"
        message={`"${food.name}" sera retiré de ta base d'aliments.`}
        className="shrink-0 text-xs text-foreground-muted hover:text-danger"
      >
        ✕
      </ConfirmDeleteButton>
    </li>
  );
}

export function FoodSettings({ foods }: { foods: Food[] }) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [addResetKey, setAddResetKey] = useState(0);
  const [seedError, setSeedError] = useState<string | null>(null);

  function runSeed(action: () => Promise<{ added: number; error: string | null }>) {
    setSeedError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setSeedError(result.error);
    });
  }

  const groups = new Map<string, Food[]>();
  for (const f of foods) {
    if (!groups.has(f.category)) groups.set(f.category, []);
    groups.get(f.category)!.push(f);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
      >
        ⚙️ Paramètres
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} widthClassName="max-w-lg">
        <div className="rounded-2xl bg-surface shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-surface px-5 py-4">
            <span className="text-sm font-semibold">Base d&apos;aliments ({foods.length})</span>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-surface-muted text-foreground-muted transition hover:bg-border">
              ✕
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            {foods.length === 0 && (
              <button
                onClick={() => runSeed(seedDefaultFoods)}
                disabled={pending}
                className="w-full rounded-xl border-[1.5px] border-dashed border-accent px-4 py-3 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-60"
              >
                {pending ? "Import..." : "📥 Importer la liste de base (~90 aliments et boissons)"}
              </button>
            )}

            {foods.length > 0 && !foods.some((f) => f.category === "Boissons") && (
              <button
                onClick={() => runSeed(seedDefaultDrinks)}
                disabled={pending}
                className="w-full rounded-xl border-[1.5px] border-dashed border-accent px-4 py-3 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-60"
              >
                {pending ? "Import..." : "☕ Importer les boissons (café, thé, jus, sodas…)"}
              </button>
            )}

            {seedError && (
              <p className="rounded-lg border border-danger/40 bg-surface-muted px-3 py-2 text-xs text-danger">
                Import impossible : {seedError}
              </p>
            )}

            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent"
              >
                + Ajouter un aliment
              </button>
            ) : (
              <form
                key={addResetKey}
                action={(formData) =>
                  startTransition(async () => {
                    await addFood(formData);
                    setAddResetKey((k) => k + 1);
                    setShowAdd(false);
                  })
                }
                className="space-y-2 rounded-xl bg-surface-muted p-3"
              >
                <div className="flex gap-2">
                  <IconPicker name="icon" defaultValue="🍽️" choices={FOOD_ICON_CHOICES} color="var(--nutrition)" />
                  <input name="name" required placeholder="Nom de l'aliment" className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent" />
                </div>
                <select name="category" defaultValue="Autres" className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-accent">
                  {FOOD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="grid grid-cols-4 gap-2">
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Kcal/100
                    <input name="calories" type="number" min={0} step="0.1" required className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Prot.
                    <input name="protein" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Gluc.
                    <input name="carbs" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Lip.
                    <input name="fat" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Fibres
                    <input name="fiber" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Sucres
                    <input name="sugar" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Sodium (mg)
                    <input name="sodium" type="number" min={0} step="1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                </div>
                <UnitCaffeineFields
                  defaultUnit="g"
                  defaultCaffeine={0}
                  fieldClass="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Portion (libellé)
                    <input name="portion_label" type="text" placeholder="Ex: 1 tranche" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    Portion (g/ml)
                    <input name="portion_grams" type="number" min={0} step="1" placeholder="Ex: 30" className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={pending} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60">
                    Ajouter
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface">
                    Annuler
                  </button>
                </div>
              </form>
            )}

            <div className="max-h-96 space-y-4 overflow-y-auto">
              {Array.from(groups.entries()).map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1.5 text-xs font-medium text-foreground-muted">{category}</p>
                  <ul className="space-y-1.5">
                    {items.map((f) => (
                      <FoodRow key={f.id} food={f} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
