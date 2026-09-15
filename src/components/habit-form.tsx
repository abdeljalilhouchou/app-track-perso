"use client";

import { IconPicker } from "@/components/ui/icon-picker";
import { CategoryPicker } from "@/components/ui/category-picker";
import { DayPicker } from "@/components/ui/day-picker";
import { CATEGORY_META } from "@/lib/habit-categories";

export function HabitForm({
  action,
  defaultValues,
  submitLabel,
  onCancel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: { icon?: string; name?: string; category?: string; scheduled_days?: number[] };
  submitLabel: string;
  onCancel?: () => void;
}) {
  const category = defaultValues?.category ?? "Général";
  const color = CATEGORY_META[category]?.color ?? "var(--accent)";

  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <IconPicker name="icon" defaultValue={defaultValues?.icon ?? "✨"} color={color} />
        <input
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="Nom de l'habitude (ex: Lire 10 minutes)"
          className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <CategoryPicker name="category" defaultValue={category} />

      <div>
        <p className="mb-1.5 text-xs text-foreground-muted">Jours prévus</p>
        <DayPicker name="scheduled_days" defaultValue={defaultValues?.scheduled_days} color={color} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground-muted transition hover:bg-surface-muted"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
