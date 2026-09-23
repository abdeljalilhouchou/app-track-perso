"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useMemo, useState, useTransition } from "react";
import { differenceInMinutes, format } from "date-fns";
import { motion } from "framer-motion";
import { addMoment, deleteMoment, updateMoment } from "@/lib/actions/moments";
import { IconPicker } from "@/components/ui/icon-picker";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useT } from "@/components/language-provider";
import { MOMENT_EMOJI_CHOICES } from "@/lib/habit-categories";
import type { Moment } from "@/types/database";

function detailsLabel(m: Moment) {
  const parts: string[] = [];
  if (m.duration_minutes) parts.push(`${m.duration_minutes} min`);
  if (m.price != null) parts.push(`${m.price} MAD`);
  return parts.join(" · ");
}

const nowLocal = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");
const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

function liveDuration(start: string, end: string): string | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const minutes = differenceInMinutes(endDate, startDate);
  return minutes > 0 ? `${minutes} min` : null;
}

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

function TimingFields({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd?: string;
}) {
  const t = useT();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd ?? "");
  const duration = useMemo(() => liveDuration(start, end), [start, end]);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-foreground-muted">{t("habits.moments.startLabel")}</span>
        <input
          name="occurred_at"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-foreground-muted">
          {t("habits.moments.endLabel")} {duration && <span className="text-accent">· {duration}</span>}
        </span>
        <input
          name="ended_at"
          type="datetime-local"
          value={end}
          min={start}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
        />
      </label>
    </div>
  );
}

export function MomentsJournal({ moments }: { moments: Moment[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [resetKey, setResetKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-2xl border-[1.5px] border-accent/50 bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg">
            📝
          </span>
          <div>
            <h2 className="text-sm font-semibold">{t("habits.moments.title")}</h2>
            <p className="text-xs text-foreground-muted">{t("habits.moments.subtitle")}</p>
          </div>
        </div>
      </div>

      <form
        key={resetKey}
        action={(formData) =>
          startTransition(async () => {
            const r = await run(() => addMoment(formData), { success: t("habits.moments.addSuccess"), failure: t("habits.moments.addError") });
            if (!r || r.error) return;
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
            placeholder={t("habits.moments.textPlaceholder")}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-xl border-[1.5px] border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent active:scale-[0.98] disabled:opacity-60"
          >
            {t("common.add")}
          </button>
        </div>

        {showDetails ? (
          <div className="relative space-y-2.5 rounded-xl bg-surface-muted p-3 sm:ml-13">
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              aria-label={t("habits.moments.closeDetailsAria")}
              className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-foreground-muted transition hover:bg-border hover:text-foreground"
            >
              ✕
            </button>
            <TimingFields defaultStart={nowLocal()} />
            <label className="flex max-w-35 flex-col gap-1">
              <span className="text-[10px] font-medium text-foreground-muted">{t("habits.moments.priceLabel")}</span>
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent"
              />
            </label>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-muted transition hover:border-accent/40 hover:text-accent sm:ml-13"
          >
            <PlusIcon />
            {t("habits.moments.detailsToggle")}
          </button>
        )}
      </form>

      {moments.length > 0 && (
        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-foreground-muted">{t("common.today")}</p>
          <ul className="space-y-1.5">
            {moments.map((m) => (
              <MomentItem key={m.id} moment={m} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MomentItem({ moment }: { moment: Moment }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [editing, setEditing] = useState(false);

  if (editing) {
    const defaultEnd = moment.duration_minutes
      ? format(
          new Date(new Date(moment.occurred_at).getTime() + moment.duration_minutes * 60000),
          "yyyy-MM-dd'T'HH:mm"
        )
      : undefined;

    return (
      <motion.li layout className="rounded-xl border border-accent/40 bg-surface p-3">
        <form
          action={(formData) =>
            startTransition(async () => {
              const r = await run(() => updateMoment(moment.id, formData), { success: t("habits.moments.editSuccess"), failure: t("habits.moments.editError") });
              if (!r || r.error) return;
              setEditing(false);
            })
          }
          className="space-y-2.5"
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
          <TimingFields defaultStart={toLocalInput(moment.occurred_at)} defaultEnd={defaultEnd} />
          <label className="flex max-w-35 flex-col gap-1">
            <span className="text-[10px] font-medium text-foreground-muted">{t("habits.moments.priceLabel")}</span>
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={moment.price ?? ""}
              placeholder="0"
              className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs outline-none focus:border-accent"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60"
            >
              {t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted transition hover:bg-surface-muted"
            >
              {t("common.cancel")}
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
          {format(new Date(moment.occurred_at), "HH:mm")}
          {details && ` · ${details}`}
        </p>
      </div>
      <span className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          aria-label={t("common.edit")}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition hover:bg-surface hover:text-foreground"
        >
          <PencilIcon />
        </button>
        <ConfirmDeleteButton
          disabled={pending}
          onConfirm={() => startTransition(async () => void (await run(() => deleteMoment(moment.id), { success: t("habits.moments.deleteSuccess"), failure: t("habits.moments.deleteError") })))}
          title={t("habits.moments.deleteConfirmTitle")}
          message={t("habits.moments.deleteConfirmMessage", { text: moment.text })}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition hover:bg-surface hover:text-danger disabled:opacity-50"
        >
          <TrashIcon />
        </ConfirmDeleteButton>
      </span>
    </motion.li>
  );
}
