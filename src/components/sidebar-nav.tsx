"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/avatar";
import {
  HomeIcon,
  SparkleIcon,
  ActivityIcon,
  UtensilsIcon,
  SmileIcon,
  UserCircleIcon,
} from "@/components/ui/nav-icons";

const links = [
  { href: "/dashboard", label: "Vue d'ensemble", shortLabel: "Accueil", Icon: HomeIcon },
  { href: "/habits", label: "Habitudes", shortLabel: "Habitudes", Icon: SparkleIcon },
  { href: "/sport", label: "Sport", shortLabel: "Sport", Icon: ActivityIcon },
  { href: "/nutrition", label: "Nutrition", shortLabel: "Nutrition", Icon: UtensilsIcon },
  { href: "/humeur", label: "Humeur", shortLabel: "Humeur", Icon: SmileIcon },
  { href: "/profil", label: "Profil", shortLabel: "Profil", Icon: UserCircleIcon },
];

export function SidebarNav({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-center border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          track<span className="text-accent">.perso</span>
        </Link>
        <ThemeToggle className="absolute right-2 top-1/2 -translate-y-1/2" />
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {links.map(({ href, shortLabel, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-2 top-0.5 h-9 rounded-xl bg-accent-soft"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className={`relative z-10 h-5 w-5 ${active ? "text-accent" : "text-foreground-muted"}`} />
              <span
                className={`relative z-10 text-[9px] font-medium ${
                  active ? "text-accent" : "text-foreground-muted"
                }`}
              >
                {shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-2 text-lg font-semibold tracking-tight">
          track<span className="text-accent">.perso</span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {links.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
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
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
