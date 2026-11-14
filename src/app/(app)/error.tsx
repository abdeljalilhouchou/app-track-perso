"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/language-provider";
import { isStaleClientError, reloadOnce } from "@/lib/stale-client";

/**
 * Catches errors on every signed-in page. A tab left open across a deployment fails
 * on its next action; that case reloads on its own instead of showing an error.
 */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isStaleClientError(error) && reloadOnce()) setReloading(true);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-10 text-center">
      {reloading ? (
        <p className="text-sm text-foreground-muted">{t("appError.updating")}</p>
      ) : (
        <>
          <h1 className="text-lg font-semibold">{t("appError.title")}</h1>
          <p className="text-sm text-foreground-muted">{t("appError.body")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => retry()} className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition hover:opacity-90">
              {t("appError.retry")}
            </button>
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-surface-muted">
              {t("appError.reload")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
