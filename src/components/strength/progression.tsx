"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { WeeklyLineChart } from "@/components/charts/weekly-line-chart";
import { formatWeight, muscleColor } from "@/lib/strength";
import type { ExerciseSummary, MuscleWeek } from "@/lib/strength-stats";

const METRICS = [
  { id: "topWeight", label: "Charge max", unit: "kg" },
  { id: "est1RM", label: "1RM estimé", unit: "kg" },
  { id: "volume", label: "Volume", unit: "kg" },
] as const;
type MetricId = (typeof METRICS)[number]["id"];

const day = (d: string) => format(parseISO(d), "d MMM yyyy", { locale: fr });

export function MuscleVolume({ weeklyMuscles }: { weeklyMuscles: MuscleWeek[] }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Séries par muscle cette semaine
      </h2>
      <p className="mb-4 text-xs text-foreground-muted">
        Repère courant pour progresser : environ 10 à 20 séries par muscle et par semaine.
      </p>
      {weeklyMuscles.length === 0 ? (
        <p className="text-sm text-foreground-muted">Aucune série enregistrée cette semaine.</p>
      ) : (
        <ul className="space-y-3">
          {weeklyMuscles.map((m) => {
            const color = muscleColor(m.muscle);
            const diff = m.thisWeekSets - m.lastWeekSets;
            return (
              <li key={m.muscle}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium" style={{ color }}>
                    {m.muscle}
                  </span>
                  <span className="text-foreground-muted">
                    <strong className="text-foreground">{m.thisWeekSets}</strong> séries · {m.thisWeekVolume.toLocaleString("fr-FR")} kg
                    {m.lastWeekSets > 0 && diff !== 0 && (
                      <span style={{ color: diff > 0 ? "var(--success)" : "var(--danger)" }}>
                        {" "}
                        {diff > 0 ? "▲" : "▼"}
                        {Math.abs(diff)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (m.thisWeekSets / 20) * 100)}%`, background: color }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Progression({ exercises }: { exercises: ExerciseSummary[] }) {
  const [selectedKey, setSelectedKey] = useState(exercises[0]?.key ?? "");
  const [metric, setMetric] = useState<MetricId>("est1RM");

  const exercise = exercises.find((e) => e.key === selectedKey) ?? exercises[0];

  const chart = useMemo(() => {
    if (!exercise) return [];
    return exercise.sessions.slice(-30).map((s) => ({
      label: format(parseISO(s.date), "d MMM", { locale: fr }),
      value: s[metric] > 0 ? s[metric] : null,
    }));
  }, [exercise, metric]);

  if (!exercise) {
    return (
      <p className="rounded-2xl border border-dashed border-sport/40 p-8 text-center text-sm text-foreground-muted">
        Ta progression apparaîtra ici après ta première séance de musculation enregistrée avec des séries.
      </p>
    );
  }

  const first1RM = exercise.sessions.find((s) => s.est1RM > 0);
  const last1RM = [...exercise.sessions].reverse().find((s) => s.est1RM > 0);
  const gain = first1RM && last1RM && first1RM !== last1RM ? Math.round((last1RM.est1RM - first1RM.est1RM) * 10) / 10 : null;
  const { maxWeight, best1RM, bestVolume } = exercise.records;
  const activeMetric = METRICS.find((m) => m.id === metric)!;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={exercise.key}
            onChange={(e) => setSelectedKey(e.target.value)}
            aria-label="Exercice"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm font-medium outline-none focus:border-sport"
          >
            {exercises.map((e) => (
              <option key={e.key} value={e.key}>
                {e.name} ({e.sessions.length} séance{e.sessions.length > 1 ? "s" : ""})
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-xl border border-sport/40 bg-surface-muted p-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: metric === m.id ? "var(--sport)" : "transparent",
                  color: metric === m.id ? "var(--on-accent)" : "var(--foreground-muted)",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-1 text-xs" style={{ color: muscleColor(exercise.muscle) }}>
          {exercise.muscle}
          {gain !== null && (
            <span className="text-foreground-muted">
              {" "}
              · 1RM estimé{" "}
              <strong style={{ color: gain >= 0 ? "var(--success)" : "var(--danger)" }}>
                {gain >= 0 ? "+" : ""}
                {gain} kg
              </strong>{" "}
              depuis {day(first1RM!.date)}
            </span>
          )}
        </p>

        {chart.length >= 2 ? (
          <WeeklyLineChart data={chart} color="var(--sport)" unit={activeMetric.unit} />
        ) : (
          <p className="rounded-xl border border-dashed border-sport/40 p-6 text-center text-xs text-foreground-muted">
            Il faut au moins 2 séances avec cet exercice pour tracer une courbe.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "🏆 Charge max",
            value: maxWeight ? `${formatWeight(maxWeight.weight)} kg × ${maxWeight.reps}` : "—",
            hint: maxWeight ? day(maxWeight.date) : "",
          },
          { label: "💪 1RM estimé", value: best1RM ? `${best1RM.value} kg` : "—", hint: best1RM ? day(best1RM.date) : "" },
          {
            label: "📦 Meilleur volume",
            value: bestVolume ? `${bestVolume.value.toLocaleString("fr-FR")} kg` : "—",
            hint: bestVolume ? day(bestVolume.date) : "",
          },
        ].map((r) => (
          <div key={r.label} className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-4">
            <p className="text-xs text-foreground-muted">{r.label}</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: "var(--sport)" }}>
              {r.value}
            </p>
            <p className="text-[11px] text-foreground-muted">{r.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-[1.5px] border-sport/50 bg-surface p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Dernières séances</h2>
        <ul className="space-y-1.5">
          {[...exercise.sessions]
            .reverse()
            .slice(0, 6)
            .map((s) => (
              <li key={s.workoutId} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-xs text-foreground-muted">{day(s.date)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {s.sets.map((x) => (x.weight > 0 ? `${formatWeight(x.weight)}×${x.reps}` : `${x.reps} reps`)).join(" · ")}
                </span>
                <span className="shrink-0 text-xs text-foreground-muted">{s.volume.toLocaleString("fr-FR")} kg</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
