import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { MealForm } from "@/components/meal-form";
import { MealList } from "@/components/meal-list";
import { NutritionGoalsCalculator } from "@/components/nutrition-goals-calculator";
import { FoodSettings } from "@/components/food-settings";

function ProgressBar({ label, value, goal, unit, color }: { label: string; value: number; goal: number | null; unit: string; color: string }) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-foreground-muted">
        <span>{label}</span>
        <span>
          <span className="font-semibold text-foreground">{value}</span>
          {goal ? ` / ${goal}` : ""} {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default async function NutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: profile }, { data: meals }, { data: foods }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("meal_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("entry_date", today)
      .order("occurred_at", { ascending: true }),
    supabase.from("foods").select("*").eq("user_id", user.id).order("name", { ascending: true }),
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

      <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Objectifs quotidiens
        </p>
        <NutritionGoalsCalculator profile={profile} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Aujourd&apos;hui
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProgressBar label="Calories" value={totals.calories} goal={profile?.goal_calories ?? null} unit="kcal" color="var(--nutrition)" />
          <ProgressBar label="Protéines" value={totals.protein} goal={profile?.goal_protein ?? null} unit="g" color="var(--habit)" />
          <ProgressBar label="Glucides" value={totals.carbs} goal={profile?.goal_carbs ?? null} unit="g" color="var(--mood)" />
          <ProgressBar label="Lipides" value={totals.fat} goal={profile?.goal_fat ?? null} unit="g" color="var(--accent)" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Ajouter un aliment
        </p>
        <MealForm foods={foods ?? []} />
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Journal du jour
        </p>
        <MealList meals={meals ?? []} />
      </div>
    </div>
  );
}
