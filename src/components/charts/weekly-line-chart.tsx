"use client";

import dynamic from "next/dynamic";
import { ChartPlaceholder, DeferredChart } from "./deferred-chart";

const Plot = dynamic(() => import("./weekly-line-chart-plot").then((module) => module.WeeklyLineChart), { ssr: false, loading: ChartPlaceholder });

export function WeeklyLineChart({
  data,
  color,
  unit,
}: {
  data: { label: string; value: number | null }[];
  color: string;
  unit: string;
}) {
  return <DeferredChart><Plot data={data} color={color} unit={unit} /></DeferredChart>;
}
