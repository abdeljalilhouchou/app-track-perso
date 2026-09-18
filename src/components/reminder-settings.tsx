"use client";

import { useState, useTransition } from "react";
import { enableEmailReminders, updateReminderTime, disableReminders } from "@/lib/actions/reminders";

export function ReminderSettings({ initialTime, email }: { initialTime: string | null; email: string }) {
  const [pending, startTransition] = useTransition();
  const [time, setTime] = useState(initialTime ?? "19:00");
  const [enabled, setEnabled] = useState(Boolean(initialTime));

  function handleEnable() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    startTransition(async () => {
      await enableEmailReminders(timezone, time);
      setEnabled(true);
    });
  }

  function handleDisable() {
    startTransition(async () => {
      await disableReminders();
      setEnabled(false);
    });
  }

  function handleTimeChange(newTime: string) {
    setTime(newTime);
    if (enabled) {
      startTransition(() => updateReminderTime(newTime));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-foreground-muted">Heure du rappel</span>
          <input
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
        </label>

        {enabled ? (
          <button
            onClick={handleDisable}
            disabled={pending}
            className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-foreground-muted transition hover:bg-surface-muted disabled:opacity-60"
          >
            Désactiver
          </button>
        ) : (
          <button
            onClick={handleEnable}
            disabled={pending}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60"
          >
            Activer les rappels
          </button>
        )}
      </div>

      <p className="text-xs text-foreground-muted">
        {enabled
          ? <>Un email sera envoyé à <span className="font-medium text-foreground">{email}</span> vers {time} s&apos;il te reste des habitudes prévues aujourd&apos;hui.</>
          : "Reçois un email de rappel si des habitudes prévues aujourd'hui ne sont pas encore cochées."}
      </p>
    </div>
  );
}
