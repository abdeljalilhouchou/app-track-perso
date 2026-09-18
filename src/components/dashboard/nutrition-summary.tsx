import Link from "next/link";
import { MacroRings } from "@/components/macro-rings";

export function NutritionSummary({
  rings,
  caffeineMg,
  weightKg,
  weightDelta,
  hasMeals,
}: {
  rings: { label: string; value: number; goal: number | null; unit: string; color: string }[];
  caffeineMg: number;
  weightKg: number | null;
  weightDelta: number | null;
  hasMeals: boolean;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">🍽️ Nutrition du jour</h2>
        <Link href="/nutrition" className="text-xs font-medium text-accent hover:underline">
          Ouvrir
        </Link>
      </div>

      {hasMeals ? (
        <MacroRings rings={rings} />
      ) : (
        <p className="rounded-xl border border-dashed border-nutrition/40 p-6 text-center text-sm text-foreground-muted">
          Rien enregistré aujourd&apos;hui.{" "}
          <Link href="/nutrition" className="font-medium text-accent hover:underline">
            Ajouter un repas
          </Link>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {caffeineMg > 0 && (
          <span className="rounded-full border border-nutrition/40 bg-surface-muted px-2.5 py-1">☕ {caffeineMg} mg de caféine</span>
        )}
        {weightKg !== null && (
          <span className="rounded-full border border-nutrition/40 bg-surface-muted px-2.5 py-1">
            ⚖️ {weightKg} kg
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
