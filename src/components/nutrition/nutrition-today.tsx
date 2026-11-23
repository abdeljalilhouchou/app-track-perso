"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MealForm, type MealMoment } from "@/components/meal-form";
import { useT } from "@/components/language-provider";
import type { Food } from "@/types/database";

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type Goals = { calories: number | null; protein: number | null; carbs: number | null; fat: number | null };

/** The moment that fits the time of day, preselected in the add form. */
function momentNow(): MealMoment {
  const hour = new Date().getHours();
  if (hour < 11) return "petit-dejeuner";
  if (hour < 15) return "dejeuner";
  if (hour < 18) return "collation";
  return "diner";
}

/** Calories left for the day in a ring, with the three macros as bars against their goals. */
export function CalorieHero({ totals, goals, goalsHref }: { totals: Totals; goals: Goals; goalsHref: string }) {
  const t = useT();
  const goal = goals.calories;
  const left = goal ? goal - totals.calories : null;
  const ratio = goal ? Math.min(1, totals.calories / goal) : 0;
  const over = left !== null && left < 0;
  const size = 148;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const macros = [
    { key: "protein", label: t("nutrition.macroRings.protein"), value: totals.protein, goal: goals.protein, color: "var(--habit)" },
    { key: "carbs", label: t("nutrition.macroRings.carbs"), value: totals.carbs, goal: goals.carbs, color: "var(--mood)" },
    { key: "fat", label: t("nutrition.macroRings.fat"), value: totals.fat, goal: goals.fat, color: "var(--accent)" },
  ];

  return (
    <section aria-label={t("nutrition.page.todayLabel")} className="rounded-3xl border border-border bg-surface p-5" data-calorie-hero>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={over ? "var(--danger)" : "var(--nutrition)"} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)}
              className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {left !== null ? (
              <>
                <span className="text-[11px] text-foreground-muted">{over ? t("nutrition.v2.over") : t("nutrition.v2.remaining")}</span>
                <span className="text-3xl font-bold tabular-nums" style={{ color: over ? "var(--danger)" : undefined }} data-calories-left>{Math.abs(left)}</span>
                <span className="text-[11px] text-foreground-muted">kcal</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold tabular-nums">{totals.calories}</span>
                <span className="text-[11px] text-foreground-muted">kcal</span>
              </>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium tabular-nums">{goal ? t("nutrition.v2.eatenOf", { eaten: totals.calories, goal }) : t("nutrition.v2.eaten", { value: totals.calories })}</p>
          {macros.map((macro) => (
            <div key={macro.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground-muted">{macro.label}</span>
                <span className="tabular-nums"><strong>{macro.value}</strong>{macro.goal ? ` / ${macro.goal}` : ""} g</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${macro.goal ? Math.min(100, (macro.value / macro.goal) * 100) : 0}%`, background: macro.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {!goal && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-muted p-3 text-sm">
          <span className="text-foreground-muted">{t("nutrition.v2.noGoal")}</span>
          <Link href={goalsHref} className="inline-flex min-h-11 items-center font-semibold text-accent">{t("nutrition.v2.setGoal")}</Link>
        </div>
      )}
    </section>
  );
}

/** The one action of the Today tab: add a food, in a sheet preset to the current meal. The day's list is in the Journal tab. */
export function AddFoodButton({ foods, quickFoods }: { foods: Food[]; quickFoods: Food[] }) {
  const t = useT();
  const [sheet, setSheet] = useState<MealMoment | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (sheet) dialogRef.current?.showModal();
  }, [sheet]);

  return (
    <>
      <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom)+0.75rem)] z-10 md:bottom-4">
        <button
          type="button"
          onClick={() => setSheet(momentNow())}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-on-accent shadow-lg shadow-accent/30 transition hover:opacity-90"
          data-add-food
        >
          <span aria-hidden className="text-xl leading-none">+</span>
          {t("nutrition.v2.addFood")}
        </button>
      </div>

      {sheet && (
        <dialog
          ref={dialogRef}
          onClose={() => setSheet(null)}
          aria-labelledby="add-food-title"
          className="add-food-sheet m-auto max-h-[92dvh] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-3xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/60"
          data-add-food-sheet
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
            <h2 id="add-food-title" className="text-lg font-semibold">{t("nutrition.v2.addFood")}</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label={t("nutrition.v2.close")} className="grid h-11 w-11 place-items-center rounded-xl text-xl text-foreground-muted hover:bg-surface-muted">×</button>
          </div>
          <div className="p-5">
            <MealForm key={sheet} foods={foods} quickFoods={quickFoods} initialMealType={sheet} onAdded={() => dialogRef.current?.close()} />
          </div>
        </dialog>
      )}
    </>
  );
}
