"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logMeal } from "@/lib/actions/nutrition";
import { FOODS, computeMacros, type Food } from "@/lib/food-database";
import { useClickOutside } from "@/lib/use-click-outside";

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "Petit-déj", icon: "🌅" },
  { value: "dejeuner", label: "Déjeuner", icon: "☀️" },
  { value: "diner", label: "Dîner", icon: "🌙" },
  { value: "collation", label: "Collation", icon: "🍎" },
] as const;

export function MealForm() {
  const [pending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [custom, setCustom] = useState(false);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>("dejeuner");

  const [customName, setCustomName] = useState("");
  const [customCals, setCustomCals] = useState(0);
  const [customProtein, setCustomProtein] = useState(0);
  const [customCarbs, setCustomCarbs] = useState(0);
  const [customFat, setCustomFat] = useState(0);

  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const activeFood: Pick<Food, "calories" | "protein" | "carbs" | "fat"> | null = custom
    ? { calories: customCals, protein: customProtein, carbs: customCarbs, fat: customFat }
    : selected
      ? { calories: selected.calories, protein: selected.protein, carbs: selected.carbs, fat: selected.fat }
      : null;

  const preview = activeFood ? computeMacros(activeFood, grams) : null;
  const canSubmit = custom ? customName.trim().length > 0 && customCals > 0 : Boolean(selected);

  function reset() {
    setQuery("");
    setSelected(null);
    setCustom(false);
    setGrams(100);
    setCustomName("");
    setCustomCals(0);
    setCustomProtein(0);
    setCustomCarbs(0);
    setCustomFat(0);
    setResetKey((k) => k + 1);
  }

  return (
    <form
      key={resetKey}
      action={(formData) =>
        startTransition(async () => {
          await logMeal(formData);
          reset();
        })
      }
      className="space-y-3"
    >
      <div ref={ref} className="relative">
        <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Aliment</label>
        {!custom ? (
          <>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Ex: poitrine de poulet, pain..."
              className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <AnimatePresence>
              {open && matches.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl"
                >
                  {matches.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelected(f);
                        setQuery(f.name);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-muted"
                    >
                      <span className="text-lg">{f.icon}</span>
                      <span className="flex-1">{f.name}</span>
                      <span className="text-xs text-foreground-muted">{f.calories} kcal/100g</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nom de l'aliment"
              className="col-span-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Calories /100g
              <input type="number" min={0} value={customCals || ""} onChange={(e) => setCustomCals(Number(e.target.value))} className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Protéines /100g
              <input type="number" min={0} step="0.1" value={customProtein || ""} onChange={(e) => setCustomProtein(Number(e.target.value))} className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Glucides /100g
              <input type="number" min={0} step="0.1" value={customCarbs || ""} onChange={(e) => setCustomCarbs(Number(e.target.value))} className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-foreground-muted">
              Lipides /100g
              <input type="number" min={0} step="0.1" value={customFat || ""} onChange={(e) => setCustomFat(Number(e.target.value))} className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent" />
            </label>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setCustom((c) => !c);
            setSelected(null);
            setOpen(false);
          }}
          className="mt-1.5 text-xs font-medium text-accent hover:underline"
        >
          {custom ? "← Revenir à la recherche" : "Aliment introuvable ? Ajouter manuellement"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground-muted">Quantité (g)</span>
          <input
            type="number"
            min={1}
            value={grams}
            onChange={(e) => setGrams(Number(e.target.value))}
            className="rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground-muted">Repas</span>
          <div className="flex gap-1 rounded-xl border border-border bg-surface-muted p-1">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMealType(m.value)}
                title={m.label}
                className="relative flex-1 rounded-lg py-1.5 text-center text-sm transition"
                style={{ background: mealType === m.value ? "var(--accent)" : "transparent" }}
              >
                {m.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {preview && (
        <div className="flex flex-wrap gap-3 rounded-xl bg-surface-muted p-3 text-xs">
          <span><strong>{preview.calories}</strong> kcal</span>
          <span className="text-foreground-muted">·</span>
          <span><strong>{preview.protein}g</strong> protéines</span>
          <span className="text-foreground-muted">·</span>
          <span><strong>{preview.carbs}g</strong> glucides</span>
          <span className="text-foreground-muted">·</span>
          <span><strong>{preview.fat}g</strong> lipides</span>
        </div>
      )}

      <input type="hidden" name="food_name" value={custom ? customName : selected?.name ?? ""} />
      <input type="hidden" name="icon" value={custom ? "🍽️" : selected?.icon ?? "🍽️"} />
      <input type="hidden" name="quantity_grams" value={grams} />
      <input type="hidden" name="meal_type" value={mealType} />
      <input type="hidden" name="calories" value={preview?.calories ?? 0} />
      <input type="hidden" name="protein" value={preview?.protein ?? 0} />
      <input type="hidden" name="carbs" value={preview?.carbs ?? 0} />
      <input type="hidden" name="fat" value={preview?.fat ?? 0} />

      <button
        type="submit"
        disabled={!canSubmit || pending}
        className="w-full rounded-xl border-[1.5px] border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-40"
      >
        Ajouter au journal
      </button>
    </form>
  );
}
