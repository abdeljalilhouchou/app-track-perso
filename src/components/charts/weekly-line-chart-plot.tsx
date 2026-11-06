"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeeklyLineChart({
  data,
  color,
  unit,
}: {
  data: { label: string; value: number | null }[];
  color: string;
  unit: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--foreground)",
            boxShadow: "var(--sport-card-shadow, none)",
          }}
          formatter={(value) => [`${value} ${unit}`, ""]}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
