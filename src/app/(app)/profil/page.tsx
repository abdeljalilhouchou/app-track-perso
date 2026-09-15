import { createClient } from "@/lib/supabase/server";
import { computeStreak } from "@/lib/streak";
import { BADGES, computeLevel, computePoints, type Stats } from "@/lib/gamification";
import { ReminderSettings } from "@/components/reminder-settings";

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

  const stats: Stats = {
    habitLogsCount: habitLogsCount ?? 0,
    workoutsCount: workoutsCount ?? 0,
    moodEntriesCount: moodEntriesCount ?? 0,
    activeHabitsCount: activeHabitsCount ?? 0,
    bestStreak,
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
            <p className="font-medium">
              {displayName} · <span className="text-accent">Niveau {level}</span>
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
            {points} points au total · {unlockedBadges.length} / {BADGES.length} badges débloqués
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-foreground-muted">Habitudes cochées</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--habit)" }}>
            {stats.habitLogsCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-foreground-muted">Séances de sport</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--sport)" }}>
            {stats.workoutsCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-foreground-muted">Humeurs notées</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--mood)" }}>
            {stats.moodEntriesCount}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">🔔</span>
          Rappel quotidien
        </h2>
        <ReminderSettings initialTime={profile?.reminder_time ?? null} email={user.email ?? ""} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground-muted">Badges</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...unlockedBadges, ...lockedBadges].map((badge) => {
            const unlocked = unlockedBadges.includes(badge);
            return (
              <div
                key={badge.id}
                className={`rounded-2xl border p-4 text-center transition ${
                  unlocked
                    ? "border-accent/30 bg-accent-soft"
                    : "border-dashed border-border opacity-50 grayscale"
                }`}
              >
                <span className="text-3xl">{badge.icon}</span>
                <p className="mt-2 text-sm font-medium">{badge.title}</p>
                <p className="mt-1 text-xs text-foreground-muted">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
