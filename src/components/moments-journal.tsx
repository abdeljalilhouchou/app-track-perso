"use client";

import { useState, useTransition } from "react";
import { format, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { addMoment, deleteMoment, updateMoment } from "@/lib/actions/moments";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { MOMENT_EMOJI_CHOICES } from "@/lib/habit-categories";
import type { Moment } from "@/types/database";

function dayLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  return format(date, "EEEE d MMMM", { locale: fr });
}

function detailsLabel(m: Moment) {
  const parts: string[] = [];
  if (m.duration_minutes) parts.push(`${m.duration_minutes} min`);
  if (m.price != null) parts.push(`${m.price}€`);
  return parts.join(" · ");
}

const today = () => format(new Date(), "yyyy-MM-dd");

export function MomentsJournal({ moments }: { moments: Moment[] }) {
  const [pending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

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
            setShowDetails(false);
          })
        }
        className="mt-3 space-y-2"
      >
        <div className="flex gap-2">
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
        </div>

        {showDetails ? (
          <div className="flex flex-wrap gap-2 pl-13">
            <input
              name="entry_date"
              type="date"
              defaultValue={today()}
              max={today()}
              className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
            <input
              name="duration_minutes"
              type="number"
              min={0}
              placeholder="Durée (min)"
              className="w-28 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              placeholder="Prix (€)"
              className="w-24 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="pl-13 text-xs font-medium text-accent hover:underline"
          >
            + Date, durée, prix (optionnel)
          </button>
        )}
      </form>

      {sortedDates.length > 0 && (
        <div className="mt-5 space-y-4">
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="mb-1.5 text-xs font-medium capitalize text-foreground-muted">{dayLabel(date)}</p>
              <ul className="space-y-1.5">
                {groups.get(date)!.map((m) => (
                  <MomentItem key={m.id} moment={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MomentItem({ moment }: { moment: Moment }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <motion.li layout className="rounded-xl border border-accent/40 bg-surface p-3">
        <form
          action={(formData) =>
            startTransition(async () => {
              await updateMoment(moment.id, formData);
              setEditing(false);
            })
          }
          className="space-y-2"
        >
          <div className="flex gap-2">
            <IconPicker name="icon" defaultValue={moment.icon} choices={MOMENT_EMOJI_CHOICES} color="var(--accent)" />
            <input
              name="text"
              required
              defaultValue={moment.text}
              className="flex-1 rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              name="entry_date"
              type="date"
              defaultValue={moment.entry_date}
              max={today()}
              className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
            <input
              name="duration_minutes"
              type="number"
              min={0}
              defaultValue={moment.duration_minutes ?? ""}
              placeholder="Durée (min)"
              className="w-28 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={moment.price ?? ""}
              placeholder="Prix (€)"
              className="w-24 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface-muted"
            >
              Annuler
            </button>
          </div>
        </form>
      </motion.li>
    );
  }

  const details = detailsLabel(moment);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2"
    >
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span>{moment.icon}</span>
        <span className="truncate">{moment.text}</span>
        {details && <span className="shrink-0 text-xs text-foreground-muted">· {details}</span>}
        <span className="shrink-0 text-xs text-foreground-muted">
          {format(new Date(moment.created_at), "HH:mm")}
        </span>
      </span>
      <span className="flex shrink-0 gap-3 text-xs">
        <button onClick={() => setEditing(true)} className="text-foreground-muted hover:text-foreground">
          Modifier
        </button>
        <ConfirmDeleteButton
          disabled={pending}
          onConfirm={() => startTransition(() => deleteMoment(moment.id))}
          title="Supprimer ce moment ?"
          message={`"${moment.text}" sera définitivement supprimé.`}
          className="text-foreground-muted hover:text-danger disabled:opacity-50"
        >
          ✕
        </ConfirmDeleteButton>
      </span>
    </motion.li>
  );
}
