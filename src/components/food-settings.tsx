"use client";

import { useState, useTransition } from "react";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useToast } from "@/components/toast/toast-provider";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { BarcodeScanner } from "@/components/nutrition/barcode-scanner";
import { addFood, updateFood, deleteFood, seedDefaultFoods, seedDefaultDrinks, resyncFoodDefaults } from "@/lib/actions/nutrition";
import { searchOpenFoodFacts, type BarcodeResult, type OffResult } from "@/lib/actions/openfoodfacts";
import { FOOD_CATEGORIES } from "@/lib/food-database";
import { CATEGORY_KEYS, caloriesFromMacros, caloriesMismatch, filterFoods } from "@/lib/food-base";
import { useT } from "@/components/language-provider";
import type { Food } from "@/types/database";

const FOOD_ICON_CHOICES = [
  "🍗", "🥩", "🍖", "🐟", "🦐", "🥚", "🥛", "🥣", "🧀", "🍚",
  "🍝", "🍞", "🥔", "🍟", "🌾", "🫘", "🍅", "🥒", "🥕", "🧅",
  "🥦", "🥬", "🫑", "🍆", "🍎", "🍌", "🍊", "🌴", "🍇", "🍓",
  "🍉", "🥑", "🥭", "🫒", "🧈", "🌰", "🥜", "🍯", "🧂", "🍫",
  "☕", "🍵", "🥤", "🧃", "💧", "🧋", "🍹", "🍽️",
];

const field = "min-h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-base outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";
const label = "flex flex-col gap-1.5 text-xs font-medium text-foreground-muted";

type Draft = {
  name: string; icon: string; category: string; unit: "g" | "ml";
  calories: string; protein: string; carbs: string; fat: string;
  fiber: string; sugar: string; sodium: string; caffeine: string;
  portion_label: string; portion_grams: string;
};
type View = { kind: "list" } | { kind: "edit"; food: Food } | { kind: "new"; draft?: Partial<Draft>; source?: string };

const str = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const num = (value: string) => Number(value.replace(",", ".")) || 0;

function draftOf(food?: Food, overrides: Partial<Draft> = {}): Draft {
  return {
    name: food?.name ?? "", icon: food?.icon ?? "🍽️", category: food?.category ?? "Autres", unit: food?.unit ?? "g",
    calories: str(food?.calories), protein: str(food?.protein ?? 0), carbs: str(food?.carbs ?? 0), fat: str(food?.fat ?? 0),
    fiber: str(food?.fiber ?? 0), sugar: str(food?.sugar ?? 0), sodium: str(food?.sodium ?? 0), caffeine: str(food?.caffeine ?? 0),
    portion_label: food?.portion_label ?? "", portion_grams: str(food?.portion_grams),
    ...overrides,
  };
}

function fromProduct(product: OffResult & { servingGrams?: number | null }): Partial<Draft> {
  return {
    name: (product.brand ? `${product.name} (${product.brand})` : product.name).slice(0, 120), icon: "🏷️",
    calories: str(product.calories), protein: str(product.protein), carbs: str(product.carbs), fat: str(product.fat),
    fiber: str(product.fiber), sugar: str(product.sugar), sodium: str(product.sodium),
    ...(product.servingGrams ? { portion_grams: str(product.servingGrams) } : {}),
  };
}

/** The food base: search, category filters and a sheet per food, with tools tucked away. */
export function FoodSettings({ foods, usage = {}, customIds = [] }: { foods: Food[]; usage?: Record<string, number>; customIds?: string[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });

  return (
    <>
      <button
        onClick={() => { setView({ kind: "list" }); setOpen(true); }}
        className="flex min-h-11 items-center gap-1.5 rounded-xl border-[1.5px] border-accent px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent"
        data-food-base-open
      >
        {t("nutrition.foodSettings.openButton")}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} widthClassName="max-w-2xl" ariaLabel={t("nutrition.foodBase.title")}>
        <div className="flex max-h-[92dvh] flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl" data-food-base>
          {view.kind === "list" ? (
            <FoodList foods={foods} usage={usage} customIds={customIds} onClose={() => setOpen(false)} onOpen={(food) => setView({ kind: "edit", food })} onNew={(draft) => setView({ kind: "new", draft })} />
          ) : (
            <FoodSheet
              key={view.kind === "edit" ? view.food.id : `new-${view.draft?.name ?? ""}`}
              food={view.kind === "edit" ? view.food : undefined}
              initial={view.kind === "new" ? view.draft : undefined}
              onBack={() => setView({ kind: "list" })}
            />
          )}
        </div>
      </Dialog>
    </>
  );
}

function FoodList({ foods, usage, customIds, onClose, onOpen, onNew }: {
  foods: Food[]; usage: Record<string, number>; customIds: string[];
  onClose: () => void; onOpen: (food: Food) => void; onNew: (draft?: Partial<Draft>) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"frequent" | "name">("frequent");
  const custom = new Set(customIds);
  const uses = new Map(Object.entries(usage));
  const shown = filterFoods(foods, { query, category, customIds: custom, usage: uses, sort });
  const categoryName = (value: string) => (CATEGORY_KEYS[value] ? t(`nutrition.foodBase.categories.${CATEGORY_KEYS[value]}`) : value);
  const present = FOOD_CATEGORIES.filter((value) => foods.some((food) => food.category === value));
  const chips = [
    { value: "all", label: t("nutrition.foodBase.all"), count: foods.length },
    ...(custom.size ? [{ value: "mine", label: t("nutrition.foodBase.mine"), count: custom.size }] : []),
    ...present.map((value) => ({ value, label: categoryName(value), count: foods.filter((food) => food.category === value).length })),
  ];

  return (
    <>
      <div className="space-y-3 border-b border-border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("nutrition.foodBase.title")}</h2>
            <p className="text-xs text-foreground-muted">{t("nutrition.foodBase.count", { count: foods.length })}</p>
          </div>
          <button onClick={onClose} aria-label={t("common.close")} className="grid h-11 w-11 place-items-center rounded-xl text-xl text-foreground-muted hover:bg-surface-muted">×</button>
        </div>
        <div className="flex gap-2">
          <label htmlFor="food-search" className="sr-only">{t("nutrition.foodBase.search")}</label>
          <input id="food-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("nutrition.foodBase.search")} className={`${field} flex-1`} autoComplete="off" data-food-search />
          <button type="button" onClick={() => onNew()} className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-accent px-3.5 text-sm font-semibold text-on-accent hover:opacity-90" data-food-new>
            <span aria-hidden className="text-lg leading-none">+</span>
            <span className="hidden sm:inline">{t("nutrition.foodBase.newFood")}</span>
            <span className="sr-only sm:hidden">{t("nutrition.foodBase.newFood")}</span>
          </button>
        </div>
        <div role="group" aria-label={t("nutrition.foodBase.filterLabel")} className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-5 sm:px-5">
          {chips.map((chip) => (
            <button key={chip.value} type="button" aria-pressed={category === chip.value} onClick={() => setCategory(chip.value)} className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${category === chip.value ? "border-accent bg-accent text-on-accent" : "border-border text-foreground-muted"}`} data-food-chip={chip.value}>
              {chip.label}<span className="tabular-nums opacity-70">{chip.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div role="group" aria-label={t("nutrition.foodBase.sortLabel")} className="flex gap-1 rounded-full bg-surface-muted p-1">
            {(["frequent", "name"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={sort === value} onClick={() => setSort(value)} className={`min-h-8 rounded-full px-3 text-xs font-semibold ${sort === value ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted"}`}>
                {t(value === "frequent" ? "nutrition.foodBase.sortFrequent" : "nutrition.foodBase.sortName")}
              </button>
            ))}
          </div>
          <FoodTools hasFoods={foods.length > 0} hasDrinks={foods.some((food) => food.category === "Boissons")} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
        {shown.length ? (
          <ul className="divide-y divide-border">
            {shown.map((food) => (
              <li key={food.id}>
                <button type="button" onClick={() => onOpen(food)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-start transition hover:bg-surface-muted" data-food-row={food.name}>
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-lg">{food.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{food.name}</span>
                    <span className="block truncate text-xs tabular-nums text-foreground-muted">
                      {food.calories} kcal · {t("nutrition.common.proteinAbbrev")} {food.protein} · {t("nutrition.common.carbsAbbrev")} {food.carbs} · {t("nutrition.common.fatAbbrev")} {food.fat} · {t("nutrition.foodBase.per100", { unit: food.unit })}
                    </span>
                  </span>
                  {(uses.get(food.name) ?? 0) > 0 && <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] tabular-nums text-foreground-muted">{t("nutrition.foodBase.usedTimes", { count: uses.get(food.name)! })}</span>}
                  {caloriesMismatch(food) && <span aria-hidden className="shrink-0 text-sm" style={{ color: "var(--mood-text)" }}>⚠</span>}
                  <span aria-hidden className="shrink-0 text-foreground-muted rtl:rotate-180">›</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-3 p-6 text-center text-sm text-foreground-muted" data-food-empty>
            <p>{category === "mine" && !query ? t("nutrition.foodBase.emptyMine") : t("nutrition.foodBase.noResults", { query })}</p>
            {query.trim() && <button type="button" onClick={() => onNew({ name: query.trim() })} className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-semibold text-accent hover:bg-surface-muted">{t("nutrition.foodBase.createNamed", { query: query.trim() })}</button>}
          </div>
        )}
      </div>
    </>
  );
}

/** One-off maintenance actions, out of the way. */
function FoodTools({ hasFoods, hasDrinks }: { hasFoods: boolean; hasDrinks: boolean }) {
  const t = useT();
  const run = useActionToast();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const seed = (action: () => Promise<{ added: number; error: string | null }>) => {
    setError(null);
    startTransition(async () => { const result = await action(); if (result.error) setError(result.error); });
  };
  const item = "flex min-h-11 w-full items-center rounded-lg px-3 text-start text-sm hover:bg-surface-muted disabled:opacity-60";

  return (
    <details className="relative" data-food-tools>
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-full px-3 text-xs font-semibold text-foreground-muted hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
        {t("nutrition.foodBase.tools")} <span aria-hidden>▾</span>
      </summary>
      <div className="absolute end-0 z-20 mt-1 w-72 max-w-[80vw] rounded-2xl border border-border bg-surface p-1.5 shadow-xl">
        {!hasFoods && <button type="button" disabled={pending} onClick={() => seed(seedDefaultFoods)} className={item}>{pending ? t("nutrition.foodSettings.importing") : t("nutrition.foodSettings.importFoodsButton")}</button>}
        {hasFoods && !hasDrinks && <button type="button" disabled={pending} onClick={() => seed(seedDefaultDrinks)} className={item}>{pending ? t("nutrition.foodSettings.importing") : t("nutrition.foodSettings.importDrinksButton")}</button>}
        {hasFoods && (
          <button
            type="button"
            disabled={pending}
            title={t("nutrition.foodSettings.resyncTooltip")}
            onClick={() => startTransition(async () => {
              const result = await run(() => resyncFoodDefaults(), { failure: t("nutrition.foodSettings.resyncFailure") });
              if (!result || result.error) return;
              if (result.updated > 0) toast.success(t("nutrition.foodSettings.resyncSuccess", { count: result.updated, word: result.updated > 1 ? t("nutrition.foodSettings.resyncWordPlural") : t("nutrition.foodSettings.resyncWordSingular") }));
              else toast.info(t("nutrition.foodSettings.resyncUpToDate"));
            })}
            className={item}
          >
            {t("nutrition.foodSettings.resyncButton")}
          </button>
        )}
        {error && <p role="alert" className="px-3 py-2 text-xs text-danger">{t("nutrition.foodSettings.importErrorPrefix", { error })}</p>}
      </div>
    </details>
  );
}

/** Edit or create one food: identity, values per 100 g/ml with a calorie check, details and serving. */
function FoodSheet({ food, initial, onBack }: { food?: Food; initial?: Partial<Draft>; onBack: () => void }) {
  const t = useT();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(() => draftOf(food, initial));
  const [source, setSource] = useState<string | null>(null);
  const [iconKey, setIconKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [onlineQuery, setOnlineQuery] = useState(initial?.name ?? "");
  const [onlineResults, setOnlineResults] = useState<OffResult[] | null>(null);
  const [searching, startSearch] = useTransition();
  const set = (key: keyof Draft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const unit = draft.unit;
  const computed = caloriesFromMacros({ protein: num(draft.protein), carbs: num(draft.carbs), fat: num(draft.fat) });
  const mismatch = draft.calories !== "" && caloriesMismatch({ calories: num(draft.calories), protein: num(draft.protein), carbs: num(draft.carbs), fat: num(draft.fat) });
  const categoryName = (value: string) => (CATEGORY_KEYS[value] ? t(`nutrition.foodBase.categories.${CATEGORY_KEYS[value]}`) : value);

  const prefill = (product: OffResult & { servingGrams?: number | null }) => {
    const values = fromProduct(product);
    setDraft((current) => ({ ...current, ...values, unit: "g" }));
    setSource(values.name ?? product.name);
    setIconKey((key) => key + 1);
    setOnlineResults(null);
  };

  const numberField = (key: keyof Draft, text: string, step = "0.1") => (
    <label className={label}>
      {text}
      <input name={key} type="number" inputMode="decimal" min={0} step={step} required={key === "calories"} value={draft[key]} onChange={(event) => set(key)(event.target.value)} className={`${field} tabular-nums`} data-food-field={key} />
    </label>
  );

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      action={(formData) => startTransition(async () => {
        const result = await run(() => (food ? updateFood(food.id, formData) : addFood(formData)), {
          success: food ? t("nutrition.foodSettings.updateSuccess", { name: draft.name }) : t("nutrition.foodSettings.addSuccess", { name: draft.name }),
          failure: food ? t("nutrition.common.updateFailure") : t("nutrition.common.addFailure"),
        });
        if (result && !result.error) onBack();
      })}
      data-food-sheet
    >
      <div className="flex items-center gap-2 border-b border-border p-3">
        <button type="button" onClick={onBack} aria-label={t("nutrition.foodBase.back")} className="grid h-11 w-11 place-items-center rounded-xl text-xl text-foreground-muted hover:bg-surface-muted rtl:rotate-180">‹</button>
        <h2 className="text-lg font-semibold">{food ? t("nutrition.foodBase.editTitle") : t("nutrition.foodBase.newTitle")}</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5">
        {!food && (
          <section className="space-y-2 rounded-2xl bg-surface-muted p-3" data-food-fill>
            <p className="text-xs font-semibold text-foreground-muted">{t("nutrition.foodBase.fillFrom")}</p>
            <div className="flex gap-2">
              <input value={onlineQuery} onChange={(event) => setOnlineQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); startSearch(async () => setOnlineResults(await searchOpenFoodFacts(onlineQuery))); } }} placeholder={t("nutrition.foodBase.onlinePlaceholder")} aria-label={t("nutrition.foodBase.online")} className={`${field} min-w-0 flex-1 bg-surface`} data-food-online-query />
              <button type="button" disabled={searching || onlineQuery.trim().length < 2} onClick={() => startSearch(async () => setOnlineResults(await searchOpenFoodFacts(onlineQuery)))} className="min-h-11 shrink-0 rounded-xl border border-border bg-surface px-3 text-sm font-semibold disabled:opacity-50" data-food-online-search>
                {searching ? t("nutrition.foodBase.onlineSearching") : t("nutrition.foodBase.onlineSearch")}
              </button>
              <button type="button" onClick={() => setScanning(true)} className="min-h-11 shrink-0 rounded-xl border border-border bg-surface px-3 text-sm font-semibold" data-food-scan>{t("nutrition.foodBase.scan")}</button>
            </div>
            {onlineResults && (onlineResults.length ? (
              <ul className="max-h-56 overflow-y-auto rounded-xl border border-border bg-surface p-1">
                {onlineResults.map((result) => (
                  <li key={result.id}>
                    <button type="button" onClick={() => prefill(result)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-start text-sm hover:bg-surface-muted">
                      <span className="min-w-0 flex-1 truncate">{result.name}{result.brand ? ` (${result.brand})` : ""}</span>
                      <span className="shrink-0 text-xs text-foreground-muted">{result.calories} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-foreground-muted">{t("nutrition.foodBase.onlineNone")}</p>)}
            {source && <p className="text-xs" style={{ color: "var(--mood-text)" }} data-food-prefilled>{t("nutrition.foodBase.prefilled", { name: source })}</p>}
            {scanning && <BarcodeScanner onFound={(product: BarcodeResult) => { setScanning(false); prefill(product); }} onClose={() => setScanning(false)} />}
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("nutrition.foodBase.identity")}</h3>
          <div className="flex items-end gap-2">
            <IconPicker key={iconKey} name="icon" defaultValue={draft.icon} choices={FOOD_ICON_CHOICES} color="var(--nutrition)" />
            <label className={`${label} flex-1`}>
              {t("nutrition.foodBase.name")}
              <input name="name" required maxLength={120} value={draft.name} onChange={(event) => set("name")(event.target.value)} className={field} data-food-field="name" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              {t("nutrition.foodBase.category")}
              <select name="category" value={draft.category} onChange={(event) => set("category")(event.target.value)} className={field}>
                {FOOD_CATEGORIES.map((value) => <option key={value} value={value}>{categoryName(value)}</option>)}
                {!FOOD_CATEGORIES.includes(draft.category as (typeof FOOD_CATEGORIES)[number]) && <option value={draft.category}>{draft.category}</option>}
              </select>
            </label>
            <div className={label}>
              {t("nutrition.foodBase.type")}
              <input type="hidden" name="unit" value={unit} />
              <div role="radiogroup" aria-label={t("nutrition.foodBase.type")} className="grid min-h-11 grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
                {(["g", "ml"] as const).map((value) => (
                  <button key={value} type="button" role="radio" aria-checked={unit === value} onClick={() => set("unit")(value)} className={`rounded-lg text-sm font-semibold ${unit === value ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted"}`}>
                    {t(value === "g" ? "nutrition.foodBase.solid" : "nutrition.foodBase.liquid")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("nutrition.foodBase.valuesTitle", { unit })}</h3>
          <div className="grid grid-cols-2 gap-3">
            {numberField("calories", t("nutrition.foodBase.calories"))}
            {numberField("protein", t("nutrition.foodBase.protein"))}
            {numberField("carbs", t("nutrition.foodBase.carbs"))}
            {numberField("fat", t("nutrition.foodBase.fat"))}
          </div>
          {mismatch && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--mood) 45%, var(--border))", background: "color-mix(in srgb, var(--mood) 10%, var(--surface))" }} data-food-mismatch>
              <span>⚠ {t("nutrition.foodBase.mismatch", { computed, stated: num(draft.calories) })}</span>
              <button type="button" onClick={() => set("calories")(String(computed))} className="min-h-11 rounded-lg px-2 font-semibold text-accent">{t("nutrition.foodBase.useComputed", { computed })}</button>
            </div>
          )}
        </section>

        <details className="group space-y-3" open={!!food && (num(draft.fiber) > 0 || num(draft.sugar) > 0 || num(draft.sodium) > 0 || num(draft.caffeine) > 0)}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {t("nutrition.foodBase.detailsTitle")} <span aria-hidden className="text-foreground-muted transition-transform group-open:rotate-90 rtl:rotate-180">›</span>
          </summary>
          <div className="grid grid-cols-2 gap-3">
            {numberField("fiber", t("nutrition.foodBase.fiber"))}
            {numberField("sugar", t("nutrition.foodBase.sugar"))}
            {numberField("sodium", t("nutrition.foodBase.sodium"), "1")}
            {numberField("caffeine", t("nutrition.foodBase.caffeine"))}
          </div>
        </details>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("nutrition.foodBase.portionTitle")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              {t("nutrition.foodBase.portionLabel")}
              <input name="portion_label" maxLength={80} value={draft.portion_label} onChange={(event) => set("portion_label")(event.target.value)} placeholder={t("nutrition.foodBase.portionLabelPlaceholder")} className={field} />
            </label>
            <label className={label}>
              {t("nutrition.foodBase.portionAmount", { unit })}
              <input name="portion_grams" type="number" inputMode="decimal" min={0} step="1" value={draft.portion_grams} onChange={(event) => set("portion_grams")(event.target.value)} className={`${field} tabular-nums`} />
            </label>
          </div>
          <p className="text-xs text-foreground-muted">{t("nutrition.foodBase.portionHint")}</p>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
        {food && (
          <ConfirmDeleteButton
            disabled={pending}
            onConfirm={() => startTransition(async () => {
              const result = await run(() => deleteFood(food.id), { success: t("nutrition.foodSettings.deleteSuccess", { name: food.name }), failure: t("nutrition.common.deleteFailure") });
              if (result && !result.error) onBack();
            })}
            title={t("nutrition.foodSettings.deleteTitle")}
            message={t("nutrition.foodSettings.deleteMessage", { name: food.name })}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger/10"
          >
            {t("nutrition.foodBase.delete")}
          </ConfirmDeleteButton>
        )}
        <button type="submit" disabled={pending} className="ms-auto min-h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent hover:opacity-90 disabled:opacity-60" data-food-save>
          {food ? t("nutrition.foodBase.save") : t("nutrition.foodBase.create")}
        </button>
      </div>
    </form>
  );
}
