import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { addDays, format, getISOWeek, startOfWeek } from "date-fns";
import { WeeklyGoal } from "./weekly-goal";
import { SportIcon, type SportIconName } from "./ui/sport-icons";
import { sportWorkoutHref } from "@/lib/sport-hub";
import { formatSportDate, type loadSportHubData } from "@/lib/sport-hub-data";
import { disciplineOf, type Discipline, type HubRecord, type SportOverview } from "@/lib/sport-overview";
import { formatPace } from "@/lib/running/stats";
import { sportImage } from "@/lib/sport-media";
import { muscleGroupI18nPath } from "@/lib/strength";
import { isCalisthenicsSchemaReady } from "@/lib/calisthenics/config";
import { isRunningSchemaReady } from "@/lib/running/config";
import type { Language } from "@/lib/language";
import type { Vars } from "@/lib/i18n/translate";

type HubData = NonNullable<Awaited<ReturnType<typeof loadSportHubData>>>;
type Translator = (key: string, vars?: Vars) => string;
type Main = Exclude<Discipline, "other">;

const card = "rounded-3xl border border-border bg-surface";
const COLOR: Record<Discipline, string> = { strength: "var(--sport)", calisthenics: "var(--habit)", running: "var(--water)", other: "var(--foreground-muted)" };
/** Readable text in the discipline's color, on light and dark themes. */
const ink = (discipline: Discipline) => `color-mix(in srgb, ${COLOR[discipline]} 62%, var(--foreground))`;
const HREF: Record<Main, string> = { strength: "/sport/musculation", calisthenics: "/sport/calisthenics", running: "/sport/running" };
const READY: Record<Main, () => boolean> = { strength: () => true, calisthenics: isCalisthenicsSchemaReady, running: isRunningSchemaReady };
const SHORT: Record<Main, string> = { strength: "M", calisthenics: "C", running: "R" };

export function SportDashboard({ data, t }: { data: HubData; t: Translator }) {
  const { overview, stats, weeklyGoal, language } = data;
  if (!overview) return null;
  const n = new Intl.NumberFormat(language);
  const h = (key: string, vars?: Vars) => t(`sport.hubDashboard.${key}`, vars);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const range = `${formatSportDate(format(weekStart, "yyyy-MM-dd"), language, { day: "numeric" })}–${formatSportDate(format(addDays(weekStart, 6), "yyyy-MM-dd"), language, { day: "numeric", month: "short" })}`;
  const goalEditor = <details className="group" data-sport-goal>
    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold [&::-webkit-details-marker]:hidden" style={{ color: ink("strength") }}>{h("editGoal")}</summary>
    <div className="mt-2"><WeeklyGoal sessions={overview.week.sessions} goal={weeklyGoal} goalWeeks={stats.records.goalWeeks} /></div>
  </details>;

  const header = <header className="flex items-end justify-between gap-3">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: ink("strength") }}>{h("weekLabel", { week: n.format(getISOWeek(now)), range })}</p>
      <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{t("nav.sport")}</h1>
      {!overview.hasWorkouts && <p className="mt-1.5 text-sm text-foreground-muted">{h("emptyIntro")}</p>}
    </div>
    {overview.hasWorkouts && stats.records.goalWeeks > 0 && <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sport-soft px-2.5 py-1 text-xs font-semibold" style={{ color: ink("strength") }} data-sport-streak>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2c2.5 3.5 6 6 6 11a6 6 0 0 1-12 0c0-2.6 1.3-4.2 2.6-5.3.2 2.3 1.3 3.6 2.6 3.6 0-3.5-1.4-6 .8-9.3z" /></svg>
      {h("streak", { count: n.format(stats.records.goalWeeks) })}
    </span>}
  </header>;

  if (!overview.hasWorkouts) return <div className="mx-auto max-w-2xl space-y-5" data-sport-dashboard data-sport-empty>
    {header}
    <section aria-label={h("goal")} className={`${card} flex items-center gap-4 p-4`}>
      <Ring done={0} goal={weeklyGoal} size={80} n={n} label={h("ringSessions")} />
      <div className="min-w-0"><p className="font-semibold">{h("goalText", { count: n.format(weeklyGoal) })}</p>{goalEditor}</div>
    </section>
    <section aria-labelledby="sport-start-title" className="space-y-3">
      <h2 id="sport-start-title" className="text-[15px] font-semibold">{h("startTitle")}</h2>
      <div className="sport-hub-disciplines space-y-3">
        {([["strength", h("recommended"), h("strengthStart")], ["calisthenics", h("caliTag"), h("caliStart")], ["running", h("runTag"), h("runStart")]] as const).map(([key, tag, detail], index) => (
          <Link key={key} href={HREF[key]} prefetch={false} className="relative flex h-[132px] items-end justify-between gap-3 overflow-hidden rounded-[22px] p-[18px] text-white" style={{ border: index === 0 ? `2px solid ${COLOR[key]}` : "1px solid var(--border)", boxShadow: index === 0 ? `0 12px 30px -16px ${COLOR[key]}` : undefined }} data-sport-start={key}>
            <Image src={sportImage(key, t).src} alt="" fill sizes="(max-width: 672px) 100vw, 672px" className="object-cover" priority={index === 0} />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/10 rtl:bg-gradient-to-l" />
            <span className="relative flex max-w-[240px] flex-col gap-1">
              <span className="self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${COLOR[key]} 25%, rgb(0 0 0 / 0.55))`, color: `color-mix(in srgb, ${COLOR[key]} 70%, white)` }}>{tag}</span>
              <span className="text-xl font-bold">{t(`sport.hub.nav.${key}`)}</span>
              <span className="text-[13px] leading-snug text-white/85">{detail}</span>
            </span>
            <span aria-hidden className="relative grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full" style={index === 0 ? { background: COLOR[key], color: "#062016" } : { background: "rgb(0 0 0 / 0.6)" }}><SportIcon name="chevron" className="sport-chevron h-4 w-4 !text-current" /></span>
          </Link>
        ))}
      </div>
    </section>
    <Link href="/sport/exercises" prefetch={false} className={`${card} flex items-center gap-3 px-4 py-3.5`}>
      <SportIcon name="exercise" className="h-5 w-5 shrink-0 text-foreground-muted" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t("sport.library.title")}</span><span className="block text-xs text-foreground-muted">{h("libraryBody")}</span></span>
      <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0" />
    </Link>
  </div>;

  const { week } = overview;
  const missing = Math.max(0, weeklyGoal - week.sessions);
  return <div className="mx-auto max-w-2xl space-y-6" data-sport-dashboard>
    {header}

    <section aria-label={h("thisWeek")} className={`${card} space-y-5 p-[18px]`} data-sport-week>
      <div className="flex items-center gap-5">
        <Ring done={week.sessions} goal={weeklyGoal} size={96} n={n} label={h("ringSessions")} />
        <dl className="sport-hub-week-stats min-w-0 flex-1 space-y-2.5">
          <Figure label={h("time")} value={duration(week.minutes, n, t)} change={week.minutesChange === null ? null : { value: week.minutesChange, text: duration(Math.abs(week.minutesChange), n, t) }} h={h} />
          <Figure label={h("volumeShort")} value={week.volume === null ? "—" : `${n.format(Math.round(week.volume))} kg`} change={week.volumeChange === null ? null : { value: week.volumeChange, text: `${n.format(Math.abs(week.volumeChange))} %` }} empty={week.volume === null} h={h} />
          <Figure label={h("distance")} value={week.distanceKm === null ? "—" : `${n.format(week.distanceKm)} km`} change={week.distanceChange === null ? null : { value: week.distanceChange, text: `${n.format(Math.abs(week.distanceChange))} km` }} empty={week.distanceKm === null} h={h} />
        </dl>
      </div>
      <div>
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-[13px] font-semibold">{h("weekPlan")}</p>
          <p className="text-xs text-foreground-muted">{missing ? h("goalLeft", { count: n.format(missing) }) : h("goalReached")}</p>
        </div>
        <ol className="grid grid-cols-7 gap-1.5" data-sport-plan>
          {overview.plan.map((day) => <PlanCell key={day.date} day={day} language={language} n={n} h={h} />)}
        </ol>
        <div className="mt-2">{goalEditor}</div>
      </div>
    </section>

    <NextSession overview={overview} t={t} h={h} n={n} />

    {overview.recovery.length > 0 && <section aria-labelledby="sport-recovery-title" className="space-y-2.5" data-sport-recovery>
      <div className="flex items-baseline justify-between gap-3"><h2 id="sport-recovery-title" className="text-[15px] font-semibold">{h("recovery")}</h2><span className="text-xs text-foreground-muted">{h("recoveryScope")}</span></div>
      <ul className={`${card} grid grid-cols-2 gap-3 p-3.5`}>
        {overview.recovery.map((muscle) => {
          const color = muscle.state === "recovering" ? "var(--nutrition)" : muscle.state === "ready" ? "var(--sport)" : "var(--water)";
          const path = muscleGroupI18nPath(muscle.group);
          const when = muscle.days === 0 ? h("workedToday") : muscle.days === 1 ? h("workedYesterday") : h("workedDaysAgo", { count: n.format(muscle.days) });
          return <li key={muscle.group} className="flex min-h-10 min-w-0 items-center gap-2.5">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 20%, transparent)` }} />
            <span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{path ? t(path) : muscle.group}</span><span className="block text-[11px] leading-snug" style={{ color: `color-mix(in srgb, ${color} 70%, var(--foreground))` }}>{h(muscle.state)} · {when}</span></span>
          </li>;
        })}
      </ul>
    </section>}

    {overview.records.length > 0 && <section aria-labelledby="sport-records-title" className="space-y-2.5" data-sport-records>
      <h2 id="sport-records-title" className="text-[15px] font-semibold">{h("records")}</h2>
      <ul className="grid grid-cols-3 gap-2">
        {overview.records.map((record) => <RecordCard key={record.discipline} record={record} language={language} n={n} t={t} h={h} />)}
      </ul>
    </section>}

    <section aria-labelledby="sport-disciplines-title" className="space-y-2.5">
      <h2 id="sport-disciplines-title" className="text-[15px] font-semibold">{t("sport.hub.disciplinesTitle")}</h2>
      <div className={`${card} sport-hub-disciplines overflow-hidden`}>
        {overview.disciplines.map((item, index) => {
          const ready = READY[item.discipline]();
          const max = Math.max(1, ...item.trend);
          const detail = !ready ? h("preparing")
            : item.total === 0 ? h("noSessionYet")
            : item.thisWeek > 0 ? h("thisWeekCount", { count: n.format(item.thisWeek) })
            : h("lastOn", { date: formatSportDate(item.lastDate!, language, { day: "numeric", month: "short" }) });
          return <Link key={item.discipline} href={HREF[item.discipline]} prefetch={false} className={`flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-muted ${index ? "border-t border-border" : ""}`} data-sport-discipline={item.discipline}>
            <span className="relative h-[60px] w-[60px] shrink-0">
              <span className="absolute inset-0 overflow-hidden rounded-2xl" style={{ boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${COLOR[item.discipline]} 55%, transparent)` }}><Image src={sportImage(item.discipline, t).src} alt="" fill sizes="60px" className="object-cover" /></span>
              <span aria-hidden className="absolute -bottom-1 -end-1 grid h-5 w-5 place-items-center rounded-[7px] border-2 border-surface text-[11px] font-extrabold text-[#0b0b10]" style={{ background: COLOR[item.discipline] }}>{SHORT[item.discipline]}</span>
            </span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{t(`sport.hub.nav.${item.discipline}`)}</span><span className="mt-0.5 block truncate text-xs text-foreground-muted">{detail}</span></span>
            {ready && item.total > 0 && <span aria-hidden className="flex h-[26px] shrink-0 items-end gap-0.5" data-sport-trend>
              {item.trend.map((value, week) => <span key={week} className="w-1 rounded-sm" style={{ height: `${Math.max(3, Math.round((value / max) * 26))}px`, background: week === item.trend.length - 1 ? COLOR[item.discipline] : `color-mix(in srgb, ${COLOR[item.discipline]} 40%, var(--surface-muted))` }} />)}
            </span>}
            <SportIcon name="chevron" className="sport-chevron h-3.5 w-3.5 shrink-0" />
          </Link>;
        })}
      </div>
    </section>

    <Challenge challenge={overview.challenge} language={language} n={n} h={h} />

    <section aria-labelledby="sport-recent-title" className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3"><h2 id="sport-recent-title" className="text-[15px] font-semibold">{t("sport.hub.recentTitle")}</h2><Link href="/sport/calendar#sport-calendar-activities" prefetch={false} className="inline-flex min-h-11 items-center text-[13px] font-semibold" style={{ color: ink("strength") }}>{h("allActivities")}</Link></div>
      <ul className={`${card} overflow-hidden`} data-sport-recent>
        {overview.recent.map((workout, index) => {
          const discipline = disciplineOf(workout, data.workoutSetIds);
          return <li key={workout.id} className={index ? "border-t border-border" : ""}>
            <Link href={sportWorkoutHref(workout)} prefetch={false} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-muted">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLOR[discipline] }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{workout.activity}</span><span className="block text-xs text-foreground-muted">{formatSportDate(workout.workout_date, language, { weekday: "short", day: "numeric", month: "short" })}</span></span>
              <bdi className="shrink-0 text-xs tabular-nums text-foreground-muted">{t("sport.hub.sessionMinutes", { minutes: n.format(workout.duration_minutes) })}</bdi>
            </Link>
          </li>;
        })}
      </ul>
    </section>

    <nav aria-label={h("shortcuts")} className="grid grid-cols-4 gap-2" data-sport-shortcuts>
      {([["/sport/calendar", "calendar", t("sport.hub.nav.calendar")], ["/sport/stats", "stats", t("sport.hub.nav.stats")], ["/sport/musculation?tab=program", "program", h("programs")], ["/sport/exercises", "exercise", t("sport.library.library")]] as [string, SportIconName, string][]).map(([href, icon, label]) => (
        <Link key={href} href={href} prefetch={false} className={`${card} flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-xs font-semibold transition-colors hover:bg-surface-muted`}>
          <SportIcon name={icon} className="h-5 w-5 text-foreground-muted" />
          <span className="max-w-full truncate">{label}</span>
        </Link>
      ))}
    </nav>
  </div>;
}

function duration(minutes: number, n: Intl.NumberFormat, t: Translator) {
  return minutes >= 60
    ? t("sport.hubDashboard.hoursMinutes", { hours: n.format(Math.floor(minutes / 60)), minutes: n.format(minutes % 60) })
    : t("sport.hub.sessionMinutes", { minutes: n.format(minutes) });
}

function Ring({ done, goal, size, n, label }: { done: number; goal: number; size: number; n: Intl.NumberFormat; label: string }) {
  const stroke = size > 90 ? 10 : 9;
  const radius = size / 2 - stroke / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const share = goal > 0 ? Math.min(1, done / goal) : 0;
  return <div className="relative shrink-0" style={{ width: size, height: size }} data-sport-ring>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
      {share > 0 && <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--sport)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - share)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <bdi dir="ltr" className="whitespace-nowrap text-2xl font-bold leading-none tabular-nums">{n.format(done)}<span className="text-sm font-medium text-foreground-muted">/{n.format(goal)}</span></bdi>
      <span className="mt-1 text-[11px] text-foreground-muted">{label}</span>
    </div>
  </div>;
}

function Figure({ label, value, change, empty, h }: { label: string; value: string; change: { value: number; text: string } | null; empty?: boolean; h: (key: string, vars?: Vars) => string }) {
  return <div className="flex items-baseline justify-between gap-2">
    <dt className="text-xs text-foreground-muted">{label}</dt>
    <dd className="flex min-w-0 items-baseline gap-2">
      <bdi className="text-base font-bold tabular-nums">{value}</bdi>
      <span className={`text-[11px] font-semibold ${change && change.value > 0 ? "text-success" : "text-foreground-muted"}`}>
        {empty ? h("noFigure") : !change ? "" : change.value === 0 ? h("sameAsLast") : <bdi>{change.value > 0 ? "▲" : "▼"} {change.text}</bdi>}
      </span>
    </dd>
  </div>;
}

function PlanCell({ day, language, n, h }: { day: SportOverview["plan"][number]; language: Language; n: Intl.NumberFormat; h: (key: string, vars?: Vars) => string }) {
  const color = day.discipline ? COLOR[day.discipline] : "var(--sport)";
  const box = day.state === "done" ? { background: color, color: "#062016" }
    : day.state === "today" ? { border: `2px solid var(--sport)`, background: "color-mix(in srgb, var(--sport) 14%, var(--surface))" }
    : day.state === "upcoming" ? { border: "1.5px dashed var(--border)" }
    : { background: "var(--surface-muted)" };
  const note = day.state === "done" ? (day.distanceKm ? `${n.format(day.distanceKm)} km` : day.note) : day.state === "today" ? h("dayToday") : null;
  const weekday = formatSportDate(day.date, language, { weekday: "narrow" });
  const status = day.state === "done" ? h("dayDone") : day.state === "today" ? h("dayToday") : day.state === "rest" ? h("dayRest") : "";
  return <li className="flex min-w-0 flex-col items-center gap-1" aria-label={[formatSportDate(day.date, language, { weekday: "long" }), status, day.state === "done" ? note : null].filter(Boolean).join(" · ")} data-state={day.state}>
    <span className={`text-[11px] ${day.state === "today" ? "font-bold" : "text-foreground-muted"}`} style={day.state === "today" ? { color: ink("strength") } : undefined} aria-hidden>{weekday}</span>
    <span className="grid aspect-square w-full max-w-[42px] place-items-center rounded-xl" style={box} aria-hidden>
      {day.state === "done" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
    </span>
    <span className="block min-h-[13px] w-full truncate text-center text-[10px] leading-tight" style={{ color: day.state === "today" ? ink("strength") : "var(--foreground-muted)" }} aria-hidden>{note}</span>
  </li>;
}

function NextSession({ overview, t, h, n }: { overview: SportOverview; t: Translator; h: (key: string, vars?: Vars) => string; n: Intl.NumberFormat }) {
  const next = overview.next;
  const banner = (children: ReactNode) => <div className="relative -mx-[18px] h-[168px]">
    <Image src={sportImage("strength", t).src} alt="" fill sizes="(max-width: 672px) 100vw, 672px" className="object-cover object-[center_60%]" priority />
    <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(0 0 0 / 0.15) 0%, rgb(0 0 0 / 0.4) 45%, rgb(0 0 0 / 0.85) 100%)" }} />
    <div className="absolute inset-x-[18px] bottom-3 text-white">{children}</div>
  </div>;
  return <section id="sport-next-session" aria-labelledby="sport-next-title" className="flex scroll-mt-6 flex-col gap-3.5 overflow-hidden rounded-3xl px-[18px] pb-[18px]" style={{ background: "color-mix(in srgb, var(--sport) 7%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--sport) 45%, var(--border))" }}>
    {next ? <>
      {banner(<>
        <span className="mb-2 inline-block rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#6ee7b7]">{h("nextEyebrow", { discipline: t("sport.hub.nav.strength") })}</span>
        <h2 id="sport-next-title" className="text-[26px] font-bold leading-tight">{next.template.name}</h2>
        <p className="mt-0.5 text-[13px] text-white/85">{[next.exerciseCount ? h("exerciseCount", { count: n.format(next.exerciseCount) }) : null, next.template.muscle_groups.map((group) => { const path = muscleGroupI18nPath(group); return path ? t(path) : group; }).join(", ") || null].filter(Boolean).join(" · ")}</p>
      </>)}
      {next.restDays !== null && <p className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-2.5 text-[13px]" data-sport-rest>
        <SportIcon name="time" className="h-4 w-4 shrink-0" />
        {next.restDays === 0 ? h("restReasonToday") : h("restReason", { count: n.format(next.restDays) })}
      </p>}
      {next.exercises.length > 0 && <ol className="space-y-2">
        {next.exercises.map((exercise, index) => <li key={index} className="flex justify-between gap-3 text-sm"><span className="min-w-0 truncate">{exercise.name}</span><bdi className="shrink-0 tabular-nums text-foreground-muted">{n.format(exercise.sets)} × {n.format(exercise.reps)}{exercise.weightKg ? ` · ${n.format(exercise.weightKg)} kg` : ""}</bdi></li>)}
        {next.exerciseCount > next.exercises.length && <li className="text-[13px] text-foreground-muted">{h("moreExercises", { count: n.format(next.exerciseCount - next.exercises.length) })}</li>}
      </ol>}
      <Link href="/sport/musculation" prefetch={false} className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl text-base font-bold text-[#062016] transition-transform active:scale-[0.98]" style={{ background: "var(--sport)", boxShadow: "0 10px 28px -12px var(--sport)" }} data-sport-start-session>
        <SportIcon name="play" className="h-[18px] w-[18px]" />{h("startSession")}
      </Link>
      <Link href="/sport/musculation?tab=program" prefetch={false} className="self-center text-[13px] font-semibold" style={{ color: ink("strength") }}>{h("otherSession")}</Link>
    </> : <>
      {banner(<><h2 id="sport-next-title" className="text-[22px] font-bold leading-tight">{h("chooseNext")}</h2></>)}
      <p className="text-sm text-foreground-muted">{h("chooseNextBody")}</p>
      <Link href="/sport/musculation" prefetch={false} className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl text-base font-bold text-[#062016]" style={{ background: "var(--sport)" }}>
        <SportIcon name="plus" className="h-[18px] w-[18px]" />{h("openStrength")}
      </Link>
    </>}
  </section>;
}

function RecordCard({ record, language, n, t, h }: { record: HubRecord; language: Language; n: Intl.NumberFormat; t: Translator; h: (key: string, vars?: Vars) => string }) {
  const value = record.discipline === "strength" ? `${n.format(record.weightKg)} kg`
    : record.discipline === "running" ? `${formatPace(record.paceSeconds)} /km`
    : record.kind === "reps" ? h("recordReps", { count: n.format(record.value) }) : h("recordHold", { count: n.format(record.value) });
  const what = record.discipline === "running" ? h("recordPace") : record.name;
  return <li className="flex min-w-0 flex-col rounded-[18px] border bg-surface p-3" style={{ borderColor: `color-mix(in srgb, ${COLOR[record.discipline]} 35%, var(--border))` }}>
    <span className="self-start rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${COLOR[record.discipline]} 16%, transparent)`, color: ink(record.discipline) }}>{t(`sport.hub.nav.${record.discipline}`)}</span>
    <bdi className="mt-2 text-lg font-bold tabular-nums">{value}</bdi>
    <span className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">{what}</span>
    <span className="mt-1 text-[11px] text-foreground-muted">{formatSportDate(record.date, language, { day: "numeric", month: "short" })}</span>
  </li>;
}

function Challenge({ challenge, language, n, h }: { challenge: SportOverview["challenge"]; language: Language; n: Intl.NumberFormat; h: (key: string, vars?: Vars) => string }) {
  const left = Math.max(0, challenge.goal - challenge.done);
  const share = Math.min(1, challenge.done / challenge.goal);
  const message = !left ? h("challengeDone") : h(challenge.onTrack ? "challengeOnTrack" : "challengeBehind", { count: n.format(left), days: n.format(challenge.daysLeft) });
  return <section aria-labelledby="sport-challenge-title" className={`${card} space-y-2.5 p-4`} data-sport-challenge>
    <div className="flex items-baseline justify-between gap-3">
      <h2 id="sport-challenge-title" className="text-[15px] font-semibold first-letter:uppercase">{h("challenge", { month: formatSportDate(challenge.month, language, { month: "long" }) })}</h2>
      <bdi className="shrink-0 text-[13px] font-bold tabular-nums">{h("challengeCount", { done: n.format(challenge.done), goal: n.format(challenge.goal) })}</bdi>
    </div>
    <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuemin={0} aria-valuemax={challenge.goal} aria-valuenow={challenge.done} aria-label={h("challengeCount", { done: n.format(challenge.done), goal: n.format(challenge.goal) })}>
      <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: "linear-gradient(90deg, var(--sport), color-mix(in srgb, var(--sport) 60%, white))" }} />
    </div>
    <p className="text-xs text-foreground-muted">{message}</p>
  </section>;
}
