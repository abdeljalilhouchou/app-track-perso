"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  const size = 124;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const macros = [
    { key: "protein", label: t("nutrition.macroRings.protein"), value: totals.protein, goal: goals.protein, color: "var(--habit)", from: "#c4b5fd", to: "#7c3aed" },
    { key: "carbs", label: t("nutrition.macroRings.carbs"), value: totals.carbs, goal: goals.carbs, color: "var(--mood)", from: "#fde68a", to: "#d97706" },
    { key: "fat", label: t("nutrition.macroRings.fat"), value: totals.fat, goal: goals.fat, color: "var(--accent)", from: "#a5b4fc", to: "#4f46e5" },
  ];
  const proteinLeft = goals.protein ? Math.round(goals.protein - totals.protein) : 0;

  return (
    <section aria-label={t("nutrition.page.todayLabel")} className="glass-card space-y-4 p-[18px]" style={{ "--glow": over ? "var(--danger)" : "var(--nutrition)" } as CSSProperties} data-calorie-hero>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
            <defs><linearGradient id="kcal-ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdba74" /><stop offset="1" stopColor="#ea580c" /></linearGradient></defs>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
            <circle
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={over ? "var(--danger)" : "url(#kcal-ring-grad)"} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)}
              className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {left !== null ? (
              <>
                <span className="text-[11px] text-foreground-muted">{over ? t("nutrition.v2.over") : t("nutrition.v2.remaining")}</span>
                <span className="text-[28px] font-black leading-tight tracking-tight tabular-nums" style={{ color: over ? "var(--danger)" : undefined }} data-calories-left>{Math.abs(left)}</span>
                <span className="text-[11px] text-foreground-muted">kcal</span>
              </>
            ) : (
              <>
                <span className="text-[32px] font-black tabular-nums">{totals.calories}</span>
                <span className="text-[11px] text-foreground-muted">kcal</span>
              </>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground-muted">{t("nutrition.v2.eatenToday")}</p>
          <p className="mt-0.5 text-2xl font-black leading-tight tabular-nums">{totals.calories}{goal ? <span className="block text-[13px] font-semibold text-foreground-muted">/ {goal} kcal</span> : <span className="text-[13px] font-semibold text-foreground-muted"> kcal</span>}</p>
          {goal ? <p className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--nutrition) 15%, transparent)", color: "color-mix(in srgb, var(--nutrition) 80%, var(--foreground))" }}>{t("nutrition.v2.pctOfGoal", { pct: Math.round((totals.calories / goal) * 100) })}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {macros.map((macro) => (
          <div key={macro.key} className="min-w-0 rounded-2xl border p-3" style={{ background: "color-mix(in srgb, var(--surface-muted) 55%, transparent)", borderColor: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
            <p className="flex items-center gap-1.5 truncate text-[11.5px] font-bold" style={{ color: `color-mix(in srgb, ${macro.color} 75%, var(--foreground))` }}><span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: macro.color }} />{macro.label}</p>
            <p className="mt-1.5 text-lg font-black leading-none tabular-nums">{Math.round(macro.value)}<span className="text-[11px] font-semibold text-foreground-muted"> g</span></p>
            {macro.goal ? <p className="mt-0.5 text-[11px] text-foreground-muted tabular-nums">/ {macro.goal} g</p> : null}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${macro.goal ? Math.min(100, (macro.value / macro.goal) * 100) : 0}%`, background: `linear-gradient(90deg, ${macro.from}, ${macro.to})` }} />
            </div>
          </div>
        ))}
      </div>
      {proteinLeft > 10 && totals.calories > 0 && <p className="rounded-2xl px-3 py-2.5 text-[12.5px] leading-relaxed" style={{ background: "color-mix(in srgb, var(--habit) 12%, transparent)", color: "color-mix(in srgb, var(--habit) 70%, var(--foreground))" }} data-protein-tip>{t("nutrition.v2.proteinLeft", { value: proteinLeft })}</p>}
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

  // "Add a food" from the quick add lands here with ?add=1: open the sheet straight away.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("add") !== "1") return;
    url.searchParams.delete("add");
    window.history.replaceState(null, "", url);
    const timer = window.setTimeout(() => setSheet(momentNow()));
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom)+0.75rem)] z-10 md:bottom-4">
        <button
          type="button"
          onClick={() => setSheet(momentNow())}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] text-base font-extrabold text-[#1f0d00] shadow-lg transition hover:opacity-90" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)", boxShadow: "0 12px 30px rgba(234,88,12,.32)" }}
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
