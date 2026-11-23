"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/components/language-provider";
import { useActionToast } from "@/components/toast/use-action-toast";
import { addWater } from "@/lib/actions/nutrition";
import { SleepSheet } from "@/components/sleep/sleep-sheet";

const PATHS = {
  night: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  mood: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
  food: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
};
const Icon = ({ name, color }: { name: keyof typeof PATHS; color: string }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{PATHS[name]}</svg>;

/** The centre "+" of the floating menu: log last night, note the mood, add a food, or +250 ml of water. */
export function QuickAddMenu() {
  const t = useT();
  const run = useActionToast();
  const [open, setOpen] = useState(false);
  const [sleep, setSleep] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const tile = "flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-surface px-2 text-center text-sm font-bold transition active:scale-[.98] disabled:opacity-60";
  const hint = "text-[11px] font-medium text-foreground-muted";
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
          <button type="button" onClick={() => { close(); setSleep(true); }} className={tile} style={{ borderColor: "color-mix(in srgb, #818cf8 40%, var(--border))", background: "color-mix(in srgb, #818cf8 10%, var(--surface))" }} data-quick-sleep><Icon name="night" color="#818cf8" />{t("sleep.quick.night")}<span className={hint}>{t("sleep.quick.nightHint")}</span></button>
          <Link href="/humeur#checkin" onClick={close} className={tile}><Icon name="mood" color="var(--mood)" />{t("home.quick.mood")}<span className={hint}>{t("sleep.quick.moodHint")}</span></Link>
          <Link href="/nutrition?add=1" onClick={close} className={tile}><Icon name="food" color="var(--nutrition)" />{t("sleep.quick.food")}<span className={hint}>{t("sleep.quick.foodHint")}</span></Link>
          <button type="button" disabled={pending} onClick={() => startTransition(async () => { await run(() => addWater(250), { success: t("home.todo.waterAdded") }); close(); })} className={tile}><Icon name="water" color="var(--water)" />{t("home.quick.water")}<span className={hint}>{t("sleep.quick.waterHint")}</span></button>
        </div>
      </div>
    </>}
    {sleep && <SleepSheet onClose={() => setSleep(false)} />}
  </>;
}
