"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPace } from "@/lib/running/stats";
import type { Language } from "@/lib/language";

const tick = { fontSize: 11, fill: "var(--foreground-muted)" };
const tooltip = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

export function RunningDistanceChart({ data, unit, language }: { data: { label: string; value: number }[]; unit: string; language: Language }) {
  const formatter = new Intl.NumberFormat(language === "ar" ? "ar" : language === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 2 });
  return <ResponsiveContainer width="100%" height={224}>
    <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
      <YAxis tick={tick} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={tooltip} formatter={(value) => [`${formatter.format(Number(value))} ${unit}`, ""]} />
      <Line type="monotone" dataKey="value" stroke="var(--sport)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--sport)" }} />
    </LineChart>
  </ResponsiveContainer>;
}

export function RunningPaceChart({ data, unit, label }: { data: { label: string; pace: number }[]; unit: string; label: string }) {
  return <ResponsiveContainer width="100%" height={224}>
    <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
      <YAxis reversed tickFormatter={(value) => formatPace(Number(value))} tick={tick} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={tooltip} formatter={(value) => [`${formatPace(Number(value))} ${unit}`, label]} />
      <Line type="monotone" dataKey="pace" stroke="var(--sport)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--sport)" }} />
    </LineChart>
  </ResponsiveContainer>;
}
