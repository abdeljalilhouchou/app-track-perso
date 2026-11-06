"use client";

import { usePathname } from "next/navigation";

/**
 * Retain the existing per-route state boundary, with content visible before
 * hydration. An opacity: 0 motion wrapper used to hide server-rendered content
 * until the animation's JavaScript loaded on slow connections.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname}>
      {children}
    </div>
  );
}
