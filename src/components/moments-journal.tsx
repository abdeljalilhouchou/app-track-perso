"use client";

import { useState, useTransition } from "react";
import { format, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { addMoment, deleteMoment } from "@/lib/actions/moments";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { MOMENT_EMOJI_CHOICES } from "@/lib/habit-categories";
import type { Moment } from "@/types/database";

function dayLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  return format(date, "EEEE d MMMM", { locale: fr });
}

export function MomentsJournal({ moments }: { moments: Moment[] }) {
  const [pending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);

  const groups = new Map<string, Moment[]>();
  for (const m of moments) {
    if (!groups.has(m.entry_date)) groups.set(m.entry_date, []);
    groups.get(m.entry_date)!.push(m);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-sm font-medium">📝 Moments du jour</h2>
        <p className="mt-0.5 text-xs text-foreground-muted">
          Une sortie, un café, un imprévu — note-le sans en faire une habitude récurrente.
        </p>
      </div>

      <form
        key={resetKey}
        action={(formData) =>
          startTransition(async () => {
            await addMoment(formData);
            setResetKey((k) => k + 1);
          })
        }
        className="mt-3 flex gap-2"
      >
        <IconPicker name="icon" defaultValue="⚡" choices={MOMENT_EMOJI_CHOICES} color="var(--accent)" />
        <input
          name="text"
          required
          placeholder="Ex: Café avec Sarah, balade shopping..."
          className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          Ajouter
        </button>
      </form>

      {sortedDates.length > 0 && (
        <div className="mt-5 space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="mb-1.5 text-xs font-medium capitalize text-foreground-muted">{dayLabel(date)}</p>
              <ul className="space-y-1.5">
                {groups.get(date)!.map((m) => (
                  <motion.li
                    key={m.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span>{m.icon}</span>
                      {m.text}
                      <span className="text-xs text-foreground-muted">
                        {format(new Date(m.created_at), "HH:mm")}
                      </span>
                    </span>
                    <ConfirmDeleteButton
                      disabled={pending}
                      onConfirm={() => startTransition(() => deleteMoment(m.id))}
                      title="Supprimer ce moment ?"
                      message={`"${m.text}" sera définitivement supprimé.`}
                      className="shrink-0 text-xs text-foreground-muted hover:text-danger disabled:opacity-50"
                    >
                      ✕
                    </ConfirmDeleteButton>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
