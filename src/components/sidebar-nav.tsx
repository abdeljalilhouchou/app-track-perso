"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/dashboard", label: "Vue d'ensemble", shortLabel: "Accueil", icon: "🏠" },
  { href: "/journal", label: "Journal", shortLabel: "Journal", icon: "📅" },
  { href: "/habits", label: "Habitudes", shortLabel: "Habitudes", icon: "✨" },
  { href: "/sport", label: "Sport", shortLabel: "Sport", icon: "🏃" },
  { href: "/humeur", label: "Humeur", shortLabel: "Humeur", icon: "🙂" },
  { href: "/profil", label: "Profil", shortLabel: "Profil", icon: "🏆" },
];

export function SidebarNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-center border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          track<span className="text-accent">.perso</span>
        </Link>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-2 top-1 h-8 rounded-xl bg-accent-soft"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span className={`relative z-10 text-lg ${active ? "" : "opacity-70"}`}>{link.icon}</span>
              <span
                className={`relative z-10 text-[10px] font-medium ${
                  active ? "text-accent" : "text-foreground-muted"
                }`}
              >
                {link.shortLabel}
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
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <p className="truncate px-2 text-sm text-foreground-muted">
            Bonjour, <span className="font-medium text-foreground">{displayName}</span>
          </p>
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
