import { TiltCard } from "@/components/ui/tilt-card";
import type { RecapMetric, WeekRecap as WeekRecapData } from "@/lib/dashboard";

function Delta({ metric, unit, neutral = false }: { metric: RecapMetric; unit: string; neutral?: boolean }) {
  if (metric.current === null || metric.previous === null) {
    return <p className="mt-1 text-xs text-foreground-muted">Pas de comparaison</p>;
  }
  const diff = Math.round((metric.current - metric.previous) * 10) / 10;
  if (diff === 0) return <p className="mt-1 text-xs text-foreground-muted">= semaine dernière</p>;

  const color = neutral ? "var(--foreground-muted)" : diff > 0 ? "var(--success)" : "var(--danger)";
  return (
    <p className="mt-1 text-xs" style={{ color }}>
      {diff > 0 ? "▲ +" : "▼ "}
      {diff}
      {unit} <span className="text-foreground-muted">vs semaine dernière</span>
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

export function WeekRecap({ recap }: { recap: WeekRecapData }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Bilan de la semaine
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Habitudes réussies"
          color="var(--habit)"
          value={recap.habitsRate.current === null ? "—" : `${recap.habitsRate.current}%`}
        >
          <Delta metric={recap.habitsRate} unit=" pts" />
        </Tile>
        <Tile label="Sport" color="var(--sport)" value={`${recap.sportMinutes.current ?? 0} min`}>
          <Delta metric={recap.sportMinutes} unit=" min" />
        </Tile>
        <Tile
          label="Humeur moyenne"
          color="var(--mood)"
          value={recap.moodAvg.current === null ? "—" : `${recap.moodAvg.current} / 5`}
        >
          <Delta metric={recap.moodAvg} unit="" />
        </Tile>
        <Tile
          label="Calories / jour"
          color="var(--nutrition)"
          value={recap.kcalAvg.current === null ? "—" : `${recap.kcalAvg.current} kcal`}
        >
          <Delta metric={recap.kcalAvg} unit=" kcal" neutral />
        </Tile>
      </div>
    </div>
  );
}
