"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import type { BadgeCategory } from "@/lib/gamification";

export type BadgeView = { id: string; icon: string; category: BadgeCategory; goal: number; value: number; unit?: "km"; unlocked: boolean };

/** The Badges page: level, overall progress, the closest badge, then every badge by category with its progress. */
export function BadgeBoard({ badges, categories, level, pointsToNext }: { badges: BadgeView[]; categories: BadgeCategory[]; level: number; pointsToNext: number }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<BadgeCategory | "all">("all");
  const locale = language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR";
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const amount = (badge: BadgeView, value: number) => `${number(value)}${badge.unit ? ` ${badge.unit}` : ""}`;

  const unlocked = badges.filter((badge) => badge.unlocked).length;
  const closest = badges.filter((badge) => !badge.unlocked && badge.value > 0).sort((a, b) => b.value / b.goal - a.value / a.goal)[0];
  const shown = (filter === "all" ? badges : badges.filter((badge) => badge.category === filter))
    .slice()
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.value / b.goal - a.value / a.goal);

  const progress = (badge: BadgeView) => (
    <div className="mt-2.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={badge.goal} aria-valuenow={Math.min(badge.value, badge.goal)} aria-label={t(`profile.badges.${badge.id}.title`)}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (badge.value / badge.goal) * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs tabular-nums text-foreground-muted">{amount(badge, Math.min(badge.value, badge.goal))} / {amount(badge, badge.goal)}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-accent/30 bg-accent-soft p-5" data-badges-hero>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent text-2xl font-bold text-on-accent">{level}</div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{t("profile.level", { level })}</p>
            <p className="text-sm text-foreground-muted">{t("profile.badgesPage.toNextLevel", { points: pointsToNext, next: level + 1 })}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{t("profile.badgesPage.unlockedOf", { unlocked, total: badges.length })}</span>
            <span className="tabular-nums text-foreground-muted">{Math.round((unlocked / badges.length) * 100)} %</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${(unlocked / badges.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {closest && (
        <div className="rounded-2xl border border-border bg-surface p-4" data-badge-closest>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t("profile.badgesPage.closest")}</p>
          <div className="mt-2 flex items-center gap-3">
            <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-muted text-2xl">{closest.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(`profile.badges.${closest.id}.title`)}</p>
              <p className="text-xs text-foreground-muted">{t(`profile.badges.${closest.id}.description`)}</p>
            </div>
          </div>
          {progress(closest)}
        </div>
      )}

      <div role="group" aria-label={t("profile.badgesPage.filterLabel")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(["all", ...categories] as const).map((value) => {
          const pool = value === "all" ? badges : badges.filter((badge) => badge.category === value);
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(value)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${active ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-foreground-muted"}`}
              data-badge-filter={value}
            >
              {value === "all" ? t("profile.badgesPage.all") : t(`profile.badgesPage.categories.${value}`)}
              <span className={`text-xs tabular-nums ${active ? "opacity-80" : "opacity-70"}`}>{pool.filter((badge) => badge.unlocked).length}/{pool.length}</span>
            </button>
          );
        })}
      </div>

      {filter !== "all" && shown.every((badge) => badge.unlocked) && <p className="text-sm text-foreground-muted">{t("profile.badgesPage.allEarned")}</p>}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {shown.map((badge, index) => (
          <motion.li
            key={badge.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.03 }}
            className={`flex flex-col rounded-2xl border p-3.5 ${badge.unlocked ? "border-accent/30 bg-accent-soft" : "border-border bg-surface"}`}
            data-badge={badge.id}
            data-unlocked={badge.unlocked || undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <span aria-hidden className={`grid h-11 w-11 place-items-center rounded-xl text-2xl ${badge.unlocked ? "bg-surface" : "bg-surface-muted grayscale opacity-60"}`}>{badge.icon}</span>
              {badge.unlocked && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">✓ {t("profile.badgesPage.earned")}</span>}
            </div>
            <p className="mt-2.5 text-sm font-semibold leading-tight">{t(`profile.badges.${badge.id}.title`)}</p>
            <p className="mt-1 text-xs text-foreground-muted">{t(`profile.badges.${badge.id}.description`)}</p>
            {!badge.unlocked && <div className="mt-auto">{progress(badge)}</div>}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
