import { format, getISODay, startOfWeek, subDays, subWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { buildInsights } from "@/lib/dashboard";
import { computeProfileStats, summarizeProgress } from "@/lib/profile-stats";
import { BADGES } from "@/lib/gamification";
import { addDays, currentStreak, dayState, indexLogs, isFlexible, jokerLeftThisWeek, keptDates, weekStart as habitWeekStart } from "@/lib/habits-v2";
import { dayProgress, type PendingHabit } from "@/lib/home";
import { ModuleTiles, NextActions, QuickActions, StartCard, type DayBar, type TilesData } from "@/components/dashboard/home-view";
import { SkyHero } from "@/components/dashboard/sky-hero";
import { getLanguage, getT } from "@/lib/i18n/get-dictionary";
import { fetchAllRows } from "@/lib/paging";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const since30 = format(subDays(today, 30), "yyyy-MM-dd");
  const since60 = format(subDays(today, 60), "yyyy-MM-dd");
  const since10w = format(subWeeks(today, 10), "yyyy-MM-dd");

  const [
    t,
    language,
    profileResult,
    habits,
    habitLogs,
    workouts,
    moodEntries,
    meals,
    todayWaterResult,
    weightLogs,
    stats,
  ] = await Promise.all([
    getT(),
    getLanguage(),
    supabase
      .from("profiles")
      .select("display_name, goal_calories, goal_protein, goal_carbs, goal_fat, water_goal_ml, caffeine_limit_mg, sugar_limit_g, sport_weekly_goal, reminder_time")
      .eq("id", user.id)
      .single(),
    fetchAllRows((from, to) =>
      supabase.from("habits").select("*").eq("user_id", user.id).eq("archived", false)
        .order("position").order("id").range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase.from("habit_logs").select("habit_id, log_date, value, is_joker").eq("user_id", user.id).gte("log_date", since10w)
        .order("log_date").order("habit_id").range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase.from("workouts").select("*").eq("user_id", user.id).gte("workout_date", since10w)
        .order("workout_date", { ascending: false }).order("id", { ascending: false }).range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase.from("mood_entries").select("*").eq("user_id", user.id).gte("entry_date", since30)
        .order("entry_date").order("id").range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase.from("meal_entries")
        .select("entry_date, calories, protein, carbs, fat, sugar, caffeine, unit, quantity_grams, id")
        .eq("user_id", user.id).gte("entry_date", since30)
        .order("entry_date").order("id").range(from, to)
    ),
    supabase.from("water_logs").select("ml").eq("user_id", user.id).eq("entry_date", todayStr).maybeSingle(),
    fetchAllRows((from, to) =>
      supabase.from("weight_logs").select("*").eq("user_id", user.id).gte("entry_date", since60)
        .order("entry_date").order("id").range(from, to)
    ),
    computeProfileStats(supabase, user.id),
  ]);

  if (profileResult.error) throw new Error("Impossible de charger le profil.");
  if (todayWaterResult.error) throw new Error("Impossible de charger l’hydratation du jour.");
  const profile = profileResult.data;
  const todayWater = todayWaterResult.data;

  const displayName = profile?.display_name || user.email?.split("@")[0] || "";
  const locale = language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${todayStr}T12:00:00`));
  const isoDay = getISODay(today);

  // Habits: what is due today and what is left, whatever the kind of habit.
  const logIndex = indexLogs(habitLogs);
  const kept = new Map(habits.map((h) => [h.id, keptDates(h, habitLogs, since10w, todayStr, todayStr)]));
  const dueToday = habits.filter((h) => {
    if (dayState(h, logIndex.get(h.id)?.get(todayStr), todayStr, todayStr) !== "off") return true;
    if (!isFlexible(h)) return false;
    const start = habitWeekStart(todayStr);
    let count = 0;
    for (let i = 0; i < 7; i++) if (kept.get(h.id)?.has(addDays(start, i))) count += 1;
    return count < h.target_per_week;
  });
  const habitDone = (id: string) => kept.get(id)?.has(todayStr) ?? false;
  const habitsDone = dueToday.filter((h) => habitDone(h.id)).length;
  const pendingHabits: PendingHabit[] = dueToday
    .filter((h) => !habitDone(h.id) && (h.kind ?? "check") !== "avoid")
    .map((h) => ({ id: h.id, name: h.name, icon: h.icon, color: h.color, kind: h.kind ?? "check", moment: h.moment ?? "any", streak: currentStreak(h, logIndex.get(h.id), todayStr) }));

  // Meals, water and mood today.
  const todayMeals = meals.filter((m) => m.entry_date === todayStr);
  const kcal = Math.round(todayMeals.reduce((sum, m) => sum + m.calories, 0));
  const protein = Math.round(todayMeals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
  const drinksMl = Math.round(todayMeals.filter((m) => m.unit === "ml").reduce((sum, m) => sum + m.quantity_grams, 0));
  const waterMl = (todayWater?.ml ?? 0) + drinksMl;
  const waterGoal = profile?.water_goal_ml ?? 2000;
  const moodToday = moodEntries.find((e) => e.entry_date === todayStr)?.mood_score ?? null;
  const kcalGoal = profile?.goal_calories ?? null;
  const proteinGoal = profile?.goal_protein ?? null;

  const day = dayProgress({ habitsDone, habitsTotal: dueToday.length, moodLogged: moodToday !== null, waterMl, waterGoal, kcal, kcalGoal, protein, proteinGoal });
  const number = (value: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);

  // Sport this week.
  const weekStartStr = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekWorkouts = workouts.filter((w) => w.workout_date >= weekStartStr);
  const sportGoal = profile?.sport_weekly_goal ?? 3;

  // Mood over the last 7 days, oldest first.
  const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
  const moodByDate = new Map(moodEntries.map((e) => [e.entry_date, e.mood_score]));
  const moodDays = last7.map((date) => moodByDate.get(date) ?? null);
  const moodScores = moodDays.filter((score): score is number => score !== null);

  const tiles: TilesData = {
    habits: { done: habitsDone, total: dueToday.length, joker: habits.some((h) => jokerLeftThisWeek(h, logIndex.get(h.id), todayStr)) },
    meals: { kcal, goal: kcalGoal, protein, proteinGoal, logged: todayMeals.length },
    sport: { done: weekWorkouts.length, goal: sportGoal, days: Array.from({ length: 7 }, (_, i) => weekWorkouts.some((w) => w.workout_date === addDays(weekStartStr, i))), last: workouts[0]?.activity ?? null },
    mood: { average: moodScores.length ? Math.round((moodScores.reduce((a, b) => a + b, 0) / moodScores.length) * 10) / 10 : null, days: moodDays },
  };

  const progress = summarizeProgress(stats);
  const insights = buildInsights(
    { moods: moodEntries, workoutDates: new Set(workouts.map((w) => w.workout_date)), meals, goalProtein: proteinGoal, weights: weightLogs, workouts },
    t
  );
  const tip = insights[0] ?? null;
  const isNew = habits.length === 0 && meals.length === 0 && moodEntries.length === 0 && workouts.length === 0;
  const goalsHref = `/nutrition?date=${todayStr}#goals`;

  const dayBars: DayBar[] = [
              { key: "habits", share: dueToday.length ? habitsDone / dueToday.length : 0, value: `${habitsDone}/${dueToday.length}`, muted: !dueToday.length },
              { key: "meals", share: kcalGoal ? kcal / kcalGoal : todayMeals.length ? 1 : 0, value: `${number(kcal)} kcal`, muted: !todayMeals.length },
              { key: "water", share: waterMl / waterGoal, value: `${number(waterMl / 1000, 1)} / ${number(waterGoal / 1000, 1)} L` },
              { key: "mood", share: moodToday !== null ? 1 : 0, value: moodToday !== null ? t("home.day.logged") : t("home.day.toLog"), muted: moodToday === null },
            ];

  return (
    <div className="page-shell space-y-5 animate-fade-in" data-home>
      <SkyHero
        dateLabel={dateLabel}
        name={displayName}
        isNew={isNew}
        pct={day.pct}
        done={day.done}
        total={day.total}
        sportDone={weekWorkouts.length}
        sportGoal={sportGoal}
        bars={dayBars}
      />

      <div className="home-columns">
      <div className="space-y-5" data-home-main>
      {isNew ? (
        <StartCard hasHabit={habits.length > 0} hasGoals={Boolean(kcalGoal)} goalsHref={goalsHref} />
      ) : (
        <>
          <NextActions today={todayStr} habits={pendingHabits} moodLogged={moodToday !== null} waterMl={waterMl} waterGoal={waterGoal} mealsLogged={todayMeals.length} sportDone={weekWorkouts.length} sportGoal={sportGoal} isoWeekday={isoDay} />
        </>
      )}

      </div>
      <div className="space-y-5" data-home-side>
      <QuickActions />
      <ModuleTiles data={tiles} />
      </div>
      </div>

      {isNew ? (
        <p className="rounded-3xl border border-border bg-surface p-4 text-sm leading-relaxed text-foreground-muted">{t("home.start.later")}</p>
      ) : (
        <>
          {tip && (
            <section className="space-y-1.5 rounded-3xl border p-4" style={{ borderColor: `color-mix(in srgb, ${tip.color} 35%, var(--border))`, background: `color-mix(in srgb, ${tip.color} 9%, var(--surface))` }} data-home-tip>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: tip.color }}>{t("home.tip")} · {tip.title}</p>
              <p className="text-sm leading-relaxed">{tip.text}</p>
            </section>
          )}
          <a href="/profil/badges" className="flex items-center gap-3.5 rounded-3xl border border-border bg-surface p-4 transition hover:bg-surface-muted" data-home-level>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-lg font-bold text-accent">{progress.level}</span>
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="flex justify-between gap-2 text-sm"><span className="font-semibold">{t("home.level.title", { level: progress.level })}</span><span className="text-foreground-muted tabular-nums">{t("home.level.points", { into: progress.pointsIntoLevel, next: progress.pointsForNextLevel })}</span></span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full bg-accent" style={{ width: `${progress.progressPct}%` }} /></span>
              <span className="block truncate text-xs text-foreground-muted">
                {progress.locked[0]
                  ? t("home.level.badge", { name: t(`profile.badges.${progress.locked[0].id}.title`), count: progress.unlocked.length, total: BADGES.length })
                  : t("home.level.noBadge", { count: progress.unlocked.length, total: BADGES.length })}
              </span>
            </span>
          </a>
        </>
      )}
    </div>
  );
}
