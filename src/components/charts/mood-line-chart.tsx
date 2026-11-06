"use client";

import dynamic from "next/dynamic";
import { ChartPlaceholder, DeferredChart } from "./deferred-chart";

const Plot = dynamic(() => import("./mood-line-chart-plot").then((module) => module.MoodLineChart), { ssr: false, loading: ChartPlaceholder });

export function MoodLineChart({ data }: { data: { label: string; mood: number; energy: number }[] }) {
  return <DeferredChart><Plot data={data} /></DeferredChart>;
}
