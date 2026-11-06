"use client";

import dynamic from "next/dynamic";
import { ChartPlaceholder, DeferredChart } from "./deferred-chart";

const Plot = dynamic(() => import("./weekly-bar-chart-plot").then((module) => module.WeeklyBarChart), { ssr: false, loading: ChartPlaceholder });

export function WeeklyBarChart({
  data,
  color,
  unit,
}: {
  data: { label: string; value: number }[];
  color: string;
  unit: string;
}) {
  return <DeferredChart><Plot data={data} color={color} unit={unit} /></DeferredChart>;
}
