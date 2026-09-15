"use client";

import { useState, useTransition } from "react";
import { enableReminders, updateReminderTime, disableReminders } from "@/lib/actions/reminders";
import { urlBase64ToUint8Array } from "@/lib/push-helpers";

export function ReminderSettings({ initialTime }: { initialTime: string | null }) {
  const [pending, startTransition] = useTransition();
  const [time, setTime] = useState(initialTime ?? "19:00");
  const [enabled, setEnabled] = useState(Boolean(initialTime));
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
  );

  async function handleEnable() {
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Autorisation refusée. Active les notifications pour ce site dans les réglages de ton navigateur.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Configuration manquante côté serveur.");
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      startTransition(async () => {
        await enableReminders(JSON.stringify(subscription), timezone, time);
        setEnabled(true);
      });
    } catch {
      setError("Impossible d'activer les rappels sur cet appareil.");
    }
  }

  async function handleDisable() {
    setError(null);
    let endpoint: string | null = null;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe();
      }
    } catch {
      // best-effort browser-side cleanup; the server-side row is removed regardless
    }
    startTransition(async () => {
      await disableReminders(endpoint);
      setEnabled(false);
    });
  }

  function handleTimeChange(newTime: string) {
    setTime(newTime);
    if (enabled) {
      startTransition(() => updateReminderTime(newTime));
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-foreground-muted">
        Les notifications ne sont pas prises en charge par ce navigateur.
      </p>
    );
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
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Activer les rappels
          </button>
        )}
      </div>

      {enabled && (
        <p className="text-xs text-foreground-muted">
          Tu recevras une notification à {time} s&apos;il te reste des habitudes prévues aujourd&apos;hui.
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
