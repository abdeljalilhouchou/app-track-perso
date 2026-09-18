import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { StreakFlame } from "@/components/ui/streak-flame";
import type { Badge } from "@/lib/gamification";

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
}) {
  return (
    <div className="rounded-2xl border-[1.5px] border-habit/50 bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">🏆 Progression</h2>
        <Link href="/profil" className="text-xs font-medium text-accent hover:underline">
          Profil
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">
          Niveau <span className="text-accent">{level}</span>
        </p>
        {bestStreak > 0 && <StreakFlame streak={bestStreak} size="md" />}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        {pointsIntoLevel} / {pointsForNextLevel} pts pour le prochain niveau · <AnimatedCounter value={points} /> pts au
        total
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs text-foreground-muted">
          Badges · {unlocked.length} / {totalBadges}
        </p>
        {unlocked.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {unlocked.slice(0, 8).map((b) => (
              <span
                key={b.id}
                title={`${b.title} — ${b.description}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-lg"
              >
                {b.icon}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground-muted">Aucun badge pour l&apos;instant.</p>
        )}
      </div>

      {nextBadge && (
        <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-foreground-muted">
          Prochain objectif : <span className="text-foreground">{nextBadge.icon} {nextBadge.title}</span> —{" "}
          {nextBadge.description}
        </p>
      )}
    </div>
  );
}
