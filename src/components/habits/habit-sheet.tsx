"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useLanguage } from "@/components/language-provider";
import { createHabit, updateHabit } from "@/lib/actions/habits";
import { CATEGORY_META, CATEGORY_PRESETS, SUGGESTED_HABITS, WEEKDAYS, categorySlug, weekdaySlug, type HabitIdea } from "@/lib/habit-categories";
import type { Habit } from "@/types/database";

type Kind = "check" | "count" | "avoid";
type Moment = "morning" | "afternoon" | "evening" | "any";
type Auto = "" | "sport" | "water" | "mood" | "sleep";
type Frequency = "daily" | "days" | "weekly";

export const HABIT_PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#fb923c", "#fbbf24", "#f472b6"];
const ICONS = ["💧", "📚", "🧘", "🏃", "🥗", "🛏️", "🏋️", "✍️", "🚭", "📵", "🙂", "🎯", "🧹", "💊", "🎸", "🌱"];
const MOMENTS: { value: Moment; icon: string }[] = [
  { value: "morning", icon: "🌅" }, { value: "afternoon", icon: "☀️" }, { value: "evening", icon: "🌙" }, { value: "any", icon: "🕑" },
];

type Draft = {
  kind: Kind; name: string; icon: string; category: string; color: string; moment: Moment;
  frequency: Frequency; days: number[]; weekly: number; goal: string; unit: string;
  reminder: string; auto: Auto; joker: boolean;
};

function fromHabit(habit: Habit): Draft {
  const all = habit.scheduled_days.length === 7;
  const flexible = habit.target_per_week < habit.scheduled_days.length;
  return {
    kind: habit.kind ?? "check", name: habit.name, icon: habit.icon, category: habit.category, color: habit.color,
    moment: habit.moment ?? "any", frequency: flexible ? "weekly" : all ? "daily" : "days", days: habit.scheduled_days,
    weekly: flexible ? habit.target_per_week : 3, goal: habit.goal_value ? String(habit.goal_value) : "8", unit: habit.goal_unit ?? "",
    reminder: habit.reminder_time?.slice(0, 5) ?? "", auto: habit.auto_source ?? "", joker: habit.joker_enabled ?? true,
  };
}

function fromIdea(idea: HabitIdea | undefined, name: string, language: "fr" | "en" | "ar"): Draft {
  return {
    kind: idea?.kind ?? "check", name, icon: idea?.icon ?? "✨", category: idea?.category ?? "Général", color: idea?.color ?? HABIT_PALETTE[1],
    moment: idea?.moment ?? "any", frequency: idea?.weekly ? "weekly" : (idea?.scheduledDays.length ?? 7) === 7 ? "daily" : "days",
    days: idea?.scheduledDays ?? [1, 2, 3, 4, 5, 6, 7], weekly: idea?.weekly ?? 3, goal: String(idea?.goal ?? 8), unit: idea?.unit?.[language] ?? "",
    reminder: "", auto: idea?.auto ?? "", joker: true,
  };
}

/** Create or edit a habit: everything the card shows, with a live preview at the top. */
export function HabitSheet({ open, onClose, habit, idea }: { open: boolean; onClose: () => void; habit?: Habit; idea?: HabitIdea }) {
  const { t, language } = useLanguage();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const ideaName = (value: HabitIdea) => t(`habits.suggestedItems.${value.key}`);
  const [draft, setDraft] = useState<Draft>(() => (habit ? fromHabit(habit) : fromIdea(idea, idea ? ideaName(idea) : "", language)));
  const [pickedIdea, setPickedIdea] = useState(idea?.key ?? null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const v = (key: string, vars?: Record<string, string | number>) => t(`habits.v2.sheet.${key}`, vars);

  const pickIdea = (value: HabitIdea) => { setPickedIdea(value.key); setDraft(fromIdea(value, ideaName(value), language)); };
  const pickKind = (kind: Kind) => setDraft((current) => ({ ...current, kind, auto: kind === "avoid" ? "" : current.auto }));
  const pickCategory = (category: string) => setDraft((current) => ({ ...current, category, auto: category === "Sport" && !current.auto && current.kind !== "avoid" ? "sport" : current.auto }));
  const toggleDay = (day: number) => setDraft((current) => {
    const days = current.days.includes(day) ? current.days.filter((value) => value !== day) : [...current.days, day].sort();
    return { ...current, days: days.length ? days : current.days };
  });

  const submit = () => {
    const formData = new FormData();
    formData.set("name", draft.name.trim());
    formData.set("icon", draft.icon);
    formData.set("category", draft.category);
    formData.set("color", draft.color);
    formData.set("kind", draft.kind);
    formData.set("moment", draft.moment);
    formData.set("frequency", draft.kind === "avoid" ? "daily" : draft.frequency);
    formData.set("scheduled_days", (draft.frequency === "days" ? draft.days : [1, 2, 3, 4, 5, 6, 7]).join(","));
    formData.set("target_per_week", String(draft.weekly));
    if (draft.kind === "count") { formData.set("goal_value", draft.goal); formData.set("goal_unit", draft.unit.trim()); }
    formData.set("reminder_time", draft.reminder);
    formData.set("auto_source", draft.kind === "avoid" ? "" : draft.auto);
    formData.set("joker_enabled", draft.joker ? "1" : "0");
    startTransition(async () => {
      const result = await run(() => (habit ? updateHabit(habit.id, formData) : createHabit(formData)), {
        success: habit ? v("saveSuccess") : v("createSuccess"),
        failure: v("error"),
      });
      if (result && !result.error) onClose();
    });
  };

  const tint = `color-mix(in srgb, ${draft.color} 18%, var(--surface))`;
  const categoryColor = CATEGORY_META[draft.category]?.color ?? "#6366f1";
  const frequencyText = draft.kind === "avoid" || draft.frequency === "daily" ? v("daily.title")
    : draft.frequency === "weekly" ? v("timesPerWeek", { count: draft.weekly })
    : draft.days.map((day) => t(`habits.weekdaysShort.${weekdaySlug(day)}`)).join(" · ");
  const chip = (on: boolean) => `inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${on ? "border-accent bg-accent-soft font-semibold" : "border-border text-foreground-muted"}`;
  const field = "min-h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-base outline-none focus:border-accent";

  return (
    <Dialog open={open} onClose={onClose} widthClassName="max-w-lg" ariaLabel={habit ? v("editTitle") : v("newTitle")}>
      <form className="flex max-h-[92dvh] flex-col overflow-hidden rounded-3xl bg-surface" onSubmit={(event) => { event.preventDefault(); submit(); }} data-habit-sheet>
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-lg font-semibold">{habit ? v("editTitle") : v("newTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={v("close")} className="grid h-11 w-11 place-items-center rounded-xl text-xl text-foreground-muted hover:bg-surface-muted">×</button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div aria-label={v("preview")} className="space-y-3 rounded-3xl border-[1.5px] p-4" style={{ borderColor: `color-mix(in srgb, ${draft.color} 45%, var(--border))`, background: `color-mix(in srgb, ${draft.color} 6%, var(--surface))` }} data-habit-preview>
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: tint }}>{draft.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{draft.name || v("namePlaceholder")}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-full px-2 py-0.5" style={{ background: `color-mix(in srgb, ${categoryColor} 16%, transparent)`, color: categoryColor }}>{t(`habits.categories.${categorySlug(draft.category)}`)}</span>
                  {draft.auto && draft.kind !== "avoid" && <span className="rounded-full border border-sport/45 px-2 py-0.5 text-sport">{t("habits.v2.card.auto", { source: t(`habits.v2.card.sources.${draft.auto}`) })}</span>}
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-foreground-muted">{frequencyText}{draft.reminder ? ` · ${draft.reminder}` : ""}</span>
                </div>
              </div>
            </div>
            {draft.kind === "count" && <p className="text-center text-lg font-bold tabular-nums">0 <span className="text-sm font-medium text-foreground-muted">/ {draft.goal || "?"} {draft.unit}</span></p>}
            {draft.kind === "avoid" && <p className="text-lg font-bold">0 <span className="text-sm font-medium text-foreground-muted">{t("habits.v2.card.cleanDays")}</span></p>}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">{v("preview")}</p>
          </div>

          {!habit && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground-muted">{v("ideas")}</h3>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {SUGGESTED_HABITS.map((value) => (
                  <button key={value.key} type="button" aria-pressed={pickedIdea === value.key} onClick={() => pickIdea(value)} className={`${chip(pickedIdea === value.key)} shrink-0`} data-habit-idea={value.key}>
                    <span aria-hidden>{value.icon}</span>{ideaName(value)}
                  </button>
                ))}
              </div>
            </section>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-foreground-muted">{v("type")}</legend>
            <div role="radiogroup" aria-label={v("type")} className="grid grid-cols-3 gap-2">
              {(["check", "count", "avoid"] as const).map((kind) => (
                <button key={kind} type="button" role="radio" aria-checked={draft.kind === kind} onClick={() => pickKind(kind)} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center ${draft.kind === kind ? "border-accent bg-accent-soft" : "border-border"}`} data-habit-kind={kind}>
                  <span className="text-sm font-semibold">{v(`types.${kind}.title`)}</span>
                  <span className="text-[11px] leading-tight text-foreground-muted">{v(`types.${kind}.hint`)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <section className="space-y-2">
            <label htmlFor="habit-name" className="text-sm font-semibold text-foreground-muted">{v("name")}</label>
            <div className="flex gap-2">
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: tint }}>{draft.icon}</span>
              <input id="habit-name" required maxLength={100} value={draft.name} onChange={(event) => set("name", event.target.value)} placeholder={v("namePlaceholder")} className={field} data-habit-name />
            </div>
            <div role="radiogroup" aria-label={v("icon")} className="grid grid-cols-8 gap-1.5">
              {ICONS.map((icon) => (
                <button key={icon} type="button" role="radio" aria-checked={draft.icon === icon} aria-label={icon} onClick={() => set("icon", icon)} className={`grid h-10 place-items-center rounded-xl text-lg ${draft.icon === icon ? "ring-2 ring-accent" : "bg-surface-muted"}`}>{icon}</button>
              ))}
            </div>
            {draft.kind === "count" && (
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground-muted">{v("goal")}<input inputMode="decimal" value={draft.goal} onChange={(event) => set("goal", event.target.value.replace(/[^\d.,]/g, ""))} className={`${field} text-center font-bold`} data-habit-goal /></label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground-muted">{v("unit")}<input maxLength={20} value={draft.unit} onChange={(event) => set("unit", event.target.value)} placeholder={v("unitPlaceholder")} className={field} /></label>
              </div>
            )}
          </section>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-foreground-muted">{v("category")}</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PRESETS.map((category) => (
                <button key={category} type="button" aria-pressed={draft.category === category} onClick={() => pickCategory(category)} className={chip(draft.category === category)}>
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: CATEGORY_META[category].color }} />{t(`habits.categories.${categorySlug(category)}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-foreground-muted">{v("moment")}</legend>
            <div role="radiogroup" aria-label={v("moment")} className="grid grid-cols-4 gap-1.5">
              {MOMENTS.map((moment) => (
                <button key={moment.value} type="button" role="radio" aria-checked={draft.moment === moment.value} onClick={() => set("moment", moment.value)} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border text-xs ${draft.moment === moment.value ? "border-accent bg-accent-soft font-semibold" : "border-border text-foreground-muted"}`}>
                  <span aria-hidden className="text-lg">{moment.icon}</span>{t(`habits.v2.moments.${moment.value}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-foreground-muted">{v("frequency")}</legend>
            {draft.kind === "avoid" ? (
              <p className="rounded-2xl bg-surface-muted p-3 text-sm text-foreground-muted">{v("avoidFrequency")}</p>
            ) : (
              <div className="space-y-2">
                {(["daily", "days", "weekly"] as const).map((frequency) => (
                  <label key={frequency} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 ${draft.frequency === frequency ? "border-accent bg-accent-soft" : "border-border"}`}>
                    <input type="radio" name="frequency" checked={draft.frequency === frequency} onChange={() => set("frequency", frequency)} className="h-4.5 w-4.5 accent-[var(--accent)]" />
                    <span className="flex-1"><span className="block text-sm font-semibold">{v(`${frequency}.title`)}</span><span className="block text-xs text-foreground-muted">{v(`${frequency}.hint`)}</span></span>
                    {frequency === "weekly" && draft.frequency === "weekly" && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-0.5">
                        <button type="button" aria-label={v("less")} onClick={() => set("weekly", Math.max(1, draft.weekly - 1))} className="grid h-9 w-9 place-items-center rounded-lg text-lg">−</button>
                        <span className="min-w-5 text-center font-bold tabular-nums" data-habit-weekly>{draft.weekly}</span>
                        <button type="button" aria-label={v("more")} onClick={() => set("weekly", Math.min(6, draft.weekly + 1))} className="grid h-9 w-9 place-items-center rounded-lg text-lg">+</button>
                      </span>
                    )}
                  </label>
                ))}
                {draft.frequency === "days" && (
                  <div className="grid grid-cols-7 gap-1.5">
                    {WEEKDAYS.map((day) => (
                      <button key={day.value} type="button" aria-pressed={draft.days.includes(day.value)} aria-label={t(`habits.weekdaysLong.${weekdaySlug(day.value)}`)} onClick={() => toggleDay(day.value)} className={`h-11 rounded-xl text-sm font-bold ${draft.days.includes(day.value) ? "bg-accent text-on-accent" : "bg-surface-muted text-foreground-muted"}`}>
                        {t(`habits.weekdaysShort.${weekdaySlug(day.value)}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <section className="divide-y divide-border rounded-2xl border border-border">
            <label className="flex min-h-16 items-center gap-3 px-3.5">
              <span className="flex-1"><span className="block text-sm font-semibold">{v("reminder")}</span><span className="block text-xs text-foreground-muted">{v("reminderHint")}</span></span>
              <input type="time" value={draft.reminder} onChange={(event) => set("reminder", event.target.value)} className="min-h-10 rounded-xl border border-border bg-surface-muted px-2 text-sm" />
            </label>
            {draft.kind !== "avoid" && (
              <label className="flex min-h-16 items-center gap-3 px-3.5">
                <span className="flex-1"><span className="block text-sm font-semibold">{v("auto")}</span><span className="block text-xs text-foreground-muted">{v("autoHint")}</span></span>
                <select value={draft.auto} onChange={(event) => set("auto", event.target.value as Auto)} className="min-h-10 max-w-40 rounded-xl border border-border bg-surface-muted px-2 text-sm" data-habit-auto>
                  {(["", "sport", "water", "mood", "sleep"] as const).map((value) => <option key={value} value={value}>{v(`autoOptions.${value || "none"}`)}</option>)}
                </select>
              </label>
            )}
            {draft.kind !== "avoid" && (
              <div className="flex min-h-16 items-center gap-3 px-3.5">
                <span id="habit-joker" className="flex-1"><span className="block text-sm font-semibold">{v("joker")}</span><span className="block text-xs text-foreground-muted">{v("jokerHint")}</span></span>
                <button type="button" role="switch" aria-checked={draft.joker} aria-labelledby="habit-joker" onClick={() => set("joker", !draft.joker)} className="relative h-8 w-13 shrink-0 rounded-full transition-colors" style={{ background: draft.joker ? "var(--accent)" : "var(--surface-muted)", boxShadow: "inset 0 0 0 1px var(--border)" }}>
                  <span aria-hidden className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[inset-inline-start] motion-reduce:transition-none ${draft.joker ? "start-6" : "start-1"}`} />
                </button>
              </div>
            )}
          </section>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-foreground-muted">{v("color")}</legend>
            <div role="radiogroup" aria-label={v("color")} className="flex gap-3">
              {HABIT_PALETTE.map((color) => (
                <button key={color} type="button" role="radio" aria-checked={draft.color === color} aria-label={color} onClick={() => set("color", color)} className="h-10 w-10 rounded-full" style={{ background: color, boxShadow: draft.color === color ? `0 0 0 3px var(--surface), 0 0 0 5px ${color}` : undefined }} />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border p-4">
          <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-border px-5 text-sm font-semibold">{v("cancel")}</button>
          <button type="submit" disabled={pending || !draft.name.trim()} className="min-h-12 rounded-2xl bg-accent text-base font-semibold text-on-accent disabled:opacity-50" data-habit-submit>
            {habit ? v("save") : v("create")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
