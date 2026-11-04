"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/language-provider";
import { CalendarIcon, ChartIcon, DumbbellIcon, HomeIcon, RunIcon, SparkleIcon } from "@/components/ui/nav-icons";

const SECTIONS = [
  { href: "/sport", key: "sport.hub.nav.overview", Icon: HomeIcon },
  { href: "/sport/musculation", key: "sport.hub.nav.strength", Icon: DumbbellIcon },
  { href: "/sport/calisthenics", key: "sport.hub.nav.calisthenics", Icon: SparkleIcon },
  { href: "/sport/running", key: "sport.hub.nav.running", Icon: RunIcon },
  { href: "/sport/calendar", key: "sport.hub.nav.calendar", Icon: CalendarIcon },
  { href: "/sport/stats", key: "sport.hub.nav.stats", Icon: ChartIcon },
] as const;

export function SportHubNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav aria-label={t("sport.hub.navigationLabel")}>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {SECTIONS.map(({ href, key, Icon }) => {
          const active = href === "/sport" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-[10px] font-medium leading-tight transition-colors sm:text-xs ${
                active
                  ? "border-sport/50 bg-sport-soft text-sport"
                  : "border-border bg-surface text-foreground-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span aria-hidden>
                <Icon className="h-4 w-4 shrink-0" />
              </span>
              <span className="max-w-full break-words">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
