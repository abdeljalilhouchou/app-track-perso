"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/toast/toast-provider";
import { removePushSubscription, savePushSubscription, saveNotificationSettings, sendTestNotification } from "@/lib/actions/notifications";
import { NOTIFY_KINDS, type NotifyKind, type NotifySettings } from "@/lib/notifications";
import { currentSubscription, deviceTimezone, pushSupport, subscribePush, unsubscribePush, type PushSupport } from "@/lib/push-client";

const COLORS: Record<NotifyKind, string> = { habits: "var(--habit)", streak: "var(--nutrition)", mood: "var(--mood)", sleep: "var(--accent)", water: "var(--water)", review: "var(--accent)" };
const ICONS: Record<NotifyKind, string> = {
  habits: "M12 3l2.6 5.6 6 .9-4.4 4.2 1 6-5.2-2.8L6.8 19.7l1-6L3.4 9.5l6-.9z",
  streak: "M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 3s1-3 0-7z",
  mood: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  sleep: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  water: "M12 2.7s6 6.3 6 11.3a6 6 0 0 1-12 0c0-5 6-11.3 6-11.3z",
  review: "M4 20V10M10 20V4M16 20v-7M22 20H2",
};

function Switch({ on, label, onChange, disabled, color = "var(--accent)", data }: { on: boolean; label: string; onChange: () => void; disabled?: boolean; color?: string; data?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange} data-switch={data}
    className={`flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors disabled:opacity-50 ${on ? "justify-end" : "justify-start bg-[color-mix(in_srgb,var(--foreground)_18%,transparent)]"}`} style={on ? { background: color } : undefined}>
    <span className="h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.3)]" />
  </button>;
}

const timeInput = "min-h-11 rounded-xl border border-border bg-surface px-3 text-[15px] font-bold tabular-nums text-foreground [color-scheme:light_dark]";

export function NotificationSettings({ initial, schemaReady }: { initial: NotifySettings; schemaReady: boolean }) {
  const { t } = useLanguage();
  const n = (key: string, vars?: Record<string, string | number>) => t(`notify.${key}`, vars);
  const toast = useToast();
  const [settings, setSettings] = useState(initial);
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [device, setDevice] = useState(false);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(async () => {
      const s = pushSupport();
      const sub = s === "ok" ? await currentSubscription() : null;
      if (alive) { setSupport(s); setDevice(!!sub); }
    }, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  const errorText = (code: string | null) => n(code === "schema" ? "schema" : code === "notReady" ? "notReady" : code === "none" ? "testNone" : "error");

  const save = (next: NotifySettings, delay = 0) => {
    setSettings(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      startTransition(async () => {
        const result = await saveNotificationSettings(next);
        if (result.error) toast.error(errorText(result.error));
      });
    }, delay);
  };
  const setKind = (kind: NotifyKind, patch: Partial<NotifySettings["kinds"][NotifyKind]>, delay = 0) =>
    save({ ...settings, kinds: { ...settings.kinds, [kind]: { ...settings.kinds[kind], ...patch } } }, delay);

  const toggleDevice = () => startTransition(async () => {
    if (device) {
      const endpoint = await unsubscribePush();
      if (endpoint) await removePushSubscription(endpoint);
      setDevice(false);
      return;
    }
    const result = await subscribePush();
    if ("error" in result) {
      if (result.error === "denied") { setSupport("denied"); toast.error(n("invite.denied")); } else toast.error(n("error"));
      return;
    }
    const saved = await savePushSubscription(result.subscription as never, deviceTimezone());
    if (saved.error) { toast.error(errorText(saved.error)); return; }
    setDevice(true);
    setSettings((s) => ({ ...s, enabled: true, timezone: deviceTimezone() }));
    toast.success(n("invite.done"));
  });

  const test = () => startTransition(async () => {
    const result = await sendTestNotification();
    if (result.error) toast.error(errorText(result.error)); else toast.success(n("testSent"));
  });

  const deviceText = support === null ? "…" : support === "install" ? n("deviceInstall") : support === "denied" ? n("deviceDenied") : support === "unsupported" ? n("deviceUnsupported") : device ? n("deviceOn") : n("deviceOff");
  const active = device && settings.enabled;

  return (
    <div className="space-y-4" data-notify-settings>
      {!schemaReady && <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-foreground-muted" data-notify-schema>{n("schema")}</p>}

      <section className="glass-card flex items-center gap-3.5 p-[18px]" style={{ "--glow": "var(--accent)" } as CSSProperties} data-notify-device>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent" aria-hidden>
          <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold">{n("device")}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-foreground-muted" data-notify-device-state>{deviceText}</p>
        </div>
        <Switch on={device} label={n("device")} onChange={toggleDevice} disabled={pending || support !== "ok" || !schemaReady} data="device" />
      </section>

      <div className="space-y-1 px-1 pt-1">
        <h2 className="text-xs font-bold uppercase tracking-[.08em] text-foreground-muted">{n("receive")}</h2>
        <p className="text-[13px] leading-snug text-foreground-muted">{n("receiveHint")}</p>
      </div>

      <div className="space-y-2.5">
        {NOTIFY_KINDS.map((kind) => {
          const k = settings.kinds[kind];
          const on = k.on && active;
          const color = COLORS[kind];
          return <article key={kind} className="rounded-[20px] border p-4 transition-colors" style={{ borderColor: on ? `color-mix(in srgb, ${color} 35%, var(--border))` : "var(--border)", background: on ? `color-mix(in srgb, ${color} 7%, var(--surface))` : "var(--surface)", opacity: active ? 1 : 0.6 }} data-notify-kind={kind}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }} aria-hidden>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[kind]} /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold">{n(`kinds.${kind}.title`)}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-foreground-muted">{n(`kinds.${kind}.when`)}</p>
              </div>
              <Switch on={k.on} label={n(`kinds.${kind}.title`)} onChange={() => setKind(kind, { on: !k.on })} disabled={!active || !schemaReady} color={color} data={kind} />
            </div>
            {k.on && <div className="mt-3 space-y-2.5 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`notify-${kind}`} className="text-[13px] text-foreground-muted">{n(kind === "review" ? "mondayAt" : kind === "water" ? "around" : "time")}</label>
                <input id={`notify-${kind}`} type="time" value={k.time} disabled={!active || !schemaReady} onChange={(e) => e.target.value && setKind(kind, { time: e.target.value }, 600)} className={timeInput} />
              </div>
              <p className="rounded-xl bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-3 py-2.5 text-[13px] leading-snug"><span className="text-foreground-muted">{n("example")} · </span>{n(`kinds.${kind}.example`)}</p>
            </div>}
          </article>;
        })}
      </div>

      <h2 className="px-1 pt-1 text-xs font-bold uppercase tracking-[.08em] text-foreground-muted">{n("calm")}</h2>
      <section className="space-y-3 rounded-[20px] border border-border bg-surface p-4" style={{ opacity: active ? 1 : 0.6 }} data-notify-calm>
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[15px] font-extrabold">{n("quiet")}</p><p className="mt-0.5 text-[12.5px] text-foreground-muted">{n("quietHint")}</p></div>
          <Switch on={settings.quietOn} label={n("quiet")} onChange={() => save({ ...settings, quietOn: !settings.quietOn })} disabled={!active || !schemaReady} data="quiet" />
        </div>
        {settings.quietOn && <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5 text-xs text-foreground-muted">{n("from")}<input type="time" value={settings.quietFrom} disabled={!active || !schemaReady} onChange={(e) => e.target.value && save({ ...settings, quietFrom: e.target.value }, 600)} className={timeInput} /></label>
          <label className="flex flex-col gap-1.5 text-xs text-foreground-muted">{n("to")}<input type="time" value={settings.quietTo} disabled={!active || !schemaReady} onChange={(e) => e.target.value && save({ ...settings, quietTo: e.target.value }, 600)} className={timeInput} /></label>
        </div>}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <div><p className="text-[15px] font-extrabold">{n("cap")}</p><p className="mt-0.5 text-[12.5px] text-foreground-muted">{n("capHint")}</p></div>
          <Switch on={settings.capOn} label={n("cap")} onChange={() => save({ ...settings, capOn: !settings.capOn })} disabled={!active || !schemaReady} data="cap" />
        </div>
      </section>

      <button type="button" onClick={test} disabled={pending || !device} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-border bg-surface text-[15px] font-bold transition hover:bg-surface-muted disabled:opacity-50" data-notify-test>
        <svg className="h-[18px] w-[18px] rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>{n("test")}
      </button>
      <p className="px-1 text-[12.5px] leading-relaxed text-foreground-muted">{n("emailNote")}</p>
    </div>
  );
}
