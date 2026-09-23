"use client";

import { format, parseISO } from "date-fns";
import { fr, enUS, arSA } from "date-fns/locale";
import { DayNavigator } from "@/components/journal/day-navigator";
import { MacroRings } from "@/components/macro-rings";
import { MealList } from "@/components/meal-list";
import { useLanguage, useT } from "@/components/language-provider";
import type { buildRings, sumMeals } from "@/lib/nutrition-totals";
import type { MealEntry } from "@/types/database";

const DATE_FNS_LOCALES = { fr, en: enUS, ar: arSA };

export function NutritionJournal({
  selectedDate,
  meals,
  markedDates,
  totals,
  rings,
  sugarLimitG,
}: {
  selectedDate: string;
  meals: MealEntry[];
  markedDates: string[];
  totals: ReturnType<typeof sumMeals>;
  rings: ReturnType<typeof buildRings>;
  sugarLimitG: number;
}) {
  const t = useT();
  const { language } = useLanguage();
  const heading = format(parseISO(selectedDate), "EEEE d MMMM", { locale: DATE_FNS_LOCALES[language] });

  return (
    <div className="rounded-2xl border-[1.5px] border-nutrition/50 bg-surface p-5">
      <DayNavigator selectedDate={selectedDate} basePath="/nutrition" markedDates={markedDates} />

      <div className="mb-4 mt-6">
        <p className="text-lg font-semibold capitalize">{heading}</p>
        <p className="text-xs text-foreground-muted">
          {meals.length === 0
            ? t("nutrition.journal.noEntriesHeading")
            : `${meals.length} ${meals.length !== 1 ? t("nutrition.journal.entryPlural") : t("nutrition.journal.entrySingular")}`}
        </p>
      </div>

      {meals.length > 0 && (
        <div className="mb-6 rounded-2xl border border-nutrition/30 p-4">
          <MacroRings key={selectedDate} rings={rings} />
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span
              className="rounded-full border px-2.5 py-1"
              style={{
                borderColor: totals.sugar > sugarLimitG ? "var(--danger)" : "color-mix(in srgb, var(--weight) 40%, var(--border))",
                color: totals.sugar > sugarLimitG ? "var(--danger)" : undefined,
              }}
            >
              {t("nutrition.journal.sugarBadge", { value: totals.sugar, limit: sugarLimitG })}
            </span>
            {totals.fiber > 0 && (
              <span className="rounded-full border border-nutrition/40 px-2.5 py-1">
                {t("nutrition.journal.fiberBadge", { value: totals.fiber })}
              </span>
            )}
            {totals.caffeine > 0 && (
              <span className="rounded-full border border-nutrition/40 px-2.5 py-1">
                {t("nutrition.journal.caffeineBadge", { value: totals.caffeine })}
              </span>
            )}
          </div>
        </div>
      )}

      <MealList meals={meals} emptyLabel={t("nutrition.mealList.emptyDay")} />
    </div>
  );
}
