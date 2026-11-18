import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/read-context";
import { BADGE_CATEGORIES, BADGES } from "@/lib/gamification";
import { computeProfileStats, summarizeProgress } from "@/lib/profile-stats";
import { BadgeBoard } from "@/components/badge-board";
import { ProfileSubpageHeader } from "@/components/profile-subpage-header";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function ProfilBadgesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const [dict, stats] = await Promise.all([getDictionary(), computeProfileStats(supabase, user.id)]);
  const { level, pointsIntoLevel, pointsForNextLevel } = summarizeProgress(stats);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <ProfileSubpageHeader title={dict.nav.badges} backLabel={dict.nav.profile} />
      <BadgeBoard
        level={level}
        pointsToNext={pointsForNextLevel - pointsIntoLevel}
        categories={BADGE_CATEGORIES}
        badges={BADGES.map((badge) => ({
          id: badge.id,
          icon: badge.icon,
          category: badge.category,
          goal: badge.goal,
          unit: badge.unit,
          value: badge.progress(stats),
          unlocked: badge.unlocked(stats),
        }))}
      />
    </div>
  );
}
