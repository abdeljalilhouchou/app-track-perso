import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { BADGES } from "@/lib/gamification";
import { computeProfileStats, summarizeProgress } from "@/lib/profile-stats";
import { BadgeGrid } from "@/components/badge-grid";
import { ProfileSubpageHeader } from "@/components/profile-subpage-header";
import { getDictionary, getT } from "@/lib/i18n/get-dictionary";

export default async function ProfilBadgesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const [dict, t, stats] = await Promise.all([getDictionary(), getT(), computeProfileStats(supabase, user.id)]);
  const { unlocked: unlockedBadges, locked: lockedBadges } = summarizeProgress(stats);

  return (
    <div className="space-y-6 animate-fade-in">
      <ProfileSubpageHeader title={dict.nav.badges} backLabel={dict.nav.profile} />
      <p className="text-sm text-foreground-muted">
        {t("profile.badgesUnlocked", { unlocked: unlockedBadges.length, total: BADGES.length })}
      </p>
      <BadgeGrid
        badges={[...unlockedBadges, ...lockedBadges].map((badge) => ({
          id: badge.id,
          icon: badge.icon,
          unlocked: unlockedBadges.includes(badge),
        }))}
      />
    </div>
  );
}
