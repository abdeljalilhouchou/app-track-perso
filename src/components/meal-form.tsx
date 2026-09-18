"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logMeal } from "@/lib/actions/nutrition";
import { searchOpenFoodFacts, type OffResult } from "@/lib/actions/openfoodfacts";
import { computeMacros } from "@/lib/food-database";
import { useClickOutside } from "@/lib/use-click-outside";
import type { Food } from "@/types/database";

const MEAL_TYPES = [
  { value: "petit-dejeuner", label: "Petit-déj", icon: "🌅" },
  { value: "dejeuner", label: "Déjeuner", icon: "☀️" },
  { value: "diner", label: "Dîner", icon: "🌙" },
  { value: "collation", label: "Collation", icon: "🍎" },
] as const;

type SelectedFood = {
  id: string;
  name: string;
  icon: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  caffeine: number;
  unit: "g" | "ml";
  portion_label?: string | null;
  portion_grams?: number | null;
};

function fromFood(f: Food): SelectedFood {
  return {
    id: f.id,
    name: f.name,
    icon: f.icon,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber,
    sugar: f.sugar,
    sodium: f.sodium,
    caffeine: f.caffeine,
    unit: f.unit,
    portion_label: f.portion_label,
    portion_grams: f.portion_grams,
  };
}

function fromOff(r: OffResult): SelectedFood {
  return {
    id: `off-${r.id}`,
    name: r.brand ? `${r.name} (${r.brand})` : r.name,
    icon: "🌍",
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    fiber: r.fiber,
    sugar: r.sugar,
    sodium: r.sodium,
    caffeine: 0,
    unit: "g",
  };
}

export function MealForm({ foods, quickFoods = [] }: { foods: Food[]; quickFoods?: Food[] }) {
  const [pending, startTransition] = useTransition();
  const [offPending, startOffTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedFood | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["value"]>("dejeuner");
  const [offResults, setOffResults] = useState<OffResult[] | null>(null);
  const [justAdded, setJustAdded] = useState(false);

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
    setOffResults(null);
    setResetKey((k) => k + 1);
  }

  function selectFood(f: Food) {
    setSelected(fromFood(f));
    if (f.unit === "ml" && f.portion_grams) setGrams(f.portion_grams);
    setQuery(f.name);
    setOpen(false);
    setOffResults(null);
  }

  function runOffSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    startOffTransition(async () => {
      const results = await searchOpenFoodFacts(q);
      setOffResults(results);
    });
  }

  return (
    <form
      key={resetKey}
      action={(formData) =>
        startTransition(async () => {
          await logMeal(formData);
          reset();
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1500);
        })
      }
      className="space-y-3"
    >
      {quickFoods.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickFoods.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFood(f)}
              className="flex items-center gap-1 rounded-full border border-nutrition/40 bg-surface-muted px-2.5 py-1 text-xs transition hover:border-nutrition hover:text-accent"
            >
              <span>{f.icon}</span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      <div ref={ref} className="relative">
        <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Aliment</label>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOffResults(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={foods.length > 0 ? "Ex: poitrine de poulet, espresso, jus d'orange..." : "Aucun aliment — ouvre Paramètres pour en ajouter"}
          className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <AnimatePresence>
          {open && matches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-nutrition/40 bg-surface p-1.5 shadow-xl"
            >
              {matches.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFood(f)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-muted"
                >
                  <span className="text-lg">{f.icon}</span>
                  <span className="flex-1">{f.name}</span>
                  <span className="text-xs text-foreground-muted">{f.calories} kcal/100{f.unit}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {open && query.trim() && matches.length === 0 && !offResults && (
          <div className="mt-1.5 space-y-1.5">
            <p className="text-xs text-foreground-muted">
              Aucun résultat dans ta base — ajoute-le via ⚙️ Paramètres, ou cherche en ligne :
            </p>
            <button
              type="button"
              onClick={runOffSearch}
              disabled={offPending}
              className="rounded-lg border border-dashed border-accent/50 px-2.5 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft disabled:opacity-60"
            >
              {offPending ? "Recherche..." : "🌍 Rechercher sur Open Food Facts"}
            </button>
          </div>
        )}
        {offResults && (
          <div className="mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-nutrition/40 bg-surface p-1.5 shadow-xl">
            {offResults.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-foreground-muted">Aucun résultat en ligne.</p>
            ) : (
              offResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelected(fromOff(r));
                    setQuery(r.name);
                    setOpen(false);
                    setOffResults(null);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-muted"
                >
                  <span className="text-lg">🌍</span>
                  <span className="min-w-0 flex-1 truncate">{r.name}{r.brand ? ` (${r.brand})` : ""}</span>
                  <span className="text-xs text-foreground-muted">{r.calories} kcal/100g</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground-muted">Quantité ({selected?.unit ?? "g"})</span>
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
          <div className="flex gap-1 rounded-xl border border-nutrition/40 bg-surface-muted p-1">
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

      {selected?.portion_grams ? (
        <button
          type="button"
          onClick={() => setGrams(selected.portion_grams!)}
          className="rounded-full border border-nutrition/40 px-2.5 py-1 text-xs text-foreground-muted transition hover:border-nutrition hover:text-accent"
        >
          Portion : {selected.portion_label ? `${selected.portion_label} · ` : ""}
          {selected.portion_grams}
          {selected.unit}
        </button>
      ) : null}

      {preview && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl bg-surface-muted p-3 text-xs">
          <span><strong>{preview.calories}</strong> kcal</span>
          <span className="text-foreground-muted">·</span>
          <span><strong>{preview.protein}g</strong> protéines</span>
          <span className="text-foreground-muted">·</span>
          <span><strong>{preview.carbs}g</strong> glucides</span>
          <span className="text-foreground-muted">·</span>
          <span><strong>{preview.fat}g</strong> lipides</span>
          {(preview.fiber > 0 || preview.sugar > 0 || preview.sodium > 0 || preview.caffeine > 0) && (
            <>
              <span className="w-full" />
              <span className="text-foreground-muted">
                {preview.fiber}g fibres · {preview.sugar}g sucres · {preview.sodium}mg sodium
                {preview.caffeine > 0 ? ` · ☕ ${preview.caffeine}mg caféine` : ""}
              </span>
            </>
          )}
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
      <input type="hidden" name="fiber" value={preview?.fiber ?? 0} />
      <input type="hidden" name="sugar" value={preview?.sugar ?? 0} />
      <input type="hidden" name="sodium" value={preview?.sodium ?? 0} />
      <input type="hidden" name="caffeine" value={preview?.caffeine ?? 0} />
      <input type="hidden" name="unit" value={selected?.unit ?? "g"} />

      <motion.button
        type="submit"
        disabled={!selected || pending}
        whileTap={{ scale: 0.98 }}
        animate={justAdded ? { scale: [1, 1.03, 1] } : {}}
        className={`relative w-full overflow-hidden rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
          justAdded
            ? "border-nutrition bg-nutrition text-white"
            : "border-accent text-accent hover:bg-accent hover:text-white"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={justAdded ? "done" : "idle"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="block"
          >
            {justAdded ? "Ajouté ✓" : "Ajouter au journal"}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </form>
  );
}
