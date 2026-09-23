"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { MoodPicker } from "@/components/mood-picker";
import { logMood } from "@/lib/actions/mood";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useToast } from "@/components/toast/toast-provider";
import { useT } from "@/components/language-provider";

type Existing = { mood_score: number; energy_level: number; notes: string | null } | null;

export function MoodForm({ today, existing }: { today: string; existing: Existing }) {
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const t = useT();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const score = Number(formData.get("mood_score"));
          const r = await run(() => logMood(formData), {
            success: existing ? t("mood.form.toastUpdateSuccess") : t("mood.form.toastCreateSuccess"),
            failure: t("mood.form.toastFailure"),
          });
          if (!r || r.error) return;

          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
          if (score <= 2) {
            toast.info(t("mood.form.lowMoodToastMessage"), {
              title: t("mood.form.lowMoodToastTitle"),
              duration: 7000,
            });
          } else if (score === 5) {
            toast.success(t("mood.form.highMoodToastMessage"), { title: t("mood.form.highMoodToastTitle") });
          }
        })
      }
      className="space-y-4 rounded-2xl border-[1.5px] border-mood/50 bg-surface p-5"
    >
      <input type="hidden" name="entry_date" value={today} />

      <div>
        <p className="mb-2 text-sm font-medium">{t("mood.form.moodLabel")}</p>
        <MoodPicker defaultValue={existing?.mood_score ?? 3} />
      </div>

      <div>
        <label htmlFor="energy_level" className="mb-2 block text-sm font-medium">
          {t("mood.form.energyLabel")}
        </label>
        <input
          id="energy_level"
          name="energy_level"
          type="range"
          min={1}
          max={5}
          defaultValue={existing?.energy_level ?? 3}
          className="w-full accent-mood"
        />
      </div>

      <input
        name="notes"
        defaultValue={existing?.notes ?? ""}
        placeholder={t("mood.form.notesPlaceholder")}
        className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
      />

      <motion.button
        type="submit"
        disabled={pending}
        whileTap={{ scale: 0.97 }}
        className="rounded-lg px-4 py-2 text-sm font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--mood)" }}
      >
        {pending ? t("mood.form.saving") : saved ? t("mood.form.saved") : existing ? t("mood.form.update") : t("mood.form.save")}
      </motion.button>
    </form>
  );
}
