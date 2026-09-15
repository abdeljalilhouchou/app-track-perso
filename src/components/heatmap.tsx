import { eachDayOfInterval, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";

type HeatmapProps = {
  /** Map of "yyyy-MM-dd" -> intensity from 0 (none) to 1 (max) */
  values: Record<string, number>;
  color: string;
  weeks?: number;
};

export function Heatmap({ values, color, weeks = 18 }: HeatmapProps) {
  const today = new Date();
  const rangeStart = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const columns: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  function cellStyle(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const v = values[key] ?? 0;
    if (v <= 0) return { background: "var(--surface-muted)" };
    const alpha = 0.25 + Math.min(v, 1) * 0.75;
    return { background: color, opacity: alpha };
  }

  return (
    <div className="flex gap-1 overflow-x-auto py-1">
      {columns.map((col, i) => (
        <div key={i} className="flex flex-col gap-1">
          {col.map((day) => (
            <div
              key={day.toISOString()}
              title={format(day, "d MMM yyyy")}
              className="h-3 w-3 rounded-[3px]"
              style={{ ...cellStyle(day), border: day > today ? "none" : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
