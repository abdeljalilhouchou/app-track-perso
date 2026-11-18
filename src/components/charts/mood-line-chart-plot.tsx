"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MoodLineChart({ data, labels = { mood: "Humeur", energy: "Énergie" } }: { data: { label: string; mood: number; energy: number }[]; labels?: { mood: string; energy: string } }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mood)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--mood)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          minTickGap={12}
          tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="mood" stroke="var(--mood)" strokeWidth={2} fill="url(#moodFill)" name={labels.mood} />
        <Area type="monotone" dataKey="energy" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 3" fill="none" name={labels.energy} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
