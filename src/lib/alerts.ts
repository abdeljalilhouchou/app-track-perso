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

const ORDER: Record<CalloutVariant, number> = { danger: 0, warning: 1, info: 2, tip: 3, success: 4 };
const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/** `hour` is the user's local hour (0-23) and `isoWeekday` 1 = Monday … 7 = Sunday. */
export function buildAlerts(f: AlertFacts, hour: number, isoWeekday: number): SmartAlert[] {
  const out: SmartAlert[] = [];

  // ---- Limits already exceeded (always relevant)
  if (f.caffeine > f.caffeineLimit) {
    out.push({
      id: "caffeine-over",
      variant: "warning",
      title: "Caféine dépassée",
      text: `Tu es à ${f.caffeine} mg pour une limite de ${f.caffeineLimit} mg. Évite d'en reprendre aujourd'hui, surtout le soir, pour bien dormir.`,
    });
  }
  if (f.sugar > f.sugarLimit) {
    out.push({
      id: "sugar-over",
      variant: "warning",
      title: "Trop de sucres aujourd'hui",
      text: `${f.sugar} g pour une limite de ${f.sugarLimit} g. Privilégie de l'eau et des aliments non sucrés pour le reste de la journée.`,
    });
  }
  if (f.kcalGoal && f.kcal > f.kcalGoal * 1.15) {
    out.push({
      id: "kcal-over",
      variant: "warning",
      title: "Objectif calorique dépassé",
      text: `Tu es à ${f.kcal} kcal pour un objectif de ${f.kcalGoal} kcal (+${f.kcal - f.kcalGoal}). Allège le prochain repas si tu vises une perte de poids.`,
      action: { label: "Voir mon journal", href: "/nutrition" },
    });
  }

  // ---- Streaks: at risk (evening) and lost
  for (const s of f.streaks) {
    if (!s.doneToday && s.streak >= 3 && hour >= 17) {
      out.push({
        id: `streak-risk-${s.name}`,
        variant: hour >= 21 ? "danger" : "warning",
        title: hour >= 21 ? "Ta série se termine bientôt !" : "Série en danger",
        text: `« ${s.name} » : ${s.streak} jours d'affilée. Coche-la avant minuit pour ne pas casser ta série. 🔥`,
        action: { label: "Aller aux habitudes", href: "/habits" },
      });
    }
    if (!s.doneToday && s.streak === 0 && s.lostLength >= 3) {
      out.push({
        id: `streak-lost-${s.name}`,
        variant: "warning",
        title: "Série perdue",
        text: `Ta série de ${s.lostLength} jours sur « ${s.name} » s'est arrêtée hier. Ça arrive à tout le monde : repars dès aujourd'hui, une nouvelle série commence par un seul jour.`,
        action: { label: "Reprendre maintenant", href: "/habits" },
      });
    }
  }

  // ---- Habits of the day
  if (f.habits.total > 0) {
    if (f.habits.done === f.habits.total) {
      out.push({
        id: "habits-all-done",
        variant: "success",
        title: "Journée parfaite",
        text: `Toutes tes habitudes du jour sont faites (${f.habits.total}/${f.habits.total}). Bravo ! 🎉`,
      });
    } else if (hour >= 18) {
      const left = f.habits.remaining.length;
      out.push({
        id: "habits-left-evening",
        variant: "info",
        title: `${left} ${plural(left, "habitude", "habitudes")} à faire`,
        text: `Il te reste : ${f.habits.remaining.slice(0, 3).join(", ")}${left > 3 ? "…" : ""}. Il n'est pas trop tard pour finir la journée en beauté.`,
        action: { label: "Cocher maintenant", href: "/habits" },
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
      title: "Objectif sport atteint",
      text: `${f.sportSessions}/${f.sportGoal} séances cette semaine. Tu peux souffler ou viser plus haut ! 💪`,
    });
  } else if (missing > 0 && missing >= daysLeft) {
    out.push({
      id: "sport-goal-risk",
      variant: "warning",
      title: "Objectif de la semaine en danger",
      text: `Il te reste ${missing} ${plural(missing, "séance", "séances")} à faire en ${daysLeft} ${plural(daysLeft, "jour", "jours")} pour atteindre ${f.sportGoal}. Planifie-en une aujourd'hui.`,
      action: { label: "Voir ma séance", href: "/sport" },
    });
  }

  // ---- Nutrition & hydration nudges
  if (f.mealsCount === 0 && hour >= 14) {
    out.push({
      id: "no-meals",
      variant: "tip",
      title: "Aucun repas noté",
      text: "Rien n'est enregistré dans ton journal alimentaire aujourd'hui. Note au moins ce que tu as déjà mangé pour garder des stats justes.",
      action: { label: "Ajouter un repas", href: "/nutrition" },
    });
  }
  if (f.proteinGoal && f.mealsCount > 0 && hour >= 19 && f.protein < f.proteinGoal * 0.6) {
    out.push({
      id: "protein-low",
      variant: "info",
      title: "Protéines en retard",
      text: `Il te manque ${Math.round(f.proteinGoal - f.protein)} g de protéines pour ton objectif. Un yaourt grec, des œufs ou un shake peuvent combler l'écart.`,
      action: { label: "Ajouter un aliment", href: "/nutrition" },
    });
  }
  const waterPct = f.waterGoal ? f.waterMl / f.waterGoal : 1;
  if (hour >= 19 && waterPct < 0.7) {
    out.push({
      id: "water-low-evening",
      variant: "warning",
      title: "Hydratation insuffisante",
      text: `${f.waterMl} ml sur ${f.waterGoal} ml. Bois un grand verre d'eau maintenant, puis un autre avant de dormir.`,
    });
  } else if (hour >= 14 && waterPct < 0.4) {
    out.push({
      id: "water-low-afternoon",
      variant: "tip",
      title: "Pense à boire",
      text: `Tu n'as bu que ${f.waterMl} ml sur ${f.waterGoal} ml. Ajoute un verre (250 ml) depuis le tableau de bord.`,
    });
  }

  // ---- Mood, weight, setup
  if (!f.moodLogged && hour >= 12) {
    out.push({
      id: "mood-missing",
      variant: "tip",
      title: "Comment tu te sens ?",
      text: "Ton humeur du jour n'est pas encore notée : un clic suffit dans le panneau ci-dessous.",
    });
  }
  if (f.daysSinceWeight !== null && f.daysSinceWeight >= 7) {
    out.push({
      id: "weight-old",
      variant: "tip",
      title: "Pesée à faire",
      text: `Ta dernière pesée date de ${f.daysSinceWeight} jours. Une pesée par semaine suffit pour suivre ta tendance.`,
      action: { label: "Noter mon poids", href: "/nutrition" },
    });
  }
  if (!f.goalsSet) {
    out.push({
      id: "goals-missing",
      variant: "info",
      title: "Objectifs nutrition non définis",
      text: "Renseigne ta taille, ton poids et ton âge : l'app calcule tes calories et macros idéaux.",
      action: { label: "Calculer mes objectifs", href: "/nutrition" },
    });
  }
  if (!f.reminderSet) {
    out.push({
      id: "reminder-missing",
      variant: "tip",
      title: "Active ton rappel du soir",
      text: "Un e-mail chaque jour te rappelle ce qu'il te reste à faire. Ça prend 10 secondes.",
      action: { label: "Activer le rappel", href: "/profil" },
    });
  }

  return out.sort((a, b) => ORDER[a.variant] - ORDER[b.variant]).slice(0, 6);
}
