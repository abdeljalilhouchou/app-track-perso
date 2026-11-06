"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useId } from "react";

export function WeeklyBarChart({
  data,
  color,
  unit,
}: {
  data: { label: string; value: number }[];
  color: string;
  unit: string;
}) {
  const gradient = `weekly-bar-${useId().replaceAll(":", "")}`;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} /><stop offset="100%" stopColor={color} stopOpacity={0.55} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--surface-muted)" }}
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
        <Bar dataKey="value" fill={`url(#${gradient})`} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
