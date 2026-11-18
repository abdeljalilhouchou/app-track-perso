"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteMoodEntry } from "@/lib/actions/mood";
import { useActionToast } from "@/components/toast/use-action-toast";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useLanguage } from "@/components/language-provider";
import { parseMoodNote } from "@/lib/mood-tags";
import { formatDay, MOOD_COLOR, MOOD_EMOJI } from "./mood-scale";

type Entry = { id: string; entry_date: string; mood_score: number; energy_level: number; notes: string | null };
const PAGE = 10;

/** Every logged day, newest first, with what mattered; each day can be edited or removed. */
export function MoodJournal({ entries, today, yesterday }: { entries: Entry[]; today: string; yesterday: string }) {
  const { t, language } = useLanguage();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState(PAGE);
  const dayName = (date: string) => date === today ? t("mood.v2.today") : date === yesterday ? t("mood.v2.yesterday") : formatDay(date, language);

  return (
    <section aria-labelledby="mood-journal" className="space-y-3" data-mood-journal>
      <h2 id="mood-journal" className="px-1 font-semibold">{t("mood.v2.journalTitle")}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {entries.slice(0, shown).map((entry) => {
          const { text, tags } = parseMoodNote(entry.notes);
          return (
            <li key={entry.id} className="flex gap-3 p-4" data-mood-entry={entry.entry_date}>
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `color-mix(in srgb, ${MOOD_COLOR[entry.mood_score]} 16%, var(--surface))` }}>{MOOD_EMOJI[entry.mood_score]}</span>
              <div className="min-w-0 flex-1">
                <div>
                  <p className="truncate font-medium first-letter:uppercase">{dayName(entry.entry_date)}</p>
                  <p className="text-xs text-foreground-muted">{t(`mood.v2.moodLevels.l${entry.mood_score}`)} · {t("mood.v2.energyQuestion")} {entry.energy_level}/5</p>
                </div>
                {tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{tags.map((tag) => <span key={tag} className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px]">{t(`mood.v2.tags.${tag}`)}</span>)}</div>}
                {text && <p className="mt-1.5 text-sm text-foreground-muted">{text}</p>}
                <div className="mt-1 flex gap-1">
                  <Link href={`/humeur?date=${entry.entry_date}#checkin`} scroll className="-ms-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-foreground-muted hover:text-foreground">{t("mood.v2.edit")}</Link>
                  <ConfirmDeleteButton
                    disabled={pending}
                    onConfirm={() => startTransition(async () => void (await run(() => deleteMoodEntry(entry.id), { success: t("mood.entryList.deleteSuccess"), failure: t("mood.entryList.deleteFailure") })))}
                    title={t("mood.entryList.deleteConfirmTitle")}
                    message={t("mood.entryList.deleteConfirmMessage", { date: formatDay(entry.entry_date, language, { day: "numeric", month: "long" }) })}
                    className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-foreground-muted hover:text-danger disabled:opacity-60"
                  >
                    {t("mood.entryList.deleteButton")}
                  </ConfirmDeleteButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {shown < entries.length && (
        <button type="button" onClick={() => setShown((value) => value + PAGE)} className="flex min-h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-medium hover:bg-surface-muted">
          {t("mood.v2.showMore")}
        </button>
      )}
    </section>
  );
}
