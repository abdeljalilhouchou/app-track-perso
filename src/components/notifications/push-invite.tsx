"use client";

import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/toast/toast-provider";
import { savePushSubscription } from "@/lib/actions/notifications";
import { currentSubscription, deviceTimezone, pushSupport, subscribePush } from "@/lib/push-client";

const DISMISS_KEY = "track-perso:push-invite";

function dismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return true; }
}

/**
 * Shown once on the home page of an installed app that can receive notifications and has
 * not been asked yet. "Later" hides it for good; settings stay reachable from the profile.
 */
export function PushInvite() {
  const { t } = useLanguage();
  const n = (key: string) => t(`notify.invite.${key}`);
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(async () => {
      if (dismissed() || pushSupport() !== "ok" || Notification.permission !== "default") return;
      const existing = await currentSubscription();
      if (alive && !existing) setShow(true);
    }, 600);
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  const hide = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
    setShow(false);
  };

  const enable = () => startTransition(async () => {
    const result = await subscribePush();
    if ("error" in result) {
      if (result.error === "denied") { toast.error(n("denied")); hide(); } else toast.error(t("notify.error"));
      return;
    }
    const saved = await savePushSubscription(result.subscription as never, deviceTimezone());
    if (saved.error) { toast.error(t(saved.error === "schema" ? "notify.schema" : "notify.error")); return; }
    toast.success(n("done"));
    hide();
  });

  if (!show) return null;
  return (
    <section className="glass-card space-y-3 p-5 text-center" style={{ "--glow": "var(--accent)" } as CSSProperties} data-push-invite>
      <span className="push-bell mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-[#818cf8] to-[#4f46e5] text-white shadow-[0_12px_30px_rgba(79,70,229,.4)]" aria-hidden>
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
      </span>
      <h2 className="text-xl font-black leading-tight">{n("title")}</h2>
      <p className="text-sm leading-relaxed text-foreground-muted">{n("body")}</p>
      <ul className="space-y-2 text-start">
        {[0, 1, 2].map((i) => <li key={i} className="flex items-center gap-2.5 rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2.5 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ["var(--habit)", "var(--accent)", "var(--sport)"][i] }} />{t(`notify.invite.points.${i}`)}
        </li>)}
      </ul>
      <button type="button" onClick={enable} disabled={pending} className="min-h-[52px] w-full rounded-[18px] bg-accent text-base font-extrabold text-white transition hover:opacity-90 disabled:opacity-60" data-push-enable>{n("enable")}</button>
      <button type="button" onClick={hide} className="min-h-11 w-full text-sm font-semibold text-foreground-muted" data-push-later>{n("later")}</button>
    </section>
  );
}
