"use client";

import { useState } from "react";
import { MUSCLE_GROUPS, exerciseKey, muscleColor } from "@/lib/strength";
import type { CatalogItem } from "@/components/strength/types";

/** Search the exercise catalog, or create a new exercise on the fly with its muscle group. */
export function ExercisePicker({
  catalog,
  excludedKeys = [],
  defaultMuscle = "Pectoraux",
  label = "Ajouter un exercice",
  onPick,
}: {
  catalog: CatalogItem[];
  excludedKeys?: string[];
  defaultMuscle?: string;
  label?: string;
  onPick: (name: string, muscle: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState(defaultMuscle);

  const q = query.trim().toLowerCase();
  const matches = q
    ? catalog.filter((c) => c.name.toLowerCase().includes(q) && !excludedKeys.includes(exerciseKey(c.name))).slice(0, 6)
    : [];
  const exact = catalog.some((c) => exerciseKey(c.name) === exerciseKey(query));

  function pick(name: string, m: string) {
    onPick(name.trim(), m);
    setQuery("");
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher ou créer un exercice..."
        className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm outline-none focus:border-sport focus:ring-2 focus:ring-sport/30"
      />
      {q && (
        <ul className="mt-2 space-y-1 rounded-xl border border-sport/40 bg-surface p-1.5">
          {matches.map((c) => (
            <li key={c.name}>
              <button
                type="button"
                onClick={() => pick(c.name, c.muscle)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-muted"
              >
                <span>{c.name}</span>
                <span className="text-xs" style={{ color: muscleColor(c.muscle) }}>
                  {c.muscle}
                </span>
              </button>
            </li>
          ))}
          {!exact && (
            <li className="flex items-center gap-2 px-1.5 py-1">
              <select
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                aria-label="Groupe musculaire"
                className="rounded-lg border border-border bg-surface-muted px-2 py-1.5 text-xs outline-none"
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => pick(query, muscle)}
                className="flex-1 rounded-lg border border-dashed border-sport/50 px-2.5 py-1.5 text-left text-sm text-sport transition hover:bg-sport-soft"
              >
                + Créer « {query.trim()} »
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
