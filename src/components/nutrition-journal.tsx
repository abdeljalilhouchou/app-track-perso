import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { DayNavigator } from "@/components/journal/day-navigator";
import { MealList } from "@/components/meal-list";
import type { MealEntry } from "@/types/database";

export function NutritionJournal({
  selectedDate,
  meals,
  markedDates,
}: {
  selectedDate: string;
  meals: MealEntry[];
  markedDates: string[];
}) {
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      caffeine: acc.caffeine + m.caffeine,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, caffeine: 0 }
  );
  const heading = format(parseISO(selectedDate), "EEEE d MMMM", { locale: fr });

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <DayNavigator selectedDate={selectedDate} basePath="/nutrition" markedDates={markedDates} />

      <div className="mb-4 mt-6">
        <p className="text-lg font-semibold capitalize">{heading}</p>
        <p className="text-xs text-foreground-muted">
          {meals.length === 0
            ? "Rien enregistré ce jour-là"
            : `${meals.length} entrée${meals.length !== 1 ? "s" : ""} · ${Math.round(totals.calories)} kcal · ${Math.round(totals.protein)}g P · ${Math.round(totals.carbs)}g G · ${Math.round(totals.fat)}g L${
                totals.caffeine > 0 ? ` · ☕ ${Math.round(totals.caffeine)}mg` : ""
              }`}
        </p>
      </div>

      <MealList meals={meals} emptyLabel="Rien enregistré ce jour-là." />
    </div>
  );
}
