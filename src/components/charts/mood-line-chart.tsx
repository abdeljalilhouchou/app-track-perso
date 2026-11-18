"use client";

import dynamic from "next/dynamic";
import { ChartPlaceholder, DeferredChart } from "./deferred-chart";

const Plot = dynamic(() => import("./mood-line-chart-plot").then((module) => module.MoodLineChart), { ssr: false, loading: ChartPlaceholder });

export function MoodLineChart({ data, labels }: { data: { label: string; mood: number; energy: number }[]; labels?: { mood: string; energy: string } }) {
  return <DeferredChart><Plot data={data} labels={labels} /></DeferredChart>;
}
