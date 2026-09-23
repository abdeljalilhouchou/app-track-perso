"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useToast } from "@/components/toast/toast-provider";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { addFood, updateFood, deleteFood, seedDefaultFoods, seedDefaultDrinks, resyncFoodDefaults } from "@/lib/actions/nutrition";
import { FOOD_CATEGORIES } from "@/lib/food-database";
import { useT } from "@/components/language-provider";
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
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
        {t("nutrition.foodSettings.typeLabel")}
        <select name="unit" defaultValue={defaultUnit} className={fieldClass}>
          <option value="g">{t("nutrition.foodSettings.solidOption")}</option>
          <option value="ml">{t("nutrition.foodSettings.liquidOption")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
        {t("nutrition.foodSettings.caffeineLabel")}
        <input name="caffeine" type="number" min={0} step="0.1" defaultValue={defaultCaffeine} className={fieldClass} />
      </label>
    </div>
  );
}

function FoodRow({ food }: { food: Food }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-accent/40 bg-surface p-3">
        <form
          action={(formData) =>
            startTransition(async () => {
              const r = await run(() => updateFood(food.id, formData), {
                success: t("nutrition.foodSettings.updateSuccess", { name: food.name }),
                failure: t("nutrition.common.updateFailure"),
              });
              if (!r || r.error) return;
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
              {t("nutrition.foodSettings.caloriesLabel")}
              <input name="calories" type="number" min={0} step="0.1" defaultValue={food.calories} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              {t("nutrition.foodSettings.proteinLabel")}
              <input name="protein" type="number" min={0} step="0.1" defaultValue={food.protein} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              {t("nutrition.foodSettings.carbsLabel")}
              <input name="carbs" type="number" min={0} step="0.1" defaultValue={food.carbs} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              {t("nutrition.foodSettings.fatLabel")}
              <input name="fat" type="number" min={0} step="0.1" defaultValue={food.fat} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              {t("nutrition.foodSettings.fiberLabel")}
              <input name="fiber" type="number" min={0} step="0.1" defaultValue={food.fiber} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              {t("nutrition.foodSettings.sugarLabel")}
              <input name="sugar" type="number" min={0} step="0.1" defaultValue={food.sugar} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              {t("nutrition.foodSettings.sodiumLabel")}
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
              {t("nutrition.foodSettings.portionLabelField")}
              <input name="portion_label" type="text" placeholder={t("nutrition.foodSettings.portionLabelPlaceholder")} defaultValue={food.portion_label ?? ""} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              {t("nutrition.foodSettings.portionGramsField")}
              <input name="portion_grams" type="number" min={0} step="1" placeholder={t("nutrition.foodSettings.portionGramsPlaceholder")} defaultValue={food.portion_grams ?? ""} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60">
              {t("common.save")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface-muted">
              {t("common.cancel")}
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
          {food.calories} kcal · {food.protein}g {t("nutrition.common.proteinAbbrev")} · {food.carbs}g{" "}
          {t("nutrition.common.carbsAbbrev")} · {food.fat}g {t("nutrition.common.fatAbbrev")} (/100{food.unit})
          {food.caffeine > 0 ? ` · ☕ ${food.caffeine}mg` : ""}
          {food.portion_grams
            ? ` · ${t("nutrition.foodSettings.portionInline", { details: food.portion_label ?? `${food.portion_grams}${food.unit}` })}`
            : ""}
        </p>
      </div>
      <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-foreground-muted hover:text-foreground">
        {t("common.edit")}
      </button>
      <ConfirmDeleteButton
        disabled={pending}
        onConfirm={() =>
          startTransition(async () =>
            void (await run(() => deleteFood(food.id), {
              success: t("nutrition.foodSettings.deleteSuccess", { name: food.name }),
              failure: t("nutrition.common.deleteFailure"),
            }))
          )
        }
        title={t("nutrition.foodSettings.deleteTitle")}
        message={t("nutrition.foodSettings.deleteMessage", { name: food.name })}
        className="shrink-0 text-xs text-foreground-muted hover:text-danger"
      >
        ✕
      </ConfirmDeleteButton>
    </li>
  );
}

export function FoodSettings({ foods }: { foods: Food[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const toast = useToast();
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
        className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-accent px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent"
      >
        {t("nutrition.foodSettings.openButton")}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} widthClassName="max-w-lg">
        <div className="rounded-2xl bg-surface shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-surface px-5 py-4">
            <span className="text-sm font-semibold">{t("nutrition.foodSettings.dialogTitle", { count: foods.length })}</span>
            <button onClick={() => setOpen(false)} aria-label={t("common.close")} className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-surface-muted text-foreground-muted transition hover:bg-border">
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
                {pending ? t("nutrition.foodSettings.importing") : t("nutrition.foodSettings.importFoodsButton")}
              </button>
            )}

            {foods.length > 0 && !foods.some((f) => f.category === "Boissons") && (
              <button
                onClick={() => runSeed(seedDefaultDrinks)}
                disabled={pending}
                className="w-full rounded-xl border-[1.5px] border-dashed border-accent px-4 py-3 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-60"
              >
                {pending ? t("nutrition.foodSettings.importing") : t("nutrition.foodSettings.importDrinksButton")}
              </button>
            )}

            {seedError && (
              <p className="rounded-lg border border-danger/40 bg-surface-muted px-3 py-2 text-xs text-danger">
                {t("nutrition.foodSettings.importErrorPrefix", { error: seedError })}
              </p>
            )}

            {foods.length > 0 && (
              <button
                onClick={() =>
                  startTransition(async () => {
                    const r = await run(() => resyncFoodDefaults(), { failure: t("nutrition.foodSettings.resyncFailure") });
                    if (!r || r.error) return;
                    // Deliberate success message even at 0: confirms the check ran instead of looking like nothing happened.
                    if (r.updated > 0) {
                      toast.success(
                        t("nutrition.foodSettings.resyncSuccess", {
                          count: r.updated,
                          word:
                            r.updated > 1
                              ? t("nutrition.foodSettings.resyncWordPlural")
                              : t("nutrition.foodSettings.resyncWordSingular"),
                        })
                      );
                    } else {
                      toast.info(t("nutrition.foodSettings.resyncUpToDate"));
                    }
                  })
                }
                disabled={pending}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent disabled:opacity-60"
                title={t("nutrition.foodSettings.resyncTooltip")}
              >
                {t("nutrition.foodSettings.resyncButton")}
              </button>
            )}

            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent"
              >
                {t("nutrition.foodSettings.addFoodButton")}
              </button>
            ) : (
              <form
                key={addResetKey}
                action={(formData) =>
                  startTransition(async () => {
                    const r = await run(() => addFood(formData), {
                      success: t("nutrition.foodSettings.addSuccess", { name: String(formData.get("name")) }),
                      failure: t("nutrition.common.addFailure"),
                    });
                    if (!r || r.error) return;
                    setAddResetKey((k) => k + 1);
                    setShowAdd(false);
                  })
                }
                className="space-y-2 rounded-xl bg-surface-muted p-3"
              >
                <div className="flex gap-2">
                  <IconPicker name="icon" defaultValue="🍽️" choices={FOOD_ICON_CHOICES} color="var(--nutrition)" />
                  <input name="name" required placeholder={t("nutrition.foodSettings.namePlaceholder")} className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:border-accent" />
                </div>
                <select name="category" defaultValue="Autres" className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-accent">
                  {FOOD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="grid grid-cols-4 gap-2">
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.caloriesLabel")}
                    <input name="calories" type="number" min={0} step="0.1" required className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.proteinLabel")}
                    <input name="protein" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.carbsLabel")}
                    <input name="carbs" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.fatLabel")}
                    <input name="fat" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.fiberLabel")}
                    <input name="fiber" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.sugarLabel")}
                    <input name="sugar" type="number" min={0} step="0.1" defaultValue={0} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.sodiumLabel")}
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
                    {t("nutrition.foodSettings.portionLabelField")}
                    <input name="portion_label" type="text" placeholder={t("nutrition.foodSettings.portionLabelPlaceholder")} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                  <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
                    {t("nutrition.foodSettings.portionGramsField")}
                    <input name="portion_grams" type="number" min={0} step="1" placeholder={t("nutrition.foodSettings.portionGramsPlaceholder")} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={pending} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60">
                    {t("common.add")}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface">
                    {t("common.cancel")}
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
