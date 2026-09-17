import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { BADGES, computeLevel, computePoints, type Stats } from "@/lib/gamification";
import { ReminderSettings } from "@/components/reminder-settings";
import { signOut } from "@/lib/actions/auth";
import { ProfileStats } from "@/components/profile-stats";
import { BadgeGrid } from "@/components/badge-grid";
import { StreakFlame } from "@/components/ui/streak-flame";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at, reminder_time")
    .eq("id", user.id)
    .single();

  const [
    { count: habitLogsCount },
    { count: workoutsCount },
    { count: moodEntriesCount },
    { count: activeHabitsCount },
    { data: allLogs },
    { count: mealEntriesCount },
    { data: mealDates },
    { data: profileGoals },
  ] = await Promise.all([
    supabase.from("habit_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("workouts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("mood_entries").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("habits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("archived", false),
    supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", user.id),
    supabase.from("meal_entries").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("meal_entries").select("entry_date, protein").eq("user_id", user.id),
    supabase.from("profiles").select("goal_protein").eq("id", user.id).single(),
  ]);

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of allLogs ?? []) {
    if (!logsByHabit.has(log.habit_id)) logsByHabit.set(log.habit_id, new Set());
    logsByHabit.get(log.habit_id)!.add(log.log_date);
  }
  const bestStreak = Math.max(
    0,
    ...Array.from(logsByHabit.values()).map((dates) => computeStreak(dates))
  );

  const proteinByDate = new Map<string, number>();
  for (const m of mealDates ?? []) {
    proteinByDate.set(m.entry_date, (proteinByDate.get(m.entry_date) ?? 0) + m.protein);
  }
  const nutritionLoggingStreak = computeStreak(new Set(proteinByDate.keys()));
  const goalProtein = profileGoals?.goal_protein ?? null;
  const proteinGoalHitDays = goalProtein
    ? Array.from(proteinByDate.values()).filter((p) => p >= goalProtein).length
    : 0;

  const stats: Stats = {
    habitLogsCount: habitLogsCount ?? 0,
    workoutsCount: workoutsCount ?? 0,
    moodEntriesCount: moodEntriesCount ?? 0,
    activeHabitsCount: activeHabitsCount ?? 0,
    bestStreak,
    mealEntriesCount: mealEntriesCount ?? 0,
    nutritionLoggingStreak,
    proteinGoalHitDays,
  };

  const points = computePoints(stats);
  const { level, pointsIntoLevel, pointsForNextLevel, progressPct } = computeLevel(points);
  const unlockedBadges = BADGES.filter((b) => b.unlocked(stats));
  const lockedBadges = BADGES.filter((b) => !b.unlocked(stats));

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="mt-1 text-sm text-foreground-muted">Ta progression, tes badges, ton parcours.</p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          {initial}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-medium">
              {displayName} · <span className="text-accent">Niveau {level}</span>
              {bestStreak > 0 && <StreakFlame streak={bestStreak} size="sm" />}
            </p>
            <p className="text-xs text-foreground-muted">
              {pointsIntoLevel} / {pointsForNextLevel} pts
            </p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "var(--accent)" }}
            />
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            <AnimatedCounter value={points} /> points au total · {unlockedBadges.length} / {BADGES.length} badges débloqués
          </p>
        </div>
      </div>

      <ProfileStats
        stats={[
          { label: "Habitudes cochées", value: stats.habitLogsCount, color: "var(--habit)" },
          { label: "Séances de sport", value: stats.workoutsCount, color: "var(--sport)" },
          { label: "Humeurs notées", value: stats.moodEntriesCount, color: "var(--mood)" },
          { label: "Repas notés", value: stats.mealEntriesCount, color: "var(--nutrition)" },
        ]}
      />

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">🔔</span>
          Rappel quotidien
        </h2>
        <ReminderSettings initialTime={profile?.reminder_time ?? null} email={user.email ?? ""} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground-muted">Badges</h2>
        <BadgeGrid
          badges={[...unlockedBadges, ...lockedBadges].map((badge) => ({
            id: badge.id,
            icon: badge.icon,
            title: badge.title,
            description: badge.description,
            unlocked: unlockedBadges.includes(badge),
          }))}
        />
      </div>

      <form action={signOut} className="md:hidden">
        <button
          type="submit"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-foreground-muted transition hover:bg-surface-muted"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
