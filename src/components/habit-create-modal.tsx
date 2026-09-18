"use client";

import { useState, useTransition } from "react";
import { createHabit } from "@/lib/actions/habits";
import { Dialog } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";
import { CATEGORY_META, CATEGORY_PRESETS, WEEKDAYS } from "@/lib/habit-categories";

export function HabitCreateModal() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [icon, setIcon] = useState("✨");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Général");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  const meta = CATEGORY_META[category] ?? CATEGORY_META["Général"];
  const scheduleLabel =
    days.length === 7 ? "tous les jours" : days.map((d) => WEEKDAYS.find((w) => w.value === d)?.label).join(", ");

  function reset() {
    setIcon("✨");
    setName("");
    setCategory("Général");
    setDays([1, 2, 3, 4, 5, 6, 7]);
  }

  function toggleDay(day: number) {
    setDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      await createHabit(formData);
      close();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border-[1.5px] border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent active:scale-[0.98]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nouvelle habitude
      </button>

      <Dialog open={open} onClose={close}>
        <form action={submit} className="rounded-2xl bg-surface shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-surface px-5 py-4">
            <span className="text-sm font-semibold">Nouvelle habitude</span>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-surface-muted text-foreground-muted transition hover:bg-border"
            >
              ✕
            </button>
          </div>

          <div
            className="mx-5 mt-4 flex items-center gap-3 rounded-2xl p-3.5"
            style={{ background: `color-mix(in srgb, ${meta.color} 14%, var(--surface))` }}
          >
            <span className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-xl bg-surface text-xl">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: meta.color }}>
                {name.trim() || "Nom de l'habitude"}
              </p>
              <p className="text-xs text-foreground-muted">
                {category} · {scheduleLabel}
              </p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground-muted">Nom</label>
              <div className="flex gap-2">
                <IconPicker name="icon" value={icon} onChange={setIcon} color={meta.color} />
                <input
                  name="name"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Lire 10 minutes"
                  className="flex-1 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-foreground-muted">Catégorie</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_PRESETS.map((c) => {
                  const cMeta = CATEGORY_META[c];
                  const active = c === category;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition"
                      style={{
                        background: active ? `color-mix(in srgb, ${cMeta.color} 16%, transparent)` : "transparent",
                        color: active ? cMeta.color : "var(--foreground-muted)",
                        border: active ? "1px solid transparent" : "1px solid var(--border)",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cMeta.color }} />
                      {cMeta.icon} {c}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="category" value={category} />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-foreground-muted">Jours prévus</label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((d) => {
                  const active = days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors"
                      style={{
                        background: active ? meta.color : "var(--surface-muted)",
                        color: active ? "white" : "var(--foreground-muted)",
                      }}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="scheduled_days" value={days.join(",")} />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex justify-end gap-2 rounded-b-2xl border-t border-border bg-surface-muted px-5 py-4">
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground-muted transition hover:bg-surface"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ background: meta.color }}
            >
              {pending ? "Création..." : "Créer l'habitude"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
