import type { CalloutVariant } from "@/components/ui/callout";

export type AlertFacts = {
  today: string;
  habits: { total: number; done: number; remaining: string[] };
  /** Only habits scheduled every day (a calendar streak is meaningless otherwise). */
  streaks: { name: string; streak: number; doneToday: boolean; lostLength: number }[];
  moodLogged: boolean;
  waterMl: number;
  waterGoal: number;
  kcal: number;
  kcalGoal: number | null;
  protein: number;
  proteinGoal: number | null;
  mealsCount: number;
  caffeine: number;
  caffeineLimit: number;
  sugar: number;
  sugarLimit: number;
  sportSessions: number;
  sportGoal: number;
  daysSinceWeight: number | null;
  reminderSet: boolean;
  goalsSet: boolean;
};

export type SmartAlert = {
  id: string;
  variant: CalloutVariant;
  title?: string;
  text: string;
  action?: { label: string; href: string };
};

export type Translator = (path: string, vars?: Record<string, string | number>) => string;

const ORDER: Record<CalloutVariant, number> = { danger: 0, warning: 1, info: 2, tip: 3, success: 4 };

/** `hour` is the user's local hour (0-23) and `isoWeekday` 1 = Monday … 7 = Sunday. */
export function buildAlerts(f: AlertFacts, hour: number, isoWeekday: number, t: Translator): SmartAlert[] {
  const out: SmartAlert[] = [];
  const plural = (n: number, oneKey: string, manyKey: string) =>
    t(`dashboard.alerts.${n > 1 ? manyKey : oneKey}`);

  // ---- Limits already exceeded (always relevant)
  if (f.caffeine > f.caffeineLimit) {
    out.push({
      id: "caffeine-over",
      variant: "warning",
      title: t("dashboard.alerts.caffeineOverTitle"),
      text: t("dashboard.alerts.caffeineOverText", { caffeine: f.caffeine, limit: f.caffeineLimit }),
    });
  }
  if (f.sugar > f.sugarLimit) {
    out.push({
      id: "sugar-over",
      variant: "warning",
      title: t("dashboard.alerts.sugarOverTitle"),
      text: t("dashboard.alerts.sugarOverText", { sugar: f.sugar, limit: f.sugarLimit }),
    });
  }
  if (f.kcalGoal && f.kcal > f.kcalGoal * 1.15) {
    out.push({
      id: "kcal-over",
      variant: "warning",
      title: t("dashboard.alerts.kcalOverTitle"),
      text: t("dashboard.alerts.kcalOverText", { kcal: f.kcal, goal: f.kcalGoal, over: f.kcal - f.kcalGoal }),
      action: { label: t("dashboard.alerts.actions.viewJournal"), href: "/nutrition" },
    });
  }

  // ---- Streaks: at risk (evening) and lost
  for (const s of f.streaks) {
    if (!s.doneToday && s.streak >= 3 && hour >= 17) {
      out.push({
        id: `streak-risk-${s.name}`,
        variant: hour >= 21 ? "danger" : "warning",
        title: t(hour >= 21 ? "dashboard.alerts.streakRiskTitleUrgent" : "dashboard.alerts.streakRiskTitleWarning"),
        text: t("dashboard.alerts.streakRiskText", { name: s.name, streak: s.streak }),
        action: { label: t("dashboard.alerts.actions.goToHabits"), href: "/habits" },
      });
    }
    if (!s.doneToday && s.streak === 0 && s.lostLength >= 3) {
      out.push({
        id: `streak-lost-${s.name}`,
        variant: "warning",
        title: t("dashboard.alerts.streakLostTitle"),
        text: t("dashboard.alerts.streakLostText", { lostLength: s.lostLength, name: s.name }),
        action: { label: t("dashboard.alerts.actions.resumeNow"), href: "/habits" },
      });
    }
  }

  // ---- Habits of the day
  if (f.habits.total > 0) {
    if (f.habits.done === f.habits.total) {
      out.push({
        id: "habits-all-done",
        variant: "success",
        title: t("dashboard.alerts.allDoneTitle"),
        text: t("dashboard.alerts.allDoneText", { total: f.habits.total }),
      });
    } else if (hour >= 18) {
      const left = f.habits.remaining.length;
      out.push({
        id: "habits-left-evening",
        variant: "info",
        title: t(left > 1 ? "dashboard.alerts.habitsLeftTitleMany" : "dashboard.alerts.habitsLeftTitleOne", { count: left }),
        text: t("dashboard.alerts.habitsLeftText", {
          list: `${f.habits.remaining.slice(0, 3).join(", ")}${left > 3 ? "…" : ""}`,
        }),
        action: { label: t("dashboard.alerts.actions.checkNow"), href: "/habits" },
      });
    }
  }

  // ---- Sport goal of the week
  const daysLeft = 8 - isoWeekday; // today included
  const missing = f.sportGoal - f.sportSessions;
  if (missing <= 0 && f.sportSessions > 0) {
    out.push({
      id: "sport-goal-reached",
      variant: "success",
      title: t("dashboard.alerts.sportGoalReachedTitle"),
      text: t("dashboard.alerts.sportGoalReachedText", { sessions: f.sportSessions, goal: f.sportGoal }),
    });
  } else if (missing > 0 && missing >= daysLeft) {
    out.push({
      id: "sport-goal-risk",
      variant: "warning",
      title: t("dashboard.alerts.sportGoalRiskTitle"),
      text: t("dashboard.alerts.sportGoalRiskText", {
        missing,
        sessionWord: plural(missing, "sessionOne", "sessionMany"),
        daysLeft,
        dayWord: plural(daysLeft, "dayOne", "dayMany"),
        goal: f.sportGoal,
      }),
      action: { label: t("dashboard.alerts.actions.viewSession"), href: "/sport" },
    });
  }

  // ---- Nutrition & hydration nudges
  if (f.mealsCount === 0 && hour >= 14) {
    out.push({
      id: "no-meals",
      variant: "tip",
      title: t("dashboard.alerts.noMealsTitle"),
      text: t("dashboard.alerts.noMealsText"),
      action: { label: t("dashboard.alerts.actions.addMeal"), href: "/nutrition" },
    });
  }
  if (f.proteinGoal && f.mealsCount > 0 && hour >= 19 && f.protein < f.proteinGoal * 0.6) {
    out.push({
      id: "protein-low",
      variant: "info",
      title: t("dashboard.alerts.proteinLowTitle"),
      text: t("dashboard.alerts.proteinLowText", { missing: Math.round(f.proteinGoal - f.protein) }),
      action: { label: t("dashboard.alerts.actions.addFood"), href: "/nutrition" },
    });
  }
  const waterPct = f.waterGoal ? f.waterMl / f.waterGoal : 1;
  if (hour >= 19 && waterPct < 0.7) {
    out.push({
      id: "water-low-evening",
      variant: "warning",
      title: t("dashboard.alerts.waterLowEveningTitle"),
      text: t("dashboard.alerts.waterLowEveningText", { water: f.waterMl, goal: f.waterGoal }),
    });
  } else if (hour >= 14 && waterPct < 0.4) {
    out.push({
      id: "water-low-afternoon",
      variant: "tip",
      title: t("dashboard.alerts.waterLowAfternoonTitle"),
      text: t("dashboard.alerts.waterLowAfternoonText", { water: f.waterMl, goal: f.waterGoal }),
    });
  }

  // ---- Mood, weight, setup
  if (!f.moodLogged && hour >= 12) {
    out.push({
      id: "mood-missing",
      variant: "tip",
      title: t("dashboard.alerts.moodMissingTitle"),
      text: t("dashboard.alerts.moodMissingText"),
    });
  }
  if (f.daysSinceWeight !== null && f.daysSinceWeight >= 7) {
    out.push({
      id: "weight-old",
      variant: "tip",
      title: t("dashboard.alerts.weightOldTitle"),
      text: t("dashboard.alerts.weightOldText", { days: f.daysSinceWeight }),
      action: { label: t("dashboard.alerts.actions.noteWeight"), href: "/nutrition" },
    });
  }
  if (!f.goalsSet) {
    out.push({
      id: "goals-missing",
      variant: "info",
      title: t("dashboard.alerts.goalsMissingTitle"),
      text: t("dashboard.alerts.goalsMissingText"),
      action: { label: t("dashboard.alerts.actions.calculateGoals"), href: "/nutrition" },
    });
  }
  if (!f.reminderSet) {
    out.push({
      id: "reminder-missing",
      variant: "tip",
      title: t("dashboard.alerts.reminderMissingTitle"),
      text: t("dashboard.alerts.reminderMissingText"),
      action: { label: t("dashboard.alerts.actions.activateReminder"), href: "/profil" },
    });
  }

  return out.sort((a, b) => ORDER[a.variant] - ORDER[b.variant]).slice(0, 6);
}
