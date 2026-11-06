import Link from "next/link";
import clsx from "clsx";
import { SportIcon, type SportIconName } from "./sport-icons";

export type SportNavigationItem = { id: string; label: string; href: string; icon?: SportIconName };

// Prepared for Lot C. The existing Sport Hub navigation stays in place.
export function SportSectionNavigation({ label, items, activeId }: { label: string; items: readonly SportNavigationItem[]; activeId: string }) {
  return <nav aria-label={label} className="sport-section-navigation">{items.map((item) => <Link key={item.id} href={item.href} aria-current={item.id === activeId ? "page" : undefined} className={clsx("sport-navigation-item", item.id === activeId && "is-active")}>
    {item.icon && <SportIcon name={item.icon} className="h-4 w-4" />}<span>{item.label}</span>
  </Link>)}</nav>;
}
