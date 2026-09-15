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

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

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
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg">
          📝
        </span>
        <div>
          <h2 className="text-sm font-semibold">Moments du jour</h2>
          <p className="text-xs text-foreground-muted">
            Une sortie, un café, un imprévu — sans en faire une habitude récurrente.
          </p>
        </div>
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
        className="mt-4 space-y-2.5"
      >
        <div className="flex gap-2">
          <IconPicker name="icon" defaultValue="⚡" choices={MOMENT_EMOJI_CHOICES} color="var(--accent)" />
          <input
            name="text"
            required
            placeholder="Ex: Café avec Sarah, balade shopping..."
            className="flex-1 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            Ajouter
          </button>
        </div>

        {showDetails ? (
          <div className="ml-13 flex flex-wrap items-end gap-3 rounded-xl bg-surface-muted p-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-foreground-muted">Date</span>
              <input
                name="entry_date"
                type="date"
                defaultValue={today()}
                max={today()}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-foreground-muted">Durée</span>
              <input
                name="duration_minutes"
                type="number"
                min={0}
                placeholder="min"
                className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-foreground-muted">Prix</span>
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                placeholder="€"
                className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
              />
            </label>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="ml-13 flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent"
          >
            <PlusIcon />
            Date, durée, prix
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
      className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2.5 transition hover:bg-accent-soft/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface text-sm">
        {moment.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{moment.text}</p>
        <p className="text-xs text-foreground-muted">
          {format(new Date(moment.created_at), "HH:mm")}
          {details && ` · ${details}`}
        </p>
      </div>
      <span className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          aria-label="Modifier"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition hover:bg-surface hover:text-foreground"
        >
          <PencilIcon />
        </button>
        <ConfirmDeleteButton
          disabled={pending}
          onConfirm={() => startTransition(() => deleteMoment(moment.id))}
          title="Supprimer ce moment ?"
          message={`"${moment.text}" sera définitivement supprimé.`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition hover:bg-surface hover:text-danger disabled:opacity-50"
        >
          <TrashIcon />
        </ConfirmDeleteButton>
      </span>
    </motion.li>
  );
}
