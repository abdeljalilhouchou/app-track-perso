"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/avatar";
import { useT } from "@/components/language-provider";
import {
  HomeIcon,
  SparkleIcon,
  ActivityIcon,
  UtensilsIcon,
  SmileIcon,
  UserCircleIcon,
} from "@/components/ui/nav-icons";

export function SidebarNav({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const pathname = usePathname();
  const t = useT();

  const links = [
    { href: "/dashboard", label: t("nav.overview"), shortLabel: t("nav.overviewShort"), Icon: HomeIcon },
    { href: "/habits", label: t("nav.habits"), shortLabel: t("nav.habitsShort"), Icon: SparkleIcon },
    { href: "/sport", label: t("nav.sport"), shortLabel: t("nav.sportShort"), Icon: ActivityIcon },
    { href: "/nutrition", label: t("nav.nutrition"), shortLabel: t("nav.nutritionShort"), Icon: UtensilsIcon },
    { href: "/humeur", label: t("nav.mood"), shortLabel: t("nav.moodShort"), Icon: SmileIcon },
    { href: "/profil", label: t("nav.profile"), shortLabel: t("nav.profile"), Icon: UserCircleIcon },
  ];
  const primaryLinks = links.filter((link) => link.href !== "/profil");
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar sticky top-0 z-30 flex items-center justify-center border-b border-border bg-surface px-4 md:hidden">
        <Link
          href="/profil"
          aria-label={t("nav.profile")}
          className="absolute start-2 flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-surface-muted"
        >
          <Avatar name={displayName} url={avatarUrl} size="sm" className="h-9 w-9" />
        </Link>
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          track<span className="text-accent">.perso</span>
        </Link>
        <ThemeToggle className="absolute end-2 h-11 w-11" />
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label={t("nav.primaryNavigation")}
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-stretch border-t border-border bg-surface px-1 md:hidden"
      >
        {primaryLinks.map(({ href, label, shortLabel, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 transition-colors duration-150 focus-visible:z-10 ${
                active ? "text-accent" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <span aria-hidden className={`absolute inset-x-2 top-0 h-0.5 rounded-b-full transition-colors ${active ? "bg-accent" : "bg-transparent"}`} />
              <span aria-hidden>
                <Icon className="relative h-5 w-5" />
              </span>
              <span
                aria-hidden
                className="relative max-w-full truncate text-[10px] font-medium leading-tight"
              >
                {shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-border bg-surface px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-2 text-lg font-semibold tracking-tight">
          track<span className="text-accent">.perso</span>
        </Link>

        <nav aria-label={t("nav.primaryNavigation")} className="mt-8 flex flex-1 flex-col gap-1">
          {links.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/profil" className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-surface-muted">
              <Avatar name={displayName} url={avatarUrl} size="sm" />
              <p className="truncate text-sm text-foreground-muted">
                <span className="font-medium text-foreground">{displayName}</span>
              </p>
            </Link>
            <ThemeToggle />
          </div>
          <SignOutButton className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground-muted transition hover:bg-surface-muted hover:text-foreground">
            {t("nav.signOut")}
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
