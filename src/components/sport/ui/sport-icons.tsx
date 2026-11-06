import type { ReactNode } from "react";
import { ActivityIcon, CalendarIcon, ChartIcon, DumbbellIcon, RunIcon } from "@/components/ui/nav-icons";

const paths = {
  anatomy: <><circle cx="12" cy="4" r="2" /><path d="M8 8 5 10 3 16m13-8 3 2 2 6M8 8l1 6-2 7m9-13-1 6 2 7M9 14h6M12 8v6m-4-5 4 2 4-2" /></>,
  calisthenics: <><circle cx="12" cy="6" r="2" /><path d="M4 3v5l5 3v4l-3 6m14-18v5l-5 3v4l3 6M9 11h6M9 15h6" /></>,
  program: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
  exercise: <><path d="m7 5 4-2 2 4-4 2-2-4Zm4 14 4-2 2 4-4 2-2-4ZM4 10l3-1 7 6 3-1 3 4M10 8l4 4 4-2" /></>,
  time: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 2v3m6 1 2-2" /></>,
  volume: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
  trophy: <><path d="M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-5 3h10m-8-3h6v3" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>,
  alert: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3v.1" /></>,
  retry: <><path d="M3 5v5h5m-4-1a8 8 0 1 1 1 9" /></>,
  history: <><path d="M3 4v6h6m-5-1a9 9 0 1 1 0 7M12 7v5l3 2" /></>,
  play: <path d="m8 4 12 8-12 8V4Z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
} satisfies Record<string, ReactNode>;

export type SportIconName = keyof typeof paths | "strength" | "running" | "calendar" | "stats" | "activity";

export function SportIcon({ name, className = "h-5 w-5" }: { name: SportIconName; className?: string }) {
  const existing = { strength: DumbbellIcon, running: RunIcon, calendar: CalendarIcon, stats: ChartIcon, activity: ActivityIcon };
  if (name in existing) {
    const Icon = existing[name as keyof typeof existing];
    return <span aria-hidden="true" className="inline-flex shrink-0"><Icon className={className} /></span>;
  }
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name as keyof typeof paths]}</svg>;
}
