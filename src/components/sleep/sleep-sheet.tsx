"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/toast/toast-provider";
import { saveSleep } from "@/lib/actions/sleep";
import { beforeMidnight, durationMinutes, eveningOf, formatSleep, SLEEP_TAGS, toMinutes, type SleepLog } from "@/lib/sleep";

const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const localeOf = (language: string) => (language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR");

/** The night on a clock from 20:00 to 12:00, as a share of that span: where the bar starts and how wide it is. */
function nightBar(bedtime: string, wakeTime: string) {
  const start = 20 * 60, span = 16 * 60;
  const at = (time: string) => { const minutes = toMinutes(time) ?? 0; return ((minutes - start + 24 * 60) % (24 * 60)) / span; };
  const from = Math.min(1, at(bedtime)), to = Math.min(1, at(wakeTime));
  return { left: from * 100, width: Math.max(2, (to - from) * 100) };
}

/**
 * "How did you sleep?": bedtime, wake-up, quality and what happened, for the night that
 * ended this morning (or `initial` when editing). Opens over the page from the bottom.
 */
export function SleepSheet({ initial, lastLog, onClose }: { initial?: SleepLog | null; lastLog?: SleepLog | null; onClose: () => void }) {
  const { t, language } = useLanguage();
  const s = (key: string, vars?: Record<string, string | number>) => t(`sleep.sheet.${key}`, vars);
  const toast = useToast();
  const [wakeDate] = useState(() => initial?.wake_date ?? localToday());
  const [bedtime, setBedtime] = useState(initial?.bedtime.slice(0, 5) ?? lastLog?.bedtime.slice(0, 5) ?? "23:30");
  const [wakeTime, setWakeTime] = useState(initial?.wake_time.slice(0, 5) ?? lastLog?.wake_time.slice(0, 5) ?? "07:00");
  const [quality, setQuality] = useState(initial?.quality ?? 3);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const minutes = durationMinutes(bedtime, wakeTime);
  const bar = nightBar(bedtime, wakeTime);
  const day = new Intl.DateTimeFormat(localeOf(language), { weekday: "short", day: "numeric" });
  const asDate = (key: string) => day.format(new Date(`${key}T12:00:00`));
  const toggleTag = (tag: string) => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);

  const save = () => startTransition(async () => {
    try {
      const result = await saveSleep({ wakeDate, bedtime, wakeTime, quality, tags });
      if (result.error) { toast.error(s(result.error === "validation" ? "invalid" : result.error === "schema" ? "schema" : "error")); return; }
      toast.success(result.habits?.length ? s("savedHabit", { names: result.habits.join(", ") }) : s("saved"));
      onClose();
    } catch {
      toast.error(s("error"));
    }
  });

  const field = "flex flex-col gap-1.5 rounded-[20px] border p-3.5";
  return <>
    <button type="button" aria-label={s("close")} onClick={onClose} className="fixed inset-0 z-[70] bg-black/45" />
    <section role="dialog" aria-modal="true" aria-labelledby="sleep-sheet-title" className="sleep-sheet" data-sleep-sheet>
      <span aria-hidden className="mx-auto block h-[5px] w-10 rounded-full bg-[#3a3a4a]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#a5b4fc]">{s("night", { from: asDate(eveningOf(wakeDate)), to: asDate(wakeDate) })}</p>
          <h2 id="sleep-sheet-title" className="mt-1 text-2xl font-extrabold text-white">{s("title")}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={s("close")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#23232e] text-[#a1a1b5]">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <label className={field} style={{ background: "rgba(129,140,248,.12)", borderColor: "rgba(129,140,248,.3)" }}>
          <span className="text-xs font-semibold text-[#c7d2fe]">{s("bed")}</span>
          <input type="time" required value={bedtime} onChange={(event) => setBedtime(event.target.value)} className="sleep-time" data-sleep-bed data-big-number />
        </label>
        <label className={field} style={{ background: "rgba(251,191,36,.1)", borderColor: "rgba(251,191,36,.28)" }}>
          <span className="text-xs font-semibold text-[#fde68a]">{s("wake")}</span>
          <input type="time" required value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} className="sleep-time" data-sleep-wake data-big-number />
        </label>
      </div>

      <div className="space-y-2">
        <div className="relative h-3.5 overflow-hidden rounded-full bg-[#23232e]" aria-hidden><span className="absolute inset-y-0 rounded-full" style={{ left: `${bar.left}%`, width: `${bar.width}%`, background: "linear-gradient(90deg, #6366f1, #a78bfa 60%, #fbbf24)" }} /></div>
        <div className="flex justify-between text-[11px] text-[#8a8aa0]" aria-hidden><span>20 h</span><span>0 h</span><span>4 h</span><span>8 h</span><span>12 h</span></div>
        <p className="text-center text-[15px] text-[#ededf2]" data-sleep-total>{minutes === null ? "—" : <><b className="text-[22px] font-black">{formatSleep(minutes)}</b>{" "}{s("total", { duration: "" }).trim()} · <span className={beforeMidnight(bedtime) ? "font-semibold text-[#6ee7b7]" : "text-[#a1a1b5]"}>{s(beforeMidnight(bedtime) ? "beforeMidnight" : "afterMidnight")}</span></>}</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-[#a1a1b5]">{s("quality")}</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => { const active = value === quality; return <button key={value} type="button" aria-pressed={active} onClick={() => setQuality(value)} className="min-h-14 rounded-[14px] border text-[11px] font-semibold" style={active ? { borderColor: "#818cf8", background: "rgba(129,140,248,.18)", color: "#c7d2fe" } : { borderColor: "#2b2b37", color: "#a1a1b5" }}><span className="block text-[17px] font-extrabold text-white">{value}</span>{s(`qualities.${value}`)}</button>; })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-[#a1a1b5]">{s("tagsTitle")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {SLEEP_TAGS.map((tag) => { const active = tags.includes(tag); return <button key={tag} type="button" aria-pressed={active} onClick={() => toggleTag(tag)} className="min-h-9 rounded-full border px-3 text-[12.5px] font-semibold" style={active ? { borderColor: "#818cf8", background: "rgba(129,140,248,.16)", color: "#e0e7ff" } : { borderColor: "#2b2b37", color: "#c6c6d4" }}>{s(`tags.${tag}`)}</button>; })}
        </div>
      </fieldset>

      <button type="button" onClick={save} disabled={pending || minutes === null} className="min-h-14 rounded-[18px] text-base font-extrabold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }} data-sleep-save>{pending ? s("saving") : s("save")}</button>
      <p className="-mt-1.5 text-center text-xs text-[#a1a1b5]">{s("habitHint")} <Link href="/sommeil" onClick={onClose} className="font-semibold text-[#c7d2fe] underline-offset-2 hover:underline">{s("seeAll")}</Link></p>
    </section>
  </>;
}
