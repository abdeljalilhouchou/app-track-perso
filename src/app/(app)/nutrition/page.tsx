import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { NutritionJournal } from "@/components/nutrition-journal";
import { NutritionGoalsCalculator } from "@/components/nutrition-goals-calculator";
import { FoodSettings } from "@/components/food-settings";
import { DailyLimits } from "@/components/daily-limits";
import { MealTemplatesPanel } from "@/components/meal-templates";
import { WaterTracker } from "@/components/water-tracker";
import { WeightTracker } from "@/components/weight-tracker";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { AddFoodButton, CalorieHero } from "@/components/nutrition/nutrition-today";
import { NutritionReview } from "@/components/nutrition/nutrition-review";
import { NutritionTabs } from "@/components/nutrition-tabs";
import { Callout } from "@/components/ui/callout";
import { InViewFade } from "@/components/ui/in-view-fade";
import { weeklyTotals } from "@/lib/weekly";
import { buildRings, sumMeals } from "@/lib/nutrition-totals";
import { SugarMeter } from "@/components/sugar-meter";
import { getDictionary, getLanguage, getT } from "@/lib/i18n/get-dictionary";
import { fetchAllRows } from "@/lib/paging";
import { isValidIsoDate } from "@/lib/actions/validation";
import { DEFAULT_DRINKS, DEFAULT_FOODS } from "@/lib/food-database";

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const seventyDaysAgo = format(subDays(new Date(), 70), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const fourMonthsAgo = format(subDays(new Date(), 120), "yyyy-MM-dd");
  const selectedDate = isValidIsoDate(date) ? date : today;

  const [
    dict,
    t,
    language,
    profileResult,
    meals,
    selectedDayMeals,
    loggedDates,
    foods,
    recentMeals,
    favoriteMeals,
    weightLogs,
    todayWaterResult,
    templatesRaw,
    templateItems,
    usageRows,
  ] = await Promise.all([
    getDictionary(),
    getT(),
    getLanguage(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", selectedDate)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_entries")
        .select("entry_date")
        .eq("user_id", user.id)
        .gte("entry_date", fourMonthsAgo)
        .order("entry_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("foods")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_entries")
        .select("entry_date, calories, protein, carbs, fat, meal_type, food_name, icon")
        .eq("user_id", user.id)
        .gte("entry_date", seventyDaysAgo)
        .order("entry_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_entries")
        .select("food_name")
        .eq("user_id", user.id)
        .gte("entry_date", thirtyDaysAgo)
        .order("entry_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: true })
        .range(from, to)
    ),
    supabase.from("water_logs").select("ml").eq("user_id", user.id).eq("entry_date", today).maybeSingle(),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("meal_template_items")
        .select("*")
        .eq("user_id", user.id)
        .order("template_id", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
    // How often each food was eaten over four months, to sort the food base by use.
    fetchAllRows((from, to) =>
      supabase
        .from("meal_entries")
        .select("food_name")
        .eq("user_id", user.id)
        .gte("entry_date", fourMonthsAgo)
        .order("id", { ascending: true })
        .range(from, to)
    ),
  ]);

  if (profileResult.error) throw new Error("Impossible de charger les objectifs nutritionnels.");
  const profile = profileResult.data;
  const todayWater = todayWaterResult.data;
  if (todayWaterResult.error) throw new Error("Impossible de charger l’hydratation du jour.");

  const itemsByTemplate = new Map<string, typeof templateItems>();
  for (const item of templateItems) {
    const items = itemsByTemplate.get(item.template_id) ?? [];
    items.push(item);
    itemsByTemplate.set(item.template_id, items);
  }
  const templates = templatesRaw.map((template) => ({
    ...template,
    meal_template_items: itemsByTemplate.get(template.id) ?? [],
  }));

  const usage: Record<string, number> = {};
  for (const row of usageRows) usage[row.food_name] = (usage[row.food_name] ?? 0) + 1;
  // Foods whose name is not in the starter lists were created by the user.
  const defaultNames = new Set([...DEFAULT_FOODS, ...DEFAULT_DRINKS].map((food) => food.name.toLowerCase()));
  const customIds = foods.filter((food) => !defaultNames.has(food.name.toLowerCase())).map((food) => food.id);

  const totals = sumMeals(meals);
  const selectedTotals = sumMeals(selectedDayMeals);

  const drinksMl = meals.filter((m) => m.unit === "ml").reduce((sum, m) => sum + m.quantity_grams, 0);
  const caffeineMg = totals.caffeine;
  const CAFFEINE_LIMIT_MG = profile?.caffeine_limit_mg ?? 400;

  const caloriesChart = weeklyTotals(
    recentMeals.map((m) => ({ date: m.entry_date, value: m.calories })),
    10
  );

  const favoriteCounts = new Map<string, number>();
  for (const m of favoriteMeals) {
    favoriteCounts.set(m.food_name, (favoriteCounts.get(m.food_name) ?? 0) + 1);
  }
  const topNames = Array.from(favoriteCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);
  const quickFoods = topNames
    .map((name) => foods.find((f) => f.name === name))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const macroRingLabels = {
    calories: t("nutrition.macroRings.calories"),
    protein: t("nutrition.macroRings.protein"),
    carbs: t("nutrition.macroRings.carbs"),
    fat: t("nutrition.macroRings.fat"),
  };
  const selectedRings = buildRings(selectedTotals, profile, macroRingLabels);
  const SUGAR_LIMIT_G = profile?.sugar_limit_g ?? 50;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-nutrition text-xl">
            🍽️
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-nutrition">{new Intl.DateTimeFormat(language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${today}T12:00:00`))}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{dict.pages.nutrition.title}</h1>
          </div>
        </div>
        <FoodSettings foods={foods} usage={usage} customIds={customIds} />
      </div>

      <NutritionTabs
        initialTab={date ? "journal" : "today"}
        today={
          <>
            {profile?.goal_calories && totals.calories > profile.goal_calories * 1.15 && (
              <Callout variant="warning" title={t("nutrition.page.overGoalTitle")} dismissKey={`kcal-over:${today}`}>
                {t("nutrition.page.overGoalBody", {
                  current: totals.calories,
                  goal: profile.goal_calories,
                  diff: totals.calories - profile.goal_calories,
                })}
              </Callout>
            )}
            {profile?.goal_calories && totals.calories > 0 && totals.calories <= profile.goal_calories && totals.calories >= profile.goal_calories * 0.9 && (
              <Callout variant="success" dismissKey={`kcal-on-target:${today}`} compact>
                {t("nutrition.page.onTargetBody")}
              </Callout>
            )}

            <CalorieHero
              totals={totals}
              goals={{ calories: profile?.goal_calories ?? null, protein: profile?.goal_protein ?? null, carbs: profile?.goal_carbs ?? null, fat: profile?.goal_fat ?? null }}
              goalsHref={`/nutrition?date=${today}#goals`}
            />

            <AddFoodButton foods={foods} quickFoods={quickFoods} />

            <section aria-labelledby="nutrition-extras" className="space-y-4">
              <h2 id="nutrition-extras" className="px-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("nutrition.v2.extrasTitle")}</h2>
              <WaterTracker ml={todayWater?.ml ?? 0} drinksMl={drinksMl} goalMl={profile?.water_goal_ml ?? 2000} />
              {caffeineMg > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">{t("nutrition.page.caffeineHeading")}</p>
                    <span className="text-sm tabular-nums">
                      <span className="font-semibold" style={{ color: caffeineMg > CAFFEINE_LIMIT_MG ? "var(--danger)" : "var(--foreground)" }}>{caffeineMg}</span> / {CAFFEINE_LIMIT_MG} mg
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((caffeineMg / CAFFEINE_LIMIT_MG) * 100))}%`, background: caffeineMg > CAFFEINE_LIMIT_MG ? "var(--danger)" : "var(--mood)" }} />
                  </div>
                  <p className="mt-2 text-[11px] text-foreground-muted">{t("nutrition.page.caffeineLimitNote", { limit: CAFFEINE_LIMIT_MG, cups: Math.max(1, Math.round(CAFFEINE_LIMIT_MG / 100)) })}</p>
                </div>
              )}
              {totals.sugar > 0 && <SugarMeter sugarG={totals.sugar} limitG={SUGAR_LIMIT_G} />}
            </section>
          </>
        }
        journal={
          <>
            <NutritionJournal
              selectedDate={selectedDate}
              meals={selectedDayMeals}
              markedDates={Array.from(new Set((loggedDates ?? []).map((d) => d.entry_date)))}
              totals={selectedTotals}
              rings={selectedRings}
              sugarLimitG={SUGAR_LIMIT_G}
            />

            <div id="goals" className="scroll-mt-20 rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                {t("nutrition.page.dailyGoalsHeading")}
              </p>
              <NutritionGoalsCalculator profile={profile} />
              <DailyLimits waterGoalMl={profile?.water_goal_ml ?? 2000} caffeineLimitMg={profile?.caffeine_limit_mg ?? 400} sugarLimitG={SUGAR_LIMIT_G} />
            </div>

            <InViewFade className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                {t("nutrition.page.calorieTrendHeading")}
              </p>
              <WeeklyBarChart data={caloriesChart} color="var(--nutrition)" unit="kcal" />
            </InViewFade>

            <WeightTracker logs={weightLogs ?? []} />
          </>
        }
        week={
          <NutritionReview
            today={today}
            meals={recentMeals}
            goals={{ calories: profile?.goal_calories ?? null, protein: profile?.goal_protein ?? null, carbs: profile?.goal_carbs ?? null, fat: profile?.goal_fat ?? null }}
          />
        }
        recipes={<MealTemplatesPanel templates={templates ?? []} foods={foods ?? []} />}
      />
    </div>
  );
}
