"use client";

import { useT } from "@/components/language-provider";

export function PageLoadingSkeleton({ routeLoading = true }: { routeLoading?: boolean } = {}) {
  const t = useT();
  return <div role="status" aria-busy="true" data-route-loading={routeLoading ? "" : undefined} className="space-y-6">
    <span className="sr-only">{t("common.loading")}</span>
    <div aria-hidden className="space-y-6 motion-safe:animate-pulse">
      <div className="space-y-3"><div className="h-7 w-40 rounded-lg bg-surface-muted" /><div className="h-4 w-3/4 max-w-md rounded bg-surface-muted" /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-24 rounded-2xl border border-border bg-surface" />)}
      </div>
      <div className="h-56 rounded-2xl border border-border bg-surface" />
    </div>
  </div>;
}
