"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useT } from "@/components/language-provider";
import { useClickOutside } from "@/lib/use-click-outside";
import { AwardIcon, LogOutIcon, SettingsIcon, UserCircleIcon } from "@/components/ui/nav-icons";

const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-sm font-medium transition hover:bg-surface-muted focus-visible:bg-surface-muted";

/** Mobile top bar: the avatar opens the account destinations instead of jumping straight to the profile. */
export function MobileAccountMenu({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(root, close);

  // Opening with the keyboard or a tap lands on the first destination.
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus({ preventScroll: true });
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
      return;
    }
    const items = [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (current + 1) % items.length
      : event.key === "ArrowUp" ? (current - 1 + items.length) % items.length
      : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus({ preventScroll: true });
  }

  const links = [
    { href: "/profil", label: t("nav.profile"), Icon: UserCircleIcon },
    { href: "/profil/parametres", label: t("nav.settings"), Icon: SettingsIcon },
    { href: "/profil/badges", label: t("nav.badges"), Icon: AwardIcon },
  ];

  return (
    <div ref={root} className="absolute start-2" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-label={t("nav.accountMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-surface-muted ${open ? "bg-surface-muted" : ""}`}
      >
        <Avatar name={displayName} url={avatarUrl} size="sm" className="h-9 w-9" />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={t("nav.accountMenu")}
          className="mobile-account-menu absolute start-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-surface p-2 shadow-xl"
        >
          <p className="truncate border-b border-border px-3 pb-2 pt-1 text-sm font-semibold">{displayName}</p>
          <div className="mt-1 flex flex-col">
            {links.map(({ href, label, Icon }) => (
              <Link key={href} href={href} role="menuitem" onClick={close} className={itemClass}>
                <Icon className="h-5 w-5 shrink-0 text-foreground-muted" />
                {label}
              </Link>
            ))}
            <div className="mt-1 border-t border-border pt-1">
              <SignOutButton role="menuitem" className={`${itemClass} text-danger`}>
                <LogOutIcon className="h-5 w-5 shrink-0" />
                {t("nav.signOut")}
              </SignOutButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
