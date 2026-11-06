"use client";

import dynamic from "next/dynamic";

const Reporter = dynamic(() => import("./performance-reporter").then((reporter) => reporter.PerformanceReporter), { ssr: false });

export function PerformanceMetrics() {
  return process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG === "true" ? <Reporter /> : null;
}
