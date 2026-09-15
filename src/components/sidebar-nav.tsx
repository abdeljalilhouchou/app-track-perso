"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "🏠" },
  { href: "/journal", label: "Journal", icon: "📅" },
  { href: "/habits", label: "Habitudes", icon: "✨" },
  { href: "/sport", label: "Sport", icon: "🏃" },
  { href: "/humeur", label: "Humeur", icon: "🙂" },
  { href: "/profil", label: "Profil", icon: "🏆" },
];

export function SidebarNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          track<span className="text-accent">.perso</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-lg border border-border p-2 text-foreground-muted"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 -translate-x-full flex-col border-r border-border bg-surface px-4 py-6 transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
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
