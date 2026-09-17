import { format, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { MealForm } from "@/components/meal-form";
import { MealList } from "@/components/meal-list";
import { NutritionGoalsCalculator } from "@/components/nutrition-goals-calculator";
import { FoodSettings } from "@/components/food-settings";
import { MealTemplatesPanel } from "@/components/meal-templates";
import { WaterTracker } from "@/components/water-tracker";
import { WeightTracker } from "@/components/weight-tracker";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { MacroRings } from "@/components/macro-rings";
import { NutritionTabs } from "@/components/nutrition-tabs";
import { InViewFade } from "@/components/ui/in-view-fade";
import { weeklyTotals } from "@/lib/weekly";

export default async function NutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const seventyDaysAgo = format(subDays(new Date(), 70), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [
    { data: profile },
    { data: meals },
    { data: foods },
    { data: recentMeals },
    { data: favoriteMeals },
    { data: weightLogs },
    { data: todayWater },
    { data: templates },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("meal_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("entry_date", today)
      .order("occurred_at", { ascending: true }),
    supabase.from("foods").select("*").eq("user_id", user.id).order("name", { ascending: true }),
    supabase
      .from("meal_entries")
      .select("entry_date, calories")
      .eq("user_id", user.id)
      .gte("entry_date", seventyDaysAgo),
    supabase
      .from("meal_entries")
      .select("food_name")
      .eq("user_id", user.id)
      .gte("entry_date", thirtyDaysAgo),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: true }),
    supabase.from("water_logs").select("ml").eq("user_id", user.id).eq("entry_date", today).maybeSingle(),
    supabase
      .from("meal_templates")
      .select("*, meal_template_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const totals = (meals ?? []).reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const caloriesChart = weeklyTotals(
    (recentMeals ?? []).map((m) => ({ date: m.entry_date, value: m.calories })),
    10
  );

  const favoriteCounts = new Map<string, number>();
  for (const m of favoriteMeals ?? []) {
    favoriteCounts.set(m.food_name, (favoriteCounts.get(m.food_name) ?? 0) + 1);
  }
  const topNames = Array.from(favoriteCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);
  const quickFoods = topNames
    .map((name) => (foods ?? []).find((f) => f.name === name))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const rings = [
    { label: "Calories", value: totals.calories, goal: profile?.goal_calories ?? null, unit: "kcal", color: "var(--nutrition)" },
    { label: "Protéines", value: totals.protein, goal: profile?.goal_protein ?? null, unit: "g", color: "var(--habit)" },
    { label: "Glucides", value: totals.carbs, goal: profile?.goal_carbs ?? null, unit: "g", color: "var(--mood)" },
    { label: "Lipides", value: totals.fat, goal: profile?.goal_fat ?? null, unit: "g", color: "var(--accent)" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-nutrition text-xl">
            🍽️
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
            <p className="mt-0.5 text-sm text-foreground-muted">Journal alimentaire et macros du jour.</p>
          </div>
        </div>
        <FoodSettings foods={foods ?? []} />
      </div>

      <NutritionTabs
        today={
          <>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Aujourd&apos;hui
              </p>
              <MacroRings rings={rings} />
            </div>

            <WaterTracker ml={todayWater?.ml ?? 0} />

            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Ajouter un aliment
              </p>
              <MealForm foods={foods ?? []} quickFoods={quickFoods} />
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Journal du jour
              </p>
              <MealList meals={meals ?? []} />
            </div>
          </>
        }
        trends={
          <>
            <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Objectifs quotidiens
              </p>
              <NutritionGoalsCalculator profile={profile} />
            </div>

            <InViewFade className="rounded-2xl border border-border bg-surface p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Tendance calorique (10 dernières semaines)
              </p>
              <WeeklyBarChart data={caloriesChart} color="var(--nutrition)" unit="kcal" />
            </InViewFade>

            <WeightTracker logs={weightLogs ?? []} />
          </>
        }
        recipes={<MealTemplatesPanel templates={templates ?? []} foods={foods ?? []} />}
      />
    </div>
  );
}
