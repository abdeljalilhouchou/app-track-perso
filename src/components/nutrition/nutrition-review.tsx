"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { MEAL_MOMENTS, reviewPeriod, type ReviewGoals, type ReviewMeal } from "@/lib/nutrition-week";

const MOMENT_KEYS: Record<(typeof MEAL_MOMENTS)[number], string> = { "petit-dejeuner": "petitDejeuner", dejeuner: "dejeuner", diner: "diner", collation: "collation" };
const MOMENT_COLORS: Record<(typeof MEAL_MOMENTS)[number], string> = { "petit-dejeuner": "var(--mood)", dejeuner: "var(--nutrition)", diner: "var(--accent)", collation: "var(--sport)" };
const card = "rounded-2xl border border-border bg-surface p-5";

function localeOf(language: string) {
  return language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
}

/** The "Bilan" tab: how the last 7 or 30 days went against the goals. */
export function NutritionReview({ meals, today, goals }: { meals: ReviewMeal[]; today: string; goals: ReviewGoals }) {
  const { t, language } = useLanguage();
  const [days, setDays] = useState<7 | 30>(7);
  const review = reviewPeriod(meals, today, days, goals);
  const number = (value: number) => new Intl.NumberFormat(localeOf(language), { maximumFractionDigits: 0 }).format(value);

  const delta = (now: number | null, before: number | null, unit: string) => {
    if (now === null || before === null) return null;
    const diff = Math.round(now - before);
    if (!diff) return null;
    return t("nutrition.v2.vsPrevious", { sign: diff > 0 ? "+" : "−", value: `${number(Math.abs(diff))} ${unit}` });
  };
  const averages = [
    { key: "avgCalories", value: review.averages.calories, goal: goals.calories, unit: "kcal", delta: delta(review.averages.calories, review.previousAverages.calories, "kcal") },
    { key: "avgProtein", value: review.averages.protein, goal: goals.protein, unit: "g", delta: delta(review.averages.protein, review.previousAverages.protein, "g") },
    { key: "avgCarbs", value: review.averages.carbs, goal: goals.carbs, unit: "g", delta: null },
    { key: "avgFat", value: review.averages.fat, goal: goals.fat, unit: "g", delta: null },
  ];
  const peak = Math.max(goals.calories ?? 0, ...review.series.map((day) => day.calories), 1);
  const dayLabel = (date: string) => new Intl.DateTimeFormat(localeOf(language), days === 7 ? { weekday: "narrow" } : { day: "numeric" }).format(new Date(`${date}T12:00:00`));

  return (
    <div className="space-y-4" data-nutrition-review>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-muted">{t("nutrition.v2.loggedDays", { logged: review.loggedDays, days: review.days })}</p>
        <div role="group" aria-label={t("nutrition.v2.weekTitle")} className="flex gap-1 rounded-full bg-surface-muted p-1">
          {([7, 30] as const).map((value) => (
            <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)} className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${days === value ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted"}`} data-review-period={value}>
              {t(`nutrition.v2.periods.p${value}`)}
            </button>
          ))}
        </div>
      </div>

      {review.loggedDays === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted" data-review-empty>{t("nutrition.v2.weekEmpty")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {averages.map((item) => {
              const share = item.goal && item.value !== null ? item.value / item.goal : null;
              return (
                <div key={item.key} className="rounded-2xl border border-border bg-surface p-4" data-review-average={item.key}>
                  <p className="text-xs text-foreground-muted">{t(`nutrition.v2.${item.key}`)}</p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums">{item.value === null ? "—" : number(item.value)}<span className="ms-1 text-sm font-normal text-foreground-muted">{item.unit}</span></p>
                  {item.goal ? (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (share ?? 0) * 100)}%`, background: share !== null && share > 1.1 ? "var(--danger)" : "var(--nutrition)" }} />
                      </div>
                      <p className="mt-1 text-xs text-foreground-muted">{t("nutrition.v2.goalShort", { value: `${number(item.goal)} ${item.unit}` })}</p>
                    </>
                  ) : null}
                  {item.delta && <p className="mt-1 text-xs text-foreground-muted">{item.delta}</p>}
                </div>
              );
            })}
          </div>
          {!goals.calories && <p className="text-xs text-foreground-muted">{t("nutrition.v2.noGoalForReview")}</p>}

          {goals.calories ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs text-foreground-muted">{t("nutrition.v2.onTarget")}</p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums" data-review-on-target>{t("nutrition.v2.daysOf", { count: review.onTargetDays, total: review.loggedDays })}</p>
                <p className="mt-1 text-xs text-foreground-muted">{t("nutrition.v2.onTargetHint")}</p>
              </div>
              {goals.protein ? (
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs text-foreground-muted">{t("nutrition.v2.proteinDays")}</p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums">{t("nutrition.v2.daysOf", { count: review.proteinDays, total: review.loggedDays })}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <section aria-labelledby="review-daily" className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="review-daily" className="font-semibold">{t("nutrition.v2.dailyTitle")}</h2>
              <div className="flex gap-3 text-xs text-foreground-muted" aria-hidden>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-nutrition" />{t("nutrition.v2.caloriesLegend")}</span>
                {goals.calories ? <span className="flex items-center gap-1.5"><span className="h-px w-3 border-t border-dashed border-foreground-muted" />{t("nutrition.v2.goalLegend")}</span> : null}
              </div>
            </div>
            <div className="relative mt-4 flex h-40 items-end gap-1" role="img" aria-label={review.series.map((day) => `${day.date}: ${day.calories} kcal`).join(", ")} data-review-bars>
              {goals.calories ? <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground-muted/60" style={{ bottom: `${(goals.calories / peak) * 100}%` }} /> : null}
              {review.series.map((day) => (
                <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: day.logged ? `${Math.max(3, (day.calories / peak) * 100)}%` : "3px",
                      background: !day.logged ? "var(--surface-muted)" : goals.calories && day.calories > goals.calories * 1.1 ? "var(--danger)" : "var(--nutrition)",
                      opacity: day.date === today ? 1 : 0.75,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1 text-center text-[10px] text-foreground-muted" aria-hidden>
              {review.series.map((day, index) => (
                <span key={day.date} className="min-w-0 flex-1">{days === 7 || index % 5 === 0 || index === review.series.length - 1 ? dayLabel(day.date) : ""}</span>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section aria-labelledby="review-moments" className={card}>
              <h2 id="review-moments" className="font-semibold">{t("nutrition.v2.momentsTitle")}</h2>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                {review.moments.map((moment) => <span key={moment.moment} style={{ width: `${moment.share}%`, background: MOMENT_COLORS[moment.moment] }} />)}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {review.moments.map((moment) => (
                  <li key={moment.moment} className="flex items-center gap-2" data-review-moment={moment.moment}>
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MOMENT_COLORS[moment.moment] }} />
                    <span className="min-w-0 flex-1 truncate">{t(`nutrition.mealTypes.${MOMENT_KEYS[moment.moment]}`)}</span>
                    <span className="tabular-nums text-foreground-muted">{moment.share} %</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="review-foods" className={card}>
              <h2 id="review-foods" className="font-semibold">{t("nutrition.v2.topFoodsTitle")}</h2>
              <ol className="mt-3 space-y-2.5">
                {review.topFoods.map((food) => (
                  <li key={food.name} className="flex items-center gap-3 text-sm" data-review-food>
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-lg">{food.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{food.name}</span>
                    <span className="shrink-0 text-xs text-foreground-muted">{t("nutrition.v2.timesCount", { count: food.count })}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
