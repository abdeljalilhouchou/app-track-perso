import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { successRate } from "@/lib/habit-insights";

type Habit = { id: string; name: string; icon: string; color: string; scheduled_days: number[]; created_at: string };

/** Success rate of each habit over the current month, compared with the previous one. */
export function HabitsMonthly({ habits, logsByHabit }: { habits: Habit[]; logsByHabit: Map<string, Set<string>> }) {
  const now = new Date();
  const thisStart = startOfMonth(now);
  const lastStart = startOfMonth(subMonths(now, 1));
  const lastEnd = endOfMonth(lastStart);

  const rows = habits
    .map((h) => {
      const set = logsByHabit.get(h.id) ?? new Set<string>();
      const cur = successRate(set, h.scheduled_days, thisStart, now);
      const prev = successRate(set, h.scheduled_days, lastStart, lastEnd);
      return { h, cur, prev };
    })
    .filter((r) => r.cur.expected > 0)
    .sort((a, b) => b.cur.rate - a.cur.rate);

  const totalExpected = rows.reduce((s, r) => s + r.cur.expected, 0);
  const totalDone = rows.reduce((s, r) => s + r.cur.completed, 0);
  const overall = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 0;

  return (
    <div className="rounded-2xl border-[1.5px] border-habit/50 bg-surface p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Bilan de {format(now, "MMMM", { locale: fr })}
          </h2>
          <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--habit)" }}>
            {overall}%{" "}
            <span className="text-sm font-normal text-foreground-muted">
              · {totalDone}/{totalExpected} jours prévus réussis
            </span>
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-foreground-muted">Pas encore de jour prévu ce mois-ci.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ h, cur, prev }) => {
            const diff = prev.expected > 0 ? cur.rate - prev.rate : null;
            return (
              <li key={h.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium">
                    {h.icon} {h.name}
                  </span>
                  <span className="shrink-0 text-foreground-muted">
                    {cur.completed}/{cur.expected} · <strong className="text-foreground">{cur.rate}%</strong>
                    {diff !== null && diff !== 0 && (
                      <span style={{ color: diff > 0 ? "var(--success)" : "var(--danger)" }}>
                        {" "}
                        {diff > 0 ? "▲" : "▼"}
                        {Math.abs(diff)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full" style={{ width: `${cur.rate}%`, background: h.color }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-foreground-muted">Les flèches comparent au mois précédent.</p>
    </div>
  );
}
