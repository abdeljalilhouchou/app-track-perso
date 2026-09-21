import { createClient } from "@/lib/supabase/server";
import { BADGES } from "@/lib/gamification";
import { computeProfileStats, summarizeProgress } from "@/lib/profile-stats";
import { ReminderSettings } from "@/components/reminder-settings";
import { signOut } from "@/lib/actions/auth";
import { ProfileStats } from "@/components/profile-stats";
import { BadgeGrid } from "@/components/badge-grid";
import { StreakFlame } from "@/components/ui/streak-flame";
import { ThemeSelector } from "@/components/theme-selector";
import { Avatar } from "@/components/avatar";
import { Callout } from "@/components/ui/callout";
import { AccountSettings } from "@/components/account-settings";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, created_at, reminder_time, avatar_url")
    .eq("id", user.id)
    .single();

  const stats = await computeProfileStats(supabase, user.id);
  const { points, level, pointsIntoLevel, pointsForNextLevel, progressPct, unlocked: unlockedBadges, locked: lockedBadges } =
    summarizeProgress(stats);
  const bestStreak = stats.bestStreak;

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="mt-1 text-sm text-foreground-muted">Ta progression, tes badges, ton parcours.</p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <Avatar name={displayName} url={profile?.avatar_url} size="lg" />
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

      {!profile?.reminder_time && (
        <Callout variant="tip" title="Rappel quotidien" dismissKey="profile-reminder" compact>
          Active le rappel par e-mail plus bas : il te dit chaque soir ce qu&apos;il te reste à faire.
        </Callout>
      )}
      {!profile?.avatar_url && (
        <Callout variant="info" title="Personnalise ton profil" dismissKey="profile-avatar" compact>
          Ajoute une photo dans « Mon compte » : elle apparaît dans le menu et sur ton profil.
        </Callout>
      )}

      <ProfileStats
        stats={[
          { label: "Habitudes cochées", value: stats.habitLogsCount, color: "var(--habit)" },
          { label: "Séances de sport", value: stats.workoutsCount, color: "var(--sport)" },
          { label: "Humeurs notées", value: stats.moodEntriesCount, color: "var(--mood)" },
          { label: "Repas notés", value: stats.mealEntriesCount, color: "var(--nutrition)" },
        ]}
      />

      <AccountSettings
        userId={user.id}
        email={user.email ?? ""}
        displayName={displayName}
        avatarUrl={profile?.avatar_url ?? null}
        memberSinceYear={new Date(user.created_at).getFullYear()}
      />

      <div className="rounded-2xl border-[1.5px] border-accent/40 bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft">🎨</span>
          Apparence
        </h2>
        <ThemeSelector />
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
