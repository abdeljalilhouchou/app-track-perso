"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { createHabit } from "@/lib/actions/habits";
import { useT } from "@/components/language-provider";
import { CATEGORY_META, SUGGESTED_HABITS } from "@/lib/habit-categories";

export function SuggestedHabits({ existingNames }: { existingNames: string[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [addedNow, setAddedNow] = useState<string[]>([]);
  const lowerExisting = existingNames.map((n) => n.toLowerCase());

  const remaining = SUGGESTED_HABITS.filter(
    (s) => !lowerExisting.includes(s.name.toLowerCase()) && !addedNow.includes(s.name)
  );

  if (remaining.length === 0) return null;

  function add(suggestion: (typeof SUGGESTED_HABITS)[number]) {
    const label = t(`habits.suggestedItems.${suggestion.key}`);
    const formData = new FormData();
    formData.set("icon", suggestion.icon);
    formData.set("name", label);
    formData.set("category", suggestion.category);
    formData.set("scheduled_days", suggestion.scheduledDays.join(","));
    startTransition(async () => {
      const r = await run(() => createHabit(formData), { success: t("habits.suggested.addSuccess", { name: label }), failure: t("habits.suggested.addError") });
      if (!r || r.error) return;
      setAddedNow((prev) => [...prev, suggestion.name]);
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground-muted">{t("habits.suggested.title")}</p>
      <div className="flex flex-wrap gap-2">
        {remaining.map((s) => {
          const color = CATEGORY_META[s.category]?.color ?? "var(--accent)";
          return (
            <motion.button
              key={s.name}
              type="button"
              disabled={pending}
              onClick={() => add(s)}
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -1 }}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium transition hover:border-transparent disabled:opacity-50"
              onMouseEnter={(e) => (e.currentTarget.style.background = `color-mix(in srgb, ${color} 14%, var(--surface-muted))`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-muted)")}
            >
              <span>{s.icon}</span>
              {t(`habits.suggestedItems.${s.key}`)}
              <span className="text-foreground-muted">+</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
