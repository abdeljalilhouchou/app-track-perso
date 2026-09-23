"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { saveNutritionProfile } from "@/lib/actions/nutrition";
import { ACTIVITY_LEVELS, NUTRITION_GOALS, computeNutritionTargets } from "@/lib/nutrition-calculator";
import { useT } from "@/components/language-provider";
import type { Profile } from "@/types/database";

export function NutritionGoalsCalculator({ profile }: { profile: Profile | null }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [open, setOpen] = useState(!profile?.goal_calories);

  const [height, setHeight] = useState(profile?.height_cm ?? 170);
  const [weight, setWeight] = useState(profile?.weight_kg ?? 70);
  const [age, setAge] = useState(profile?.age ?? 25);
  const [sex, setSex] = useState<"homme" | "femme">(profile?.sex ?? "homme");
  const [activity, setActivity] = useState(profile?.activity_level ?? "leger");
  const [goal, setGoal] = useState(profile?.nutrition_goal ?? "maintenir");

  const preview = computeNutritionTargets({
    heightCm: height,
    weightKg: weight,
    age,
    sex,
    activityLevel: activity,
    goal,
  });

  if (!open && profile?.goal_calories) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span><strong>{profile.goal_calories}</strong> kcal/j</span>
          <span className="text-foreground-muted">
            {profile.goal_protein}g {t("nutrition.common.proteinAbbrev")} · {profile.goal_carbs}g{" "}
            {t("nutrition.common.carbsAbbrev")} · {profile.goal_fat}g {t("nutrition.common.fatAbbrev")}
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-accent hover:underline"
        >
          {t("nutrition.goalsCalculator.recalculate")}
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const r = await run(() => saveNutritionProfile(formData), {
            success: t("nutrition.goalsCalculator.saveSuccess", { calories: preview.calories }),
            failure: t("nutrition.goalsCalculator.saveFailure"),
          });
          if (!r || r.error) return;
          setOpen(false);
        })
      }
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-foreground-muted">{t("nutrition.goalsCalculator.height")}</span>
          <input
            name="height_cm"
            type="number"
            min={100}
            max={250}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-foreground-muted">{t("nutrition.goalsCalculator.weight")}</span>
          <input
            name="weight_kg"
            type="number"
            min={30}
            max={300}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-foreground-muted">{t("nutrition.goalsCalculator.age")}</span>
          <input
            name="age"
            type="number"
            min={10}
            max={100}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-foreground-muted">{t("nutrition.goalsCalculator.sex")}</span>
          <select
            name="sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as "homme" | "femme")}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="homme">{t("nutrition.goalsCalculator.male")}</option>
            <option value="femme">{t("nutrition.goalsCalculator.female")}</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-foreground-muted">{t("nutrition.goalsCalculator.activityLevel")}</span>
        <select
          name="activity_level"
          value={activity}
          onChange={(e) => setActivity(e.target.value as typeof activity)}
          className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.value} value={a.value}>
              {t(`nutrition.goalsCalculator.activityLevels.${a.value}.label`)} —{" "}
              {t(`nutrition.goalsCalculator.activityLevels.${a.value}.hint`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-foreground-muted">{t("nutrition.goalsCalculator.goal")}</span>
        <select
          name="nutrition_goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value as typeof goal)}
          className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
        >
          {NUTRITION_GOALS.map((g) => (
            <option key={g.value} value={g.value}>
              {t(`nutrition.goalsCalculator.goals.${g.value}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-xl bg-accent-soft p-3 text-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">{t("nutrition.goalsCalculator.resultTitle")}</p>
        <p>
          {t("nutrition.goalsCalculator.resultLine", {
            calories: preview.calories,
            protein: preview.protein,
            proteinsWord: t("nutrition.common.proteinsWord"),
            carbs: preview.carbs,
            carbsWord: t("nutrition.common.carbsWord"),
            fat: preview.fat,
            fatWord: t("nutrition.common.fatWord"),
          })}
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border-[1.5px] border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-60"
      >
        {pending ? t("nutrition.common.saving") : t("nutrition.goalsCalculator.saveButton")}
      </button>
    </form>
  );
}
