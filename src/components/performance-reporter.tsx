"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { currentRouteMeasurement, finishRouteMeasurement } from "@/lib/performance/navigation";

const report: Parameters<typeof useReportWebVitals>[0] = ({ name, value, rating }) => {
  console.info("[track-perso:vitals]", { name, value, rating });
};

export function PerformanceReporter() {
  useReportWebVitals(report);
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    let first = 0;
    let second = 0;
    const check = () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      const measurement = currentRouteMeasurement();
      if (!measurement) return;
      // Allow React to commit and the loading boundary to disappear. The first
      // shell paint is not the completion of a route's data loading.
      first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          if (`${location.pathname}${location.search}` !== measurement.target || main.querySelector("[data-route-loading]")) return;
          finishRouteMeasurement(measurement);
        });
      });
    };
    const observer = new MutationObserver(check);
    observer.observe(main, { childList: true, subtree: true });
    window.addEventListener("track-perso:navigation", check);
    window.addEventListener("popstate", check);
    check();
    return () => {
      observer.disconnect();
      window.removeEventListener("track-perso:navigation", check);
      window.removeEventListener("popstate", check);
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return null;
}
