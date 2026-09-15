"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "🏠" },
  { href: "/habits", label: "Habitudes", icon: "✨" },
  { href: "/sport", label: "Sport", icon: "🏃" },
  { href: "/humeur", label: "Humeur", icon: "🙂" },
];

export function SidebarNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
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
  );
}
