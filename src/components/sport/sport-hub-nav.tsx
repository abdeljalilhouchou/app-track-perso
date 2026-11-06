"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/language-provider";
import { useClickOutside } from "@/lib/use-click-outside";
import { SportLink } from "./ui/sport-primitives";
import { SportIcon, type SportIconName } from "./ui/sport-icons";
import { SportSectionNavigation } from "./ui/sport-section-navigation";

const SECTIONS: readonly { id: string; href: string; key: string; icon: SportIconName }[] = [
  { id: "overview", href: "/sport", key: "sport.hub.nav.overview", icon: "activity" },
  { id: "strength", href: "/sport/musculation", key: "sport.hub.nav.strength", icon: "strength" },
  { id: "calisthenics", href: "/sport/calisthenics", key: "sport.hub.nav.calisthenics", icon: "calisthenics" },
  { id: "running", href: "/sport/running", key: "sport.hub.nav.running", icon: "running" },
  { id: "calendar", href: "/sport/calendar", key: "sport.hub.nav.calendar", icon: "calendar" },
  { id: "stats", href: "/sport/stats", key: "sport.hub.nav.stats", icon: "stats" },
  { id: "exercises", href: "/sport/exercises", key: "sport.library.library", icon: "exercise" },
];

export function SportHubNav() {
  const pathname = usePathname();
  const t = useT();
  const picker = useRef<HTMLDetailsElement>(null);
  const close = useCallback(() => { if (picker.current) picker.current.open = false; }, []);
  useClickOutside(picker, close);
  useEffect(close, [pathname, close]);

  // The dashboard owns its discipline cards and quick links. Child routes get
  // one disclosure row instead of a second permanent six-card navigation.
  if (pathname === "/sport") return null;
  const current = SECTIONS.find((section) => section.href !== "/sport" && (pathname === section.href || pathname.startsWith(section.href + "/")));
  const sections = pathname.startsWith("/sport/musculation") ? [...SECTIONS,
    { id: "program", href: "/sport/musculation?tab=program", key: "sport.hubDashboard.programs", icon: "program" as const },
    { id: "history", href: "/sport/musculation?tab=history", key: "sport.hubDashboard.history", icon: "history" as const },
  ] : SECTIONS;

  return <div className="sport-context-navigation" data-sport-context-navigation>
    <SportLink href="/sport" variant="ghost" className="px-2"><SportIcon name="chevron" className="sport-context-back-icon h-4 w-4" />{t("nav.sport")}</SportLink>
    <details ref={picker} className="sport-context-picker" onKeyDown={(event) => {
      if (event.key === "Escape" && picker.current?.open) {
        event.preventDefault(); close(); picker.current.querySelector("summary")?.focus();
      }
    }}>
      <summary className="sport-button sport-button-secondary" aria-label={t("sport.hubDashboard.switchSection")}>
        <SportIcon name={current?.icon ?? "activity"} className="h-4 w-4" /><span>{t(current?.key ?? "nav.sport")}</span><SportIcon name="chevron" className="sport-context-picker-arrow h-3 w-3" />
      </summary>
      <div className="sport-context-menu" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) close(); }}>
        <SportSectionNavigation label={t("sport.hub.navigationLabel")} activeId={current?.id ?? "overview"} items={sections.map((section) => ({ ...section, label: t(section.key) }))} />
      </div>
    </details>
  </div>;
}
