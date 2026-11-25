"use client";

import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { logMood } from "@/lib/actions/mood";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useToast } from "@/components/toast/toast-provider";
import { useLanguage } from "@/components/language-provider";
import { composeMoodNote, MOOD_TAGS, parseMoodNote, type MoodTag } from "@/lib/mood-tags";
import { formatDay } from "./mood-scale";
import { HoloFace } from "./holo-face";
import { HOLO_MOODS } from "@/lib/holo-face";

export type CheckinEntry = { mood_score: number; energy_level: number; notes: string | null } | null;

const LEVELS = [1, 2, 3, 4, 5];

/**
 * Today's check-in: mood, energy, what mattered and a note. Yesterday can be logged too, and
 * any past day opens here through `?date=` from the journal. A logged day shows as a summary
 * until "Modifier" is pressed.
 */
export function MoodCheckin({ today, yesterday, entries, editDate }: { today: string; yesterday: string; entries: Record<string, CheckinEntry>; editDate: string | null }) {
  const { t, language } = useLanguage();
  const [date, setDate] = useState(editDate ?? today);
  const existing = entries[date] ?? null;
  const [open, setOpen] = useState(!existing || !!editDate);
  const pastDay = editDate && editDate !== today && editDate !== yesterday;

  return (
    <section id="checkin" aria-labelledby="checkin-title" className="scroll-mt-20 rounded-3xl border border-mood/40 bg-surface p-5" style={{ background: "color-mix(in srgb, var(--mood) 6%, var(--surface))" }} data-mood-checkin>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="checkin-title" className="text-lg font-semibold">{pastDay ? t("mood.v2.editingDay", { date: formatDay(editDate, language) }) : t("mood.v2.checkinTitle")}</h2>
        {pastDay ? (
          <Link href="/humeur" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-foreground-muted hover:bg-surface-muted">{t("mood.v2.cancelEdit")}</Link>
        ) : (
          <div role="radiogroup" aria-label={t("mood.v2.dayLabel")} className="flex gap-1 rounded-full border border-border bg-surface p-1">
            {[today, yesterday].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={date === value}
                onClick={() => { setDate(value); setOpen(!entries[value]); }}
                className={`min-h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${date === value ? "bg-mood text-[#2b1700]" : "text-foreground-muted"}`}
              >
                {value === today ? t("mood.v2.today") : t("mood.v2.yesterday")}
              </button>
            ))}
          </div>
        )}
      </div>

      {existing && !open ? (
        <Summary entry={existing} onEdit={() => setOpen(true)} />
      ) : (
        <CheckinForm key={date} date={date} existing={existing} onSaved={() => setOpen(false)} />
      )}
    </section>
  );
}

function Summary({ entry, onEdit }: { entry: NonNullable<CheckinEntry>; onEdit: () => void }) {
  const { t } = useLanguage();
  const { text, tags } = parseMoodNote(entry.notes);
  return (
    <div className="mt-4 flex items-start gap-4" data-mood-summary>
      <span className="holo-stage h-24 w-24 shrink-0 rounded-2xl" style={{ "--tint": HOLO_MOODS[entry.mood_score]?.color } as CSSProperties}><HoloFace score={entry.mood_score} compact label={t(`mood.v2.moodLevels.l${entry.mood_score}`)} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--mood-text)" }}>{t("mood.v2.doneTitle")}</p>
        <p className="mt-0.5 text-lg font-semibold">{t(`mood.v2.moodLevels.l${entry.mood_score}`)}</p>
        <p className="text-sm text-foreground-muted">{t("mood.v2.energyQuestion")} · {t(`mood.v2.energyLevels.l${entry.energy_level}`)}</p>
        {tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs">{t(`mood.v2.tags.${tag}`)}</span>)}</div>}
        {text && <p className="mt-2 text-sm text-foreground-muted">« {text} »</p>}
        <button type="button" onClick={onEdit} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted">{t("mood.v2.edit")}</button>
      </div>
    </div>
  );
}

function CheckinForm({ date, existing, onSaved }: { date: string; existing: CheckinEntry; onSaved: () => void }) {
  const { t } = useLanguage();
  const run = useActionToast();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const initial = parseMoodNote(existing?.notes);
  const [mood, setMood] = useState(existing?.mood_score ?? 0);
  const [energy, setEnergy] = useState(existing?.energy_level ?? 3);
  const [tags, setTags] = useState<MoodTag[]>(initial.tags);
  const [text, setText] = useState(initial.text);

  const submit = () => {
    if (!mood) return;
    const formData = new FormData();
    formData.set("entry_date", date);
    formData.set("mood_score", String(mood));
    formData.set("energy_level", String(energy));
    formData.set("notes", composeMoodNote(text, tags) ?? "");
    startTransition(async () => {
      const result = await run(() => logMood(formData), {
        success: existing ? t("mood.form.toastUpdateSuccess") : t("mood.form.toastCreateSuccess"),
        failure: t("mood.form.toastFailure"),
      });
      if (!result || result.error) return;
      onSaved();
      if (mood <= 2) toast.info(t("mood.form.lowMoodToastMessage"), { title: t("mood.form.lowMoodToastTitle"), duration: 7000 });
      else if (mood === 5) toast.success(t("mood.form.highMoodToastMessage"), { title: t("mood.form.highMoodToastTitle") });
    });
  };

  return (
    <form className="mt-5 space-y-6" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <fieldset>
        <legend className="sr-only">{t("mood.v2.moodQuestion")}</legend>
        <div className="holo-stage mb-3 rounded-3xl" style={{ "--tint": HOLO_MOODS[mood]?.color } as CSSProperties} data-holo-stage>
          <HoloFace score={mood} label={t("mood.v2.holoLabel")} />
          <span className="pointer-events-none absolute end-4 top-3 text-[11px] text-white/60">{t("mood.v2.holoHint")}</span>
          <p className={`pointer-events-none absolute inset-x-0 bottom-4 px-4 text-center font-black text-white ${mood ? "text-[28px]" : "text-base text-white/80"}`} style={{ textShadow: `0 0 24px ${HOLO_MOODS[mood]?.color}` }} aria-live="polite">{mood ? t(`mood.v2.moodLevels.l${mood}`) : t("mood.v2.holoPick")}</p>
        </div>
        <div role="radiogroup" aria-label={t("mood.v2.moodQuestion")} className="grid grid-cols-5 gap-2">
          {LEVELS.map((level) => {
            const selected = mood === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMood(level)}
                className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] px-1 transition motion-safe:active:scale-95"
                style={{
                  borderColor: selected ? HOLO_MOODS[level].color : "var(--border)",
                  background: selected ? `color-mix(in srgb, ${HOLO_MOODS[level].color} 16%, var(--surface))` : "var(--surface)",
                  transform: selected ? "translateY(-3px)" : undefined,
                }}
                data-mood-level={level}
              >
                <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: HOLO_MOODS[level].color, boxShadow: `0 0 12px ${HOLO_MOODS[level].color}` }} />
                <span className={`text-[11px] leading-tight ${selected ? "font-semibold" : "text-foreground-muted"}`}>{t(`mood.v2.moodLevels.l${level}`)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex w-full items-baseline justify-between text-sm font-medium">
          {t("mood.v2.energyQuestion")}
          <span className="text-xs font-normal text-foreground-muted">{t(`mood.v2.energyLevels.l${energy}`)}</span>
        </legend>
        <div role="radiogroup" aria-label={t("mood.v2.energyQuestion")} className="grid grid-cols-5 gap-1.5">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={energy === level}
              aria-label={t(`mood.v2.energyLevels.l${level}`)}
              onClick={() => setEnergy(level)}
              className="flex min-h-11 items-end justify-center rounded-xl border border-border p-1.5 transition-colors"
              style={{ background: level <= energy ? "color-mix(in srgb, var(--mood) 22%, var(--surface))" : "var(--surface)", borderColor: energy === level ? "var(--mood)" : undefined }}
              data-energy-level={level}
            >
              <span aria-hidden className="w-full rounded-md" style={{ height: `${6 + level * 4}px`, background: level <= energy ? "var(--mood)" : "var(--surface-muted)" }} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">{t("mood.v2.tagsQuestion")}</legend>
        <p className="mb-3 mt-1 text-xs text-foreground-muted">{t("mood.v2.tagsHint")}</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => setTags((current) => on ? current.filter((value) => value !== tag) : [...current, tag])}
                className={`min-h-10 rounded-full border px-3.5 text-sm transition-colors ${on ? "border-mood bg-mood-soft font-semibold" : "border-border text-foreground-muted hover:text-foreground"}`}
                data-mood-tag={tag}
              >
                {on && <span aria-hidden>✓ </span>}{t(`mood.v2.tags.${tag}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="mood-note" className="sr-only">{t("mood.v2.notePlaceholder")}</label>
        <textarea id="mood-note" value={text} onChange={(event) => setText(event.target.value)} maxLength={1800} rows={2} placeholder={t("mood.v2.notePlaceholder")} className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-mood focus-visible:ring-2 focus-visible:ring-mood/30" />
      </div>

      <button type="submit" disabled={!mood || pending} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-mood text-base font-semibold text-[#2b1700] shadow-lg shadow-mood/20 transition hover:opacity-90 disabled:opacity-50" data-mood-save>
        {pending ? t("mood.v2.saving") : existing ? t("mood.v2.update") : t("mood.v2.save")}
      </button>
    </form>
  );
}
