"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/components/language-provider";
import { useActionToast } from "@/components/toast/use-action-toast";
import { addWater } from "@/lib/actions/nutrition";

const PATHS = {
  meal: <><path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></>,
  mood: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
  sport: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
};
const Icon = ({ name, color }: { name: keyof typeof PATHS; color: string }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{PATHS[name]}</svg>;

/** The centre "+" of the floating menu: opens the quick add (meal, mood, workout, +250 ml of water). */
export function QuickAddMenu() {
  const t = useT();
  const run = useActionToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const tile = "flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-semibold transition active:scale-[.98] disabled:opacity-60";
  const close = () => setOpen(false);

  return <>
    <button type="button" aria-label={t("home.quick.label")} aria-expanded={open} aria-controls="quick-add-panel" onClick={() => setOpen((value) => !value)} className="quick-add-button" data-quick-add>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden className={`transition-transform duration-200 ${open ? "rotate-45" : ""}`}><path d="M12 5v14M5 12h14" /></svg>
    </button>
    {open && <>
      <button type="button" aria-label={t("home.quick.close")} onClick={close} className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] md:hidden" />
      <div id="quick-add-panel" role="dialog" aria-label={t("home.quick.label")} className="quick-add-panel md:hidden" data-quick-add-panel>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{t("home.quick.label")}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/nutrition" onClick={close} className={tile}><Icon name="meal" color="var(--nutrition)" />{t("home.quick.meal")}</Link>
          <Link href="/humeur#checkin" onClick={close} className={tile}><Icon name="mood" color="var(--mood)" />{t("home.quick.mood")}</Link>
          <Link href="/sport" onClick={close} className={tile}><Icon name="sport" color="var(--sport)" />{t("home.quick.sport")}</Link>
          <button type="button" disabled={pending} onClick={() => startTransition(async () => { await run(() => addWater(250), { success: t("home.todo.waterAdded") }); close(); })} className={tile}><Icon name="water" color="var(--water)" />{t("home.quick.water")} · 250 ml</button>
        </div>
      </div>
    </>}
  </>;
}
