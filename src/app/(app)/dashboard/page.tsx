import { differenceInCalendarDays, format, getISODay, parseISO, startOfWeek, subDays, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { weeklyTotals } from "@/lib/weekly";
import { buildInsights, computeWeekRecap } from "@/lib/dashboard";
import { computeProfileStats, summarizeProgress } from "@/lib/profile-stats";
import { BADGES } from "@/lib/gamification";
import { WeeklyBarChart } from "@/components/charts/weekly-bar-chart";
import { MoodLineChart } from "@/components/charts/mood-line-chart";
import { InViewFade } from "@/components/ui/in-view-fade";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { NutritionSummary } from "@/components/dashboard/nutrition-summary";
import { ProgressCard } from "@/components/dashboard/progress-card";
import { WeekRecap } from "@/components/dashboard/week-recap";
import { SmartAlerts } from "@/components/dashboard/smart-alerts";
import { computeStreak } from "@/lib/streak";
import type { AlertFacts } from "@/lib/alerts";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const dict = await getDictionary();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const since30 = format(subDays(today, 30), "yyyy-MM-dd");
  const since60 = format(subDays(today, 60), "yyyy-MM-dd");
  const since10w = format(subWeeks(today, 10), "yyyy-MM-dd");

  const [
    { data: profile },
    { data: habits },
    { data: habitLogs },
    { data: workouts },
    { data: moodEntries },
    { data: meals },
    { data: todayWater },
    { data: weightLogs },
    stats,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, goal_calories, goal_protein, goal_carbs, goal_fat, water_goal_ml, caffeine_limit_mg, sugar_limit_g, sport_weekly_goal, reminder_time")
      .eq("id", user.id)
      .single(),
    supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", false),
    supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", user.id).gte("log_date", since10w),
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .gte("workout_date", since10w)
      .order("workout_date", { ascending: false }),
    supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("entry_date", since30)
      .order("entry_date", { ascending: true }),
    supabase
      .from("meal_entries")
      .select("entry_date, calories, protein, carbs, fat, sugar, caffeine, unit, quantity_grams")
      .eq("user_id", user.id)
      .gte("entry_date", since30),
    supabase.from("water_logs").select("ml").eq("user_id", user.id).eq("entry_date", todayStr).maybeSingle(),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("entry_date", since60)
      .order("entry_date", { ascending: true }),
    computeProfileStats(supabase, user.id),
  ]);

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of habitLogs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.log_date);
  }

  // Today
  const todayIsoDay = getISODay(today);
  const todayHabits = (habits ?? [])
    .filter((h) => h.scheduled_days.includes(todayIsoDay))
    .map((h) => ({
      id: h.id,
      icon: h.icon,
      name: h.name,
      color: h.color,
      done: logsByHabit.get(h.id)?.has(todayStr) ?? false,
    }));
  const moodToday = (moodEntries ?? []).find((e) => e.entry_date === todayStr)?.mood_score ?? null;

  const todayMeals = (meals ?? []).filter((m) => m.entry_date === todayStr);
  const totals = todayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const drinksMl = Math.round(
    todayMeals.filter((m) => m.unit === "ml").reduce((sum, m) => sum + m.quantity_grams, 0)
  );
  const caffeineMg = Math.round(todayMeals.reduce((sum, m) => sum + m.caffeine, 0));
  const sugarG = Math.round(todayMeals.reduce((sum, m) => sum + m.sugar, 0) * 10) / 10;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const rings = [
    { label: "Calories", value: Math.round(totals.calories), goal: profile?.goal_calories ?? null, unit: "kcal", color: "var(--nutrition)" },
    { label: "Protéines", value: round1(totals.protein), goal: profile?.goal_protein ?? null, unit: "g", color: "var(--habit)" },
    { label: "Glucides", value: round1(totals.carbs), goal: profile?.goal_carbs ?? null, unit: "g", color: "var(--mood)" },
    { label: "Lipides", value: round1(totals.fat), goal: profile?.goal_fat ?? null, unit: "g", color: "var(--accent)" },
  ];

  const latestWeight = weightLogs && weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const previousWeight = weightLogs && weightLogs.length > 1 ? weightLogs[weightLogs.length - 2] : null;
  const weightDelta = latestWeight && previousWeight ? round1(latestWeight.weight_kg - previousWeight.weight_kg) : null;

  // Progression
  const progress = summarizeProgress(stats);

  // Weekly recap + cross-module insights
  const recap = computeWeekRecap({
    habits: habits ?? [],
    logsByHabit,
    workouts: workouts ?? [],
    moods: moodEntries ?? [],
    meals: meals ?? [],
  });

  const insights = buildInsights({
    moods: moodEntries ?? [],
    workoutDates: new Set((workouts ?? []).map((w) => w.workout_date)),
    meals: meals ?? [],
    goalProtein: profile?.goal_protein ?? null,
    weights: weightLogs ?? [],
    workouts: workouts ?? [],
  });

  // Charts
  const sportChart = weeklyTotals(
    (workouts ?? []).map((w) => ({ date: w.workout_date, value: w.duration_minutes })),
    10
  );
  const moodChart = (moodEntries ?? []).map((e) => ({
    label: format(new Date(e.entry_date), "d MMM", { locale: fr }),
    mood: e.mood_score,
    energy: e.energy_level,
  }));

 // ---- Facts for the notes & alerts panel
  const dayBefore = (n: number) => format(subDays(today, n), "yyyy-MM-dd");
  const streakOn = (set: Set<string>, from: number) => {
    let n = 0;
    while (set.has(dayBefore(from + n))) n++;
    return n;
  };
  const dailyHabits = (habits ?? []).filter((h) => h.scheduled_days.length === 7);
  const streaks = dailyHabits.map((h) => {
    const set = logsByHabit.get(h.id) ?? new Set<string>();
    const doneToday = set.has(todayStr);
    const streak = computeStreak(set);
    const lostLength = !doneToday && !set.has(dayBefore(1)) ? streakOn(set, 2) : 0;
    return { name: h.name, streak: doneToday ? streak : set.has(dayBefore(1)) ? streak : 0, doneToday, lostLength };
  });
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeight = weightLogs && weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const alertFacts: AlertFacts = {
    today: todayStr,
    habits: {
      total: todayHabits.length,
      done: todayHabits.filter((h) => h.done).length,
      remaining: todayHabits.filter((h) => !h.done).map((h) => h.name),
    },
    streaks,
    moodLogged: moodToday !== null,
    waterMl: (todayWater?.ml ?? 0) + drinksMl,
    waterGoal: profile?.water_goal_ml ?? 2000,
    kcal: Math.round(totals.calories),
    kcalGoal: profile?.goal_calories ?? null,
    protein: round1(totals.protein),
    proteinGoal: profile?.goal_protein ?? null,
    mealsCount: todayMeals.length,
    caffeine: caffeineMg,
    caffeineLimit: profile?.caffeine_limit_mg ?? 400,
    sugar: sugarG,
    sugarLimit: profile?.sugar_limit_g ?? 50,
    sportSessions: (workouts ?? []).filter((w) => w.workout_date >= weekStart).length,
    sportGoal: profile?.sport_weekly_goal ?? 3,
    daysSinceWeight: lastWeight ? differenceInCalendarDays(today, parseISO(lastWeight.entry_date)) : null,
    reminderSet: Boolean(profile?.reminder_time),
    goalsSet: Boolean(profile?.goal_calories),
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dict.dashboard.greeting.replace("{name}", displayName)}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{format(today, "EEEE d MMMM yyyy", { locale: fr })}</p>
      </div>

      <SmartAlerts facts={alertFacts} />

      <TodayPanel
        date={todayStr}
        habits={todayHabits}
        moodToday={moodToday}
        waterMl={todayWater?.ml ?? 0}
        drinksMl={drinksMl}
        waterGoalMl={profile?.water_goal_ml ?? 2000}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <NutritionSummary
          rings={rings}
          caffeineMg={caffeineMg}
          sugarG={sugarG}
          weightKg={latestWeight?.weight_kg ?? null}
          weightDelta={weightDelta}
          hasMeals={todayMeals.length > 0}
        />
        <ProgressCard
          level={progress.level}
          points={progress.points}
          pointsIntoLevel={progress.pointsIntoLevel}
          pointsForNextLevel={progress.pointsForNextLevel}
          progressPct={progress.progressPct}
          bestStreak={stats.bestStreak}
          unlocked={progress.unlocked}
          totalBadges={BADGES.length}
          nextBadge={progress.locked[0] ?? null}
        />
      </div>

      <WeekRecap recap={recap} title={dict.dashboard.weekRecap} />

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{dict.dashboard.insights}</h2>
        {insights.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {insights.map((i) => (
              <div
                key={i.title}
                className="rounded-2xl border-[1.5px] p-5 text-sm"
                style={{
                  borderColor: `color-mix(in srgb, ${i.color} 50%, var(--border))`,
                  background: `color-mix(in srgb, ${i.color} 8%, var(--surface))`,
                }}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: i.color }}>
                  {i.icon} {i.title}
                </p>
                {i.text}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-accent/40 p-5 text-sm text-foreground-muted">
            Continue à noter humeur, sport, repas et poids : les liens entre tes modules apparaîtront ici dès qu&apos;il y
            aura assez de données.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InViewFade className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground-muted">{dict.dashboard.sportChart}</h2>
            <Link href="/sport" className="text-xs text-accent hover:underline">
              {dict.dashboard.seeAll}
            </Link>
          </div>
          <WeeklyBarChart data={sportChart} color="var(--sport)" unit="min" />
        </InViewFade>

        <InViewFade className="rounded-2xl border-[1.5px] border-mood/50 bg-surface p-5" delay={0.1}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground-muted">{dict.dashboard.moodChart}</h2>
            <Link href="/humeur" className="text-xs text-accent hover:underline">
              {dict.dashboard.seeAll}
            </Link>
          </div>
          {moodChart.length > 0 ? (
            <MoodLineChart data={moodChart} />
          ) : (
            <p className="py-16 text-center text-sm text-foreground-muted">{dict.dashboard.noData}</p>
          )}
        </InViewFade>
      </div>

      {(!habits || habits.length === 0) && (
        <div className="rounded-2xl border border-dashed border-habit/40 p-6 text-center text-sm text-foreground-muted">
          Tu n&apos;as pas encore d&apos;habitude.{" "}
          <Link href="/habits" className="font-medium text-accent hover:underline">
            Crée ta première habitude
          </Link>
          .
        </div>
      )}
    </div>
  );
}
