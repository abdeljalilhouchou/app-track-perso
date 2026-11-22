"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const HINT_KEY = "track-perso:pwa-hint-dismissed";
const TEXT = {
  fr: { title: "Installe track.perso", before: "Appuie sur", share: "Partager", after: "puis « Sur l’écran d’accueil ».", close: "Fermer" },
  en: { title: "Install track.perso", before: "Tap", share: "Share", after: "then “Add to Home Screen”.", close: "Close" },
  ar: { title: "ثبّت track.perso", before: "اضغط على", share: "مشاركة", after: "ثم «إضافة إلى الشاشة الرئيسية».", close: "إغلاق" },
};

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function hintDismissed() {
  try { return localStorage.getItem(HINT_KEY) === "1"; } catch { return true; }
}

/**
 * Registers the service worker (production only) and, on an iPhone that has not
 * installed the app yet, explains once how to add it to the home screen: Safari has
 * no install prompt of its own.
 */
export function PwaRegister() {
  const pathname = usePathname();
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isIos() || isInstalled() || hintDismissed()) return;
    const timer = window.setTimeout(() => setHint(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hint || pathname === "/") return null;
  const lang = document.documentElement.lang as keyof typeof TEXT;
  const text = TEXT[lang] ?? TEXT.fr;
  const dismiss = () => { setHint(false); try { localStorage.setItem(HINT_KEY, "1"); } catch {} };

  return <div role="dialog" aria-label={text.title} className="fixed inset-x-3 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-2xl" style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 12px)" }} data-pwa-hint>
    {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 40px icon, no optimisation needed */}
    <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-[10px]" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold">{text.title}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-foreground-muted">
        {text.before}{" "}
        <svg aria-hidden viewBox="0 0 24 24" className="inline h-4 w-4 align-[-3px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}><path d="M12 15V3M8 7l4-4 4 4" /><path d="M7 10H5v11h14V10h-2" /></svg>{" "}
        <strong className="font-semibold text-foreground">{text.share}</strong>, {text.after}
      </p>
    </div>
    <button type="button" onClick={dismiss} aria-label={text.close} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted">✕</button>
  </div>;
}
