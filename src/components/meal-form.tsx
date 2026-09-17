"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logMeal } from "@/lib/actions/nutrition";
import { computeMacros } from "@/lib/food-database";
import { useClickOutside } from "@/lib/use-click-outside";
import type { Food } from "@/types/database";

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "Petit-déj", icon: "🌅" },
  { value: "dejeuner", label: "Déjeuner", icon: "☀️" },
  { value: "diner", label: "Dîner", icon: "🌙" },
  { value: "collation", label: "Collation", icon: "🍎" },
] as const;

export function MealForm({ foods }: { foods: Food[] }) {
  const [pending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>("dejeuner");

  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, foods]);

  const preview = selected ? computeMacros(selected, grams) : null;

  function reset() {
    setQuery("");
    setSelected(null);
    setGrams(100);
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
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={foods.length > 0 ? "Ex: poitrine de poulet, pain..." : "Aucun aliment — ouvre Paramètres pour en ajouter"}
          disabled={foods.length === 0}
          className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
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
        {open && query.trim() && matches.length === 0 && (
          <p className="mt-1.5 text-xs text-foreground-muted">
            Aucun résultat — ajoute-le via le bouton ⚙️ Paramètres ci-dessus.
          </p>
        )}
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

      <input type="hidden" name="food_name" value={selected?.name ?? ""} />
      <input type="hidden" name="icon" value={selected?.icon ?? "🍽️"} />
      <input type="hidden" name="quantity_grams" value={grams} />
      <input type="hidden" name="meal_type" value={mealType} />
      <input type="hidden" name="calories" value={preview?.calories ?? 0} />
      <input type="hidden" name="protein" value={preview?.protein ?? 0} />
      <input type="hidden" name="carbs" value={preview?.carbs ?? 0} />
      <input type="hidden" name="fat" value={preview?.fat ?? 0} />

      <button
        type="submit"
        disabled={!selected || pending}
        className="w-full rounded-xl border-[1.5px] border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-40"
      >
        Ajouter au journal
      </button>
    </form>
  );
}
