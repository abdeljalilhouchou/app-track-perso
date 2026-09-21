/** Daily sugar intake vs the user's personal limit. */
export function SugarMeter({ sugarG, limitG }: { sugarG: number; limitG: number }) {
  const over = sugarG > limitG;
  const pct = Math.min(100, Math.round((sugarG / limitG) * 100));
  const color = over ? "var(--danger)" : "var(--weight)";

  return (
    <div className="rounded-2xl border-[1.5px] border-weight/50 bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">🍬 Sucres</p>
        <span className="text-sm">
          <span className="font-semibold" style={{ color: over ? "var(--danger)" : "var(--foreground)" }}>
            {sugarG}
          </span>{" "}
          / {limitG} g
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-2 text-[11px] text-foreground-muted">
        {over
          ? `Tu dépasses ta limite de ${sugarG - limitG} g aujourd'hui.`
          : `Il te reste ${Math.round((limitG - sugarG) * 10) / 10} g. Limite personnelle modifiable dans l'onglet Journal.`}
      </p>
    </div>
  );
}
