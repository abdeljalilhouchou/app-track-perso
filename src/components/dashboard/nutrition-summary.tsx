import Link from "next/link";
import { MacroRings } from "@/components/macro-rings";

type Translator = (path: string, vars?: Record<string, string | number>) => string;

export function NutritionSummary({
  rings,
  caffeineMg,
  sugarG,
  weightKg,
  weightDelta,
  hasMeals,
  t,
}: {
  rings: { label: string; value: number; goal: number | null; unit: string; color: string }[];
  caffeineMg: number;
  sugarG: number;
  weightKg: number | null;
  weightDelta: number | null;
  hasMeals: boolean;
  t: Translator;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("dashboard.nutrition.heading")}</h2>
        <Link href="/nutrition" className="text-xs font-medium text-accent hover:underline">
          {t("dashboard.nutrition.open")}
        </Link>
      </div>

      {hasMeals ? (
        <MacroRings rings={rings} />
      ) : (
        <p className="rounded-xl border border-dashed border-nutrition/40 p-6 text-center text-sm text-foreground-muted">
          {t("dashboard.nutrition.noMealsToday")}{" "}
          <Link href="/nutrition" className="font-medium text-accent hover:underline">
            {t("dashboard.nutrition.addMeal")}
          </Link>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {caffeineMg > 0 && (
          <span className="rounded-full border border-nutrition/40 bg-surface-muted px-2.5 py-1">
            ☕ {t("dashboard.nutrition.caffeine", { mg: caffeineMg })}
          </span>
        )}
        {sugarG > 0 && (
          <span className="rounded-full border border-nutrition/40 bg-surface-muted px-2.5 py-1">
            🍬 {t("dashboard.nutrition.sugar", { g: sugarG })}
          </span>
        )}
        {weightKg !== null && (
          <span className="rounded-full border border-nutrition/40 bg-surface-muted px-2.5 py-1">
            ⚖️ {t("dashboard.nutrition.weight", { kg: weightKg })}
            {weightDelta !== null && weightDelta !== 0 && (
              <span style={{ color: weightDelta > 0 ? "var(--danger)" : "var(--success)" }}>
                {" "}
                ({weightDelta > 0 ? "+" : ""}
                {weightDelta})
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
