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
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-foreground-muted">{t("profile.reminders.timeLabel")}</span>
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
            {t("profile.reminders.disable")}
          </button>
        ) : (
          <button
            onClick={handleEnable}
            disabled={pending}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-on-accent transition hover:opacity-90 disabled:opacity-60"
          >
            {t("profile.reminders.enable")}
          </button>
        )}
      </div>

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
