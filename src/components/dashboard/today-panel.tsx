"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toggleHabitLog } from "@/lib/actions/habits";
import { quickLogMood } from "@/lib/actions/mood";
import { addWater } from "@/lib/actions/nutrition";
import { ConfettiBurst } from "@/components/ui/confetti-burst";

type TodayHabit = { id: string; icon: string; name: string; color: string; done: boolean };

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

function HabitRing({ done, total }: { done: number; total: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="6" />
      <motion.circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--habit)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c * (1 - pct) }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
        {done}/{total}
      </text>
    </svg>
  );
}

export function TodayPanel({
  date,
  habits,
  moodToday,
  waterMl,
  drinksMl,
  waterGoalMl,
}: {
  date: string;
  habits: TodayHabit[];
  moodToday: number | null;
  waterMl: number;
  drinksMl: number;
  waterGoalMl: number;
}) {
  const [, startTransition] = useTransition();
  const [burst, setBurst] = useState(0);

  const [doneMap, toggleOptimistic] = useOptimistic(
    Object.fromEntries(habits.map((h) => [h.id, h.done])) as Record<string, boolean>,
    (state, id: string) => ({ ...state, [id]: !state[id] })
  );
  const [mood, setMoodOptimistic] = useOptimistic(moodToday, (_, value: number) => value as number | null);
  const [water, addWaterOptimistic] = useOptimistic(waterMl, (state, add: number) => Math.max(0, state + add));

  const doneCount = habits.filter((h) => doneMap[h.id]).length;
  const totalWater = water + drinksMl;
  const waterPct = Math.min(100, Math.round((totalWater / waterGoalMl) * 100));

  function toggle(habit: TodayHabit) {
    const willBeDone = !doneMap[habit.id];
    if (willBeDone && doneCount + 1 === habits.length) setBurst((b) => b + 1);
    startTransition(async () => {
      toggleOptimistic(habit.id);
      await toggleHabitLog(habit.id, date);
    });
  }

  return (
    <div className="grid gap-4 rounded-2xl border-[1.5px] border-accent/40 bg-surface p-5 lg:grid-cols-3">
      <ConfettiBurst trigger={burst} />

      <div>
        <div className="mb-3 flex items-center gap-3">
          <HabitRing done={doneCount} total={habits.length} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Habitudes du jour</p>
            <p className="text-xs text-foreground-muted">
              {habits.length === 0
                ? "Aucune habitude prévue aujourd'hui"
                : doneCount === habits.length
                  ? "Tout est fait, bravo ! 🎉"
                  : `${habits.length - doneCount} restante${habits.length - doneCount > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {habits.map((h) => {
            const done = doneMap[h.id];
            return (
              <li key={h.id}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggle(h)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-surface-muted px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted/70"
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-[11px] font-bold text-white transition-colors"
                    style={{ borderColor: h.color, background: done ? h.color : "transparent" }}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span>{h.icon}</span>
                  <span className={`min-w-0 flex-1 truncate ${done ? "text-foreground-muted line-through" : ""}`}>
                    {h.name}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
        {habits.length === 0 && (
          <Link href="/habits" className="text-xs font-medium text-accent hover:underline">
            Gérer mes habitudes
          </Link>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Humeur du jour</p>
        <p className="mb-3 text-xs text-foreground-muted">
          {mood ? "Touche pour modifier." : "Pas encore notée — comment tu te sens ?"}
        </p>
        <div className="flex gap-2">
          {MOODS.map((m) => {
            const selected = mood === m.value;
            return (
              <motion.button
                key={m.value}
                type="button"
                whileTap={{ scale: 0.88 }}
                animate={selected ? { scale: [1, 1.25, 1.1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                onClick={() =>
                  startTransition(async () => {
                    setMoodOptimistic(m.value);
                    await quickLogMood(date, m.value);
                  })
                }
                aria-label={`Humeur ${m.value} sur 5`}
                className="flex h-11 w-11 items-center justify-center rounded-xl border text-2xl transition-colors"
                style={{
                  borderColor: selected ? "var(--mood)" : "color-mix(in srgb, var(--mood) 35%, var(--border))",
                  background: selected ? "var(--mood-soft)" : "transparent",
                }}
              >
                {m.emoji}
              </motion.button>
            );
          })}
        </div>
        <Link href="/humeur" className="mt-3 inline-block text-xs font-medium text-accent hover:underline">
          Ajouter énergie et notes
        </Link>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">💧 Hydratation</p>
          <span className="text-sm">
            <span className="font-semibold">{totalWater}</span> / {waterGoalMl} ml
          </span>
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--water)" }}
            initial={false}
            animate={{ width: `${waterPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[250, 330, 500].map((ml) => (
            <motion.button
              key={ml}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() =>
                startTransition(async () => {
                  addWaterOptimistic(ml);
                  await addWater(ml);
                })
              }
              className="rounded-full border border-water/40 px-3 py-1.5 text-xs font-medium transition-colors hover:border-water hover:text-water"
            >
              + {ml} ml
            </motion.button>
          ))}
        </div>
        {drinksMl > 0 && (
          <p className="mt-2 text-[11px] text-foreground-muted">dont {drinksMl} ml de boissons du journal</p>
        )}
      </div>
    </div>
  );
}
