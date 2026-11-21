"use client";

import { useTransition } from "react";
import { useLanguage } from "@/components/language-provider";
import { useActionToast } from "@/components/toast/use-action-toast";
import { resumeHabit } from "@/lib/actions/habits";
import { SUGGESTED_HABITS, categorySlug, type HabitIdea } from "@/lib/habit-categories";
import type { Habit } from "@/types/database";

/** Ideas to start from, paused habits to resume, and how automatic check-ins work. */
export function HabitsManage({ habits, paused, today, onIdea }: { habits: Habit[]; paused: Habit[]; today: string; onIdea: (idea: HabitIdea) => void }) {
  const { t } = useLanguage();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const m = (key: string, vars?: Record<string, string | number>) => t(`habits.v2.manage.${key}`, vars);
  const names = new Set([...habits, ...paused].map((habit) => habit.name.toLowerCase()));
  const ideas = SUGGESTED_HABITS.filter((idea) => !names.has(t(`habits.suggestedItems.${idea.key}`).toLowerCase()) && !names.has(idea.name.toLowerCase()));
  const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(iso)) / 86_400_000)) : null);

  return (
    <div className="space-y-6" data-habits-manage>
      <p className="text-sm text-foreground-muted">{m("summary", { active: habits.length, paused: paused.length })}</p>

      {ideas.length > 0 && (
        <section aria-labelledby="habits-ideas" className="space-y-3">
          <div>
            <h2 id="habits-ideas" className="font-semibold">{m("ideasTitle")}</h2>
            <p className="mt-1 text-sm text-foreground-muted">{m("ideasHint")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {ideas.map((idea) => (
              <button key={idea.key} type="button" onClick={() => onIdea(idea)} className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-surface p-3.5 text-start transition hover:bg-surface-muted" data-habit-idea-card={idea.key}>
                <span aria-hidden className="text-2xl">{idea.icon}</span>
                <span className="text-sm font-semibold">{t(`habits.suggestedItems.${idea.key}`)}</span>
                <span className="text-xs text-foreground-muted">
                  {t(`habits.categories.${categorySlug(idea.category)}`)} · {idea.kind ? t(`habits.v2.sheet.types.${idea.kind}.title`) : idea.weekly ? t("habits.v2.sheet.timesPerWeek", { count: idea.weekly }) : t("habits.v2.sheet.daily.title")}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="habits-paused" className="space-y-3">
        <h2 id="habits-paused" className="font-semibold">{m("pausedTitle", { count: paused.length })}</h2>
        {paused.length ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {paused.map((habit) => {
              const days = daysSince(habit.paused_at);
              return (
                <li key={habit.id} className="flex items-center gap-3 p-3.5" data-habit-paused={habit.name}>
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-xl opacity-70">{habit.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground-muted">{habit.name}</p>
                    {days !== null && <p className="text-xs text-foreground-muted">{m("pausedSince", { days })}</p>}
                  </div>
                  <button type="button" disabled={pending} onClick={() => startTransition(async () => void (await run(() => resumeHabit(habit.id), { success: t("habits.paused.resumeSuccess", { name: habit.name }) })))} className="min-h-10 rounded-xl border border-border px-3 text-sm font-semibold" style={{ color: "var(--habit)" }}>
                    {m("resume")}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">{m("noPaused")}</p>
        )}
      </section>

      <p className="flex gap-3 rounded-3xl p-4 text-sm leading-relaxed" style={{ background: "color-mix(in srgb, var(--sport) 12%, var(--surface))" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sport)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
        {m("autoInfo")}
      </p>
    </div>
  );
}
