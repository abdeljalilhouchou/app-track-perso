import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TiltCard } from "@/components/ui/tilt-card";
import type { weekdayAverages, moodSummary } from "@/lib/mood-insights";
import type { Insight } from "@/lib/dashboard";

const EMOJI = ["", "😞", "😕", "😐", "🙂", "😄"];

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <TiltCard
      className="rounded-2xl border-[1.5px] bg-surface p-5"
      style={{ borderColor: "color-mix(in srgb, var(--mood) 50%, var(--border))" }}
    >
      <p className="text-sm text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--mood)" }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-foreground-muted">{hint}</p>}
    </TiltCard>
  );
}

export function MoodTiles({ summary }: { summary: ReturnType<typeof moodSummary> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Humeur moyenne (30 j)"
        value={summary.mood === null ? "—" : `${summary.mood} / 5`}
        hint={summary.mood === null ? undefined : EMOJI[Math.round(summary.mood)]}
      />
      <Tile label="Énergie moyenne" value={summary.energy === null ? "—" : `${summary.energy} / 5`} />
      <Tile
        label="Meilleure journée"
        value={summary.best ? `${EMOJI[summary.best.mood_score]} ${summary.best.mood_score}/5` : "—"}
        hint={summary.best ? format(parseISO(summary.best.entry_date), "EEEE d MMMM", { locale: fr }) : undefined}
      />
      <Tile label="Série de notation" value={`${summary.streak} j`} hint={`${summary.count} humeurs notées au total`} />
    </div>
  );
}

export function WeekdayBars({ data }: { data: ReturnType<typeof weekdayAverages> }) {
  const known = data.filter((d) => d.avg !== null);
  const best = known.length ? known.reduce((b, d) => (d.avg! > b.avg! ? d : b)) : null;

  return (
    <div className="rounded-2xl border-[1.5px] border-mood/50 bg-surface p-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Humeur par jour de la semaine</h2>
      <p className="mb-4 text-xs text-foreground-muted">
        {best ? `Ton meilleur jour : ${best.label} (${best.avg}/5).` : "Pas encore assez de données."}
      </p>
      <div className="flex h-36 items-end gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-foreground-muted">{d.avg ?? "—"}</span>
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${d.avg ? (d.avg / 5) * 100 : 4}%`,
                background: d.avg ? "var(--mood)" : "var(--surface-muted)",
                opacity: best && d.label === best.label ? 1 : 0.55,
              }}
            />
            <span className="text-[10px] font-medium text-foreground-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MoodInsights({ insights }: { insights: Insight[] }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Ce qui influence ton humeur
      </h2>
      {insights.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {insights.map((i) => (
            <div
              key={i.title}
              className="rounded-2xl border-[1.5px] p-5 text-sm"
              style={{
                borderColor: `color-mix(in srgb, ${i.color} 50%, var(--border))`,
                background: `color-mix(in srgb, ${i.color} 8%, var(--surface))`,
              }}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: i.color }}>
                {i.icon} {i.title}
              </p>
              {i.text}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-mood/40 p-5 text-sm text-foreground-muted">
          Continue à noter ton humeur, tes repas, ton eau et ton sport : les liens apparaîtront ici dès qu&apos;il y aura
          au moins 2 jours de chaque côté.
        </p>
      )}
    </div>
  );
}
