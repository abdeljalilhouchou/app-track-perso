import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { BADGES } from "@/lib/gamification";
import { computeProfileStats, summarizeProgress } from "@/lib/profile-stats";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileStats } from "@/components/profile-stats";
import { StreakFlame } from "@/components/ui/streak-flame";
import { Avatar } from "@/components/avatar";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { AwardIcon, SettingsIcon } from "@/components/ui/nav-icons";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";

export default async function ProfilPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const [dict, t, { data: profile, error: profileError }, stats] = await Promise.all([
    getDictionary(),
    getT(),
    supabase.from("profiles")
      .select("display_name, created_at, reminder_time, avatar_url")
      .eq("id", user.id)
      .single(),
    computeProfileStats(supabase, user.id),
  ]);
  if (profileError) throw new Error("Impossible de charger le profil.");

  const { points, level, pointsIntoLevel, pointsForNextLevel, progressPct, unlocked: unlockedBadges } =
    summarizeProgress(stats);
  const bestStreak = stats.bestStreak;

  const displayName = profile?.display_name || user.email?.split("@")[0] || "toi";
  // Settings and badges live on their own pages; this one links to them.
  const subpages = [
    { href: "/profil/parametres", label: dict.nav.settings, Icon: SettingsIcon },
    { href: "/profil/badges", label: dict.nav.badges, Icon: AwardIcon, detail: t("profile.badgesUnlocked", { unlocked: unlockedBadges.length, total: BADGES.length }) },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dict.pages.profile.title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{dict.pages.profile.subtitle}</p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <Avatar name={displayName} url={profile?.avatar_url} size="lg" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-medium">
              {displayName} · <span className="text-accent">{t("profile.level", { level })}</span>
              {bestStreak > 0 && <StreakFlame streak={bestStreak} size="sm" />}
            </p>
            <p className="text-xs text-foreground-muted">
              {t("profile.pointsIntoLevel", { pointsIntoLevel, pointsForNextLevel })}
            </p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "var(--accent)" }}
            />
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            <AnimatedCounter value={points} /> {t("profile.totalPointsSuffix")} ·{" "}
            {t("profile.badgesUnlocked", { unlocked: unlockedBadges.length, total: BADGES.length })}
          </p>
        </div>
      </div>

      <ProfileStats
        stats={[
          { label: t("profile.stats.habitsChecked"), value: stats.habitLogsCount, color: "var(--habit)" },
          { label: t("profile.stats.workouts"), value: stats.workoutsCount, color: "var(--sport)" },
          { label: t("profile.stats.moods"), value: stats.moodEntriesCount, color: "var(--mood)" },
          { label: t("profile.stats.meals"), value: stats.mealEntriesCount, color: "var(--nutrition)" },
        ]}
      />

      <nav aria-label={dict.pages.profile.title} className="overflow-hidden rounded-2xl border border-border bg-surface">
        {subpages.map(({ href, label, Icon, detail }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 items-center gap-3 border-b border-border px-4 last:border-b-0 transition hover:bg-surface-muted"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{label}</span>
              {detail && <span className="block text-xs text-foreground-muted">{detail}</span>}
            </span>
            <span aria-hidden className="text-foreground-muted rtl:rotate-180">›</span>
          </Link>
        ))}
      </nav>

      <SignOutButton className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-foreground-muted transition hover:bg-surface-muted md:hidden">
        {dict.nav.signOut}
      </SignOutButton>
    </div>
  );
}
