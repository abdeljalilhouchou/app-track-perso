import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { StreakFlame } from "@/components/ui/streak-flame";
import type { Badge } from "@/lib/gamification";

type Translator = (path: string, vars?: Record<string, string | number>) => string;

export function ProgressCard({
  level,
  points,
  pointsIntoLevel,
  pointsForNextLevel,
  progressPct,
  bestStreak,
  unlocked,
  totalBadges,
  nextBadge,
  t,
}: {
  level: number;
  points: number;
  pointsIntoLevel: number;
  pointsForNextLevel: number;
  progressPct: number;
  bestStreak: number;
  unlocked: Badge[];
  totalBadges: number;
  nextBadge: Badge | null;
  t: Translator;
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-habit/50 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("dashboard.progress.heading")}</h2>
        <Link href="/profil" className="text-xs font-medium text-accent hover:underline">
          {t("dashboard.progress.profileLink")}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <LevelLabel t={t} level={level} />
        {bestStreak > 0 && <StreakFlame streak={bestStreak} size="md" />}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        {t("dashboard.progress.pointsForNextLevel", { pointsIntoLevel, pointsForNextLevel })} · <AnimatedCounter value={points} />{" "}
        {t("dashboard.progress.totalPoints")}
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs text-foreground-muted">
          {t("dashboard.progress.badgesCount", { unlocked: unlocked.length, total: totalBadges })}
        </p>
        {unlocked.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {unlocked.slice(0, 8).map((b) => (
              <span
                key={b.id}
                title={`${t(`profile.badges.${b.id}.title`)} — ${t(`profile.badges.${b.id}.description`)}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-lg"
              >
                {b.icon}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground-muted">{t("dashboard.progress.noBadges")}</p>
        )}
      </div>

      {nextBadge && (
        <p className="mt-3 rounded-xl border border-dashed border-habit/40 px-3 py-2 text-xs text-foreground-muted">
          {t("dashboard.progress.nextGoal")}{" "}
          <span className="text-foreground">
            {nextBadge.icon} {t(`profile.badges.${nextBadge.id}.title`)}
          </span>{" "}
          — {t(`profile.badges.${nextBadge.id}.description`)}
        </p>
      )}
    </div>
  );
}

/** Renders "Niveau {level}" (or its translation) with the level number highlighted in accent color. */
function LevelLabel({ t, level }: { t: Translator; level: number }) {
  const text = t("profile.level", { level });
  const numStr = String(level);
  const idx = text.indexOf(numStr);
  if (idx === -1) {
    return (
      <p className="text-lg font-semibold">
        {text} <span className="text-accent">{level}</span>
      </p>
    );
  }
  return (
    <p className="text-lg font-semibold">
      {text.slice(0, idx)}
      <span className="text-accent">{numStr}</span>
      {text.slice(idx + numStr.length)}
    </p>
  );
}
