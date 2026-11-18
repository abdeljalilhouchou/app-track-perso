import type { weekdayAverages } from "@/lib/mood-insights";
import type { comparePeriods, tagEffects } from "@/lib/mood-tags";
import type { Insight } from "@/lib/dashboard";
import type { Vars } from "@/lib/i18n/translate";

type Translator = (path: string, vars?: Vars) => string;

const card = "rounded-2xl border border-border bg-surface p-5";

function Stat({ label, value, unit, delta, tone = "neutral", hint }: { label: string; value: string; unit?: string; delta?: string; tone?: "good" | "bad" | "neutral"; hint?: string }) {
  const color = tone === "good" ? "var(--success)" : tone === "bad" ? "var(--danger)" : "var(--foreground-muted)";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4" data-mood-stat>
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">
        {value}
        {unit && <span className="ms-1 text-sm font-normal text-foreground-muted">{unit}</span>}
      </p>
      {delta && <p className="mt-1 text-xs font-medium" style={{ color }}>{delta}</p>}
      {hint && <p className="mt-1 text-xs text-foreground-muted">{hint}</p>}
    </div>
  );
}

/** Four figures: mood and energy over 30 days against the 30 before, the streak and coverage. */
export function MoodStats({ periods, streak, t }: { periods: ReturnType<typeof comparePeriods>; streak: number; t: Translator }) {
  const delta = (now: number | null, before: number | null): { delta?: string; tone?: "good" | "bad" | "neutral" } => {
    if (now === null || before === null) return {};
    const diff = Math.round((now - before) * 10) / 10;
    if (Math.abs(diff) < 0.1) return { delta: t("mood.v2.deltaSame"), tone: "neutral" };
    return { delta: `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(1)} ${t("mood.v2.vsPrevious")}`, tone: diff > 0 ? "good" : "bad" };
  };
  const { current, previous } = periods;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label={t("mood.v2.statMood")} value={current.mood === null ? "—" : current.mood.toFixed(1)} unit="/ 5" {...delta(current.mood, previous.mood)} />
      <Stat label={t("mood.v2.statEnergy")} value={current.energy === null ? "—" : current.energy.toFixed(1)} unit="/ 5" {...delta(current.energy, previous.energy)} />
      <Stat label={t("mood.v2.statStreak")} value={String(streak)} unit={t("mood.v2.daysUnit")} />
      <Stat label={t("mood.v2.statDays")} value={String(current.days)} hint={t("mood.v2.ofDays", { total: 30 })} />
    </div>
  );
}

/** Factors chosen in check-ins, with how mood on those days compares with the average. */
export function MoodFactors({ effects, t }: { effects: ReturnType<typeof tagEffects>; t: Translator }) {
  const scale = Math.max(1, ...effects.map((effect) => Math.abs(effect.diff)));
  return (
    <section aria-labelledby="mood-factors" className={card} data-mood-factors>
      <h2 id="mood-factors" className="font-semibold">{t("mood.v2.factorsTitle")}</h2>
      <p className="mt-1 text-xs text-foreground-muted">{effects.length ? t("mood.v2.factorsHint") : t("mood.v2.factorsEmpty")}</p>
      {effects.length > 0 && (
        <ul className="mt-4 space-y-3">
          {effects.slice(0, 6).map((effect) => {
            const up = effect.diff >= 0;
            return (
              <li key={effect.tag} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm" data-mood-factor={effect.tag}>
                <span className="truncate font-medium">{t(`mood.v2.tags.${effect.tag}`)}</span>
                {/* A centred bar: right of the middle when the factor lifts the mood, left when it lowers it. */}
                <span className="relative h-2 rounded-full bg-surface-muted" aria-hidden>
                  <span className="absolute inset-y-0 start-1/2 w-px bg-border" />
                  <span
                    className="absolute inset-y-0 rounded-full"
                    style={{
                      background: up ? "var(--success)" : "var(--danger)",
                      width: `${(Math.abs(effect.diff) / scale) * 50}%`,
                      insetInlineStart: up ? "50%" : `${50 - (Math.abs(effect.diff) / scale) * 50}%`,
                    }}
                  />
                </span>
                <span className="text-end text-xs tabular-nums" style={{ color: up ? "var(--success)" : "var(--danger)" }}>
                  {up ? "+" : "−"}{Math.abs(effect.diff).toFixed(1)}
                  <span className="ms-1.5 text-foreground-muted">{t("mood.v2.factorDays", { count: effect.days })}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function WeekdayBars({ data, t }: { data: ReturnType<typeof weekdayAverages>; t: Translator }) {
  const known = data.filter((d) => d.avg !== null);
  const best = known.length ? known.reduce((b, d) => (d.avg! > b.avg! ? d : b)) : null;

  return (
    <section aria-labelledby="mood-weekdays" className={card}>
      <h2 id="mood-weekdays" className="font-semibold">{t("mood.overview.weekdayChartTitle")}</h2>
      <p className="mb-4 mt-1 text-xs text-foreground-muted">
        {best ? t("mood.overview.bestDayHint", { label: best.label, avg: best.avg! }) : t("mood.overview.notEnoughData")}
      </p>
      <div className="flex h-36 items-end gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-foreground-muted">{d.avg ?? "—"}</span>
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${d.avg ? (d.avg / 5) * 100 : 4}%`,
                background: d.avg ? "var(--mood)" : "var(--surface-muted)",
                opacity: best && d.label === best.label ? 1 : 0.5,
              }}
            />
            <span className="text-[10px] font-medium text-foreground-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Links between mood and the rest of the app (sport, protein, sugar, caffeine, water). */
export function MoodInsights({ insights, t }: { insights: Insight[]; t: Translator }) {
  return (
    <section aria-labelledby="mood-links" className={card}>
      <h2 id="mood-links" className="font-semibold">{t("mood.v2.linksTitle")}</h2>
      {insights.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {insights.map((i) => (
            <li key={i.title} className="flex gap-3 py-3 text-sm">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in srgb, ${i.color} 14%, var(--surface))` }}>{i.icon}</span>
              <div className="min-w-0">
                <p className="font-medium">{i.title}</p>
                <p className="mt-0.5 text-foreground-muted">{i.text}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-foreground-muted">{t("mood.overview.insightsEmpty")}</p>
      )}
    </section>
  );
}
