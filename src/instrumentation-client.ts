import { startRouteMeasurement } from "@/lib/performance/navigation";

export function onRouterTransitionStart(url: string) {
  startRouteMeasurement(url);
}
