"use client";

import { useActionToast } from "@/components/toast/use-action-toast";
import { useState, useTransition } from "react";
import { enableEmailReminders, updateReminderTime, disableReminders } from "@/lib/actions/reminders";
import { useT } from "@/components/language-provider";

export function ReminderSettings({ initialTime, email }: { initialTime: string | null; email: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const run = useActionToast();
  const [time, setTime] = useState(initialTime ?? "19:00");
  const [enabled, setEnabled] = useState(Boolean(initialTime));

  function handleEnable() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    startTransition(async () => {
      const r = await run(() => enableEmailReminders(timezone, time), {
        success: t("profile.reminders.enabled", { time }),
        failure: t("profile.reminders.enableFailed"),
      });
      if (!r || r.error) return;
      setEnabled(true);
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const r = await run(() => disableReminders(), {
        success: t("profile.reminders.disabled"),
        failure: t("profile.reminders.disableFailed"),
      });
      if (!r || r.error) return;
      setEnabled(false);
    });
  }

  function handleTimeChange(newTime: string) {
    setTime(newTime);
    if (enabled) {
      startTransition(
        async () =>
          void (await run(() => updateReminderTime(newTime), {
            success: t("profile.reminders.moved", { time: newTime }),
            failure: t("profile.reminders.moveFailed"),
          }))
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p id="reminder-label" className="text-sm font-medium">{t("profile.settingsPage.reminderLabel")}</p>
          <p className="text-xs text-foreground-muted">{enabled ? t("profile.settingsPage.reminderOn", { time }) : t("profile.settingsPage.reminderOff")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="reminder-label"
          disabled={pending}
          onClick={enabled ? handleDisable : handleEnable}
          className="relative h-8 w-13 shrink-0 rounded-full transition-colors disabled:opacity-60"
          style={{ background: enabled ? "var(--accent)" : "var(--surface-muted)", boxShadow: "inset 0 0 0 1px var(--border)" }}
          data-reminder-switch
        >
          <span
            aria-hidden
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[inset-inline-start] motion-reduce:transition-none ${enabled ? "start-6" : "start-1"}`}
          />
        </button>
      </div>

      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span className="text-foreground-muted">{t("profile.reminders.timeLabel")}</span>
        <input
          type="time"
          value={time}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="min-h-11 rounded-xl border border-border bg-surface-muted px-3 text-sm outline-none focus:border-accent"
        />
      </label>

      <p className="text-xs text-foreground-muted">
        {enabled ? <EnabledDescription text={t("profile.reminders.descriptionEnabled", { email, time })} email={email} /> : t("profile.reminders.descriptionDisabled")}
      </p>
    </div>
  );
}

/** Renders the "reminder enabled" sentence with the email address bolded, wherever it lands in the translated text. */
function EnabledDescription({ text, email }: { text: string; email: string }) {
  const idx = text.indexOf(email);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-medium text-foreground">{email}</span>
      {text.slice(idx + email.length)}
    </>
  );
}
