"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useT } from "@/components/language-provider";
import { logWorkout } from "@/lib/actions/sport";
import type { ActivityStat } from "@/lib/sport-stats";

const field =
  "rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-sport focus:ring-2 focus:ring-sport/30";

export function WorkoutForm({ today, favorites }: { today: string; favorites: ActivityStat[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [resetKey, setResetKey] = useState(0);
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(3);
  const [justAdded, setJustAdded] = useState(false);

  function pick(a: ActivityStat) {
    setActivity(a.name);
    setDuration(a.avgDuration);
    setIntensity(Math.min(5, Math.max(1, a.avgIntensity)));
  }

  function reset() {
    setActivity("");
    setDuration(30);
    setIntensity(3);
    setResetKey((k) => k + 1);
  }

  return (
    <form
      key={resetKey}
      action={(formData) =>
        startTransition(async () => {
          const r = await run(() => logWorkout(formData), {
            success: t("sport.common.sessionSavedToast", { name: String(formData.get("activity") ?? "") }),
            failure: t("sport.common.sessionNotSaved"),
          });
          if (!r || r.error) return;
          reset();
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1500);
        })
      }
      className="space-y-3 rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("sport.workoutForm.title")}</p>

      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {favorites.map((a) => (
            <button
              key={a.name}
              type="button"
              onClick={() => pick(a)}
              title={t("sport.workoutForm.favoriteTitle", {
                count: a.count,
                unit: t(a.count > 1 ? "sport.common.sessionOther" : "sport.common.sessionOne"),
                avg: a.avgDuration,
              })}
              className="rounded-full border border-sport/40 bg-surface-muted px-2.5 py-1 text-xs transition hover:border-sport hover:text-sport"
            >
              {t("sport.workoutForm.favoriteLabel", { name: a.name, avg: a.avgDuration })}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="activity"
          required
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder={t("sport.workoutForm.activityPlaceholder")}
          className={`${field} sm:col-span-2`}
        />
        <input name="workout_date" type="date" required defaultValue={today} max={today} className={field} />
        <input
          name="duration_minutes"
          type="number"
          min={1}
          required
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          placeholder={t("sport.workoutForm.durationPlaceholder")}
          className={field}
        />
        <label className="flex flex-col gap-1 text-xs text-foreground-muted">
          {t("sport.common.intensityLabel")}
          <select
            name="intensity"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className={`${field} text-foreground`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
        <input name="notes" placeholder={t("sport.workoutForm.notesPlaceholder")} className={`${field} self-end`} />
      </div>

      <motion.button
        type="submit"
        disabled={pending || !activity.trim()}
        whileTap={{ scale: 0.98 }}
        className="w-full rounded-lg bg-sport px-4 py-2 text-sm font-medium text-on-accent transition hover:opacity-90 disabled:opacity-50"
      >
        {justAdded ? t("sport.workoutForm.addedButton") : t("sport.common.saveSessionButton")}
      </motion.button>
    </form>
  );
}
