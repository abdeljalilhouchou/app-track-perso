import { TiltCard } from "@/components/ui/tilt-card";
import type { RecapMetric, WeekRecap as WeekRecapData } from "@/lib/dashboard";

type Translator = (path: string, vars?: Record<string, string | number>) => string;

function Delta({ metric, unit, neutral = false, t }: { metric: RecapMetric; unit: string; neutral?: boolean; t: Translator }) {
  if (metric.current === null || metric.previous === null) {
    return <p className="mt-1 text-xs text-foreground-muted">{t("dashboard.weekRecap.noComparison")}</p>;
  }
  const diff = Math.round((metric.current - metric.previous) * 10) / 10;
  if (diff === 0) return <p className="mt-1 text-xs text-foreground-muted">{t("dashboard.weekRecap.sameAsLastWeek")}</p>;

  const color = neutral ? "var(--foreground-muted)" : diff > 0 ? "var(--success)" : "var(--danger)";
  return (
    <p className="mt-1 text-xs" style={{ color }}>
      {diff > 0 ? "▲ +" : "▼ "}
      {diff}
      {unit} <span className="text-foreground-muted">{t("dashboard.weekRecap.vsLastWeek")}</span>
    </p>
  );
}

function Tile({
  label,
  color,
  value,
  children,
}: {
  label: string;
  color: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TiltCard
      className="rounded-2xl border-[1.5px] bg-surface p-5"
      style={{ borderColor: `color-mix(in srgb, ${color} 50%, var(--border))` }}
    >
      <p className="text-sm text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color }}>
        {value}
      </p>
      {children}
    </TiltCard>
  );
}

export function WeekRecap({ recap, title, t }: { recap: WeekRecapData; title: string; t: Translator }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("dashboard.weekRecap.habitsSuccess")}
          color="var(--habit)"
          value={recap.habitsRate.current === null ? "—" : `${recap.habitsRate.current}%`}
        >
          <Delta metric={recap.habitsRate} unit=" pts" t={t} />
        </Tile>
        <Tile label={t("dashboard.weekRecap.sport")} color="var(--sport)" value={`${recap.sportMinutes.current ?? 0} min`}>
          <Delta metric={recap.sportMinutes} unit=" min" t={t} />
        </Tile>
        <Tile
          label={t("dashboard.weekRecap.moodAvg")}
          color="var(--mood)"
          value={recap.moodAvg.current === null ? "—" : `${recap.moodAvg.current} / 5`}
        >
          <Delta metric={recap.moodAvg} unit="" t={t} />
        </Tile>
        <Tile
          label={t("dashboard.weekRecap.kcalPerDay")}
          color="var(--nutrition)"
          value={recap.kcalAvg.current === null ? "—" : `${recap.kcalAvg.current} kcal`}
        >
          <Delta metric={recap.kcalAvg} unit=" kcal" neutral t={t} />
        </Tile>
      </div>
    </div>
  );
}
