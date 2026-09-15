"use client";

import { IconPicker } from "@/components/ui/icon-picker";
import { CategoryPicker } from "@/components/ui/category-picker";
import { TargetPicker } from "@/components/ui/target-picker";

export function HabitForm({
  action,
  defaultValues,
  submitLabel,
  onCancel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: { icon?: string; name?: string; category?: string; target_per_week?: number };
  submitLabel: string;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <IconPicker name="icon" defaultValue={defaultValues?.icon ?? "✨"} />
        <input
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="Nom de l'habitude (ex: Lire 10 minutes)"
          className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="flex gap-2">
        <CategoryPicker name="category" defaultValue={defaultValues?.category ?? "Général"} />
        <div className="w-40">
          <TargetPicker name="target_per_week" defaultValue={defaultValues?.target_per_week ?? 7} />
        </div>
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
