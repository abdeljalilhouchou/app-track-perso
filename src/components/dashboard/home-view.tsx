"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { useActionToast } from "@/components/toast/use-action-toast";
import { toggleHabitLog } from "@/lib/actions/habits";
import { addWater } from "@/lib/actions/nutrition";
import { nextActions, type NextAction, type PendingHabit } from "@/lib/home";

const card = "rounded-3xl border border-border bg-surface";
const formatL = (ml: number, locale: string) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(ml / 1000)} L`;
const localeOf = (language: string) => (language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR");

// The reader's hour, not the server's: the server renders with midday, the phone then corrects it.
const subscribeHour = (callback: () => void) => {
  const timer = window.setInterval(callback, 60_000);
  return () => window.clearInterval(timer);
};
const useHour = () => useSyncExternalStore(subscribeHour, () => new Date().getHours(), () => 12);

export type DayBar = { key: "habits" | "meals" | "water" | "mood"; share: number; value: string; muted?: boolean };

export function DayCard({ pct, done, total, bars }: { pct: number; done: number; total: number; bars: DayBar[] }) {
  const { t } = useLanguage();
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const title = !total ? "none" : pct >= 100 ? "great" : pct >= 50 ? "good" : "start";
  const colors = { habits: "var(--habit)", meals: "var(--nutrition)", water: "var(--water)", mood: "var(--mood)" };
  return (
    <section aria-label={t("home.day.label")} className={`${card} space-y-4 p-5`} style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))" }} data-home-day>
      <div className="flex items-center gap-5">
        <div className="relative h-[108px] w-[108px] shrink-0">
          <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden>
            <circle cx="54" cy="54" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="10" />
            <circle cx="54" cy="54" r={radius} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct / 100)} transform="rotate(-90 54 54)" className="transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold leading-none tabular-nums" data-home-pct>{pct} %</span>
            <span className="mt-1 text-[11px] text-foreground-muted">{t("home.day.label")}</span>
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="font-semibold">{t(`home.day.title.${title}`)}</p>
          {total > 0 && <p className="text-sm text-foreground-muted">{t("home.day.count", { done, total })}</p>}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {bars.map((bar) => (
          <div key={bar.key} className="min-w-0 space-y-1.5">
            <p className="truncate text-[11px] text-foreground-muted">{t(`home.day.${bar.key}`)}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, bar.share * 100)}%`, background: colors[bar.key] }} /></div>
            <p className={`truncate text-xs font-semibold tabular-nums ${bar.muted ? "text-foreground-muted" : ""}`}>{bar.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NextActions({ today, habits, moodLogged, waterMl, waterGoal, mealsLogged, sportDone, sportGoal, isoWeekday }: {
  today: string;
  habits: PendingHabit[];
  moodLogged: boolean;
  waterMl: number;
  waterGoal: number;
  mealsLogged: number;
  sportDone: number;
  sportGoal: number;
  isoWeekday: number;
}) {
  const { t, language } = useLanguage();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const hour = useHour();
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [extraWater, setExtraWater] = useState(0);
  const water = waterMl + extraWater;
  const actions = nextActions({ hour, isoWeekday, habits: habits.filter((habit) => !doneIds.includes(habit.id)), moodLogged, waterMl: water, waterGoal, mealsLogged, sportDone, sportGoal });
  const locale = localeOf(language);

  const checkHabit = (habit: PendingHabit) => {
    setDoneIds((ids) => [...ids, habit.id]);
    startTransition(async () => {
      const result = await run(() => toggleHabitLog(habit.id, today), { success: t("home.todo.habitDone", { name: habit.name }), undo: { run: () => toggleHabitLog(habit.id, today) } });
      if (!result || result.error) setDoneIds((ids) => ids.filter((id) => id !== habit.id));
    });
  };
  const drink = () => {
    setExtraWater((ml) => ml + 250);
    startTransition(async () => {
      const result = await run(() => addWater(250), { success: t("home.todo.waterAdded") });
      if (!result || result.error) setExtraWater((ml) => ml - 250);
    });
  };

  const row = (action: NextAction) => {
    const button = "inline-flex min-h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm font-semibold";
    if (action.type === "habit") {
      const { habit } = action;
      return (
        <Row key={`h-${habit.id}`} icon={habit.icon} tint={habit.color} title={habit.name} hint={`${t("home.todo.habitHint", { moment: t(`home.moments.${habit.moment}`) })}${habit.streak > 1 ? ` · ${t("home.todo.streak", { count: habit.streak })}` : ""}`}>
          {habit.kind === "check"
            ? <button type="button" disabled={pending} onClick={() => checkHabit(habit)} className={button} data-home-habit-done={habit.id}>{t("home.todo.done")}</button>
            : <Link href="/habits" className={button}>{t("home.todo.open")}</Link>}
        </Row>
      );
    }
    if (action.type === "mood") return <Row key="mood" icon="🙂" tint="var(--mood)" title={t("home.todo.moodTitle")} hint={t("home.todo.moodHint")}><Link href="/humeur#checkin" className={button}>{t("home.todo.moodCta")}</Link></Row>;
    if (action.type === "water") return <Row key="water" icon="💧" tint="var(--water)" title={t("home.todo.waterTitle", { ml: new Intl.NumberFormat(locale).format(action.missingMl) })} hint={t("home.todo.waterHint", { current: formatL(water, locale), goal: formatL(waterGoal, locale) })}><button type="button" disabled={pending} onClick={drink} className="inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-bold" style={{ background: "var(--water)", color: "#0b0b10" }} data-home-water>{t("home.todo.waterCta")}</button></Row>;
    if (action.type === "meals") return <Row key="meals" icon="🍽️" tint="var(--nutrition)" title={t("home.todo.mealsTitle")} hint={t("home.todo.mealsHint")}><Link href="/nutrition" className={button}>{t("home.todo.mealsCta")}</Link></Row>;
    return <Row key="sport" icon="🏃" tint="var(--sport)" title={t("home.todo.sportTitle", { count: action.missing })} hint={t("home.todo.sportHint", { done: sportDone, goal: sportGoal })}><Link href="/sport" className={button}>{t("home.todo.sportCta")}</Link></Row>;
  };

  return (
    <section aria-labelledby="home-todo" className="space-y-2.5" data-home-todo>
      <h2 id="home-todo" className="font-semibold">{t("home.todo.title")}</h2>
      {actions.length ? <ul className={`${card} divide-y divide-border`}>{actions.map(row)}</ul> : <p className={`${card} p-4 text-sm text-foreground-muted`}>{t("home.todo.allDone")}</p>}
    </section>
  );
}

function Row({ icon, tint, title, hint, children }: { icon: string; tint: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3" data-home-action>
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: `color-mix(in srgb, ${tint} 16%, var(--surface))` }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-foreground-muted">{hint}</p>
      </div>
      {children}
    </li>
  );
}

const ICONS = {
  meal: <path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-2 6 0 8v10" />,
  mood: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01" /></>,
  sport: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
};

export function QuickActions() {
  const { t } = useLanguage();
  const run = useActionToast();
  const [pending, startTransition] = useTransition();
  const tile = "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-xs font-semibold transition hover:bg-surface-muted disabled:opacity-60";
  const icon = (key: keyof typeof ICONS, color: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[key]}</svg>;
  return (
    <section aria-label={t("home.quick.label")} className="grid grid-cols-4 gap-2" data-home-quick>
      <Link href="/nutrition" className={tile}>{icon("meal", "var(--nutrition)")}{t("home.quick.meal")}</Link>
      <Link href="/humeur#checkin" className={tile}>{icon("mood", "var(--mood)")}{t("home.quick.mood")}</Link>
      <Link href="/sport" className={tile}>{icon("sport", "var(--sport)")}{t("home.quick.sport")}</Link>
      <button type="button" disabled={pending} onClick={() => startTransition(async () => void (await run(() => addWater(250), { success: t("home.todo.waterAdded") })))} className={tile}>{icon("water", "var(--water)")}{t("home.quick.water")}</button>
    </section>
  );
}

export type TilesData = {
  habits: { done: number; total: number; joker: boolean };
  meals: { kcal: number; goal: number | null; protein: number; proteinGoal: number | null; logged: number };
  sport: { done: number; goal: number; days: boolean[]; last: string | null };
  mood: { average: number | null; days: (number | null)[] };
};

export function ModuleTiles({ data }: { data: TilesData }) {
  const { t, language } = useLanguage();
  const number = (value: number) => new Intl.NumberFormat(localeOf(language), { maximumFractionDigits: 1 }).format(value);
  const tile = "flex min-w-0 flex-col gap-2.5 rounded-3xl border border-border bg-surface p-4 transition hover:bg-surface-muted";
  const empty = "flex min-w-0 flex-col gap-2 rounded-3xl border border-dashed border-border p-4";
  const head = (label: string) => <span className="flex items-center justify-between text-xs text-foreground-muted">{label}<span aria-hidden className="rtl:rotate-180">›</span></span>;
  const left = data.meals.goal ? data.meals.goal - data.meals.kcal : null;
  return (
    <section aria-label={t("home.tiles.label")} className="grid grid-cols-2 gap-2.5" data-home-tiles>
      {data.habits.total ? (
        <Link href="/habits" className={tile} data-home-tile="habits">
          {head(t("home.tiles.habits"))}
          <span className="text-2xl font-bold tabular-nums">{data.habits.done}<span className="text-sm font-medium text-foreground-muted"> / {data.habits.total}</span></span>
          <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(data.habits.total, 8)}, minmax(0, 1fr))` }} aria-hidden>
            {Array.from({ length: Math.min(data.habits.total, 8) }, (_, i) => <span key={i} className="h-2 rounded" style={{ background: i < data.habits.done ? "var(--habit)" : "var(--surface-muted)" }} />)}
          </span>
          {data.habits.joker && <span className="truncate text-xs" style={{ color: "var(--habit)" }}>{t("home.tiles.joker")}</span>}
        </Link>
      ) : (
        <Link href="/habits" className={empty} data-home-tile="habits"><span className="text-xs text-foreground-muted">{t("home.tiles.habits")}</span><span className="text-sm font-semibold">{t("home.tiles.noHabits")}</span><span className="text-xs text-accent">{t("home.tiles.createFirst")} ›</span></Link>
      )}
      {data.meals.logged ? (
        <Link href="/nutrition" className={tile} data-home-tile="meals">
          {head(t("home.tiles.meals"))}
          <span className="text-2xl font-bold tabular-nums">{number(left !== null ? Math.abs(left) : data.meals.kcal)}<span className="text-sm font-medium text-foreground-muted"> kcal</span></span>
          <span className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden><span className="block h-full rounded-full" style={{ width: `${data.meals.goal ? Math.min(100, (data.meals.kcal / data.meals.goal) * 100) : 100}%`, background: left !== null && left < 0 ? "var(--danger)" : "var(--nutrition)" }} /></span>
          <span className="truncate text-xs text-foreground-muted">{left === null ? t("home.tiles.kcalEaten") : left < 0 ? t("home.tiles.kcalOver") : t("home.tiles.kcalLeft")}{data.meals.proteinGoal ? ` · ${t("home.tiles.protein", { value: number(data.meals.protein), goal: data.meals.proteinGoal })}` : ""}</span>
        </Link>
      ) : (
        <Link href="/nutrition" className={empty} data-home-tile="meals"><span className="text-xs text-foreground-muted">{t("home.tiles.meals")}</span><span className="text-sm font-semibold">{t("home.tiles.noMeals")}</span><span className="text-xs text-accent">{t("home.tiles.addMeal")} ›</span></Link>
      )}
      {data.sport.done || data.sport.last ? (
        <Link href="/sport" className={tile} data-home-tile="sport">
          {head(t("home.tiles.sport"))}
          <span className="text-2xl font-bold tabular-nums">{data.sport.done}<span className="text-sm font-medium text-foreground-muted"> / {data.sport.goal}</span></span>
          <span className="grid grid-cols-7 gap-1" aria-hidden>{data.sport.days.map((on, i) => <span key={i} className="h-2 rounded" style={{ background: on ? "var(--sport)" : "var(--surface-muted)" }} />)}</span>
          {data.sport.last && <span className="truncate text-xs text-foreground-muted">{t("home.tiles.lastSession", { name: data.sport.last })}</span>}
        </Link>
      ) : (
        <Link href="/sport" className={empty} data-home-tile="sport"><span className="text-xs text-foreground-muted">{t("home.tiles.sport")}</span><span className="text-sm font-semibold">{t("home.tiles.noSport")}</span><span className="text-xs text-accent">{t("home.tiles.logSport")} ›</span></Link>
      )}
      {data.mood.average !== null ? (
        <Link href="/humeur" className={tile} data-home-tile="mood">
          {head(t("home.tiles.mood"))}
          <span className="text-2xl font-bold tabular-nums">{number(data.mood.average)}<span className="text-sm font-medium text-foreground-muted"> / 5</span></span>
          <span className="grid h-6 grid-cols-7 items-end gap-1" aria-hidden>{data.mood.days.map((score, i) => <span key={i} className="rounded-sm" style={{ height: `${score ? (score / 5) * 100 : 15}%`, background: score ? "var(--mood)" : "var(--surface-muted)" }} />)}</span>
          <span className="truncate text-xs text-foreground-muted">{t("home.tiles.moodAverage")}</span>
        </Link>
      ) : (
        <Link href="/humeur#checkin" className={empty} data-home-tile="mood"><span className="text-xs text-foreground-muted">{t("home.tiles.mood")}</span><span className="text-sm font-semibold">{t("home.tiles.noMood")}</span><span className="text-xs text-accent">{t("home.tiles.logMood")} ›</span></Link>
      )}
    </section>
  );
}

export function StartCard({ hasHabit, hasGoals, goalsHref }: { hasHabit: boolean; hasGoals: boolean; goalsHref: string }) {
  const { t } = useLanguage();
  const steps = [
    { key: "account", done: true, title: t("home.start.account") },
    { key: "habit", done: hasHabit, title: t("home.start.habit"), hint: t("home.start.habitHint"), href: "/habits", cta: t("home.start.habitCta") },
    { key: "goals", done: hasGoals, title: t("home.start.goals"), hint: t("home.start.goalsHint"), href: goalsHref, cta: t("home.start.goalsCta") },
  ];
  const done = steps.filter((step) => step.done).length;
  const nextKey = steps.find((step) => !step.done)?.key;
  return (
    <section aria-labelledby="home-start" className={`${card} space-y-4 p-5`} style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))" }} data-home-start>
      <div className="flex items-baseline justify-between">
        <h2 id="home-start" className="font-semibold">{t("home.start.title")}</h2>
        <span className="text-xs text-foreground-muted tabular-nums">{done} / {steps.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden><div className="h-full rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.key} className="flex items-center gap-3">
            <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${step.done ? "bg-accent text-on-accent" : "border-2 border-border"}`}>{step.done ? "✓" : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${step.done ? "text-foreground-muted line-through" : ""}`}>{step.title}</p>
              {!step.done && step.hint && <p className="text-xs text-foreground-muted">{step.hint}</p>}
            </div>
            {!step.done && step.href && <Link href={step.href} className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${step.key === nextKey ? "bg-accent text-on-accent" : "border border-border"}`}>{step.cta}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
